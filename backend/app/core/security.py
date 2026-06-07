import datetime
import bcrypt
from jose import jwt, JWTError
from typing import Optional
from app.core.config import settings

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_access_token(user_id: str) -> str:
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=settings.ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "userId": user_id,  # Match JS camelCase "userId"
        "exp": expire
    }
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("userId")  # Match JS camelCase "userId"
        if user_id is None:
            return None
        return user_id
    except JWTError:
        return None
