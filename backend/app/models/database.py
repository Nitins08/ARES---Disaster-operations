import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

def get_engine():
    """Attempts PostgreSQL engine first; gracefully falls back to SQLite for instant demo."""
    engine = None
    try:
        # Try configured PostgreSQL
        if settings.DATABASE_URL.startswith("postgresql"):
            test_engine = create_engine(
                settings.DATABASE_URL,
                pool_pre_ping=True,
                connect_args={"connect_timeout": 3}
            )
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Successfully connected to PostgreSQL/PostGIS database.")
            return test_engine
    except Exception as e:
        logger.warning(
            f"Could not connect to PostgreSQL ({e}). "
            f"Falling back to local SQLite ({settings.SQLITE_FALLBACK_URL}) for instant demo/offline mode."
        )

    # Fallback to SQLite
    engine = create_engine(
        settings.SQLITE_FALLBACK_URL,
        connect_args={"check_same_thread": False}
    )
    return engine

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from backend.app.models import entities  # ensure models are registered
    Base.metadata.create_all(bind=engine)
    # Ensure added columns exist in existing SQLite databases
    with engine.connect() as conn:
        for tbl, col, col_type in [
            ("incidents", "what_happened", "TEXT"),
            ("incidents", "report_source", "VARCHAR(50) DEFAULT 'Citizen'"),
            ("reports", "report_source", "VARCHAR(50) DEFAULT 'Citizen'")
        ]:
            try:
                conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass
    logger.info("Database initialized successfully.")
