import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text

# Load dot env first before any other imports
from app.core.config import settings
from app.core.database import engine
from app.routers import auth, documents, ai, health
from app.websocket.collab import collab_asgi_app, websocket_server
from app.middleware.error_handler import (
    validation_exception_handler,
    http_exception_handler,
    db_exception_handler,
    catch_all_exception_handler
)

# Force IPv4 preference for DNS resolution in python to prevent Neon DB connection ENOTFOUND errors
# (identical to Node setDefaultResultOrder)
import socket
# Prevent infinite recursion on hot reload by saving the original getaddrinfo uniquely
if not hasattr(socket, "_orig_getaddrinfo"):
    socket._orig_getaddrinfo = socket.getaddrinfo
    
    def getaddrinfo_ipv4_first(*args, **kwargs):
        responses = socket._orig_getaddrinfo(*args, **kwargs)
        # Sort responses: IPv4 first (AF_INET = 2, AF_INET6 = 23)
        return sorted(responses, key=lambda x: 0 if x[0] == socket.AF_INET else 1)
    socket.getaddrinfo = getaddrinfo_ipv4_first


app = FastAPI(
    title="CollabAI API",
    description="Python FastAPI backend for real-time collaborative editor",
    version="2.0.0"
)

# CORS configuration — allow Vercel production + all preview URLs + localhost
allowed_origins = [
    settings.FRONTEND_URL,
    "https://collabai-nine.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
]

# Allow all *.vercel.app preview deployment URLs
allowed_origin_regex = r"https://.*\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in allowed_origins if o],
    allow_origin_regex=allowed_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(SQLAlchemyError, db_exception_handler)
app.add_exception_handler(Exception, catch_all_exception_handler)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(health.router, prefix="/api")

@app.get("/health", tags=["System Health"])
async def health_check_root():
    return {"status": "ok"}

# Mount WS Real-time sync engine
app.mount("/ws", collab_asgi_app)

@app.on_event("startup")
async def startup_event():
    # 1. Verify database connection
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            print(f"Database connected successfully to Neon!")
    except Exception as e:
        print(f"CRITICAL: Database connection failed during startup: {e}")
        sys.exit(1)
        
    # 2. Start WebsocketServer background task group (non-blocking)
    import asyncio
    asyncio.create_task(websocket_server.start())
    print("WebSocket Real-time Sync Server ready.")

@app.on_event("shutdown")
async def shutdown_event():
    # Stop WebsocketServer context block
    await websocket_server.stop()
    print("Websocket Server shutdown completed.")
