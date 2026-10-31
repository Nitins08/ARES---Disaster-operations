import uuid
import logging
from pathlib import Path
from backend.app.config import settings

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        self.backend = settings.STORAGE_BACKEND
        self.upload_dir = settings.UPLOAD_DIR
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def save_image(self, clean_bytes: bytes, extension: str = "jpg") -> str:
        """
        Saves clean image bytes and returns a public URL or relative path.
        """
        filename = f"{uuid.uuid4().hex}.{extension}"
        
        if self.backend == "supabase" and settings.SUPABASE_URL and settings.SUPABASE_KEY:
            try:
                import httpx
                # Upload to Supabase Storage endpoint
                url = f"{settings.SUPABASE_URL}/storage/v1/object/{settings.SUPABASE_BUCKET}/{filename}"
                headers = {
                    "Authorization": f"Bearer {settings.SUPABASE_KEY}",
                    "Content-Type": "image/jpeg"
                }
                resp = httpx.post(url, content=clean_bytes, headers=headers)
                if resp.status_code in (200, 201):
                    return f"{settings.SUPABASE_URL}/storage/v1/object/public/{settings.SUPABASE_BUCKET}/{filename}"
                else:
                    logger.warning(f"Supabase upload failed ({resp.status_code}), falling back to local file.")
            except Exception as e:
                logger.error(f"Supabase storage error: {e}")

        # Local storage fallback
        file_path = self.upload_dir / filename
        with open(file_path, "wb") as f:
            f.write(clean_bytes)

        return f"/uploads/{filename}"

storage_service = StorageService()
