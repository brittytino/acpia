"""
Keycloak JWT Authentication & Authorization
Validates RS256 JWTs issued by Keycloak and extracts user roles.
"""
import httpx
import structlog
from functools import lru_cache
from typing import Optional, Dict, Any
from jose import jwt, JWTError
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

logger = structlog.get_logger(__name__)

security = HTTPBearer()


@lru_cache(maxsize=1)
def _get_keycloak_public_key() -> str:
    """Fetch and cache Keycloak realm public key for JWT verification."""
    url = f"{settings.KEYCLOAK_SERVER_URL}/realms/{settings.KEYCLOAK_REALM}"
    try:
        response = httpx.get(url, timeout=10)
        response.raise_for_status()
        realm_data = response.json()
        public_key_pem = (
            "-----BEGIN PUBLIC KEY-----\n"
            + realm_data["public_key"]
            + "\n-----END PUBLIC KEY-----"
        )
        return public_key_pem
    except Exception as e:
        logger.error("Failed to fetch Keycloak public key", error=str(e))
        raise RuntimeError(f"Cannot connect to Keycloak: {e}")


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a Keycloak JWT."""
    try:
        public_key = _get_keycloak_public_key()
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError as e:
        logger.warning("JWT validation failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


class CurrentUser:
    """Represents the authenticated user from JWT claims."""

    def __init__(self, payload: Dict[str, Any]):
        self.user_id: str = payload.get("sub", "")
        self.username: str = payload.get("preferred_username", "")
        self.email: str = payload.get("email", "")
        self.full_name: str = payload.get("name", "")
        self.roles: list = self._extract_roles(payload)

    @staticmethod
    def _extract_roles(payload: Dict[str, Any]) -> list:
        """Extract realm roles from Keycloak token."""
        realm_access = payload.get("realm_access", {})
        return realm_access.get("roles", [])

    def has_role(self, role: str) -> bool:
        return role in self.roles

    def is_admin(self) -> bool:
        return "acpia-admin" in self.roles

    def is_supervisor(self) -> bool:
        return "acpia-supervisor" in self.roles or self.is_admin()

    def is_investigator(self) -> bool:
        return (
            "acpia-investigator" in self.roles
            or self.is_supervisor()
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> CurrentUser:
    """FastAPI dependency: decode JWT and return current user."""
    payload = decode_token(credentials.credentials)
    user = CurrentUser(payload)

    if not user.is_investigator():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: ACPIA role required",
        )
    return user


async def require_supervisor(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Require supervisor or admin role."""
    if not current_user.is_supervisor():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Supervisor role required",
        )
    return current_user


async def require_admin(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Require admin role."""
    if not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return current_user
