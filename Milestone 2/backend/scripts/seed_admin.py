import os
import sys
from pathlib import Path
from dotenv import load_dotenv

CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

ENV_PATH = BACKEND_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

from database import SessionLocal
import models
from services.auth_service import hash_password



def seed_admin() -> None:
    """Create the initial administrator account from environment variables.

    Required environment variables:
        ADMIN_EMAIL    -- The administrator email address.
        ADMIN_PASSWORD -- The administrator password (min 8 characters).

    Optional environment variables (fall back to generic display names):
        ADMIN_FIRST_NAME -- Administrator first name  (default: "Platform")
        ADMIN_LAST_NAME  -- Administrator last name   (default: "Admin")

    Safety rules:
    - If the account already exists the script exits without modifying it.
    - The plaintext password is never printed to stdout.
    - A RuntimeError is raised and no database writes are attempted when
      required configuration is missing or invalid.
    """
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    admin_first_name = os.getenv("ADMIN_FIRST_NAME", "Platform")
    admin_last_name = os.getenv("ADMIN_LAST_NAME", "Admin")

    if not admin_email:
        raise RuntimeError(
            "[CONFIG ERROR] ADMIN_EMAIL is not set. "
            "Add ADMIN_EMAIL to backend/.env before running this script."
        )
    if not admin_password:
        raise RuntimeError(
            "[CONFIG ERROR] ADMIN_PASSWORD is not set. "
            "Add ADMIN_PASSWORD to backend/.env before running this script."
        )
    if len(admin_password) < 8:
        raise RuntimeError(
            "[CONFIG ERROR] ADMIN_PASSWORD is too short (minimum 8 characters required)."
        )

    email_normalized = admin_email.strip().lower()

    db = SessionLocal()
    try:
        existing = db.query(models.Admin).filter(
            models.Admin.email == email_normalized
        ).first()

        if existing:
            print(
                f"[INFO] An administrator account for '{email_normalized}' already "
                f"exists. No changes were made. "
                f"To reset the password, update it directly in the database."
            )
            return

        admin = models.Admin(
            first_name=admin_first_name.strip(),
            last_name=admin_last_name.strip(),
            email=email_normalized,
            password=hash_password(admin_password),
            confirm_password=None,
        )
        db.add(admin)
        db.commit()

        print(f"[SUCCESS] Administrator account created for: {email_normalized}")
        print("[INFO] Store the password securely. It will not be displayed again.")

    except RuntimeError:
        raise
    except Exception as exc:
        db.rollback()
        print(f"[ERROR] Failed to create administrator account: {exc}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()

