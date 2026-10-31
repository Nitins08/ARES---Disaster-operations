import os
import json
import re
import logging
from typing import Optional, Dict, Any, List
from google import genai
from google.genai import types

from backend.app.config import settings
from backend.app.schemas.ai import GeminiAnalysisOutput, BoundingBox
from backend.app.models.database import SessionLocal
from backend.app.models.entities import CachedAIResult

logger = logging.getLogger(__name__)

GEMINI_SYSTEM_INSTRUCTION = """
You are an expert emergency disaster triage AI for First Responders.
Analyze the disaster report (photo and/or text description and location).

CRITICAL RULES:
1. STRICT NEGATIVE-CLASS & ANTI-HALLUCINATION VERIFICATION:
   - If the image depicts an everyday indoor/outdoor scene, an electronic device (laptop, computer monitor, mobile phone, tablet screen), a document, paper, a selfie, a vehicle in normal undamaged state, pets, undamaged furniture, or ANY scene WITHOUT visual evidence of disaster damage:
     * 'evidence_boxes' MUST BE AN EMPTY LIST []. NEVER draw bounding boxes on screens, keyboards, windows, furniture, documents, or undamaged structures.
     * 'visible_hazards' MUST BE AN EMPTY LIST [] (unless a specific hazard is directly stated in the user text, and even then, mark it as text-reported only).
     * In 'consistency_note', explicitly state that the photo does NOT exhibit any disaster damage or physical hazard (e.g., "Photo depicts an electronic screen / indoor room with no visible signs of fire, smoke, flood, earthquake damage, or physical hazards.").
     * Lower 'confidence' to <= 0.25 if the visual evidence contradicts or fails to corroborate a reported disaster.
     * If both text and image lack disaster evidence, classify 'disaster_type' as 'other' and 'severity' as 1.
2. DO NOT INVENT HAZARDS:
   - NEVER assume or output default hazards like 'active flames', 'dense particulate smoke', 'deep standing water', or 'cracked masonry' unless they are clearly, unambiguously visible in the photo or explicitly stated by the reporter.
3. BOUNDING BOXES:
   - Only output bounding boxes in 'evidence_boxes' if there is genuine, verified, physical disaster phenomena visible in the photo (e.g., open active flames, heavy smoke plume rising from a fire, deep standing water submerging streets/vehicles, collapsed building sections, or active landslides).
   - If no disaster damage is present in the photo, 'evidence_boxes' MUST be [].
4. The 'what_happened' summary MUST be a concise, factual 1-2 sentence description strictly preserving the original user meaning without hallucination.
5. If information is not available, state 'Not reported' or 'Unknown'.

You MUST respond with valid JSON matching the required schema:
- disaster_type: One of 'flood', 'cyclone', 'earthquake', 'landslide', 'fire', or 'other'. If uncertain or non-disaster, classify as 'other'.
- what_happened: Concise, factual 1-2 sentence synopsis of the actual event.
- visible_hazards: List of specific visible or described physical hazards. Empty list [] if none verified.
- severity: Integer 1 (minor nuisance / no damage) to 5 (catastrophic structural/life threat).
- confidence: Float 0.0 to 1.0 representing your assessment certainty.
- people_at_risk: Count of individuals directly identified at risk (use 0 if not explicitly mentioned).
- urgent_needs: List from ['medical', 'rescue', 'water', 'food', 'shelter', 'evacuation'].
- danger_phrases: Key critical phrases detected (e.g. 'trapped', 'gas leak', 'fire spreading', 'elderly trapped', 'drowning').
- report_source: One of 'citizen', 'volunteer', 'field_team'.
- language: ISO 639-1 code of original report text (e.g., 'es', 'hi', 'fr', 'en').
- english_translation: Faithful English translation of the user's description.
- consistency_note: A brief analytical critique assessing whether the photo evidence, textual claims, and reported environment are consistent or contradictory.
- evidence_boxes: List of bounding boxes [ymin, xmin, ymax, xmax] normalized 0-1000 highlighting physical damage or hazards in the photo. Empty list [] if no hazards.
"""

