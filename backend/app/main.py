import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.database import init_db, SessionLocal
from backend.app.models.entities import Incident
from backend.app.api import reports, incidents, audit, rules, seed, auth

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ARES")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize tables
    logger.info("Starting ARES Disaster Operations Backend...")
    init_db()

    # If database is fresh/empty, automatically seed with realistic demo incidents
    db: Session = SessionLocal()
    try:
        count = db.query(Incident).count()
        if count == 0:
            logger.info("Database is empty. Auto-seeding initial demo incidents...")
            seed.seed_demo_data(db)
    except Exception as e:
        logger.warning(f"Auto-seed check: {e}")
    finally:
        db.close()

    yield
    logger.info("Shutting down ARES backend.")

app = FastAPI(
    title="ARES API",
    description="Autonomous Response & Emergency Operations Platform API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware for React + Vite Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Mount for Uploaded Stripped Images
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")

# Include API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(rules.router, prefix="/api")
app.include_router(seed.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ARES",
        "gemini_model": settings.GEMINI_MODEL,
        "database_backend": "PostgreSQL" if "postgresql" in settings.DATABASE_URL else "SQLite (Local/Demo)",
        "storage_backend": settings.STORAGE_BACKEND
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
