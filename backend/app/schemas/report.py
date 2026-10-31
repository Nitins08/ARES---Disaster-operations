from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, Field

class ReportCreate(BaseModel):
    raw_description: Optional[str] = Field(None, description="Citizen's description of emergency in any language")
    latitude: Optional[float] = Field(None, description="Latitude coordinate")
    longitude: Optional[float] = Field(None, description="Longitude coordinate")
    is_gps: bool = Field(False, description="True if coordinates came from device GPS / EXIF, False if manual pin")
    is_reporting_for_other: bool = Field(False, description="Whether reporter is submitting on behalf of another party")
    reporter_contact: Optional[str] = Field(None, description="Optional phone/contact for follow-up")

class ReportResponse(BaseModel):
    id: int
    tracking_token: str
    image_url: Optional[str] = None
    image_phash: Optional[str] = None
    raw_description: Optional[str] = None
    detected_language: str
    english_translation: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_gps: bool
    is_reporting_for_other: bool
    status: str
    is_unverified: bool
    follow_up_needed: List[str] = []
    consistency_note: Optional[str] = None
    ai_analysis: Optional[Any] = None
    incident_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TrackingResponse(BaseModel):
    tracking_token: str
    report_id: int
    incident_id: Optional[int] = None
    status: str
    is_unverified: bool
    follow_up_needed: List[str] = []
    message: str
    created_at: datetime
    priority_level: Optional[str] = None
    why_this_rank: Optional[str] = None

class FollowUpUpdate(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    additional_notes: Optional[str] = None