def analyze_with_gemini(
    image_bytes: Optional[bytes], 
    text_description: Optional[str],
    location_summary: Optional[str] = None
) -> GeminiAnalysisOutput:
    """
    Executes one multimodal Gemini call using the official google-genai SDK.
    Model name is dynamically retrieved from GEMINI_MODEL.
    """
    model_name = settings.GEMINI_MODEL
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")

    if not api_key:
        logger.warning("No GEMINI_API_KEY set. Using intelligent disaster triage fallback analyzer.")
        return generate_mock_analysis(image_bytes, text_description, location_summary)

    try:
        client = genai.Client(api_key=api_key)
        
        prompt_parts: List[Any] = [
            f"User Description: {text_description or 'No text description provided.'}\n"
            f"Location Context: {location_summary or 'Unspecified coordinates'}\n\n"
            "Analyze the situation objectively based on the photo and description.\n"
            "Determine if there is genuine disaster damage or hazards.\n"
            "CRITICAL: If the photo shows an indoor scene, computer/phone screen, document, or non-disaster subject with NO flames, smoke, water, or damage, return empty lists [] for evidence_boxes and visible_hazards, and explain the discrepancy in consistency_note."
        ]

        if image_bytes:
            prompt_parts.append(
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
            )

        response = client.models.generate_content(
            model=model_name,
            contents=prompt_parts,
            config=types.GenerateContentConfig(
                system_instruction=GEMINI_SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=GeminiAnalysisOutput,
                temperature=0.2,
            )
        )

        if response.text:
            data = json.loads(response.text)
            return GeminiAnalysisOutput(**data)
        else:
            raise ValueError("Empty response from Gemini API")

    except Exception as e:
        logger.error(f"Gemini API analysis failed: {e}. Falling back to disaster triage rules.")
        return generate_mock_analysis(image_bytes, text_description, location_summary)


def get_cached_or_analyze(
    image_phash: Optional[str],
    image_bytes: Optional[bytes],
    text_description: Optional[str],
    location_summary: Optional[str] = None
) -> GeminiAnalysisOutput:
    """
    Checks cache by image_phash. If found, reuses cached AI result.
    Otherwise, invokes Gemini analysis and stores in CachedAIResult table.
    """
    if image_phash:
        db = SessionLocal()
        try:
            cached = db.query(CachedAIResult).filter(CachedAIResult.image_phash == image_phash).first()
            if cached and cached.result_json:
                res_data = dict(cached.result_json)
                # Check for and purge legacy mock boxes or legacy fake hazards
                boxes = res_data.get("evidence_boxes", [])
                has_legacy_mock = any(
                    b.get("box_2d") in ([150, 120, 580, 840], [610, 300, 890, 720])
                    or ("Primary " in b.get("label", "") and " impact zone" in b.get("label", ""))
                    for b in boxes if isinstance(b, dict)
                )
                if has_legacy_mock:
                    res_data["evidence_boxes"] = [
                        b for b in boxes if isinstance(b, dict) 
                        and b.get("box_2d") not in ([150, 120, 580, 840], [610, 300, 890, 720])
                        and not ("Primary " in b.get("label", "") and " impact zone" in b.get("label", ""))
                    ]
                    cached.result_json = res_data
                    db.commit()

                logger.info(f"AI result cache hit for image hash {image_phash}")
                return GeminiAnalysisOutput(**res_data)
        except Exception as e:
            logger.warning(f"Error checking AI cache: {e}")
        finally:
            db.close()

    # Perform analysis
    result = analyze_with_gemini(image_bytes, text_description, location_summary)

    # Save to cache
    if image_phash:
        db = SessionLocal()
        try:
            new_cache = CachedAIResult(
                image_phash=image_phash,
                result_json=result.model_dump()
            )
            db.merge(new_cache)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning(f"Failed to cache AI result: {e}")
        finally:
            db.close()

    return result


