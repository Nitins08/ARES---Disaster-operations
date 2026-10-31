from typing import List, Optional
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    box_2d: List[int] = Field(
        ..., 
        description="Bounding box coordinates in normalized scale [ymin, xmin, ymax, xmax] from 0 to 1000"
    )
    label: str = Field(..., description="Short hazard/evidence description e.g. 'collapsed masonry', 'flood water'")

class GeminiAnalysisOutput(BaseModel):
    disaster_type: str = Field(
        default="flood", 
        description="Primary disaster category: flood, cyclone, earthquake, landslide, or fire"
    )
    visible_hazards: List[str] = Field(
        default_factory=list, 
        description="Hazards visible in image or described in text e.g. downed lines, deep water, structural cracks"
    )
    severity: int = Field(
        default=3, 
        ge=1, 
        le=5, 
        description="Severity score on a 1 (minor) to 5 (catastrophic) scale"
    )
    confidence: float = Field(
        default=0.7, 
        ge=0.0, 
        le=1.0, 
        description="AI confidence score between 0.0 and 1.0"
    )
    people_at_risk: int = Field(
        default=0, 
        description="Estimated number of individuals visibly or textually identified at immediate risk"
    )
    urgent_needs: List[str] = Field(
        default_factory=list, 
        description="Immediate survival needs: medical, rescue, water, food, shelter, evacuation"
    )
    danger_phrases: List[str] = Field(
        default_factory=list, 
        description="Key alarming phrases detected in original report e.g. 'trapped', 'child alone'"
    )
    what_happened: str = Field(
        default="",
        description="Concise, factual synopsis of what occurred, preserving original meaning without speculating"
    )
    report_source: str = Field(
        default="citizen",
        description="Report source: citizen, volunteer, or field_team"
    )
    language: str = Field(
        default="en", 
        description="Detected natural language of the raw report"
    )
    english_translation: str = Field(
        default="", 
        description="Faithful English translation of the raw report"
    )
    consistency_note: str = Field(
        default="", 
        description="Analysis of consistency between photo visual evidence, text description, and provided location"
    )
    evidence_boxes: List[BoundingBox] = Field(
        default_factory=list, 
        description="Evidence bounding boxes highlighting visible danger zones or damaged elements"
    )
