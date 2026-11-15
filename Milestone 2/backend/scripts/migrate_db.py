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
    print(f"Connecting to database to apply safe schema updates...")
    with engine.begin() as conn:
        for table in ["Student", "Teacher", "Admin"]:
            print(f"\n--- Updating table: {table} ---")
            print(f"Altering {table}.Password to VARCHAR(255)...")
            conn.execute(text(f'ALTER TABLE "{table}" ALTER COLUMN "Password" TYPE VARCHAR(255);'))
            
            print(f"Dropping NOT NULL on {table}.Confirm_Password...")
            conn.execute(text(f'ALTER TABLE "{table}" ALTER COLUMN "Confirm_Password" DROP NOT NULL;'))
            
            check_pk = conn.execute(text(f"""
                SELECT conname FROM pg_constraint
                WHERE conrelid = '"{table}"'::regclass AND contype = 'p';
            """)).fetchall()
            
            if not check_pk:
                print(f"Adding PRIMARY KEY ({table}.Email)...")
                conn.execute(text(f'ALTER TABLE "{table}" ADD PRIMARY KEY ("Email");'))
            else:
                print(f"Primary key already exists on {table}: {check_pk}")

    print("\n[SUCCESS] All safe schema alterations completed successfully!")

    inspector = inspect(engine)
    for table in ["Student", "Teacher", "Admin"]:
        print(f"\nVerification for {table}:")
        cols = {c["name"]: c for c in inspector.get_columns(table, schema="public")}
        print(f"  Password type: {cols['Password']['type']}")
        print(f"  Confirm_Password nullable: {cols['Confirm_Password']['nullable']}")
        print(f"  PK: {inspector.get_pk_constraint(table, schema='public')}")

if __name__ == "__main__":
    run_migration()
