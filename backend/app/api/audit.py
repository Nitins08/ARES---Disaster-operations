from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.models.database import get_db
from backend.app.models.entities import AuditLog
from backend.app.schemas.audit import AuditLogResponse
from backend.app.services.auth_service import get_current_admin

router = APIRouter(
    prefix="/audit-logs", 
    tags=["Audit Logs"],
    dependencies=[Depends(get_current_admin)]
)

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    incident_id: Optional[int] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    """Returns chronologically ordered audit logs of all responder/coordinator actions."""
    query = db.query(AuditLog)
    if incident_id:
        query = query.filter(AuditLog.incident_id == incident_id)
    return query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
