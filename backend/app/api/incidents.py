from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone

from backend.app.models.database import get_db
from backend.app.models.entities import Incident, Report, AuditLog, IncidentReportLink
from backend.app.schemas.incident import IncidentResponse, IncidentUpdate, IncidentMergeRequest
from backend.app.services.auth_service import get_current_admin

router = APIRouter(
    prefix="/incidents", 
    tags=["Incidents"],
    dependencies=[Depends(get_current_admin)]
)

def to_incident_response(inc: Incident) -> IncidentResponse:
    """Formats incident into standardized 9-point operational briefing schema."""
    # Verification status: Unverified, Under Review, Verified
    if inc.status == "needs_information":
        v_status = "Unverified"
    elif inc.status == "new":
        v_status = "Under Review"
    elif inc.status in ["verified", "assigned", "resolved"]:
        v_status = "Verified"
    elif inc.status == "false_report":
        v_status = "Marked False"
    else:
        v_status = inc.status.capitalize()

    # What Happened: concise factual synopsis
    what_happened = getattr(inc, "what_happened", None)
    if not what_happened and inc.reports:
        primary = inc.reports[0]
        what_happened = primary.english_translation or primary.raw_description
    if not what_happened:
        if inc.disaster_type and inc.disaster_type != "other":
            what_happened = f"Emergency incident reported for {inc.disaster_type}."
        else:
            what_happened = "Emergency incident reported. Awaiting detailed triage."

    # Report source
    source = getattr(inc, "report_source", None) or "Citizen"
    if inc.reports and getattr(inc.reports[0], "is_reporting_for_other", False):
        source = "Citizen (Reporting on behalf of victims)"

    # Clean legacy mock boxes to prevent phantom hazard boxes on incident reviews
    raw_boxes = inc.evidence_boxes or []
    cleaned_boxes = [
        b for b in raw_boxes 
        if isinstance(b, dict) 
        and b.get("box_2d") not in ([150, 120, 580, 840], [610, 300, 890, 720])
        and not ("Primary " in b.get("label", "") and " impact zone" in b.get("label", ""))
    ]

    resp = IncidentResponse.model_validate(inc)
    resp.evidence_boxes = cleaned_boxes
    resp.what_happened = what_happened
    resp.verification_status = v_status
    resp.report_source = source
    return resp

@router.get("", response_model=List[IncidentResponse])
def get_incidents(
    status: Optional[str] = Query(None, description="Filter by status: new, needs_information, verified, assigned, resolved"),
    disaster_type: Optional[str] = Query(None, description="Filter by disaster type"),
    priority_level: Optional[str] = Query(None, description="Filter by priority: CRITICAL, HIGH, MEDIUM, LOW"),
    confidence_level: Optional[str] = Query(None, description="Filter by confidence: HIGH, MEDIUM, LOW"),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db)
):
    """
    Returns ranked incident queue for responder and coordinator consoles.
    Sorted by Priority Score DESC, then creation time.
    """
    query = db.query(Incident).options(joinedload(Incident.reports))

    if status:
        query = query.filter(Incident.status == status)
    if disaster_type:
        query = query.filter(Incident.disaster_type == disaster_type)
    if priority_level:
        query = query.filter(Incident.priority_level == priority_level)
    if confidence_level:
        query = query.filter(Incident.confidence_level == confidence_level)

    # Ranked by priority score descending
    incidents = query.order_by(Incident.priority_score.desc(), Incident.created_at.desc()).limit(limit).all()
    return [to_incident_response(inc) for inc in incidents]


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident_detail(incident_id: int, db: Session = Depends(get_db)):
    """Returns detailed incident view with evidence boxes, corroborations, and original reports."""
    incident = db.query(Incident).options(joinedload(Incident.reports)).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return to_incident_response(incident)