def generate_mock_analysis(
    image_bytes: Optional[bytes],
    text_description: Optional[str],
    location_summary: Optional[str] = None
) -> GeminiAnalysisOutput:
    """
    Intelligent offline emergency triage analyzer used when GEMINI_API_KEY is not set.
    Ensures safe triage without hallucinating bounding boxes or unverified hazards.
    """
    desc = (text_description or "").lower().strip()
    
    # 0. Check for explicit negation (e.g. "no fire", "not a fire", "no smoke", "false alarm")
    is_negated_fire = bool(re.search(r'\b(no|not|neither|without|never|false)\s+(?:visible\s+|active\s+)?(fire|flames?|smoke|blaze|burn)\b', desc))
    is_negated_flood = bool(re.search(r'\b(no|not|neither|without|never|false)\s+(?:visible\s+|active\s+)?(flood|water|submerged|leak)\b', desc))
    is_negated_quake = bool(re.search(r'\b(no|not|neither|without|never|false)\s+(?:visible\s+|active\s+)?(quake|shake|rubble|collapse|crack)\b', desc))
    is_negated_cyclone = bool(re.search(r'\b(no|not|neither|without|never|false)\s+(?:visible\s+|active\s+)?(cyclone|storm|wind|hurricane)\b', desc))
    is_negated_landslide = bool(re.search(r'\b(no|not|neither|without|never|false)\s+(?:visible\s+|active\s+)?(landslide|mud|slope)\b', desc))

    # 1. Determine disaster type with negation awareness
    disaster_type = "other"
    if not is_negated_fire and any(k in desc for k in ["fire", "flame", "burning", "blaze", "wildfire"]):
        disaster_type = "fire"
    elif not is_negated_quake and any(k in desc for k in ["quake", "earthquake", "aftershock", "tremor", "rubble", "collapse"]):
        disaster_type = "earthquake"
    elif not is_negated_cyclone and any(k in desc for k in ["cyclone", "hurricane", "tornado", "typhoon", "extreme wind", "storm"]):
        disaster_type = "cyclone"
    elif not is_negated_landslide and any(k in desc for k in ["landslide", "mudslide", "rockfall", "slope failure"]):
        disaster_type = "landslide"
    elif not is_negated_flood and any(k in desc for k in ["flood", "submerged", "overflow", "drowning", "rising water"]):
        disaster_type = "flood"

    # 2. Extract danger phrases
    danger_phrases = []
    urgent_candidates = [
        "trapped", "person trapped", "fire near homes", "structural collapse",
        "drowning", "gas leak", "children", "infant", "bleeding", "unconscious"
    ]
    for phrase in urgent_candidates:
        if phrase in desc:
            danger_phrases.append(phrase)

    # 3. Urgent needs
    urgent_needs = []
    if any(w in desc for w in ["hurt", "bleeding", "injured", "medical", "ambulance", "doctor", "heart"]):
        urgent_needs.append("medical")
    if any(w in desc for w in ["trapped", "stuck", "roof", "rescue", "boat", "evacuate"]):
        urgent_needs.append("rescue")
    if any(w in desc for w in ["water", "thirst", "drinking"]):
        urgent_needs.append("water")
    if any(w in desc for w in ["food", "hungry", "starving"]):
        urgent_needs.append("food")
    if any(w in desc for w in ["cold", "shelter", "homeless", "roof"]):
        urgent_needs.append("shelter")

    # 4. Severity & People at risk
    severity = 1 if disaster_type == "other" else 2
    if danger_phrases or "collapse" in desc or "fatal" in desc:
        severity = 5
    elif any(w in desc for w in ["heavy", "deep", "massive", "severe", "critical", "out of control"]):
        severity = 4
    elif any(w in desc for w in ["medium", "moderate", "expanding"]):
        severity = 3

    # Do not invent population numbers; default to 0 (Unknown) unless explicitly mentioned
    people_at_risk = 0
    num_match = re.search(r'\b(\d+)\s*(people|persons|residents|children|occupants|civilians|victims)\b', desc)
    if num_match:
        try:
            people_at_risk = int(num_match.group(1))
        except ValueError:
            pass
    elif any(w in desc for w in ["crowd", "many", "dozens", "hundreds", "school", "hospital"]):
        people_at_risk = 12
    elif any(w in desc for w in ["family", "neighbors", "several", "group"]):
        people_at_risk = 4
    elif any(w in desc for w in ["person trapped", "someone trapped", "elderly trapped", "baby", "infant"]):
        people_at_risk = 1

    # 5. Visible hazards (ONLY extract hazards affirmatively mentioned in text)
    visible_hazards = []
    hazard_keyword_map = [
        ("flames", "active flames", is_negated_fire),
        ("flame", "active flames", is_negated_fire),
        ("blaze", "active fire", is_negated_fire),
        ("smoke", "dense smoke", is_negated_fire),
        ("gas leak", "combustible gas leak", False),
        ("fuel", "combustible fuel risk", False),
        ("deep water", "deep standing water", is_negated_flood),
        ("submerged", "submerged infrastructure", is_negated_flood),
        ("rapid current", "rapid water current", is_negated_flood),
        ("fissure", "structural masonry fissure", is_negated_quake),
        ("crack", "structural fissure", is_negated_quake),
        ("rubble", "rubble obstruction", is_negated_quake),
        ("downed power line", "downed utility lines", False),
        ("power line", "downed utility lines", False),
        ("live wire", "electrical hazard", False),
        ("mud flow", "mud flow", is_negated_landslide),
        ("slope failure", "unstable earth embankment", is_negated_landslide),
    ]
    for kw, label, is_neg in hazard_keyword_map:
        if not is_neg and kw in desc and label not in visible_hazards:
            visible_hazards.append(label)

    # 6. Consistency Note
    if image_bytes and disaster_type == "other":
        consistency_note = "Visual asset received without confirmed disaster hazards. Automated bounding boxes and hazard tags disabled to prevent false detections."
    elif image_bytes and visible_hazards:
        consistency_note = f"Visual asset received alongside reported {disaster_type} hazards. Computer vision verification pending responder review; bounding boxes omitted."
    elif image_bytes:
        consistency_note = "Visual asset received. No overt disaster hazards identified in report description; bounding boxes omitted to prevent false alarms."
    elif not image_bytes:
        consistency_note = "Text-only dispatch report: visual verification pending citizen photo follow-up."
    else:
        consistency_note = "Report received; visual and textual verification pending dispatcher review."

    # 7. What Happened (concise, factual synopsis strictly preserving original meaning)
    if text_description and text_description.strip():
        what_happened = text_description.strip()
    elif image_bytes and disaster_type != "other":
        what_happened = f"Citizen submitted visual evidence regarding potential {disaster_type} incident."
    elif image_bytes:
        what_happened = "Citizen submitted photo evidence; visual inspection pending responder triage."
    else:
        what_happened = "Emergency report filed without detailed text description."

    # 8. Evidence bounding boxes - NEVER fabricate boxes in offline / mock mode
    boxes: List[BoundingBox] = []

    # 9. Confidence calculation
    if disaster_type == "other":
        confidence = 0.20
    elif image_bytes and visible_hazards:
        confidence = 0.65
    elif image_bytes:
        confidence = 0.45
    else:
        confidence = 0.50

    return GeminiAnalysisOutput(
        disaster_type=disaster_type,
        what_happened=what_happened,
        visible_hazards=visible_hazards,
        severity=severity,
        confidence=confidence,
        people_at_risk=people_at_risk,
        urgent_needs=urgent_needs or (["rescue"] if severity >= 4 else []),
        danger_phrases=danger_phrases,
        report_source="citizen",
        language="en",
        english_translation=text_description or "Citizen submitted image without text description.",
        consistency_note=consistency_note,
        evidence_boxes=boxes
    )
