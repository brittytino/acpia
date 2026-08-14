import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.core.security import verify_password, issue_token
from app.core.ratelimit import rate_limit
from app.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User

log = logging.getLogger("acpia.auth")
router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login", dependencies=[Depends(rate_limit(10, 60))])
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == req.username))
    user = result.scalars().first()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = issue_token(str(user.id), user.role)
    return {"token": token, "access_token": token, "username": user.username, "role": user.role}
