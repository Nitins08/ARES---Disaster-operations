import hmac
import hashlib
import base64
import json
import time
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
from backend.app.config import settings

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

def _b64url_decode(data: str) -> bytes:
    padding = "=" * (4 - (len(data) % 4)) if len(data) % 4 != 0 else ""
    return base64.urlsafe_b64decode((data + padding).encode("utf-8"))

def create_admin_token(username: str) -> str:
    """Generates a cryptographically signed HMAC-SHA256 session token."""
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    exp = now + (settings.TOKEN_EXPIRE_HOURS * 3600)
    
    payload = {
        "sub": username,
        "role": "admin",
        "iat": now,
        "exp": exp
    }

    header_b64 = _b64url_encode(json.dumps(header).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")

    signature = hmac.new(
        settings.ADMIN_JWT_SECRET.encode("utf-8"),
        signing_input,
        hashlib.sha256
    ).digest()
    signature_b64 = _b64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"

def verify_admin_token(token: str) -> Dict[str, Any]:
    """
    Validates token signature and expiration.
    Uses constant-time comparison to prevent timing side-channel attacks.
    """
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format",
            headers={"WWW-Authenticate": "Bearer"}
        )

    header_b64, payload_b64, signature_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")

    expected_sig = hmac.new(
        settings.ADMIN_JWT_SECRET.encode("utf-8"),
        signing_input,
        hashlib.sha256
    ).digest()
    expected_sig_b64 = _b64url_encode(expected_sig)

    if not hmac.compare_digest(signature_b64, expected_sig_b64):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Corrupted token payload",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if payload.get("exp", 0) < int(time.time()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin session expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return payload

def verify_admin_credentials(username: str, password: str) -> bool:
    """Constant-time comparison of username and password against configured backend admin credentials."""
    user_match = hmac.compare_digest(username.strip(), settings.ADMIN_USERNAME.strip())
    pass_match = hmac.compare_digest(password.strip(), settings.ADMIN_PASSWORD.strip())
    return user_match and pass_match

def get_current_admin(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """FastAPI dependency to protect administrative endpoints."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required for Control Room access",
            headers={"WWW-Authenticate": "Bearer"}
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme. Expected 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return verify_admin_token(token)
