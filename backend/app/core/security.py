from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from app.config import settings

import bcrypt

def hash_password(p: str) -> str:
    pwd_bytes = p.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(p: str, h: str) -> bool:
    try:
        pwd_bytes = p.encode('utf-8')[:72]
        h_bytes = h.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, h_bytes)
    except Exception:
        return False

def issue_token(user_id: str, role: str) -> str:
    return jwt.encode(
        {"sub": str(user_id), "role": role,
         "exp": datetime.now(timezone.utc) + timedelta(hours=8)},
        settings.jwt_secret, algorithm="HS256")

def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = decode_token(credentials.credentials)
        class MockUser:
            id = payload.get("sub")
            role = payload.get("role")
        return MockUser()
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
