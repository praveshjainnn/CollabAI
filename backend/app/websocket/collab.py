import asyncio
import base64
import datetime
import uuid
from typing import Any, Dict, Optional, Set
from urllib.parse import parse_qs

from pycrdt import Doc
from pycrdt.websocket import WebsocketServer, ASGIServer, YRoom
from jose import jwt, JWTError

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.security import decode_access_token
from app.models.models import User, Document, DocumentAccess, Revision

# Keep track of active room names and their autosave timers
save_tasks: Dict[str, asyncio.Task] = {}
websocket_server: Optional[WebsocketServer] = None

# Helper to parse headers from scope
def get_header_value(scope: Dict[str, Any], header_name: str) -> str:
    headers = scope.get("headers", [])
    header_name_bytes = header_name.lower().encode("utf-8")
    for k, v in headers:
        if k == header_name_bytes:
            return v.decode("utf-8")
    return ""

def get_cookies_from_scope(scope: Dict[str, Any]) -> Dict[str, str]:
    cookie_str = get_header_value(scope, "cookie")
    cookies = {}
    if cookie_str:
        for part in cookie_str.split(";"):
            if "=" in part:
                k, v = part.strip().split("=", 1)
                cookies[k] = v
    return cookies

def get_query_param(scope: Dict[str, Any], param_name: str) -> str:
    query_string = scope.get("query_string", b"").decode("utf-8")
    params = parse_qs(query_string)
    return params.get(param_name, [""])[0]

# Database Persistence
async def hydrate_room_from_db(doc_id: str, room: YRoom):
    print(f"[WS] Hydrating doc {doc_id} from database...")
    async with AsyncSessionLocal() as db:
        try:
            stmt = f"SELECT content FROM documents WHERE id = '{doc_id}' LIMIT 1"
            # Using raw SQL or standard query for quick retrieve
            from sqlalchemy import text
            result = await db.execute(text(stmt))
            row = result.first()
            if row and row[0]:
                content_bytes = row[0]
                room.ydoc.apply_update(content_bytes)
                print(f"[WS] Doc {doc_id} successfully hydrated ({len(content_bytes)} bytes)")
            else:
                print(f"[WS] Doc {doc_id} has no existing content, starting fresh")
        except Exception as e:
            print(f"[WS ERROR] Failed to hydrate doc {doc_id}: {e}")

async def save_room_to_db(doc_id: str, room: YRoom, reason: str = "autosave"):
    state_bytes = room.ydoc.get_update()
    if not state_bytes:
        return
        
    print(f"[WS] Saving doc {doc_id} (reason={reason}, {len(state_bytes)} bytes)...")
    async with AsyncSessionLocal() as db:
        try:
            from sqlalchemy import select, update
            # Get document
            stmt = select(Document).filter(Document.id == doc_id).limit(1)
            result = await db.execute(stmt)
            doc = result.scalars().first()
            if not doc:
                print(f"[WS WARNING] Doc {doc_id} not found in DB during save!")
                return
                
            # Update Document content and version
            doc.content = state_bytes
            doc.version += 1
            doc.updated_at = datetime.datetime.utcnow()
            doc.last_saved_at = datetime.datetime.utcnow()
            
            # Find an active user in room to associate as last saver
            active_user_id = None
            # Extract from awareness state if possible, or use creator
            for client_id, state in room.awareness.states.items():
                user_state = state.get("user")
                if user_state and user_state.get("id"):
                    active_user_id = user_state["id"]
                    break
                    
            if active_user_id:
                doc.last_saved_by_user_id = active_user_id
            elif doc.created_by_user_id:
                active_user_id = doc.created_by_user_id
                
            # Write a Revision history record
            revision_id = str(uuid.uuid4())
            revision = Revision(
                id=revision_id,
                content=state_bytes,
                version=doc.version,
                save_reason=reason,
                revision_metadata={},
                document_id=doc_id,
                user_id=active_user_id or doc.created_by_user_id
            )
            
            db.add(revision)
            await db.commit()
            print(f"[WS] Doc {doc_id} successfully saved. Version: {doc.version}")
        except Exception as e:
            print(f"[WS ERROR] Failed to save doc {doc_id}: {e}")

# Debounced autosave
async def debounced_save(doc_id: str, room: YRoom):
    await asyncio.sleep(5)  # 5-second debounce
    await save_room_to_db(doc_id, room, reason="autosave")
    save_tasks.pop(doc_id, None)

def trigger_autosave(doc_id: str, room: YRoom):
    if doc_id in save_tasks:
        save_tasks[doc_id].cancel()
        
    task = asyncio.create_task(debounced_save(doc_id, room))
    save_tasks[doc_id] = task

