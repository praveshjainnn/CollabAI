from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError
import traceback

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    details = []
    for error in exc.errors():
        path = ".".join([str(p) for p in error.get("loc", []) if p != "body"])
        details.append({
            "path": path,
            "message": error.get("msg", "Validation error")
        })
        
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "Validation failed",
            "details": details
        }
    )

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

async def db_exception_handler(request: Request, exc: SQLAlchemyError):
    err_msg = str(exc)
    
    # Check for Postgres unique constraint violation (code 23505)
    if "23505" in err_msg or "unique constraint" in err_msg.lower():
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "A record with this value already exists."}
        )
        
    # Check for ENOTFOUND / DNS resolution issues
    if "enotfound" in err_msg.lower() or "dns" in err_msg.lower():
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"error": "Database host could not be resolved"}
        )
        
    # Check for ECONNREFUSED
    if "econnrefused" in err_msg.lower() or "connection refused" in err_msg.lower():
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"error": "Database connection refused"}
        )
        
    print(f"[DB ERROR] @ {request.method} {request.url}")
    traceback.print_exc()
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error"}
    )

async def catch_all_exception_handler(request: Request, exc: Exception):
    print(f"[EXPRESS-LIKE ERROR] @ {request.method} {request.url}")
    traceback.print_exc()
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error"}
    )
