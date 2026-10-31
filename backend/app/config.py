import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    # AI settings - model MUST come from GEMINI_MODEL environment variable
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Database settings
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+psycopg2://postgres:postgrespassword@localhost:5432/damagemapper"
    )
    SQLITE_FALLBACK_URL: str = f"sqlite:///{BASE_DIR / 'damagemapper_local.db'}"

    # Storage settings
    STORAGE_BACKEND: str = os.getenv("STORAGE_BACKEND", "local")  # "local" or "supabase"
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_BUCKET: str = os.getenv("SUPABASE_BUCKET", "disaster-reports")

    # Rules path
    RULES_PATH: Path = Path(__file__).resolve().parent / "rules.yaml"

    # Privacy & Security
    SALT_SECRET: str = os.getenv("SALT_SECRET", "damage-mapper-hackathon-salt-2026")
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))

    # Admin Control Room Authentication
    ADMIN_USERNAME: str = os.getenv("ARES_ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ARES_ADMIN_PASSWORD", "ares-admin-2026")
    ADMIN_JWT_SECRET: str = os.getenv("ARES_JWT_SECRET", "ares-control-room-secure-key-2026")
    TOKEN_EXPIRE_HOURS: int = int(os.getenv("TOKEN_EXPIRE_HOURS", "24"))

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
