"""
s3_service.py — AWS S3 integration for CollabAI exports.

HOW IT WORKS:
  boto3 is synchronous (blocking) — it doesn't know about async/await.
  FastAPI runs on an async event loop. If you call boto3 directly inside
  an async def, it BLOCKS the whole event loop, freezing all other requests.

  The fix: asyncio.get_event_loop().run_in_executor(None, blocking_fn, args...)
  This runs the blocking function in a thread pool, freeing the event loop.
  The 'None' means "use the default ThreadPoolExecutor".

PRESIGNED URLS:
  Instead of streaming the file through FastAPI (EC2 bandwidth),
  we upload to S3 once and return a time-limited signed URL.
  The client downloads directly from S3 — EC2 is not involved in the transfer.
  Signature is computed locally using your secret key + HMAC-SHA256.
  No extra AWS API call needed for URL generation.
"""
import asyncio
import io
import logging
from functools import lru_cache
from typing import Optional

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError, NoCredentialsError

from app.core.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_s3_client():
    """
    Return a cached boto3 S3 client.

    lru_cache(maxsize=1) means this function executes only on the first call;
    after that it returns the same client object. boto3 clients manage their
    own HTTP connection pool internally, so reusing one is correct and efficient.

    Config options:
      retries.max_attempts=3  — automatically retry transient errors (throttle, 5xx)
      retries.mode='adaptive' — uses exponential backoff with jitter
      max_pool_connections=10 — limits concurrent HTTP connections to S3
    """
    return boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        # Explicitly use the regional endpoint so the presigned URL host and
        # the signing host are identical. Without this, boto3 can generate a
        # URL with s3.amazonaws.com (global) but sign it with
        # s3.<region>.amazonaws.com (regional), causing SignatureDoesNotMatch.
        endpoint_url=f"https://s3.{settings.AWS_REGION}.amazonaws.com",
        config=Config(
            signature_version="s3v4",  # Required for all regions except us-east-1
            retries={"max_attempts": 3, "mode": "adaptive"},
            max_pool_connections=10,
        ),
    )


def _is_s3_configured() -> bool:
    """Return True only if all three required S3 settings are present."""
    return bool(
        settings.AWS_ACCESS_KEY_ID
        and settings.AWS_SECRET_ACCESS_KEY
        and settings.AWS_S3_BUCKET
    )


def _upload_to_s3_sync(
    file_bytes: bytes,
    s3_key: str,
    content_type: str,
    filename: str,
) -> None:
    """
    Blocking upload — called inside run_in_executor, NOT in the event loop directly.

    upload_fileobj streams bytes from a file-like object (io.BytesIO).
    ExtraArgs:
      ContentType       — tells S3 and browsers what MIME type this file is
      ContentDisposition — when opened via presigned URL, the browser sees
                           'attachment; filename="report.docx"' and prompts
                           a download with the correct filename instead of the S3 key
    """
    client = get_s3_client()
    client.upload_fileobj(
        io.BytesIO(file_bytes),
        settings.AWS_S3_BUCKET,
        s3_key,
        ExtraArgs={
            "ContentType": content_type,
            "ContentDisposition": f'attachment; filename="{filename}"',
        },
    )


def _generate_presigned_url_sync(s3_key: str, expires_in: int) -> str:
    """
    Blocking presigned URL generation — also runs in thread pool.

    generate_presigned_url('get_object') creates an HTTPS URL containing:
      - Your bucket + key
      - X-Amz-Expires (how long it's valid, in seconds)
      - X-Amz-Signature (HMAC-SHA256 of the above, signed with your secret key)

    Anyone with the URL can GET the object for `expires_in` seconds.
    After that, S3 returns 403. No AWS API call is made — it's pure local crypto.
    """
    client = get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.AWS_S3_BUCKET, "Key": s3_key},
        ExpiresIn=expires_in,
    )


async def upload_export_to_s3(
    file_bytes: bytes,
    user_id: str,
    document_id: str,
    filename: str,
    content_type: str,
) -> Optional[str]:
    """
    Async entry point: upload a file to S3 and return a presigned URL.

    Returns None (instead of raising) if S3 is not configured or fails.
    This lets the caller fall back to streaming the file directly — the
    app continues to work even if AWS creds are not set.

    S3 key structure: exports/{user_id}/{document_id}/{filename}
    Example:         exports/abc-123/doc-456/My_Report.docx

    Why this structure?
      - Easy to list or delete all exports for a specific document
      - Scoped by user_id so you can add per-user lifecycle rules later
      - Avoids collisions between users exporting the same document title
    """
    if not _is_s3_configured():
        logger.warning("S3 not configured — falling back to direct response")
        return None

    s3_key = f"exports/{user_id}/{document_id}/{filename}"
    loop = asyncio.get_event_loop()

    try:
        # Step 1: Upload the file bytes to S3 (blocking — runs in thread pool)
        await loop.run_in_executor(
            None,
            _upload_to_s3_sync,
            file_bytes,
            s3_key,
            content_type,
            filename,
        )

        # Step 2: Generate a time-limited presigned URL (also blocking)
        url = await loop.run_in_executor(
            None,
            _generate_presigned_url_sync,
            s3_key,
            settings.AWS_S3_EXPORT_URL_EXPIRE_SECONDS,
        )

        logger.info("S3 upload successful: %s", s3_key)
        return url

    except NoCredentialsError:
        logger.error("AWS credentials are missing or invalid")
        return None
    except ClientError as e:
        # ClientError carries a structured response with the AWS error code
        error_code = e.response["Error"]["Code"]
        logger.error("S3 ClientError [%s]: %s", error_code, e)
        return None
    except Exception as e:
        logger.error("Unexpected S3 error: %s", e)
        return None
