import base64
import secrets
import datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.responses import Response as FastAPIResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, update, delete, and_, case
from typing import Optional, List

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.docx_generator import convert_html_to_docx
from app.models.models import User, Document, DocumentAccess, Revision, DocumentShareLink
from app.schemas.document import (
    DocumentCreate, DocumentUpdate, DocumentResponse, DocumentDetailResponse,
    DocumentListResponse, PaginationMeta, RevisionResponse, RevisionListResponse,
    RevisionDetailResponse
)

router = APIRouter(prefix="/documents", tags=["Documents"])

# Helpers
def create_share_token() -> str:
    return secrets.token_urlsafe(24)

def normalize_role(role: str, fallback: str = "editor") -> str:
    r = role.strip().lower()
    if r in ["viewer", "editor", "owner"]:
        return r
    return fallback

async def get_document_access(db: AsyncSession, user_id: str, document_id: str) -> Optional[DocumentAccess]:
    stmt = select(DocumentAccess).filter(
        and_(DocumentAccess.user_id == user_id, DocumentAccess.document_id == document_id)
    ).limit(1)
    result = await db.execute(stmt)
    return result.scalars().first()

async def require_document_access(db: AsyncSession, user_id: str, document_id: str) -> DocumentAccess:
    access = await get_document_access(db, user_id, document_id)
    if not access:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    return access

async def require_owner(db: AsyncSession, user_id: str, document_id: str) -> bool:
    access = await get_document_access(db, user_id, document_id)
    return access is not None and access.role == "owner"

