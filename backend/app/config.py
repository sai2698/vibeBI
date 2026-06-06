from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/bi_platform"
    SYNC_DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/bi_platform"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "supersecretkey"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    AI_PROVIDER: str = "openai"
    OLLAMA_HOST: str = "http://localhost:11434"
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "noreply@biplatform.com"
    SMTP_PASSWORD: str = "changeme"
    FROM_EMAIL: str = "noreply@biplatform.com"
    MAX_QUERY_ROWS: int = 100000
    QUERY_TIMEOUT_SEC: int = 30
    CACHE_TTL_SEC: int = 3600

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
