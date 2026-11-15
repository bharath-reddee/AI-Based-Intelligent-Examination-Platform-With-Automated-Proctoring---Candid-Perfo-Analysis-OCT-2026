import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv
import bcrypt
import jwt

CURRENT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = CURRENT_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

_raw_secret = os.getenv("SECRET_KEY")
if not _raw_secret:
    raise RuntimeError(
        "[CONFIG ERROR] SECRET_KEY is not set. "
        "Add SECRET_KEY to backend/.env before starting the application."
    )
if len(_raw_secret) < 32:
    raise RuntimeError(
        "[CONFIG ERROR] SECRET_KEY is too short (minimum 32 characters required). "
        "Generate a secure key and set it in backend/.env."
    )
SECRET_KEY: str = _raw_secret

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt with standard salt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against stored bcrypt hash or legacy plaintext safely."""
    if not hashed_password or not plain_password:
        return False
    try:
        clean_hash = hashed_password.strip()
        if clean_hash.startswith(("$2a$", "$2b$", "$2y$")):
            return bcrypt.checkpw(plain_password.encode("utf-8"), clean_hash.encode("utf-8"))
        return plain_password == clean_hash
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a signed JWT access token with user claims and expiration."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a signed JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
