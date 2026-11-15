import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect

CURRENT_DIR = Path(__file__).resolve().parent
ENV_PATH = CURRENT_DIR.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not set in .env")

engine = create_engine(DATABASE_URL)

def run_migration():
    print("Applying safe additions for Teacher Results & Proctoring...")
    with engine.begin() as conn:
        print("Ensuring teacher_feedback column exists in student_answers...")
        conn.execute(text("ALTER TABLE student_answers ADD COLUMN IF NOT EXISTS teacher_feedback TEXT;"))
        
        print("Ensuring evaluated_at column exists in student_answers...")
        conn.execute(text("ALTER TABLE student_answers ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMP;"))
        
        print("Ensuring proctoring_events table exists...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS proctoring_events (
                id SERIAL PRIMARY KEY,
                attempt_id INTEGER REFERENCES exam_attempts(id) ON DELETE CASCADE,
                exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
                student_email VARCHAR(50) REFERENCES "Student"("Email") ON DELETE CASCADE,
                event_type VARCHAR(100) NOT NULL,
                severity VARCHAR(20) DEFAULT 'medium',
                details TEXT,
                review_status VARCHAR(20) DEFAULT 'flagged',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
    print("[SUCCESS] Schema migration completed successfully!")

if __name__ == "__main__":
    run_migration()
