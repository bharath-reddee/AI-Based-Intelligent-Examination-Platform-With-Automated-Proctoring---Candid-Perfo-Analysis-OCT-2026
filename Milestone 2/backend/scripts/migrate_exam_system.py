import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect

CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
ENV_PATH = BACKEND_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not set in .env")

engine = create_engine(DATABASE_URL)

def run_migration():
    print("Applying safe schema updates for Exam Management, Assignments & Proctoring...")
    with engine.begin() as conn:
        print("Ensuring columns exist in 'exams'...")
        conn.execute(text("ALTER TABLE exams ADD COLUMN IF NOT EXISTS topic VARCHAR(200);"))
        conn.execute(text("ALTER TABLE exams ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'Medium';"))
        conn.execute(text("ALTER TABLE exams ADD COLUMN IF NOT EXISTS max_tab_switches INTEGER DEFAULT 3;"))
        conn.execute(text("ALTER TABLE exams ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';"))
        conn.execute(text("ALTER TABLE exams ADD COLUMN IF NOT EXISTS ai_proctoring_enabled BOOLEAN DEFAULT TRUE;"))
        conn.execute(text("ALTER TABLE exams ADD COLUMN IF NOT EXISTS negative_marking_enabled BOOLEAN DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE exams ADD COLUMN IF NOT EXISTS negative_marking_score FLOAT DEFAULT 0.25;"))
        conn.execute(text("ALTER TABLE exams ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE exams ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN DEFAULT FALSE;"))

        conn.execute(text("""
            UPDATE exams
            SET status = CASE
                WHEN is_published = TRUE THEN 'published'
                ELSE 'draft'
            END
            WHERE status IS NULL OR status = '';
        """))

        print("Ensuring columns exist in 'questions'...")
        conn.execute(text("ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'Medium';"))
        conn.execute(text("ALTER TABLE questions ADD COLUMN IF NOT EXISTS negative_marks FLOAT DEFAULT 0.0;"))
        conn.execute(text("ALTER TABLE questions ADD COLUMN IF NOT EXISTS min_words INTEGER;"))
        conn.execute(text("ALTER TABLE questions ADD COLUMN IF NOT EXISTS max_words INTEGER;"))

        print("Ensuring 'exam_assignments' table exists...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS exam_assignments (
                id SERIAL PRIMARY KEY,
                exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
                student_email VARCHAR(50) NOT NULL REFERENCES "Student"("Email") ON DELETE CASCADE,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_exam_assignment UNIQUE (exam_id, student_email)
            );
        """))

        print("Ensuring columns exist in 'exam_attempts'...")
        conn.execute(text("ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS tab_switch_count INTEGER DEFAULT 0;"))
        conn.execute(text("ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS face_warning_count INTEGER DEFAULT 0;"))
        conn.execute(text("ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS question_order JSON;"))
        conn.execute(text("ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS option_order JSON;"))

    print("\n[SUCCESS] Exam System Schema Migration applied successfully!")

    insp = inspect(engine)
    print("\nVerified columns for 'exams':", [c["name"] for c in insp.get_columns("exams")])
    print("Verified columns for 'questions':", [c["name"] for c in insp.get_columns("questions")])
    print("Verified columns for 'exam_assignments':", [c["name"] for c in insp.get_columns("exam_assignments")])
    print("Verified columns for 'exam_attempts':", [c["name"] for c in insp.get_columns("exam_attempts")])

if __name__ == "__main__":
    run_migration()
