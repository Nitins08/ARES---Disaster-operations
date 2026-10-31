from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, Field
from backend.app.schemas.report import ReportResponse

class IncidentResponse(BaseModel):
    id: int
    disaster_type: str
    priority_level: str  # CRITICAL, HIGH, MEDIUM, LOW
    priority_score: float
    confidence_level: str # HIGH, MEDIUM, LOW
    confidence_score: float
    why_this_rank: str
    what_happened: Optional[str] = None
    report_source: Optional[str] = "Citizen"
    verification_status: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address_summary: Optional[str] = None
    people_at_risk: int
    urgent_needs: List[str] = []
    visible_hazards: List[str] = []
    danger_phrases: List[str] = []
    evidence_boxes: List[Any] = []
    primary_image_url: Optional[str] = None
    corroboration_count: int
    merge_reasons: List[str] = []
    status: str
    assigned_team: Optional[str] = None
    coordinator_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    reports: List[ReportResponse] = []

    class Config:
        from_attributes = True

class IncidentUpdate(BaseModel):
    status: Optional[str] = None  # new, needs_information, verified, assigned, resolved, false_report
    priority_level: Optional[str] = None
    confidence_level: Optional[str] = None
    assigned_team: Optional[str] = None
    coordinator_notes: Optional[str] = None
    corrected_severity: Optional[int] = None
    corrected_hazard: Optional[str] = None
    actor_role: str = Field(default="responder", description="'responder' or 'coordinator'")
    actor_id: str = Field(default="responder_1", description="Identifier of the operator")

class IncidentMergeRequest(BaseModel):
    target_incident_id: int
    source_incident_id: int
    reason: str
    actor_role: str = "coordinator"
    actor_id: str = "coordinator_1"
