"""Auth endpoints — JWT login, replaces Keycloak."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import uuid

from app.database import get_db
from app.models.user import User
from app.core.security import verify_password, create_access_token, hash_password, get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str


class UserOut(BaseModel):
    id: uuid.UUID
    username: str
    role: str


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = create_access_token({"sub": user.username, "role": user.role})
    return Token(access_token=token, username=user.username, role=user.role)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut(id=current_user.id, username=current_user.username, role=current_user.role)


@router.post("/setup", include_in_schema=False)
async def setup_admin(db: AsyncSession = Depends(get_db)):
    """One-time setup: create admin user. Remove after first use."""
    existing = await db.execute(select(User).where(User.username == "admin"))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Admin already exists")
    user = User(
        username="admin",
        password_hash=hash_password("acpia2026"),
        role="admin",
    )
    db.add(user)
    await db.commit()
    return {"message": "Admin user created. Username: admin, Password: acpia2026"}
