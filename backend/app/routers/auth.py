import random
import uuid
from fastapi import APIRouter, Depends, Response, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_user
from app.models.models import User
from app.schemas.auth import UserRegister, UserLogin, AuthResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

USER_COLORS = [
    '#6366f1', '#ec4899', '#14b8a6', '#f59e0b',
    '#ef4444', '#8b5cf6', '#06b6d4', '#10b981',
]

def get_auth_cookie_options(secure: bool = False):
    return {
        "httponly": True,
        "samesite": "lax",
        "secure": secure,
        "path": "/",
        "max_age": 7 * 24 * 60 * 60  # 7 days in seconds
    }

def is_secure_cookie() -> bool:
    if settings.NODE_ENV == "production":
        return True
    return settings.FRONTEND_URL.lower().startswith("https://")

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserRegister,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    email_normalized = user_in.email.strip().lower()
    
    # Check if user already exists
    result = await db.execute(select(User).filter(User.email == email_normalized).limit(1))
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
        
    hashed = hash_password(user_in.password)
    color = random.choice(USER_COLORS)
    user_id = str(uuid.uuid4())
    
    user = User(
        id=user_id,
        email=email_normalized,
        name=user_in.name.strip(),
        password=hashed,
        color=color
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    token = create_access_token(user.id)
    
    # Set Cookie
    options = get_auth_cookie_options(secure=is_secure_cookie())
    response.set_cookie(settings.AUTH_COOKIE_NAME, token, **options)
    
    return {"token": token, "user": user}

@router.post("/login", response_model=AuthResponse)
async def login(
    user_in: UserLogin,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    email_normalized = user_in.email.strip().lower()
    
    result = await db.execute(select(User).filter(User.email == email_normalized).limit(1))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
        
    if not verify_password(user_in.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
        
    token = create_access_token(user.id)
    
    # Set Cookie
    options = get_auth_cookie_options(secure=is_secure_cookie())
    response.set_cookie(settings.AUTH_COOKIE_NAME, token, **options)
    
    return {"token": token, "user": user}

@router.get("/me", response_model=dict)
async def me(current_user: User = Depends(get_current_user)):
    user_res = UserResponse.model_validate(current_user)
    return {"user": user_res}

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(
        settings.AUTH_COOKIE_NAME,
        path="/",
        secure=is_secure_cookie(),
        samesite="lax"
    )
    return {"success": True}
