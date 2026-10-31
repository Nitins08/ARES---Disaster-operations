from fastapi import APIRouter, Depends
from backend.app.services.prioritization import prioritization_engine
from backend.app.services.auth_service import get_current_admin

router = APIRouter(
    prefix="/rules", 
    tags=["Rules"],
    dependencies=[Depends(get_current_admin)]
)

@router.get("")
def get_rules():
    """Returns the loaded rules.yaml specification, disaster types, and scoring weights."""
    return prioritization_engine.rules