# Endpoints
@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    q: Optional[str] = Query("", description="Search term for document title"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(16, ge=1, le=60),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    offset = (page - 1) * pageSize
    search_pattern = f"%{q.strip().lower()}%" if q.strip() else ""

    # Select query
    stmt = (
        select(
            Document.id,
            Document.title,
            Document.created_at,
            Document.updated_at,
            Document.version,
            DocumentAccess.role
        )
        .join(DocumentAccess, Document.id == DocumentAccess.document_id)
        .filter(DocumentAccess.user_id == current_user.id)
    )
    
    if search_pattern:
        stmt = stmt.filter(func.lower(Document.title).like(search_pattern))
        
    stmt = stmt.order_by(Document.updated_at.desc()).limit(pageSize).offset(offset)
    
    result = await db.execute(stmt)
    rows = result.all()
    
    # Count query
    count_stmt = (
        select(func.count())
        .select_from(Document)
        .join(DocumentAccess, Document.id == DocumentAccess.document_id)
        .filter(DocumentAccess.user_id == current_user.id)
    )
    if search_pattern:
        count_stmt = count_stmt.filter(func.lower(Document.title).like(search_pattern))
        
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0
    
    documents = []
    for r in rows:
        documents.append(
            DocumentResponse(
                id=r.id,
                title=r.title,
                createdAt=r.created_at,
                updatedAt=r.updated_at,
                version=r.version,
                role=r.role
            )
        )
        
    totalPages = max(1, (total + pageSize - 1) // pageSize)
    
    return DocumentListResponse(
        documents=documents,
        pagination=PaginationMeta(
            total=total,
            page=page,
            pageSize=pageSize,
            totalPages=totalPages
        )
    )

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_document(
    doc_in: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    document_id = str(uuid.uuid4())
    access_id = str(uuid.uuid4())
    
    document = Document(
        id=document_id,
        title=doc_in.title.strip() if doc_in.title else "Untitled Document",
        created_by_user_id=current_user.id,
        version=0
    )
    
    access = DocumentAccess(
        id=access_id,
        user_id=current_user.id,
        document_id=document_id,
        role="owner"
    )
    
    db.add(document)
    db.add(access)
    await db.commit()
    await db.refresh(document)
    
    doc_res = DocumentResponse(
        id=document.id,
        title=document.title,
        createdAt=document.created_at,
        updatedAt=document.updated_at,
        version=document.version,
        role="owner"
    )
    
    return {"document": doc_res}

@router.get("/{id}", response_model=dict)
async def get_document(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    access = await require_document_access(db, current_user.id, id)
    
    stmt = select(Document).filter(Document.id == id).limit(1)
    result = await db.execute(stmt)
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
        
    content_b64 = None
    if doc.content:
        content_b64 = base64.b64encode(doc.content).decode("utf-8")
        
    doc_res = DocumentDetailResponse(
        id=doc.id,
        title=doc.title,
        content=content_b64,
        version=doc.version,
        lastSavedAt=doc.last_saved_at,
        lastSavedByUserId=doc.last_saved_by_user_id,
        createdAt=doc.created_at,
        updatedAt=doc.updated_at,
        role=access.role
    )
    
    return {"document": doc_res}

@router.patch("/{id}", response_model=dict)
async def rename_document(
    id: str,
    doc_in: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    access = await require_document_access(db, current_user.id, id)
    if access.role == "viewer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to edit this document"
        )
        
    title = doc_in.title.strip() or "Untitled Document"
    
    stmt = update(Document).where(Document.id == id).values(
        title=title,
        updated_at=func.now()
    ).returning(Document.id, Document.title, Document.updated_at)
    
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
        
    await db.commit()
    
    return {
        "document": {
            "id": row.id,
            "title": row.title,
            "updatedAt": row.updated_at
        }
    }

@router.delete("/{id}", response_model=dict)
async def delete_document(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    is_owner = await require_owner(db, current_user.id, id)
    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized - you must be the owner"
        )
        
    stmt = delete(Document).where(Document.id == id)
    result = await db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
        
    await db.commit()
    return {"success": True}

@router.post("/{id}/export")
async def export_document(
    id: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await require_document_access(db, current_user.id, id)
    
    html = body.get("html", "").strip()
    title = body.get("title", "document").strip()
    
    if not html:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No content to export"
        )
        
    docx_bytes = convert_html_to_docx(html, title)
    
    # Return file response
    headers = {
        "Content-Disposition": f'attachment; filename="{title}.docx"',
        "Content-Length": str(len(docx_bytes))
    }
    return FastAPIResponse(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers=headers
    )

# Revisions
@router.get("/{id}/revisions", response_model=RevisionListResponse)
async def get_revisions(
    id: str,
    page: int = Query(1, ge=1),
    pageSize: int = Query(12, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await require_document_access(db, current_user.id, id)
    offset = (page - 1) * pageSize
    
    stmt = (
        select(
            Revision.id,
            Revision.version,
            Revision.save_reason,
            Revision.content_hash,
            Revision.revision_metadata,
            Revision.created_at,
            User.id.label("user_id"),
            User.name.label("user_name"),
            User.color.label("user_color")
        )
        .join(User, User.id == Revision.user_id)
        .filter(Revision.document_id == id)
        .order_by(Revision.created_at.desc())
        .limit(pageSize)
        .offset(offset)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    count_stmt = select(func.count()).filter(Revision.document_id == id)
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0
    
    revisions = []
    for r in rows:
        revisions.append(
            RevisionResponse(
                id=r.id,
                version=r.version,
                saveReason=r.save_reason,
                contentHash=r.content_hash,
                metadata=r.revision_metadata or {},
                createdAt=r.created_at,
                user={
                    "id": r.user_id,
                    "name": r.user_name,
                    "color": r.user_color
                }
            )
        )
        
    totalPages = max(1, (total + pageSize - 1) // pageSize)
    
    return RevisionListResponse(
        revisions=revisions,
        pagination=PaginationMeta(
            total=total,
            page=page,
            pageSize=pageSize,
            totalPages=totalPages
        )
    )

@router.get("/{id}/revisions/{revisionId}", response_model=dict)
async def get_revision(
    id: str,
    revisionId: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await require_document_access(db, current_user.id, id)
    
    stmt = (
        select(
            Revision.id,
            Revision.version,
            Revision.save_reason,
            Revision.content_hash,
            Revision.revision_metadata,
            Revision.content,
            Revision.created_at,
            User.id.label("user_id"),
            User.name.label("user_name"),
            User.color.label("user_color")
        )
        .join(User, User.id == Revision.user_id)
        .filter(and_(Revision.document_id == id, Revision.id == revisionId))
        .limit(1)
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Revision not found"
        )
        
    content_b64 = base64.b64encode(row.content).decode("utf-8")
    
    revision_res = RevisionDetailResponse(
        id=row.id,
        version=row.version,
        saveReason=row.save_reason,
        contentHash=row.content_hash,
        metadata=row.revision_metadata or {},
        content=content_b64,
        createdAt=row.created_at,
        user={
            "id": row.user_id,
            "name": row.user_name,
            "color": row.user_color
        }
    )
    
    return {"revision": revision_res}

@router.post("/{id}/revisions/{revisionId}/restore", response_model=dict)
async def restore_revision(
    id: str,
    revisionId: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    access = await require_document_access(db, current_user.id, id)
    if access.role == "viewer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to restore revisions"
        )
        
    stmt = select(Revision).filter(and_(Revision.document_id == id, Revision.id == revisionId)).limit(1)
    result = await db.execute(stmt)
    revision = result.scalars().first()
    if not revision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Revision not found"
        )
        
    # In python implementation, to trigger CRDT changes on the active WebSocket rooms:
    # We can import our WebsocketServer room management service and force reload of the document state!
    # Let's save the document state to the database directly first
    doc_stmt = select(Document).filter(Document.id == id).limit(1)
    doc_result = await db.execute(doc_stmt)
    document = doc_result.scalars().first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
        
    document.content = revision.content
    document.version += 1
    document.last_saved_at = func.now()
    document.last_saved_by_user_id = current_user.id
    
    # Save a restore revision record
    restore_rev_id = str(uuid.uuid4())
    restore_rev = Revision(
        id=restore_rev_id,
        content=revision.content,
        version=document.version,
        save_reason="restore",
        revision_metadata={
            "restoredFromRevisionId": revisionId,
            "restoredFromVersion": revision.version
        },
        document_id=id,
        user_id=current_user.id
    )
    db.add(restore_rev)
    await db.commit()
    
    # Trigger memory state reload (collab.py custom logic)
    from app.websocket.collab import force_replace_doc_state
    await force_replace_doc_state(id, revision.content)
    
    return {
        "success": True,
        "version": document.version,
        "restoredFromRevisionId": revisionId
    }

# Collaborators & Sharing
@router.get("/{id}/collaborators", response_model=dict)
async def get_collaborators(
    id: str,
    page: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=40),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await require_document_access(db, current_user.id, id)
    offset = (page - 1) * pageSize
    
    stmt = (
        select(
            User.id.label("userId"),
            User.email,
            User.name,
            User.color,
            DocumentAccess.role,
            DocumentAccess.created_at.label("createdAt")
        )
        .join(DocumentAccess, User.id == DocumentAccess.user_id)
        .filter(DocumentAccess.document_id == id)
        .order_by(
            case(
                (DocumentAccess.role == "owner", 0),
                (DocumentAccess.role == "editor", 1),
                else_=2
            ),
            DocumentAccess.created_at.asc()
        )
        .limit(pageSize)
        .offset(offset)
    )
    
    result = await db.execute(stmt)
    rows = [dict(r._mapping) for r in result.all()]
    
    count_stmt = select(func.count()).filter(DocumentAccess.document_id == id)
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0
    
    totalPages = max(1, (total + pageSize - 1) // pageSize)
    
    return {
        "collaborators": rows,
        "pagination": {
            "total": total,
            "page": page,
            "pageSize": pageSize,
            "totalPages": totalPages
        }
    }

@router.post("/{id}/share", response_model=dict)
async def share_document(
    id: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    is_owner = await require_owner(db, current_user.id, id)
    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
        
    email = body.get("email", "").strip().lower()
    role = normalize_role(body.get("role", "editor"))
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required"
        )
        
    user_stmt = select(User).filter(User.email == email).limit(1)
    user_result = await db.execute(user_stmt)
    target_user = user_result.scalars().first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    # Upsert access
    access_stmt = select(DocumentAccess).filter(
        and_(DocumentAccess.user_id == target_user.id, DocumentAccess.document_id == id)
    ).limit(1)
    access_result = await db.execute(access_stmt)
    access = access_result.scalars().first()
    
    if access:
        if access.role != "owner":
            access.role = role
    else:
        access = DocumentAccess(
            id=str(uuid.uuid4()),
            user_id=target_user.id,
            document_id=id,
            role=role
        )
        db.add(access)
        
    await db.commit()
    await db.refresh(access)
    
    return {
        "access": {
            "id": access.id,
            "role": access.role,
            "userId": access.user_id,
            "documentId": access.document_id,
            "createdAt": access.created_at
        }
    }

@router.patch("/{id}/collaborators/{targetUserId}", response_model=dict)
async def change_collaborator_role(
    id: str,
    targetUserId: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    is_owner = await require_owner(db, current_user.id, id)
    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner can change roles"
        )
        
    role = normalize_role(body.get("role", "viewer"))
    
    stmt = select(DocumentAccess).filter(
        and_(
            DocumentAccess.document_id == id,
            DocumentAccess.user_id == targetUserId,
            DocumentAccess.role != "owner"
        )
    ).limit(1)
    
    result = await db.execute(stmt)
    access = result.scalars().first()
    if not access:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collaborator not found or cannot be changed"
        )
        
    access.role = role
    await db.commit()
    
    return {"success": True, "role": access.role}

@router.delete("/{id}/collaborators/{targetUserId}", response_model=dict)
async def remove_collaborator(
    id: str,
    targetUserId: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    is_owner = await require_owner(db, current_user.id, id)
    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner can remove collaborators"
        )
        
    stmt = delete(DocumentAccess).where(
        and_(
            DocumentAccess.document_id == id,
            DocumentAccess.user_id == targetUserId,
            DocumentAccess.role != "owner"
        )
    )
    result = await db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collaborator not found or cannot be removed"
        )
        
    await db.commit()
    return {"success": True}

# Share Links
@router.post("/{id}/share-links", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_share_link(
    id: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    is_owner = await require_owner(db, current_user.id, id)
    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner can create share links"
        )
        
    role = normalize_role(body.get("role", "viewer"))
    expiresInDays = int(body.get("expiresInDays", 0))
    expires_at = None
    if expiresInDays > 0:
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=expiresInDays)
        
    link = DocumentShareLink(
        id=str(uuid.uuid4()),
        token=create_share_token(),
        role=role,
        is_active=True,
        use_count=0,
        expires_at=expires_at,
        document_id=id,
        created_by_user_id=current_user.id
    )
    
    db.add(link)
    await db.commit()
    await db.refresh(link)
    
    return {
        "link": {
            "id": link.id,
            "token": link.token,
            "role": link.role,
            "isActive": link.is_active,
            "useCount": link.use_count,
            "expiresAt": link.expires_at,
            "createdAt": link.created_at
        }
    }

@router.get("/{id}/share-links", response_model=dict)
async def get_share_links(
    id: str,
    page: int = Query(1, ge=1),
    pageSize: int = Query(8, ge=1, le=40),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    is_owner = await require_owner(db, current_user.id, id)
    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner can view share links"
        )
        
    offset = (page - 1) * pageSize
    
    stmt = (
        select(DocumentShareLink)
        .filter(DocumentShareLink.document_id == id)
        .order_by(DocumentShareLink.created_at.desc())
        .limit(pageSize)
        .offset(offset)
    )
    result = await db.execute(stmt)
    links = result.scalars().all()
    
    count_stmt = select(func.count()).filter(DocumentShareLink.document_id == id)
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0
    
    totalPages = max(1, (total + pageSize - 1) // pageSize)
    
    links_res = []
    for l in links:
        links_res.append({
            "id": l.id,
            "token": l.token,
            "role": l.role,
            "isActive": l.is_active,
            "useCount": l.use_count,
            "expiresAt": l.expires_at,
            "lastUsedAt": l.last_used_at,
            "createdAt": l.created_at
        })
        
    return {
        "links": links_res,
        "pagination": {
            "total": total,
            "page": page,
            "pageSize": pageSize,
            "totalPages": totalPages
        }
    }

@router.delete("/{id}/share-links/{linkId}", response_model=dict)
async def delete_share_link(
    id: str,
    linkId: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    is_owner = await require_owner(db, current_user.id, id)
    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner can revoke share links"
        )
        
    stmt = select(DocumentShareLink).filter(
        and_(DocumentShareLink.id == linkId, DocumentShareLink.document_id == id)
    ).limit(1)
    result = await db.execute(stmt)
    link = result.scalars().first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found"
        )
        
    link.is_active = False
    await db.commit()
    return {"success": True}

@router.post("/share-links/{token}/accept", response_model=dict)
async def accept_share_link(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(DocumentShareLink).filter(DocumentShareLink.token == token).limit(1)
    result = await db.execute(stmt)
    link = result.scalars().first()
    
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found"
        )
    if not link.is_active:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Share link is inactive"
        )
    if link.expires_at and link.expires_at.replace(tzinfo=None) < datetime.datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Share link has expired"
        )
        
    # Add document access
    access_stmt = select(DocumentAccess).filter(
        and_(DocumentAccess.user_id == current_user.id, DocumentAccess.document_id == link.document_id)
    ).limit(1)
    access_result = await db.execute(access_stmt)
    access = access_result.scalars().first()
    
    if access:
        if access.role != "owner":
            access.role = link.role
    else:
        access = DocumentAccess(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            document_id=link.document_id,
            role=link.role
        )
        db.add(access)
        
    link.use_count += 1
    link.last_used_at = func.now()
    
    await db.commit()
    await db.refresh(access)
    
    return {
        "success": True,
        "documentId": link.document_id,
        "role": access.role
    }

@router.get("/{id}/download")
async def download_raw_yjs(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await require_document_access(db, current_user.id, id)
    
    stmt = select(Document).filter(Document.id == id).limit(1)
    result = await db.execute(stmt)
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
        
    safe_title = "".join([c if c.isalnum() or c in "-_" else "_" for c in (doc.title or "document")])
    content_bytes = doc.content or b""
    
    headers = {
        "Content-Disposition": f'attachment; filename="{safe_title}.yjs"',
        "X-Document-Updated-At": doc.updated_at.isoformat(),
        "X-Document-Version": str(doc.version)
    }
    return FastAPIResponse(
        content=content_bytes,
        media_type="application/octet-stream",
        headers=headers
    )
