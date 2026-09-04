from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    NODE_ENV: str = "development"
    PORT: int = 4000
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Database Settings
    DATABASE_URL: str
    DIRECT_URL: Optional[str] = None
    
    # JWT Settings
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 7
    AUTH_COOKIE_NAME: str = "access_token"
    
    # AI Settings
    GEMINI_API_KEY: Optional[str] = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GROQ_API_KEY: Optional[str] = ""
    AI_MODEL: str = "llama-3.3-70b-versatile"

    # AWS S3 Settings
    AWS_ACCESS_KEY_ID: Optional[str] = ""
    AWS_SECRET_ACCESS_KEY: Optional[str] = ""
    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET: Optional[str] = ""
    AWS_S3_EXPORT_URL_EXPIRE_SECONDS: int = 3600  # presigned URL valid for 1 hour

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
