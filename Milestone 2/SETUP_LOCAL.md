# Local setup (Windows / VS Code)

## 1. Database
1. Install PostgreSQL and create an empty database, e.g. `examdb`.
2. In `backend/.env` set `DATABASE_URL=postgresql+psycopg://postgres:<your_password>@localhost:5432/examdb`

## 2. Backend
```
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python scripts/init_db.py          # creates the tables
python scripts/migrate_db.py
python scripts/migrate_user_approvals.py
python scripts/migrate_exam_system.py
python scripts/migrate_milestone2_practice.py
python scripts/migrate_milestone2_results.py
python scripts/seed_admin.py       # creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD in .env
python main.py                     # http://localhost:8000
```

## 3. Frontend
```
cd frontend
npm install
npm run dev                        # http://localhost:5173
```
`frontend/.env` -> `VITE_API_BASE_URL=http://localhost:8000` (change it if the backend port changes).

## 4. Keys (backend/.env)
- Put your own `OPENAI_API_KEY` and/or `GOOGLE_API_KEY` for AI question generation (leave blank to disable AI).
- `SECRET_KEY` was regenerated. Change `ADMIN_PASSWORD` before running `seed_admin.py`.
- Redis is optional: if it is not running, the app falls back to PostgreSQL.
- Never share or commit `backend/.env`.
