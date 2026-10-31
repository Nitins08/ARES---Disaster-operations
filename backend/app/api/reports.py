import uuid
import hashlib
from typing import Optional
from fastapi import APIRouter, Depends, Form, File, UploadFile, Request, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.database import get_db, SessionLocal
from backend.app.models.entities import Report, Incident
from backend.app.schemas.report import ReportResponse, TrackingResponse, FollowUpUpdate
from backend.app.services.image_service import process_image, compute_hamming_distance
from backend.app.services.storage_service import storage_service
from backend.app.services.ai_service import get_cached_or_analyze
from backend.app.services.merging_service import merging_service

router = APIRouter(prefix="/reports", tags=["Reports"])

def generate_sender_hash(request: Request) -> str:
    """Generates a privacy-preserving SHA-256 hash of the client identifier."""
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    raw = f"{client_ip}:{user_agent}:{settings.SALT_SECRET}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]

def run_ai_and_merge_pipeline(report_id: int, image_bytes: Optional[bytes]):
    """Background task to run multimodal Gemini analysis, caching, prioritization & duplicate merging."""
    db: Session = SessionLocal()
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return

        loc_str = f"Lat: {report.latitude}, Lon: {report.longitude}" if report.latitude else None
        
        # Multimodal AI analysis (cached by image phash)
        ai_output = get_cached_or_analyze(
            image_phash=report.image_phash,
            image_bytes=image_bytes,
            text_description=report.raw_description,
            location_summary=loc_str
        )

        # Update report with AI output details
        report.detected_language = ai_output.language
        report.english_translation = ai_output.english_translation
        report.consistency_note = ai_output.consistency_note
        report.ai_analysis = ai_output.model_dump()

        # Merge or create incident
        incident = merging_service.merge_or_create_incident(
            db=db,
            report=report,
            ai_output=ai_output
        )

    except Exception as e:
        db.rollback()
        print(f"Error in background AI & merge pipeline: {e}")
    finally:
        db.close()


@router.post("", response_model=ReportResponse)
async def submit_report(
    request: Request,
    background_tasks: BackgroundTasks,
    raw_description: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    is_gps: bool = Form(False),
    is_reporting_for_other: bool = Form(False),
    reporter_contact: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Submits a new disaster report from mobile PWA or web portal.
    Handles image metadata stripping, EXIF GPS extraction, hashing, and kicks off AI analysis.
    """
    sender_hash = generate_sender_hash(request)
    tracking_token = uuid.uuid4().hex

    image_url = None
    image_phash = None
    image_dhash = None
    clean_bytes = None

    # Handle photo upload
    if photo and photo.filename:
        raw_bytes = await photo.read()
        if len(raw_bytes) > 0:
            # 1. Read EXIF GPS & 2. Strip metadata & 3. Compute perceptual hash
            clean_bytes, phash_val, dhash_val, exif_lat, exif_lon = process_image(raw_bytes)
            image_phash = phash_val
            image_dhash = dhash_val
            
            # If user didn't specify GPS coords but EXIF had them, use EXIF GPS
            if latitude is None and exif_lat is not None:
                latitude = exif_lat
                longitude = exif_lon
                is_gps = True

            # Save stripped image to storage
            image_url = storage_service.save_image(clean_bytes)

    # Incomplete or text-only reports are never discarded: tagged needs_information & unverified
    is_unverified = False
    follow_up = []
    if not image_url:
        follow_up.append("photo")
        is_unverified = True
    if latitude is None or longitude is None:
        follow_up.append("location")
        is_unverified = True

    new_report = Report(
        tracking_token=tracking_token,
        image_url=image_url,
        image_phash=image_phash,
        image_dhash=image_dhash,
        sender_hash=sender_hash,
        is_reporting_for_other=is_reporting_for_other,
        reporter_contact=reporter_contact,
        raw_description=raw_description or "",
        latitude=latitude,
        longitude=longitude,
        is_gps=is_gps,
        status="needs_information" if is_unverified else "new",
        is_unverified=is_unverified,
        follow_up_needed=follow_up
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    # Immediately execute background AI analysis and duplicate merging
    background_tasks.add_task(run_ai_and_merge_pipeline, new_report.id, clean_bytes)

    return new_report


@router.get("/r/{token}", response_model=TrackingResponse)
def get_report_tracking(token: str, db: Session = Depends(get_db)):
    """
    Public tracking endpoint for citizens to follow up on their submitted report.
    """
    report = db.query(Report).filter(Report.tracking_token == token).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report tracking token not found")

    incident = db.query(Incident).filter(Incident.id == report.incident_id).first() if report.incident_id else None

    # Construct citizen-friendly status message
    msg = "Your report has been received and prioritized by our emergency response queue."
    if report.follow_up_needed:
        msg = f"Report received. To verify response teams faster, please provide: {', '.join(report.follow_up_needed)}."
    elif incident and incident.status == "assigned":
        msg = f"A rescue unit ({incident.assigned_team or 'Response Team'}) has been dispatched to this location."
    elif incident and incident.status == "resolved":
        msg = "This incident has been marked resolved by responders on site."

    return TrackingResponse(
        tracking_token=report.tracking_token,
        report_id=report.id,
        incident_id=report.incident_id,
        status=report.status,
        is_unverified=report.is_unverified,
        follow_up_needed=report.follow_up_needed or [],
        message=msg,
        created_at=report.created_at,
        priority_level=incident.priority_level if incident else "PENDING",
        why_this_rank=incident.why_this_rank if incident else "Processing AI triage..."
    )


@router.post("/r/{token}/follow-up")
async def submit_follow_up(
    token: str,
    background_tasks: BackgroundTasks,
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Allows citizen to submit missing photo or missing location for an unverified report.
    """
    report = db.query(Report).filter(Report.tracking_token == token).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report tracking token not found")

    clean_bytes = None
    if photo and photo.filename:
        raw_bytes = await photo.read()
        if len(raw_bytes) > 0:
            clean_bytes, phash_val, dhash_val, exif_lat, exif_lon = process_image(raw_bytes)
            report.image_phash = phash_val
            report.image_dhash = dhash_val
            report.image_url = storage_service.save_image(clean_bytes)
            if "photo" in (report.follow_up_needed or []):
                report.follow_up_needed = [item for item in report.follow_up_needed if item != "photo"]

    if latitude is not None and longitude is not None:
        report.latitude = latitude
        report.longitude = longitude
        report.is_gps = False
        if "location" in (report.follow_up_needed or []):
            report.follow_up_needed = [item for item in report.follow_up_needed if item != "location"]

    if not report.follow_up_needed:
        report.is_unverified = False
        report.status = "verified"

    db.commit()
    db.refresh(report)

    # Re-trigger pipeline
    background_tasks.add_task(run_ai_and_merge_pipeline, report.id, clean_bytes)

    return {"status": "success", "message": "Follow-up information added to report"}
