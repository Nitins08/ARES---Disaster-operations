import yaml
import logging
from typing import Tuple, Dict, Any, List
from datetime import datetime, timezone
from backend.app.config import settings
from backend.app.schemas.ai import GeminiAnalysisOutput

logger = logging.getLogger(__name__)

class PrioritizationEngine:
    def __init__(self, rules_path=None):
        self.rules_path = rules_path or settings.RULES_PATH
        self.rules = self.load_rules()

    def load_rules(self) -> Dict[str, Any]:
        """Loads prioritization, confidence, and safety rules from YAML."""
        try:
            with open(self.rules_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                logger.info(f"Loaded rules from {self.rules_path}")
                return data
        except Exception as e:
            logger.error(f"Failed to load rules.yaml: {e}. Using builtin defaults.")
            return {}

    def compute_priority_and_confidence(
        self,
        ai_output: GeminiAnalysisOutput,
        has_photo: bool,
        is_gps: bool,
        corroboration_count: int = 1,
        created_at: datetime = None,
        is_reused_image: bool = False,
        is_metadata_mismatch: bool = False
    ) -> Tuple[str, float, str, float, str]:
        """
        Computes two distinct, independent metrics:
        1. PRIORITY (Urgency: CRITICAL, HIGH, MEDIUM, LOW and numerical score 0-100)
        2. CONFIDENCE (Verification: HIGH, MEDIUM, LOW and numerical score 0.0-1.0)
        
        CRITICAL SAFETY RULE:
        A missing photo LOWERS CONFIDENCE, NEVER PRIORITY!
        
        Returns:
        (priority_level, priority_score, confidence_level, confidence_score, why_this_rank)
        """
        rules = self.rules
        p_rules = rules.get("priority", {})
        c_rules = rules.get("confidence", {})
        safety_rules = rules.get("safety_overrides", {})

        # --- 1. COMPUTE PRIORITY (URGENCY) ---
        priority_score = float(p_rules.get("base_weight", 15.0))
        why_reasons = []

        # Factor A: AI Severity (1-5)
        severity_mult = float(p_rules.get("severity_weight", 5.0))
        severity_points = ai_output.severity * severity_mult
        priority_score += severity_points
        why_reasons.append(f"Severity level {ai_output.severity}/5 (+{severity_points:.0f} pts)")

        # Factor B: Hazards and threat to life
        hazard_weights = p_rules.get("hazard_threat_to_life", {})
        threat_points = 0.0
        detected_threat_names = []
        for hazard in ai_output.visible_hazards:
            hazard_lower = hazard.lower()
            for key, weight in hazard_weights.items():
                if key in hazard_lower:
                    threat_points += float(weight)
                    detected_threat_names.append(key)
        
        if threat_points > 0:
            capped_threat = min(threat_points, 30.0)
            priority_score += capped_threat
            why_reasons.append(f"Threat hazards: {', '.join(set(detected_threat_names))} (+{capped_threat:.0f} pts)")

        # Factor C: People at risk & Vulnerable groups
        people_scale = p_rules.get("people_at_risk_scale", {})
        if ai_output.people_at_risk >= 11:
            p_risk_pts = float(people_scale.get("crowd", 25.0))
            priority_score += p_risk_pts
            why_reasons.append(f"Large group in danger ({ai_output.people_at_risk}+ people, +{p_risk_pts:.0f} pts)")
        elif ai_output.people_at_risk >= 4:
            p_risk_pts = float(people_scale.get("group", 15.0))
            priority_score += p_risk_pts
            why_reasons.append(f"Multiple people at risk ({ai_output.people_at_risk} people, +{p_risk_pts:.0f} pts)")
        elif ai_output.people_at_risk >= 1:
            p_risk_pts = float(people_scale.get("single", 5.0))
            priority_score += p_risk_pts
            why_reasons.append(f"Individual at risk (+{p_risk_pts:.0f} pts)")

        # Factor D: Urgent Needs (Medical, Rescue, Water)
        urgent_weights = p_rules.get("urgent_needs_weights", {})
        needs_pts = 0.0
        for need in ai_output.urgent_needs:
            need_key = need.lower()
            if need_key in urgent_weights:
                pts = float(urgent_weights[need_key])
                needs_pts += pts
                why_reasons.append(f"Urgent {need_key} need (+{pts:.0f} pts)")
        priority_score += min(needs_pts, 35.0)

        # Factor E: Time decay / Escalation
        if created_at:
            now = datetime.now(timezone.utc)
            # Ensure both datetimes are timezone-aware (or both naive) to prevent subtraction errors
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            delta_hours = max((now - created_at).total_seconds() / 3600.0, 0.0)
            staleness = p_rules.get("time_staleness", {})
            cap_hours = staleness.get("hours_escalation_cap", 12.0)
            esc_rate = staleness.get("escalation_per_hour", 1.5)
            escalation_hours = min(delta_hours, cap_hours)
            time_escalation = escalation_hours * esc_rate
            if time_escalation > 2.0:
                priority_score += time_escalation
                why_reasons.append(f"Pending without resolution for {delta_hours:.1f}h (+{time_escalation:.1f} pts)")

        # Clamp priority score between 0 and 100
        priority_score = min(max(priority_score, 0.0), 100.0)

        # --- SAFETY OVERRIDES CHECK ---
        # Immediate trigger to CRITICAL if danger phrases match
        safety_override_triggered = False
        override_phrase = None
        override_danger_phrases = safety_rules.get("danger_phrases", [])
        
        # Check against detected danger phrases and raw English translation
        text_to_scan = f"{' '.join(ai_output.danger_phrases)} {ai_output.english_translation}".lower()
        for phrase in override_danger_phrases:
            if phrase.lower() in text_to_scan:
                safety_override_triggered = True
                override_phrase = phrase
                break

        if safety_override_triggered:
            min_score = float(safety_rules.get("min_priority_score", 92.0))
            priority_score = max(priority_score, min_score)
            priority_level = "CRITICAL"
            why_reasons.insert(0, f"SAFETY OVERRIDE: Danger trigger '{override_phrase}' escalated priority directly to CRITICAL")
        else:
            if priority_score >= 80.0:
                priority_level = "CRITICAL"
            elif priority_score >= 60.0:
                priority_level = "HIGH"
            elif priority_score >= 40.0:
                priority_level = "MEDIUM"
            else:
                priority_level = "LOW"

        # --- 2. COMPUTE CONFIDENCE (VERIFICATION) ---
        conf_score = float(c_rules.get("base_score", 0.20))
        conf_reasons = []

        # Photo present & matched
        if has_photo:
            photo_bonus = float(c_rules.get("photo_present_and_matched", 0.35))
            conf_score += photo_bonus
            conf_reasons.append("Photo verified")
        else:
            # Lowers confidence ONLY, NEVER lowers priority!
            photo_penalty = float(c_rules.get("missing_photo_penalty", -0.25))
            conf_score += photo_penalty
            conf_reasons.append("No photo attached (lowers confidence, not priority)")

        # GPS vs approximate location
        if is_gps:
            gps_bonus = float(c_rules.get("gps_location", 0.25))
            conf_score += gps_bonus
            conf_reasons.append("Device/EXIF GPS precision")
        else:
            approx_bonus = float(c_rules.get("approximate_location", 0.10))
            conf_score += approx_bonus
            conf_reasons.append("Manual pin/approx location")

        # Corroborating reports
        if corroboration_count > 1:
            per_report = float(c_rules.get("corroboration_bonus_per_report", 0.15))
            cap = float(c_rules.get("corroboration_cap", 0.30))
            corrob_bonus = min((corroboration_count - 1) * per_report, cap)
            conf_score += corrob_bonus
            conf_reasons.append(f"{corroboration_count} corroborating citizen reports")

        # Consistency note bonus
        if "High" in ai_output.consistency_note or "concordance" in ai_output.consistency_note.lower():
            const_bonus = float(c_rules.get("consistency_bonus", 0.10))
            conf_score += const_bonus
            conf_reasons.append("Consistent visual/textual signals")

        # Penalties: Reused image or metadata mismatch
        if is_reused_image:
            reused_pen = float(c_rules.get("reused_image_penalty", -0.35))
            conf_score += reused_pen
            conf_reasons.append("Flagged: Image hash matches prior incident elsewhere")

        if is_metadata_mismatch:
            mismatch_pen = float(c_rules.get("metadata_mismatch_penalty", -0.20))
            conf_score += mismatch_pen
            conf_reasons.append("Flagged: Metadata mismatch")

        # Clamp confidence score 0.05 to 0.99
        conf_score = min(max(conf_score, 0.05), 0.99)

        if conf_score >= 0.70:
            confidence_level = "HIGH"
        elif conf_score >= 0.40:
            confidence_level = "MEDIUM"
        else:
            confidence_level = "LOW"

        # Construct concise, explainable "why this rank" line
        why_this_rank = (
            f"Priority {priority_level} ({priority_score:.0f}/100) — {'; '.join(why_reasons[:3])}. "
            f"Confidence {confidence_level} ({conf_score:.2f}) — {'; '.join(conf_reasons[:3])}."
        )

        return priority_level, priority_score, confidence_level, conf_score, why_this_rank

prioritization_engine = PrioritizationEngine()
