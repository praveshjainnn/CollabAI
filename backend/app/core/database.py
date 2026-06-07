import contextlib
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# In SQLAlchemy, asyncpg requires the postgresql+asyncpg:// prefix
from urllib.parse import urlparse, urlunparse
from app.core.config import settings

# In SQLAlchemy, asyncpg requires the postgresql+asyncpg:// prefix and doesn't support query parameters like sslmode in the URL.
def get_async_db_url(url: str) -> str:
    parsed = urlparse(url)
    scheme = "postgresql+asyncpg"
    
    # Strip all query string parameters from URL to avoid asyncpg connect keyword errors
    return urlunparse((
        scheme,
        parsed.netloc,
        parsed.path,
        "",  # params
        "",  # query
        ""   # fragment
    ))

db_url = get_async_db_url(settings.DATABASE_URL)

engine = create_async_engine(
    db_url,
    pool_size=20,
    max_overflow=10,
    pool_recycle=3600,
    pool_pre_ping=True,
    connect_args={
        "ssl": True,  # Force SSL connection in asyncpg (essential for Neon)
        "command_timeout": 30,
        "timeout": 30
    }
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
