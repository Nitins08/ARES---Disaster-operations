from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel

class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    actor_role: str
    actor_id: str
    action: str
    incident_id: int
    details: Any

    class Config:
        from_attributes = True