@router.patch("/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: int, 
    update_data: IncidentUpdate, 
    db: Session = Depends(get_db)
):
    """
    Rescuer review panel actions:
    Confirm, correct severity/hazard, mark false, mark duplicate, assign, or resolve.
    Every update is written to the Audit Log.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    action_details = {}
    action_type = "updated"

    # Status update
    if update_data.status:
        action_type = f"status_{update_data.status}"
        action_details["previous_status"] = incident.status
        action_details["new_status"] = update_data.status
        incident.status = update_data.status

    # Priority level / severity correction
    if update_data.corrected_severity:
        action_type = "correct_severity"
        action_details["previous_score"] = incident.priority_score
        # Adjust score according to new severity 1-5
        new_score = float(update_data.corrected_severity) * 18.0
        incident.priority_score = min(max(new_score, 10.0), 100.0)
        if incident.priority_score >= 80:
            incident.priority_level = "CRITICAL"
        elif incident.priority_score >= 60:
            incident.priority_level = "HIGH"
        elif incident.priority_score >= 40:
            incident.priority_level = "MEDIUM"
        else:
            incident.priority_level = "LOW"
        action_details["new_severity"] = update_data.corrected_severity
        action_details["new_priority"] = incident.priority_level
        incident.why_this_rank += f" [Manually corrected severity to {update_data.corrected_severity}/5 by {update_data.actor_role}]"

    # Hazard correction
    if update_data.corrected_hazard:
        action_type = "correct_hazard"
        hazards = list(incident.visible_hazards or [])
        if update_data.corrected_hazard not in hazards:
            hazards.append(update_data.corrected_hazard)
        incident.visible_hazards = hazards
        action_details["added_hazard"] = update_data.corrected_hazard

    # Assigned team
    if update_data.assigned_team:
        action_type = "assigned_team"
        incident.assigned_team = update_data.assigned_team
        incident.status = "assigned"
        action_details["assigned_team"] = update_data.assigned_team

    # Coordinator notes
    if update_data.coordinator_notes:
        incident.coordinator_notes = update_data.coordinator_notes
        action_details["notes"] = update_data.coordinator_notes

    incident.updated_at = datetime.now(timezone.utc)

    # Record in Audit Log
    audit = AuditLog(
        actor_role=update_data.actor_role,
        actor_id=update_data.actor_id,
        action=action_type,
        incident_id=incident.id,
        details=action_details
    )
    db.add(audit)
    db.commit()
    db.refresh(incident)

    return to_incident_response(incident)


@router.post("/merge", response_model=IncidentResponse)
def merge_incidents(
    payload: IncidentMergeRequest,
    db: Session = Depends(get_db)
):
    """
    Coordinator manual merge action:
    Merges source_incident_id into target_incident_id.
    """
    target = db.query(Incident).filter(Incident.id == payload.target_incident_id).first()
    source = db.query(Incident).filter(Incident.id == payload.source_incident_id).first()

    if not target or not source:
        raise HTTPException(status_code=404, detail="Target or source incident not found")

    if target.id == source.id:
        raise HTTPException(status_code=400, detail="Cannot merge an incident into itself")

    # Re-link all reports from source to target
    source_reports = db.query(Report).filter(Report.incident_id == source.id).all()
    for r in source_reports:
        r.incident_id = target.id
        link = IncidentReportLink(
            incident_id=target.id,
            report_id=r.id,
            merge_reason=f"Manual merge by {payload.actor_role}: {payload.reason}"
        )
        db.add(link)

    # Increment corroboration count
    target.corroboration_count += len(source_reports)
    existing_reasons = target.merge_reasons or []
    target.merge_reasons = existing_reasons + [f"Manual merge of #{source.id}: {payload.reason}"]

    # Merge hazards & needs
    target.visible_hazards = list(set((target.visible_hazards or []) + (source.visible_hazards or [])))
    target.urgent_needs = list(set((target.urgent_needs or []) + (source.urgent_needs or [])))
    target.danger_phrases = list(set((target.danger_phrases or []) + (source.danger_phrases or [])))
    target.people_at_risk = max(target.people_at_risk, source.people_at_risk)

    # Update confidence due to higher corroboration
    target.confidence_score = min(target.confidence_score + 0.15, 0.98)
    if target.confidence_score >= 0.70:
        target.confidence_level = "HIGH"

    # Mark source incident as resolved/merged
    source.status = "duplicate"
    source.coordinator_notes = f"Merged into Incident #{target.id} by {payload.actor_id}: {payload.reason}"

    # Audit log
    audit = AuditLog(
        actor_role=payload.actor_role,
        actor_id=payload.actor_id,
        action="manual_merge",
        incident_id=target.id,
        details={
            "merged_source_id": source.id,
            "reason": payload.reason,
            "new_corroboration_count": target.corroboration_count
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(target)

    return to_incident_response(target)
