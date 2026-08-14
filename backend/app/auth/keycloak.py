"""
Keycloak JWT Authentication & Authorization
Validates RS256 JWTs issued by Keycloak and extracts user roles.

DEV MODE: If ENVIRONMENT=development AND Keycloak is unreachable,
falls back to a bypass user (admin) so all 3 devs can test APIs 
without needing Keycloak configured on day 1.
"""
import httpx
import structlog
from functools import lru_cache
from typing import Optional, Dict, Any
from jose import jwt, JWTError
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.security.utils import get_authorization_scheme_param
from fastapi import Request
from app.config import settings

logger = structlog.get_logger(__name__)

security = HTTPBearer(auto_error=False)   # auto_error=False → won't reject missing tokens in dev


# ── Dev bypass user (only active when Keycloak is unreachable in dev mode) ────
_DEV_USER_PAYLOAD = {
    "sub": "00000000-0000-0000-0000-000000000001",
    "preferred_username": "admin",
    "email": "admin@acpia.local",
    "name": "System Admin (DEV)",
    "realm_access": {
        "roles": ["acpia-admin", "acpia-supervisor", "acpia-investigator"]
    },
}


class CurrentUser:
    """Represents the authenticated user from JWT claims."""

    def __init__(self, payload: Dict[str, Any]):
        self.user_id: str = payload.get("sub", "00000000-0000-0000-0000-000000000001")
        self.username: str = payload.get("preferred_username", "admin")
        self.email: str = payload.get("email", "admin@acpia.local")
        self.full_name: str = payload.get("name", "Admin")
        self.roles: list = self._extract_roles(payload)

    @staticmethod
    def _extract_roles(payload: Dict[str, Any]) -> list:
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


@lru_cache(maxsize=1)
def _get_keycloak_public_key() -> Optional[str]:
    """Fetch and cache Keycloak realm public key. Returns None if unreachable."""
    url = f"{settings.KEYCLOAK_SERVER_URL}/realms/{settings.KEYCLOAK_REALM}"
    try:
        response = httpx.get(url, timeout=5)
        response.raise_for_status()
        realm_data = response.json()
        public_key_pem = (
            "-----BEGIN PUBLIC KEY-----\n"
            + realm_data["public_key"]
            + "\n-----END PUBLIC KEY-----"
        )
        logger.info("Keycloak public key loaded successfully.")
        return public_key_pem
    except Exception as e:
        if settings.ENVIRONMENT == "development":
            logger.warning(
                "Keycloak unreachable — using DEV bypass authentication",
                error=str(e)
            )
            return None
        logger.error("Failed to fetch Keycloak public key", error=str(e))
        raise RuntimeError(f"Cannot connect to Keycloak: {e}")


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a Keycloak JWT. Falls back to dev user if Keycloak is down."""
    public_key = _get_keycloak_public_key()

    if public_key is None and settings.ENVIRONMENT == "development":
        # Dev bypass — return admin payload without actually validating the token
        logger.debug("DEV: Bypassing JWT validation, using admin user")
        return _DEV_USER_PAYLOAD

    try:
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


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> CurrentUser:
    """
    FastAPI dependency: decode JWT and return current user.
    In DEV mode with no Keycloak: returns a hardcoded admin user so 
    Barath and Chinnaya can test all endpoints without a token.
    """
    # If no token provided in DEV mode → use bypass
    if credentials is None:
        if settings.ENVIRONMENT == "development":
            logger.debug("DEV: No token provided, using admin bypass user")
            return CurrentUser(_DEV_USER_PAYLOAD)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authentication token provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

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
