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
    print("Connecting to database to apply safe, non-destructive schema updates...")
    with engine.begin() as conn:
        print("\n--- Updating table: Teacher ---")
        print("Adding column Institute to Teacher if not exists...")
        conn.execute(text('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "Institute" VARCHAR(100) DEFAULT \'Not Specified\';'))
        
        print("Adding column approval_status to Teacher if not exists...")
        conn.execute(text('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "approval_status" VARCHAR(20) DEFAULT \'approved\';'))

        print("Adding column is_active to Teacher if not exists...")
        conn.execute(text('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT TRUE;'))

        print("Adding column rejection_reason to Teacher if not exists...")
        conn.execute(text('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;'))

        print("Adding column created_at to Teacher if not exists...")
        conn.execute(text('ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;'))

        conn.execute(text('UPDATE "Teacher" SET "approval_status" = \'approved\' WHERE "approval_status" IS NULL;'))
        conn.execute(text('UPDATE "Teacher" SET "is_active" = TRUE WHERE "is_active" IS NULL;'))
        conn.execute(text('UPDATE "Teacher" SET "Institute" = \'Engineering Faculty\' WHERE "Institute" IS NULL OR "Institute" = \'Not Specified\';'))

        print("\n--- Updating table: Student ---")
        print("Adding column approval_status to Student if not exists...")
        conn.execute(text('ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "approval_status" VARCHAR(20) DEFAULT \'approved\';'))

        print("Adding column is_active to Student if not exists...")
        conn.execute(text('ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT TRUE;'))

        print("Adding column rejection_reason to Student if not exists...")
        conn.execute(text('ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;'))

        print("Adding column created_at to Student if not exists...")
        conn.execute(text('ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;'))

        conn.execute(text('UPDATE "Student" SET "approval_status" = \'approved\' WHERE "approval_status" IS NULL;'))
        conn.execute(text('UPDATE "Student" SET "is_active" = TRUE WHERE "is_active" IS NULL;'))

        print("\n--- Updating table: Admin ---")
        conn.execute(text('ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT TRUE;'))
        conn.execute(text('ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;'))
        conn.execute(text('UPDATE "Admin" SET "is_active" = TRUE WHERE "is_active" IS NULL;'))

    print("\n[SUCCESS] Non-destructive schema updates completed successfully!")

    inspector = inspect(engine)
    for table in ["Student", "Teacher", "Admin"]:
        print(f"\nVerification for {table}:")
        cols = {c["name"]: c for c in inspector.get_columns(table, schema="public")}
        for col_name in ["Institute", "Department", "approval_status", "is_active", "rejection_reason", "created_at"]:
            if col_name in cols:
                print(f"  {col_name}: {cols[col_name]['type']}, nullable={cols[col_name]['nullable']}, default={cols[col_name].get('default')}")

if __name__ == "__main__":
    run_migration()
