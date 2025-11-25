from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
import os
from dotenv import load_dotenv

# Load .env from specific path
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(env_path)

# Debug print
print(f"🔐 Loading auth - SECRET_KEY: {os.getenv('JWT_SECRET_KEY')[:20]}..." if os.getenv(
    'JWT_SECRET_KEY') else "❌ JWT_SECRET_KEY not found!")


SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    # Ensure 'sub' is a string if it exists
    if 'sub' in to_encode and not isinstance(to_encode['sub'], str):
        to_encode['sub'] = str(to_encode['sub'])

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str):
    try:
        print(f"🔐 Verifying token: {token[:50]}...")
        print(
            f"🔐 Using SECRET_KEY: {SECRET_KEY[:20]}..." if SECRET_KEY else "❌ SECRET_KEY is None!")
        print(f"🔐 Using ALGORITHM: {ALGORITHM}")

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")

        print(f"✅ Token verified! User ID: {user_id}, Type: {type(user_id)}")

        if user_id is None:
            return None
        return int(user_id)  # Convert back to int for your application
    except JWTError as e:
        print(f"❌ Token verification failed: {e}")
        return None
