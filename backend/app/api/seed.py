import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.models.database import get_db
from backend.app.models.entities import Incident, Report, IncidentReportLink, AuditLog
from backend.app.services.auth_service import get_current_admin

router = APIRouter(
    prefix="/seed", 
    tags=["Seed Data"],
    dependencies=[Depends(get_current_admin)]
)

DEMO_SENDER_TAG = "seed_demo_fixture"

@router.post("")
def seed_demo_data(db: Session = Depends(get_db)):
    """
    Seeds a curated collection of highly realistic disaster scenarios with verified local imagery:
    1. Safety overrides (trapped residents, fire near homes, structural collapse)
    2. Multi-report duplicate merging with corroboration counts
    3. Missing photo lowering confidence, NEVER priority (status: needs_information)
    4. Categorically accurate visual evidence matching every disaster type
    5. Clean preservation of any real user-submitted reports
    """
    now = datetime.now(timezone.utc)

    # Clean only previously seeded demo data, strictly preserving real user-submitted reports
    demo_reports = db.query(Report).filter(Report.sender_hash == DEMO_SENDER_TAG).all()
    demo_incident_ids = {r.incident_id for r in demo_reports if r.incident_id}
    
    # Also clean initial unseeded legacy demo incident IDs if present
    for inc_id in [1, 2, 3, 4, 5]:
        legacy_inc = db.query(Incident).filter(Incident.id == inc_id).first()
        if legacy_inc:
            # Check if this legacy incident only has demo reports
            linked_reports = db.query(Report).filter(Report.incident_id == inc_id).all()
            if not linked_reports or all(r.sender_hash == DEMO_SENDER_TAG or r.id in [1, 2, 3, 4, 5, 6] for r in linked_reports):
                demo_incident_ids.add(inc_id)

    if demo_incident_ids:
        db.query(IncidentReportLink).filter(IncidentReportLink.incident_id.in_(demo_incident_ids)).delete(synchronize_session=False)
        db.query(AuditLog).filter(AuditLog.incident_id.in_(demo_incident_ids)).delete(synchronize_session=False)
        db.query(Report).filter(Report.incident_id.in_(demo_incident_ids)).delete(synchronize_session=False)
        db.query(Incident).filter(Incident.id.in_(demo_incident_ids)).delete(synchronize_session=False)

    # Also clean any remaining demo reports
    db.query(Report).filter(Report.sender_hash == DEMO_SENDER_TAG).delete(synchronize_session=False)
    db.commit()

    # =========================================================================
    # 1. CRITICAL FLOOD: Poonamallee High Rd & Central Station Residential Enclave
    # =========================================================================
    inc1 = Incident(
        disaster_type="flood",
        priority_level="CRITICAL",
        priority_score=95.0,
        confidence_level="HIGH",
        confidence_score=0.92,
        why_this_rank="SAFETY OVERRIDE: Danger triggers 'person trapped' and 'elderly trapped' escalated priority directly to CRITICAL. 2 corroborating citizen reports (45m apart); visual evidence confirms floodwaters reaching ground floor ceiling height.",
        what_happened="Severe urban flooding with over 5 feet of water inside ground floor residences. 6 occupants including two elderly residents are trapped with water still rising.",
        report_source="Citizen (Reporting on behalf of family)",
        latitude=13.0827,
        longitude=80.2707,
        address_summary="Poonamallee High Rd & Central Station Residential Enclave, Chennai",
        people_at_risk=6,
        urgent_needs=["rescue", "medical", "clean_water", "inflatable_boat"],
        visible_hazards=["deep standing floodwater", "submerged vehicles", "waterlogged electrical distribution box"],
        danger_phrases=["person trapped", "elderly trapped", "water rising"],
        evidence_boxes=[
            {"box_2d": [180, 140, 620, 810], "label": "Submerged residential ground floor & trapped occupants"},
            {"box_2d": [640, 280, 890, 710], "label": "Submerged power junction box hazard"}
        ],
        primary_image_url="/uploads/demo/flood_submerged_residential.jpg",
        corroboration_count=2,
        merge_reasons=["Merged Report #2: 45m away within 12 min, matching hazard 'flood' and verified standing water level"],
        status="verified",
        assigned_team="NDRF Swiftwater Boat Team Alpha-4",
        created_at=now - timedelta(minutes=35)
    )
    db.add(inc1)
    db.flush()

    rep1 = Report(
        tracking_token=uuid.uuid4().hex,
        sender_hash=DEMO_SENDER_TAG,
        image_url="/uploads/demo/flood_submerged_residential.jpg",
        image_phash="a1b2c3d4e5f60718",
        raw_description="Water is over 5 feet deep on the ground floor of our home! My elderly grandparents with mobility issues are trapped inside. We desperately need a rescue boat before nightfall!",
        detected_language="en",
        english_translation="Water is over 5 feet deep on the ground floor of our home! My elderly grandparents with mobility issues are trapped inside. We desperately need a rescue boat before nightfall!",
        latitude=13.0827,
        longitude=80.2707,
        is_gps=True,
        incident_id=inc1.id,
        status="verified",
        is_unverified=False,
        consistency_note="High visual-textual concordance: photographic frame confirms street inundation reaching 5ft with submerged parked vehicles.",
        created_at=now - timedelta(minutes=35)
    )
    rep2 = Report(
        tracking_token=uuid.uuid4().hex,
        sender_hash=DEMO_SENDER_TAG,
        raw_description="Severe inundation on Poonamallee cross street. Neighbors in house #14 are waving from the balcony shouting for evacuation assistance.",
        detected_language="en",
        english_translation="Severe inundation on Poonamallee cross street. Neighbors in house #14 are waving from the balcony shouting for evacuation assistance.",
        latitude=13.0830,
        longitude=80.2710,
        is_gps=True,
        incident_id=inc1.id,
        status="verified",
        is_unverified=False,
        consistency_note="Corroborates standing water height and trapped residents at location.",
        created_at=now - timedelta(minutes=23)
    )
    db.add_all([rep1, rep2])

    # =========================================================================
    # 2. CRITICAL FIRE: T. Nagar Textile Warehouse & Residential Block Fire
    # =========================================================================
    inc2 = Incident(
        disaster_type="fire",
        priority_level="CRITICAL",
        priority_score=98.0,
        confidence_level="HIGH",
        confidence_score=0.94,
        why_this_rank="SAFETY OVERRIDE: Active commercial blaze spreading toward multi-family housing triggered immediate CRITICAL priority. Dense toxic particulate smoke threatening adjacent apartment blocks.",
        what_happened="Major structural blaze erupted in a commercial textile warehouse with heavy flames and toxic smoke rapidly spreading toward adjacent residential apartment units.",
        report_source="Citizen",
        latitude=13.0405,
        longitude=80.2337,
        address_summary="T. Nagar Commercial Hub & Residential Lane, Chennai",
        people_at_risk=14,
        urgent_needs=["firefighting", "evacuation", "paramedics", "burn_treatment"],
        visible_hazards=["active multi-story structural blaze", "dense toxic smoke plume", "combustible chemical storage", "threat to residential balconies"],
        danger_phrases=["fire near homes", "flames spreading", "residents trapped"],
        evidence_boxes=[
            {"box_2d": [520, 80, 930, 890], "label": "Active structural flame front bursting through commercial windows"},
            {"box_2d": [60, 100, 480, 780], "label": "Dense black smoke plume billowing above roofline"}
        ],
        primary_image_url="/uploads/demo/fire_warehouse_blaze.jpg",
        corroboration_count=2,
        merge_reasons=["Merged Report #4: 30m away, eyewitness confirms blaze spreading across rooftop towards apartments"],
        status="assigned",
        assigned_team="Fire Tender Unit 07 & Ladder Crew",
        created_at=now - timedelta(minutes=18)
    )
    db.add(inc2)
    db.flush()

    rep3 = Report(
        tracking_token=uuid.uuid4().hex,
        sender_hash=DEMO_SENDER_TAG,
        image_url="/uploads/demo/fire_warehouse_blaze.jpg",
        image_phash="f9e8d7c6b5a41320",
        raw_description="Major structural fire erupted in the fabric storage facility behind residential Block B! Massive flames are leaping toward apartment windows and smoke is suffocating the upper floors!",
        detected_language="en",
        english_translation="Major structural fire erupted in the fabric storage facility behind residential Block B! Massive flames are leaping toward apartment windows and smoke is suffocating the upper floors!",
        latitude=13.0405,
        longitude=80.2337,
        is_gps=True,
        incident_id=inc2.id,
        status="assigned",
        is_unverified=False,
        consistency_note="Visual confirmed heavy structural flame front and toxic smoke envelope threatening residential block.",
        created_at=now - timedelta(minutes=18)
    )
    rep4 = Report(
        tracking_token=uuid.uuid4().hex,
        sender_hash=DEMO_SENDER_TAG,
        raw_description="Flames spreading rapidly across warehouse roof, building next door is being evacuated. Several elderly residents require stretcher assistance.",
        detected_language="en",
        english_translation="Flames spreading rapidly across warehouse roof, building next door is being evacuated. Several elderly residents require stretcher assistance.",
        latitude=13.0408,
        longitude=80.2340,
        is_gps=True,
        incident_id=inc2.id,
        status="assigned",
        is_unverified=False,
        consistency_note="Corroborates active flame extension and evacuation in progress.",
        created_at=now - timedelta(minutes=10)
    )
    db.add_all([rep3, rep4])

    # =========================================================================
    # 3. CRITICAL EARTHQUAKE: Anna Salai Commercial Complex Multi-Story Collapse
    # =========================================================================
    inc3 = Incident(
        disaster_type="earthquake",
        priority_level="CRITICAL",
        priority_score=93.0,
        confidence_level="HIGH",
        confidence_score=0.89,
        why_this_rank="SAFETY OVERRIDE: Catastrophic structural pancake collapse with trapped survivors under concrete rubble. Multilingual eyewitness report verified by EXIF geotag and structural photographic evidence.",
        what_happened="Catastrophic 3-story reinforced concrete building collapse following seismic tremor. Structural pancaking with 8 people reported trapped beneath heavy masonry slabs.",
        report_source="Volunteer",
        latitude=13.0604,
        longitude=80.2496,
        address_summary="Anna Salai Commercial Complex, Chennai",
        people_at_risk=8,
        urgent_needs=["heavy_urban_search_and_rescue", "trauma_surgeons", "concrete_cutters", "canine_units"],
        visible_hazards=["pancake collapsed floor slabs", "unstable load-bearing pillars", "exposed live wiring", "crushed vehicles under masonry"],
        danger_phrases=["structural collapse", "people trapped under rubble"],
        evidence_boxes=[
            {"box_2d": [150, 120, 720, 860], "label": "Collapsed multi-story reinforced concrete superstructure"},
            {"box_2d": [700, 250, 920, 600], "label": "Masonry rubble debris zone blocking roadway"}
        ],
        primary_image_url="/uploads/demo/building_collapse_rubble.jpg",
        corroboration_count=1,
        merge_reasons=[],
        status="assigned",
        assigned_team="SDRF Heavy Search & Rescue Team Echo",
        created_at=now - timedelta(minutes=55)
    )
    db.add(inc3)
    db.flush()

    rep5 = Report(
        tracking_token=uuid.uuid4().hex,
        sender_hash=DEMO_SENDER_TAG,
        image_url="/uploads/demo/building_collapse_rubble.jpg",
        image_phash="3c4d5e6f7a8b9c0d",
        raw_description="El terremoto provocó el colapso total de la estructura de 3 pisos. Hay personas atrapadas bajo los escombros de concreto y necesitamos equipo pesado de rescate de inmediato.",
        detected_language="es",
        english_translation="The earthquake caused the complete collapse of the 3-story structure. There are people trapped under the concrete rubble and we need heavy rescue equipment immediately.",
        latitude=13.0604,
        longitude=80.2496,
        is_gps=True,
        incident_id=inc3.id,
        status="assigned",
        is_unverified=False,
        consistency_note="Multilingual Spanish report translated accurately. Damage consistent with seismic structural pancake failure.",
        created_at=now - timedelta(minutes=55)
    )
    db.add(rep5)

    # =========================================================================
    # 4. HIGH LANDSLIDE: ECR Coastal Highway Incline & Hill Pass
    # =========================================================================
    inc4 = Incident(
        disaster_type="landslide",
        priority_level="HIGH",
        priority_score=78.0,
        confidence_level="HIGH",
        confidence_score=0.86,
        why_this_rank="Priority HIGH (78/100) — Major arterial evacuation route completely severed by heavy mudslide; 3 vehicles stranded between debris flows. Confidence HIGH (0.86) — Ground photo matched with terrain slope telemetry.",
        what_happened="Hillside slope failure triggered a heavy mud and boulder slide that completely blocked all lanes of the coastal highway incline, stranding 3 civilian vehicles.",
        report_source="Field Team (Highways Patrol)",
        latitude=12.9800,
        longitude=80.2500,
        address_summary="ECR Coastal Highway Incline & Hill Pass, Chennai",
        people_at_risk=3,
        urgent_needs=["earthmoving_equipment", "traffic_diversion", "geotechnical_assessment"],
        visible_hazards=["heavy mud and boulder debris", "fractured road surface", "imminent secondary slope failure"],
        danger_phrases=["road blocked", "cars stranded"],
        evidence_boxes=[
            {"box_2d": [260, 150, 780, 850], "label": "Massive mud and boulder deposits covering all traffic lanes"}
        ],
        primary_image_url="/uploads/demo/landslide_road_blocked.jpg",
        corroboration_count=1,
        status="verified",
        assigned_team="Highways Dept Earthmover Squad 2",
        created_at=now - timedelta(hours=2, minutes=10)
    )
    db.add(inc4)
    db.flush()

    rep6 = Report(
        tracking_token=uuid.uuid4().hex,
        sender_hash=DEMO_SENDER_TAG,
        image_url="/uploads/demo/landslide_road_blocked.jpg",
        image_phash="5f6a7b8c9d0e1f2a",
        raw_description="Hillside collapsed after heavy rains and completely buried the highway in mud and large boulders. Both lanes blocked; three cars are stranded with families inside.",
        detected_language="en",
        english_translation="Hillside collapsed after heavy rains and completely buried the highway in mud and large boulders. Both lanes blocked; three cars are stranded with families inside.",
        latitude=12.9800,
        longitude=80.2500,
        is_gps=True,
        incident_id=inc4.id,
        status="verified",
        is_unverified=False,
        consistency_note="Visual confirmed heavy mud and rock slippage directly over arterial roadway.",
        created_at=now - timedelta(hours=2, minutes=10)
    )
    db.add(rep6)

    # =========================================================================
    # 5. HIGH CYCLONE: Besant Nagar Beach Road Downed Trees & Power Grid
    # =========================================================================
    inc5 = Incident(
        disaster_type="cyclone",
        priority_level="HIGH",
        priority_score=74.0,
        confidence_level="HIGH",
        confidence_score=0.87,
        why_this_rank="Priority HIGH (74/100) — Uprooted mature trees brought down high-voltage utility lines onto flooded roadway; electrocution hazard present. Confidence HIGH (0.87) — Photo evidence and EXIF metadata confirm cyclone wind field.",
        what_happened="Severe cyclone wind gusts uprooted mature banyan trees across the avenue, dragging down high-voltage utility lines onto the wet roadway and blocking vehicular transit.",
        report_source="Citizen",
        latitude=12.9982,
        longitude=80.2665,
        address_summary="Besant Nagar Beach Road & 4th Avenue, Chennai",
        people_at_risk=2,
        urgent_needs=["power_grid_isolation", "chainsaw_crews", "road_clearing"],
        visible_hazards=["downed high-voltage power lines", "massive uprooted banyan trees", "sparking electrical line hazard"],
        danger_phrases=["live wire in street", "fallen trees blocking road"],
        evidence_boxes=[
            {"box_2d": [240, 100, 800, 900], "label": "Large fallen tree trunks blocking roadway and crushing utility poles"}
        ],
        primary_image_url="/uploads/demo/cyclone_fallen_tree_road.jpg",
        corroboration_count=1,
        status="verified",
        assigned_team="TANGEDCO Electric Rapid Response 4",
        created_at=now - timedelta(hours=1, minutes=20)
    )
    db.add(inc5)
    db.flush()

    rep7 = Report(
        tracking_token=uuid.uuid4().hex,
        sender_hash=DEMO_SENDER_TAG,
        image_url="/uploads/demo/cyclone_fallen_tree_road.jpg",
        image_phash="7a8b9c0d1e2f3a4b",
        raw_description="Cyclone gale winds tore down three huge trees across the main avenue. High voltage power lines snapped and are lying across the wet pavement sparking. Urgent electricity cutoff required!",
        detected_language="en",
        english_translation="Cyclone gale winds tore down three huge trees across the main avenue. High voltage power lines snapped and are lying across the wet pavement sparking. Urgent electricity cutoff required!",
        latitude=12.9982,
        longitude=80.2665,
        is_gps=True,
        incident_id=inc5.id,
        status="verified",
        is_unverified=False,
        consistency_note="Photographic confirmation of downed mature timber with tangled overhead utility conduits.",
        created_at=now - timedelta(hours=1, minutes=20)
    )
    db.add(rep7)

    # =========================================================================
    # 6. HIGH INFRASTRUCTURE: Kattivakkam Expressway Fracturing & Bridge Approach
    # =========================================================================
    inc6 = Incident(
        disaster_type="earthquake",
        priority_level="HIGH",
        priority_score=81.0,
        confidence_level="HIGH",
        confidence_score=0.85,
        why_this_rank="Priority HIGH (81/100) — Critical transportation artery severed by deep road fracturing and bridge approach settling. High risk of vehicle plunge if unbarricaded. Confidence HIGH (0.85) — Verified engineering photographic evidence.",
        what_happened="Earthquake displacement buckled and fractured the expressway approach and bridge expansion joints with deep chasms across traffic lanes.",
        report_source="Field Team (Traffic Engineering)",
        latitude=13.1250,
        longitude=80.3010,
        address_summary="Kattivakkam Expressway Overpass & Bridge Approach, Chennai",
        people_at_risk=0,
        urgent_needs=["structural_inspection", "heavy_barricading", "traffic_rerouting"],
        visible_hazards=["buckled asphalt pavement", "deep lateral road fissures", "structural expansion joint failure"],
        danger_phrases=["bridge cracked", "road collapsed"],
        evidence_boxes=[
            {"box_2d": [320, 120, 780, 880], "label": "Severely collapsed road bridge span dropped into flood channel"}
        ],
        primary_image_url="/uploads/demo/infrastructure_road_collapse.jpg",
        corroboration_count=1,
        status="verified",
        created_at=now - timedelta(hours=3, minutes=45)
    )
    db.add(inc6)
    db.flush()

    rep8 = Report(
        tracking_token=uuid.uuid4().hex,
        sender_hash=DEMO_SENDER_TAG,
        image_url="/uploads/demo/infrastructure_road_collapse.jpg",
        image_phash="2d3e4f5a6b7c8d9e",
        raw_description="The expressway overpass approach has buckled completely with deep cracks across all four lanes. The road is impassable and dangerous. Traffic police must block the ramps immediately.",
        detected_language="en",
        english_translation="The expressway overpass approach has buckled completely with deep cracks across all four lanes. The road is impassable and dangerous. Traffic police must block the ramps immediately.",
        latitude=13.1250,
        longitude=80.3010,
        is_gps=True,
        incident_id=inc6.id,
        status="verified",
        is_unverified=False,
        consistency_note="Visual confirmed major structural faulting and deep pavement fracturing across bridge approach lanes.",
        created_at=now - timedelta(hours=3, minutes=45)
    )
    db.add(rep8)

    # =========================================================================
    # 7. MEDIUM FIRE: Pallikaranai Marshland Scrub Fire Threatening Perungudi
    # =========================================================================
    inc7 = Incident(
        disaster_type="fire",
        priority_level="MEDIUM",
        priority_score=62.0,
        confidence_level="HIGH",
        confidence_score=0.88,
        why_this_rank="Priority MEDIUM (62/100) — Scrub fire advancing along marsh perimeter; wind blowing smoke toward suburban housing; no trapped casualties reported. Confidence HIGH (0.88) — Open-horizon photo confirms flame line and smoke drift.",
        what_happened="Brush and scrub wildfire burning dry marshland vegetation along suburban perimeter with heavy smoke blowing into residential housing blocks.",
        report_source="Citizen",
        latitude=12.9350,
        longitude=80.2180,
        address_summary="Pallikaranai Marshland Scrub Border, Perungudi, Chennai",
        people_at_risk=0,
        urgent_needs=["brush_fire_tenders", "perimeter_firebreak"],
        visible_hazards=["advancing brush fire front", "dense white particulate smoke", "dry vegetation fuel"],
        danger_phrases=["smoke entering houses", "brush fire spreading"],
        evidence_boxes=[
            {"box_2d": [180, 80, 780, 920], "label": "High wildfire flame wall burning through woodland canopy"}
        ],
        primary_image_url="/uploads/demo/fire_wildfire_scrub.jpg",
        corroboration_count=1,
        status="new",
        created_at=now - timedelta(minutes=48)
    )
    db.add(inc7)
    db.flush()

    rep9 = Report(
        tracking_token=uuid.uuid4().hex,
        sender_hash=DEMO_SENDER_TAG,
        image_url="/uploads/demo/fire_wildfire_scrub.jpg",
        image_phash="8c9d0e1f2a3b4c5d",
        raw_description="A large brush fire is spreading through dry grass near the marsh edge. Smoke is drifting into our residential layout. Fire breaks need to be established before it reaches the outer compound walls.",
        detected_language="en",
        english_translation="A large brush fire is spreading through dry grass near the marsh edge. Smoke is drifting into our residential layout. Fire breaks need to be established before it reaches the outer compound walls.",
        latitude=12.9350,
        longitude=80.2180,
        is_gps=True,
        incident_id=inc7.id,
        status="new",
        is_unverified=False,
        consistency_note="Visual confirmed continuous flame line consuming dry brush with heavy smoke plume.",
        created_at=now - timedelta(minutes=48)
    )
    db.add(rep9)

    # =========================================================================
    # 8. INCOMPLETE / TEXT-ONLY REPORT (MISSING PHOTO LOWERS CONFIDENCE, NOT PRIORITY)
    # =========================================================================
    inc8_token = "demo-track-token-101"
    inc8 = Incident(
        disaster_type="flood",
        priority_level="HIGH",
        priority_score=73.0,
        confidence_level="LOW",
        confidence_score=0.28,
        why_this_rank="Priority HIGH (73/100) — Threat to life with 5 people including children stranded on terrace; clean drinking water need. Confidence LOW (0.28) — Missing photo lowers verification score, not priority. Tagged unverified pending citizen follow-up.",
        what_happened="Canal breach flooded lowland neighborhood with 4 feet of standing water. 5 residents including two children are stranded on an open terrace without food or drinking water.",
        report_source="Citizen (SOS Dispatch)",
        latitude=13.0102,
        longitude=80.2158,
        address_summary="Guindy Lowland Settlement Canal Border, Chennai",
        people_at_risk=5,
        urgent_needs=["clean_water", "rescue_boat", "dry_rations"],
        visible_hazards=["canal overflow", "submerged roads"],
        danger_phrases=["children stranded", "terrace trapped"],
        evidence_boxes=[],
        primary_image_url=None,
        corroboration_count=1,
        status="needs_information",
        created_at=now - timedelta(minutes=22)
    )
    db.add(inc8)
    db.flush()

    rep10 = Report(
        tracking_token=inc8_token,
        sender_hash=DEMO_SENDER_TAG,
        image_url=None,
        image_phash=None,
        raw_description="Canal overflowed suddenly and water is 4 feet deep. 5 people including two young children are stranded on the open terrace with no food or drinking water. Phone battery is dying.",
        detected_language="en",
        english_translation="Canal overflowed suddenly and water is 4 feet deep. 5 people including two young children are stranded on the open terrace with no food or drinking water. Phone battery is dying.",
        latitude=13.0102,
        longitude=80.2158,
        is_gps=False,
        incident_id=inc8.id,
        status="needs_information",
        is_unverified=True,
        follow_up_needed=["photo", "location"],
        consistency_note="Text-only dispatch report: awaiting citizen photo verification via tracking token /r/demo-track-token-101.",
        created_at=now - timedelta(minutes=22)
    )
    db.add(rep10)

    # =========================================================================
    # Initial Audit Trail
    # =========================================================================
    a1 = AuditLog(
        actor_role="system",
        actor_id="triage_ai",
        action="created",
        incident_id=inc1.id,
        details={"disaster_type": "flood", "priority": "CRITICAL", "safety_override": "trapped_person"}
    )
    a2 = AuditLog(
        actor_role="coordinator",
        actor_id="coordinator_chennai",
        action="assigned_team",
        incident_id=inc1.id,
        details={"assigned_team": "NDRF Swiftwater Boat Team Alpha-4"}
    )
    a3 = AuditLog(
        actor_role="coordinator",
        actor_id="coordinator_chennai",
        action="assigned_team",
        incident_id=inc2.id,
        details={"assigned_team": "Fire Tender Unit 07 & Ladder Crew"}
    )
    a4 = AuditLog(
        actor_role="responder",
        actor_id="responder_fire_station",
        action="confirm",
        incident_id=inc2.id,
        details={"verified_severity": 5, "verified_hazard": "active structural blaze"}
    )
    db.add_all([a1, a2, a3, a4])
    db.commit()

    return {
        "status": "success",
        "message": "Demo database successfully initialized with 8 curated, realistic disaster scenarios and verified local photography.",
        "sample_tracking_token": inc8_token,
        "sample_tracking_url": f"/r/{inc8_token}"
    }