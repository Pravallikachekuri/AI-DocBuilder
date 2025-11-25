from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# =========================
# DATABASE CONFIGURATION
# =========================

# Create a data folder if not exists
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(BASE_DIR, "../data")

if not os.path.exists(DB_DIR):
    os.makedirs(DB_DIR)

DB_PATH = os.path.join(DB_DIR, "ai_docs.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Print during startup to confirm DB path
print(f"✅ Database path: {DB_PATH}")

# =========================
# DATABASE ENGINE
# =========================

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Needed for SQLite
    echo=False,  # Change to True to see SQL queries in console
)

# =========================
# SESSION / BASE
# =========================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# =========================
# DEPENDENCY
# =========================


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
