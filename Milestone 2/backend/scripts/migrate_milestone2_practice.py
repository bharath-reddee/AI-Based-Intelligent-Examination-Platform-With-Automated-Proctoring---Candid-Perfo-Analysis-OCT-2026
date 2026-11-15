import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
ENV_PATH = BACKEND_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not set in .env")

engine = create_engine(DATABASE_URL)

def run_migration():
    print("Applying safe additions for AI Practice Tests & Student Artifacts...")
    with engine.begin() as conn:
        print("Ensuring columns exist in 'exams'...")
        conn.execute(text("ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_mock BOOLEAN DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE exams ADD COLUMN IF NOT EXISTS created_by_student VARCHAR(50);"))

        print("Ensuring columns exist in 'exam_attempts'...")
        conn.execute(text("ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS is_timed BOOLEAN DEFAULT TRUE;"))
        conn.execute(text("ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS flagged_questions JSON;"))

        print("Ensuring columns exist in 'student_answers'...")
        conn.execute(text("ALTER TABLE student_answers ADD COLUMN IF NOT EXISTS image_url TEXT;"))

        print("Ensuring columns exist in 'questions'...")
        conn.execute(text("ALTER TABLE questions ADD COLUMN IF NOT EXISTS validation_status VARCHAR(50) DEFAULT 'validated';"))

    print("[SUCCESS] Milestone 2 Practice Schema migration applied successfully!")

if __name__ == "__main__":
    run_migration()
