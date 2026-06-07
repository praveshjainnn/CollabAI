import datetime
from pydantic import BaseModel
from typing import Optional, List

class DocumentCreate(BaseModel):
    title: Optional[str] = "Untitled Document"

class DocumentUpdate(BaseModel):
    title: str

class DocumentResponse(BaseModel):
    id: str
    title: str
    createdAt: datetime.datetime
    updatedAt: datetime.datetime
    version: int
    role: str

    class Config:
        from_attributes = True

class PaginationMeta(BaseModel):
    total: int
    page: int
    pageSize: int
    totalPages: int

class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    pagination: PaginationMeta

class DocumentDetailResponse(BaseModel):
    id: str
    title: str
    content: Optional[str] = None  # Base64 encoded string
    version: int
    lastSavedAt: Optional[datetime.datetime] = None
    lastSavedByUserId: Optional[str] = None
    createdAt: datetime.datetime
    updatedAt: datetime.datetime
    role: str

    class Config:
        from_attributes = True

class UserShortResponse(BaseModel):
    id: str
    name: str
    color: str

class RevisionResponse(BaseModel):
    id: str
    version: int
    saveReason: str
    contentHash: Optional[str] = None
    metadata: dict
    createdAt: datetime.datetime
    user: UserShortResponse

class RevisionListResponse(BaseModel):
    revisions: List[RevisionResponse]
    pagination: PaginationMeta

class RevisionDetailResponse(BaseModel):
    id: str
    version: int
    saveReason: str
    contentHash: Optional[str] = None
    metadata: dict
    content: str  # Base64 encoded
    createdAt: datetime.datetime
    user: UserShortResponse
