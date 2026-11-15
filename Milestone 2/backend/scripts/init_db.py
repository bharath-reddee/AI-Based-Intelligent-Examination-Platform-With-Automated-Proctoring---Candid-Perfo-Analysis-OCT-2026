"""Create all database tables on a fresh PostgreSQL database.

Run once from the backend folder, BEFORE the migrate_*.py scripts and seed_admin.py:
    python scripts/init_db.py
"""
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from database import Base, engine  # loads backend/.env
import models  # noqa: F401  (registers every table on Base)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    print("Tables ready:", ", ".join(sorted(Base.metadata.tables.keys())))


if __name__ == "__main__":
    init_db()