class CustomWebsocketServer(WebsocketServer):
    async def get_room(self, name: str) -> YRoom:
        clean_name = name.lstrip("/")
        room_exists = clean_name in self.rooms.keys()
        
        room = await super().get_room(clean_name)
        
        if not room_exists:
            # Hydrate document from PostgreSQL
            await hydrate_room_from_db(clean_name, room)
            
            # Observe changes to trigger debounced saves
            # In pycrdt, observe is called with the update event
            room.ydoc.observe(lambda event: trigger_autosave(clean_name, room))
            
        return room

# Force replace document state (used for revision restores)
async def force_replace_doc_state(doc_id: str, state_bytes: bytes):
    global websocket_server
    if websocket_server and doc_id in websocket_server.rooms:
        room = websocket_server.rooms[doc_id]
        
        # Disconnect all active clients in this room (matching Node forceReplaceDocState)
        clients_copy = list(room.clients)
        for client in clients_copy:
            try:
                # Close the websocket channel
                await client.close()
            except Exception:
                pass
                
        # Evict room from memory
        await websocket_server.delete_room(room=room)

# Connection lifecycle hooks / Authentication
async def on_connect(message: Dict[str, Any], scope: Dict[str, Any]) -> bool:
    """
    Returns True to reject/close the websocket, False to accept it.
    """
    path = scope.get("path", "").lstrip("/")
    # Strip "ws/" prefix that leaks from the ASGI routing path
    doc_id = path.removeprefix("ws/")

    # 1. Extract authentication token — cookie first, then WS protocol, then query param
    cookies = get_cookies_from_scope(scope)
    token = cookies.get(settings.AUTH_COOKIE_NAME)

    if not token:
        protocols = get_header_value(scope, "sec-websocket-protocol")
        if protocols:
            token = protocols.split(",")[0].strip()

    if not token:
        token = get_query_param(scope, "token")

    if not token:
        print(f"[WS REJECTED] No token for doc {doc_id}")
        return True  # Reject

    # 2. Verify JWT
    user_id = decode_access_token(token)
    if not user_id:
        print(f"[WS REJECTED] Invalid token for doc {doc_id}")
        return True

    # 3. Verify user + access
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select, and_

        # Load user
        user_stmt = select(User).filter(User.id == user_id).limit(1)
        user_result = await db.execute(user_stmt)
        user = user_result.scalars().first()
        if not user:
            print(f"[WS REJECTED] User {user_id} not found")
            return True

        # Check if user is the document OWNER — owners always have access
        doc_stmt = select(Document).filter(Document.id == doc_id).limit(1)
        doc_result = await db.execute(doc_stmt)
        doc = doc_result.scalars().first()

        if doc and str(doc.created_by_user_id) == str(user_id):
            scope["user_name"] = user.name
            scope["user_id"]   = user.id
            scope["user_role"] = "owner"
            print(f"[WS ACCEPTED] Owner={user.name} doc={doc_id}")
            return False  # Accept

        # Non-owner: check DocumentAccess table
        access_stmt = select(DocumentAccess).filter(
            and_(
                DocumentAccess.user_id == user_id,
                DocumentAccess.document_id == doc_id
            )
        ).limit(1)
        access_result = await db.execute(access_stmt)
        access = access_result.scalars().first()

        if not access:
            print(f"[WS REJECTED] User {user.name} has no access to doc {doc_id}")
            return True

        scope["user_name"] = user.name
        scope["user_id"]   = user.id
        scope["user_role"] = access.role
        print(f"[WS ACCEPTED] User={user.name} doc={doc_id} role={access.role}")
        return False  # Accept

async def on_disconnect(scope: Dict[str, Any]):
    user_name = scope.get("user_name", "Unknown")
    doc_id = scope.get("path", "").lstrip("/")
    print(f"[WS DISCONNECTED] User={user_name} doc={doc_id}")
    
    # Save room state on last client disconnect
    global websocket_server
    if websocket_server and doc_id in websocket_server.rooms:
        room = websocket_server.rooms[doc_id]
        if not room.clients:
            # Last client disconnected, persist final state immediately
            try:
                # Cancel pending autosave task
                if doc_id in save_tasks:
                    save_tasks[doc_id].cancel()
                    save_tasks.pop(doc_id)
                    
                await save_room_to_db(doc_id, room, reason="disconnect")
            except Exception as e:
                print(f"[WS ERROR] Save on disconnect failed: {e}")

# Initialize custom server and ASGI server bridge
websocket_server = CustomWebsocketServer(auto_clean_rooms=True)
collab_asgi_app = ASGIServer(
    websocket_server=websocket_server,
    on_connect=on_connect,
    on_disconnect=on_disconnect
)
