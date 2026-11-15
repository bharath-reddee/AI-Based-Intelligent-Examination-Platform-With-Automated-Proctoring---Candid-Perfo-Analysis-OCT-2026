import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

CURRENT_DIR = Path(__file__).resolve().parent
ENV_PATH = CURRENT_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is missing in backend .env")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency to yield a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_database_health():
    """Verify database connectivity, schema, and existing tables safely (read-only)."""
    with engine.connect() as conn:
        db_name = conn.execute(text("SELECT current_database();")).scalar()
        server_version = conn.execute(text("SHOW server_version;")).scalar()
        inspector = inspect(engine)
        tables = inspector.get_table_names(schema="public")
        
        required_tables = ["Student", "Teacher", "Admin"]
        table_status = {t: (t in tables) for t in required_tables}
        
        return {
            "status": "healthy",
            "database_name": db_name,
            "server_version": server_version,
            "schema": "public",
            "tables_found": tables,
            "required_tables_present": table_status,
        }
