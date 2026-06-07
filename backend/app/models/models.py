import datetime
from sqlalchemy import (
    Column, String, DateTime, LargeBinary, BigInteger, 
    Boolean, Integer, ForeignKey, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = 'users'

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    password = Column(String, nullable=False)
    color = Column(String, nullable=False, default='#6366f1')
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    accesses = relationship("DocumentAccess", back_populates="user", cascade="all, delete-orphan")
    created_documents = relationship("Document", foreign_keys="[Document.created_by_user_id]", back_populates="creator")
    saved_documents = relationship("Document", foreign_keys="[Document.last_saved_by_user_id]", back_populates="last_saver")
    revisions = relationship("Revision", back_populates="user")
    created_share_links = relationship("DocumentShareLink", back_populates="creator")


class Document(Base):
    __tablename__ = 'documents'

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False, default='Untitled Document')
    content = Column(LargeBinary, nullable=True)
    version = Column(BigInteger, nullable=False, default=0)
    content_hash = Column(String, nullable=True)
    last_saved_at = Column(DateTime(timezone=True), nullable=True)
    last_saved_by_user_id = Column(String, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_by_user_id = Column(String, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by_user_id], back_populates="created_documents")
    last_saver = relationship("User", foreign_keys=[last_saved_by_user_id], back_populates="saved_documents")
    accesses = relationship("DocumentAccess", back_populates="document", cascade="all, delete-orphan")
    revisions = relationship("Revision", back_populates="document", cascade="all, delete-orphan")
    share_links = relationship("DocumentShareLink", back_populates="document", cascade="all, delete-orphan")


class DocumentAccess(Base):
    __tablename__ = 'document_accesses'

    id = Column(String, primary_key=True)
    role = Column(String, nullable=False, default='editor')
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False)
    user_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    document_id = Column(String, ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint('user_id', 'document_id', name='uq_user_document_access'),
    )

    # Relationships
    user = relationship("User", back_populates="accesses")
    document = relationship("Document", back_populates="accesses")


class Revision(Base):
    __tablename__ = 'revisions'

    id = Column(String, primary_key=True)
    content = Column(LargeBinary, nullable=False)
    version = Column(BigInteger, nullable=False, default=0)
    content_hash = Column(String, nullable=True)
    state_vector = Column(LargeBinary, nullable=True)
    save_reason = Column(String, nullable=False, default='autosave')
    revision_metadata = Column("metadata", JSONB, nullable=False, default=dict)
    parent_revision_id = Column(String, ForeignKey('revisions.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False, index=True)
    document_id = Column(String, ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)

    # Relationships
    document = relationship("Document", back_populates="revisions")
    user = relationship("User", back_populates="revisions")
    parent = relationship("Revision", remote_side=[id])


class DocumentShareLink(Base):
    __tablename__ = 'document_share_links'

    id = Column(String, primary_key=True)
    token = Column(String, unique=True, nullable=False, index=True)
    role = Column(String, nullable=False, default='viewer')
    is_active = Column(Boolean, nullable=False, default=True)
    use_count = Column(Integer, nullable=False, default=0)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False)
    document_id = Column(String, ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    created_by_user_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # Relationships
    document = relationship("Document", back_populates="share_links")
    creator = relationship("User", back_populates="created_share_links")
