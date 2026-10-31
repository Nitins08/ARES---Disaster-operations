from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from backend.app.services.auth_service import (
    verify_admin_credentials,
    create_admin_token,
    get_current_admin
)

router = APIRouter(prefix="/auth", tags=["Admin Authentication"])

class LoginRequest(BaseModel):
    username: str = Field(..., description="Administrator username")
    password: str = Field(..., description="Administrator password")

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    username: str
    role: str

@router.post("/login", response_model=LoginResponse)
def admin_login(payload: LoginRequest):
    """
    Authenticates an administrator for Control Room access.
    Returns a cryptographically signed session token.
    """
    is_valid = verify_admin_credentials(payload.username, payload.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator credentials. Access denied.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = create_admin_token(payload.username)
    return LoginResponse(
        access_token=token,
        token_type="Bearer",
        username=payload.username,
        role="admin"
    )

@router.get("/me")
def verify_session(admin_payload: dict = Depends(get_current_admin)):
    """Verifies an active administrative session token."""
    return {
        "authenticated": True,
        "username": admin_payload.get("sub"),
        "role": admin_payload.get("role"),
        "expires_at": admin_payload.get("exp")
    }
