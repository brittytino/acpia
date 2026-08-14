import uuid
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db


def hash_password(p: str) -> str:
    pwd_bytes = p.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(p: str, h: str) -> bool:
    try:
        pwd_bytes = p.encode("utf-8")[:72]
        h_bytes = h.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, h_bytes)
    except Exception:
        return False


def issue_token(user_id: str, role: str) -> str:
    return jwt.encode(
        {
            "sub": str(user_id),
            "role": role,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
        },
        settings.jwt_secret,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.JWT_ALGORITHM])


security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """Real DB-backed auth dependency. Decodes the JWT, then loads the User row
    so every handler gets an actual ORM object — not a stand-in."""
    from app.models.user import User

    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return user


def require_role(*roles: str):
    """Dependency factory: raises 403 unless current_user.role is one of `roles`."""

    async def _check(current_user=Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=403,
                detail=f"This action requires one of: {', '.join(roles)}. Your role is '{current_user.role}'.",
            )
        return current_user

    return _check
