import math
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session

from backend.app.models.entities import Incident, Report, IncidentReportLink, AuditLog
from backend.app.schemas.ai import GeminiAnalysisOutput
from backend.app.services.image_service import compute_hamming_distance
from backend.app.services.prioritization import prioritization_engine

logger = logging.getLogger(__name__)

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance in meters between two lat/lon points."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def calculate_text_similarity(text1: str, text2: str) -> float:
    """Computes Jaccard word-token similarity between two descriptions."""
    if not text1 or not text2:
        return 0.0
    s1 = set(text1.lower().split())
    s2 = set(text2.lower().split())
    intersection = s1.intersection(s2)
    union = s1.union(s2)
    return len(intersection) / len(union) if union else 0.0

class IncidentMergingService:
    def __init__(self):
        self.rules = prioritization_engine.rules.get("merging", {})
        self.dist_threshold = float(self.rules.get("distance_meters", 250.0))
        self.time_threshold_hours = float(self.rules.get("time_window_hours", 6.0))
        self.hash_threshold = int(self.rules.get("image_hash_hamming_threshold", 8))
        self.text_threshold = float(self.rules.get("text_similarity_threshold", 0.40))

    def find_matching_incident(
        self,
        db: Session,
        latitude: Optional[float],
        longitude: Optional[float],
        disaster_type: str,
        image_phash: Optional[str],
        text_description: Optional[str]
    ) -> Tuple[Optional[Incident], Optional[str]]:
        """
        Finds an existing open incident that corresponds to the same physical event.
        Returns (incident, merge_reason_string) if found, else (None, None).
        """
        if latitude is None or longitude is None:
            return None, None

        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=self.time_threshold_hours)
        # Support both SQLite naive timestamps and PostgreSQL timezone-aware timestamps
        cutoff_naive = cutoff_time.replace(tzinfo=None)
        
        # Candidate incidents within time window and not resolved
        candidates = db.query(Incident).filter(
            (Incident.created_at >= cutoff_time) | (Incident.created_at >= cutoff_naive),
            Incident.status.notin_(["resolved", "false_report"]),
            Incident.latitude.isnot(None),
            Incident.longitude.isnot(None)
        ).all()

        for inc in candidates:
            dist = haversine_distance(latitude, longitude, inc.latitude, inc.longitude)
            if dist > self.dist_threshold:
                continue

            # Reports are within spatial threshold. Now check semantic and perceptual match.
            reasons = [f"{dist:.0f}m away"]
            
            # Check image perceptual hash match
            is_image_match = False
            if image_phash:
                # Compare with linked reports of this incident
                for linked_report in inc.reports:
                    if linked_report.image_phash:
                        h_dist = compute_hamming_distance(image_phash, linked_report.image_phash)
                        if h_dist <= self.hash_threshold:
                            is_image_match = True
                            reasons.append(f"image perceptual hash match (hamming dist={h_dist})")
                            break

            # Check disaster type match
            type_match = (disaster_type.lower() == inc.disaster_type.lower())
            if type_match:
                reasons.append(f"matching disaster type '{disaster_type}'")

            # Check textual similarity
            text_sim = 0.0
            if text_description and inc.reports:
                text_sim = max(
                    calculate_text_similarity(text_description, r.raw_description or "")
                    for r in inc.reports
                )
                if text_sim >= self.text_threshold:
                    reasons.append(f"text similarity {text_sim*100:.0f}%")

            # Qualify merge if (distance <= 250m) AND (type_match OR is_image_match OR text_sim >= 0.40)
            if type_match or is_image_match or text_sim >= self.text_threshold:
                merge_summary = f"Merged because: {', '.join(reasons)}"
                return inc, merge_summary

        return None, None

    def merge_or_create_incident(
        self,
        db: Session,
        report: Report,
        ai_output: GeminiAnalysisOutput
    ) -> Incident:
        """
        Orchestrates duplicate merging or new incident creation, priority & confidence ranking,
        and audit log generation.
        """
        matched_incident, merge_reason = self.find_matching_incident(
            db=db,
            latitude=report.latitude,
            longitude=report.longitude,
            disaster_type=ai_output.disaster_type,
            image_phash=report.image_phash,
            text_description=report.raw_description
        )

        has_photo = bool(report.image_url)
        is_gps = bool(report.is_gps)

        if matched_incident:
            # --- MERGE INTO EXISTING INCIDENT ---
            matched_incident.corroboration_count += 1
            if merge_reason:
                existing_reasons = matched_incident.merge_reasons or []
                matched_incident.merge_reasons = existing_reasons + [merge_reason]

            # Merge visible hazards and danger phrases
            merged_hazards = list(set((matched_incident.visible_hazards or []) + ai_output.visible_hazards))
            matched_incident.visible_hazards = merged_hazards
            
            merged_needs = list(set((matched_incident.urgent_needs or []) + ai_output.urgent_needs))
            matched_incident.urgent_needs = merged_needs

            merged_danger = list(set((matched_incident.danger_phrases or []) + ai_output.danger_phrases))
            matched_incident.danger_phrases = merged_danger

            # Update people at risk to maximum reported
            matched_incident.people_at_risk = max(matched_incident.people_at_risk, ai_output.people_at_risk)

            # Re-rank priority and confidence with increased corroboration
            p_level, p_score, c_level, c_score, why = prioritization_engine.compute_priority_and_confidence(
                ai_output=ai_output,
                has_photo=has_photo or bool(matched_incident.primary_image_url),
                is_gps=is_gps,
                corroboration_count=matched_incident.corroboration_count,
                created_at=matched_incident.created_at
            )

            matched_incident.priority_level = p_level
            matched_incident.priority_score = p_score
            matched_incident.confidence_level = c_level
            matched_incident.confidence_score = c_score
            matched_incident.why_this_rank = why

            # Link report
            report.incident_id = matched_incident.id
            report.status = "verified" if has_photo else "needs_information"
            
            link = IncidentReportLink(
                incident_id=matched_incident.id,
                report_id=report.id,
                merge_reason=merge_reason
            )
            db.add(link)

            # Audit log
            audit = AuditLog(
                actor_role="system",
                actor_id="deduplication_engine",
                action="auto_merged",
                incident_id=matched_incident.id,
                details={
                    "report_id": report.id,
                    "reason": merge_reason,
                    "new_corroboration_count": matched_incident.corroboration_count,
                    "new_priority": p_level,
                    "new_confidence": c_level
                }
            )
            db.add(audit)
            db.commit()
            db.refresh(matched_incident)
            return matched_incident

        else:
            # --- CREATE NEW INCIDENT ---
            # Initial prioritization
            p_level, p_score, c_level, c_score, why = prioritization_engine.compute_priority_and_confidence(
                ai_output=ai_output,
                has_photo=has_photo,
                is_gps=is_gps,
                corroboration_count=1,
                created_at=datetime.now(timezone.utc)
            )

            # Determine status: "needs_information" if photo or pin is missing
            initial_status = "new"
            follow_up = []
            if not has_photo:
                follow_up.append("photo")
                initial_status = "needs_information"
                report.is_unverified = True
            if report.latitude is None or report.longitude is None:
                follow_up.append("location")
                initial_status = "needs_information"
                report.is_unverified = True

            report.follow_up_needed = follow_up

            # Create Incident entity
            source_tag = "Citizen (Reporting on behalf of victims)" if report.is_reporting_for_other else "Citizen"
            what_happened_synopsis = (
                getattr(ai_output, "what_happened", None) 
                or report.english_translation 
                or report.raw_description 
                or f"Citizen filed emergency report. Visual analysis identified {ai_output.disaster_type} hazards."
            )

            new_incident = Incident(
                disaster_type=ai_output.disaster_type,
                priority_level=p_level,
                priority_score=p_score,
                confidence_level=c_level,
                confidence_score=c_score,
                why_this_rank=why,
                what_happened=what_happened_synopsis,
                report_source=source_tag,
                latitude=report.latitude or 0.0,
                longitude=report.longitude or 0.0,
                address_summary=f"Lat {report.latitude:.4f}, Lon {report.longitude:.4f}" if report.latitude else "Unspecified locality",
                people_at_risk=ai_output.people_at_risk,
                urgent_needs=ai_output.urgent_needs,
                visible_hazards=ai_output.visible_hazards,
                danger_phrases=ai_output.danger_phrases,
                evidence_boxes=[b.model_dump() for b in ai_output.evidence_boxes],
                primary_image_url=report.image_url,
                corroboration_count=1,
                merge_reasons=[],
                status=initial_status
            )
            db.add(new_incident)
            db.flush()

            # Link report
            report.incident_id = new_incident.id
            report.status = initial_status

            link = IncidentReportLink(
                incident_id=new_incident.id,
                report_id=report.id,
                merge_reason="Initial incident creation"
            )
            db.add(link)

            # Audit log
            audit = AuditLog(
                actor_role="system",
                actor_id="triage_engine",
                action="created",
                incident_id=new_incident.id,
                details={
                    "report_id": report.id,
                    "disaster_type": ai_output.disaster_type,
                    "priority": p_level,
                    "confidence": c_level,
                    "status": initial_status
                }
            )
            db.add(audit)
            db.commit()
            db.refresh(new_incident)
            return new_incident

merging_service = IncidentMergingService()
