from datetime import datetime, timezone
import json
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from backend.app.models.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    disaster_type = Column(String(50), nullable=False, default="flood", index=True)
    
    # Priority & Confidence
    priority_level = Column(String(20), nullable=False, default="MEDIUM", index=True)  # CRITICAL, HIGH, MEDIUM, LOW
    priority_score = Column(Float, nullable=False, default=50.0)  # 0 - 100
    confidence_level = Column(String(20), nullable=False, default="MEDIUM", index=True) # HIGH, MEDIUM, LOW
    confidence_score = Column(Float, nullable=False, default=0.5)  # 0.0 - 1.0
    why_this_rank = Column(Text, nullable=False, default="")
    what_happened = Column(Text, nullable=True)
    report_source = Column(String(50), nullable=True, default="Citizen")

    # Location & Summary
    latitude = Column(Float, nullable=True, index=True)
    longitude = Column(Float, nullable=True, index=True)
    address_summary = Column(String(255), nullable=True, default="")
    
    # Needs & Hazards
    people_at_risk = Column(Integer, default=0)
    urgent_needs = Column(JSON, default=list)        # ["medical", "rescue", "water"]
    visible_hazards = Column(JSON, default=list)     # ["deep water", "rapid current"]
    danger_phrases = Column(JSON, default=list)      # ["person trapped"]
    evidence_boxes = Column(JSON, default=list)      # [{"box_2d": [ymin, xmin, ymax, xmax], "label": "..."}]
    primary_image_url = Column(String(500), nullable=True)

    # Multi-report Corroboration & Deduplication
    corroboration_count = Column(Integer, default=1)
    merge_reasons = Column(JSON, default=list)       # ["45m away within 15 min, matching hazard"]

    # Status & Management
    status = Column(String(30), nullable=False, default="new", index=True)  # new, needs_information, verified, assigned, resolved
    assigned_team = Column(String(100), nullable=True)
    coordinator_notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    reports = relationship("Report", back_populates="incident")
    audit_logs = relationship("AuditLog", back_populates="incident", cascade="all, delete-orphan")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tracking_token = Column(String(64), unique=True, index=True, nullable=False)
    
    # Image & Media
    image_url = Column(String(500), nullable=True)
    image_phash = Column(String(64), index=True, nullable=True)
    image_dhash = Column(String(64), nullable=True)
    
    # Sender & Privacy
    sender_hash = Column(String(64), index=True, nullable=True)
    is_reporting_for_other = Column(Boolean, default=False)
    reporter_contact = Column(String(100), nullable=True)
    report_source = Column(String(50), nullable=True, default="Citizen")

    # Content & Translation
    raw_description = Column(Text, nullable=True)
    detected_language = Column(String(20), default="en")
    english_translation = Column(Text, nullable=True)

    # Geolocation
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    is_gps = Column(Boolean, default=False)  # True = GPS/EXIF, False = manual pin

    # Incident link & Status
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(30), default="new")  # new, needs_information, verified, assigned, resolved, duplicate, false_report
    is_unverified = Column(Boolean, default=False)
    follow_up_needed = Column(JSON, default=list)  # ["photo", "location"]

    # AI result snapshot
    ai_analysis = Column(JSON, nullable=True)
    consistency_note = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    incident = relationship("Incident", back_populates="reports")


class IncidentReportLink(Base):
    __tablename__ = "incident_report_links"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    merged_at = Column(DateTime(timezone=True), default=utcnow)
    merge_reason = Column(String(255), nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), default=utcnow, index=True)
    actor_role = Column(String(30), default="responder")  # responder, coordinator, system
    actor_id = Column(String(100), default="anonymous")
    action = Column(String(50), nullable=False)           # confirm, correct_severity, correct_hazard, mark_false, mark_duplicate, manual_merge, assign, resolve
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    details = Column(JSON, default=dict)

    incident = relationship("Incident", back_populates="audit_logs")


class CachedAIResult(Base):
    __tablename__ = "cached_ai_results"

    image_phash = Column(String(64), primary_key=True, index=True)
    result_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
