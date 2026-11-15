# Milestone 2: AI-Based Intelligent Examination Platform with Automated Proctoring and Candidate Performance Analysis

This directory contains the complete implementation and integration for **Milestone 2**:
- **Backend**: Python FastAPI with SQLAlchemy ORM, Pydantic v2 schemas, bcrypt hashing, PyJWT authentication, and PostgreSQL 18 connection.
- **Frontend**: Modern React + Vite with Tailwind CSS, Axios client, React Router, and role-based portals for Students, Teachers, and Administrators.
- **Database**: Connected to existing PostgreSQL 18 database `User`, reusing existing tables `Student`, `Teacher`, and `Admin`.

---

## 1. Directory Structure

```
Milestone2/
├── README.md
├── backend/
│   ├── .env                       # Backend DB connection string & JWT secrets
│   ├── requirements.txt           # Python dependencies
│   ├── main.py                    # FastAPI entry point with CORS and error handlers
│   ├── database.py                # SQLAlchemy engine, session management, and health checks
│   ├── models.py                  # Explicit ORM mapping to PostgreSQL Student, Teacher, Admin
│   ├── schemas.py                 # Pydantic validation and response serialization
│   ├── dependencies.py            # JWT token verification and role guards
│   ├── routers/
│   │   ├── auth.py                # Student/Teacher/Admin registration & login
│   │   ├── students.py            # /students/me & student dashboard metrics
│   │   ├── teachers.py            # /teachers/me & faculty overview
│   │   ├── admins.py              # /admins/me, /admins/users audit, platform metrics
│   │   └── health.py              # /health & /health/database checks
│   ├── services/
│   │   └── auth_service.py        # Bcrypt password hashing & JWT token creation/decoding
│   └── scripts/
│       ├── migrate_db.py          # Safe column widening & PK constraints
│       ├── seed_admin.py          # Secure admin account provisioning
│       └── test_api_suite.py      # Automated 15-point verification test suite
└── frontend/
    ├── .env                       # VITE_API_BASE_URL=http://localhost:8000
    ├── package.json
    ├── vite.config.js             # Vite configuration with React & Tailwind CSS
    ├── index.html                 # SEO-optimized title & meta headers
    └── src/
        ├── main.jsx
        ├── App.jsx                # Main routing & protected route wrappers
        ├── index.css              # Modern glassmorphism & typography
        ├── api/
        │   └── axios.js           # Reusable Axios API client with token interceptor
        ├── context/
        │   └── AuthContext.jsx    # User session, login, and logout state management
        ├── components/
        │   ├── Navbar.jsx         # Responsive navigation & role indicators
        │   └── ProtectedRoute.jsx # Role-aware route guards
        └── pages/
            ├── Home.jsx           # Landing page with live PostgreSQL connection badge
            ├── Login.jsx          # Tabbed sign-in for Student, Teacher, and Admin
            ├── StudentRegister.jsx# Candidate registration form
            ├── TeacherRegister.jsx# Faculty registration form
            ├── AdminLogin.jsx     # Restricted administrator console
            ├── StudentDashboard.jsx# Candidate exam schedule & proctoring trust score
            ├── TeacherDashboard.jsx# Question bank & active assessments
            └── AdminDashboard.jsx # Real-time PostgreSQL user registry table
```

---

## 2. PostgreSQL Database Connection

- **Database Name**: `User`
- **PostgreSQL Server**: PostgreSQL 18 (listening on port 5432)
- **Schema**: `public`
- **Reused Tables**: `Student`, `Teacher`, `Admin`
- **Connection String**:
  ```env
  DATABASE_URL=postgresql+psycopg://postgres:Ashish%407419@localhost:5432/User
  ```
  *(Note: Special character `@` in password is safely percent-encoded as `%40`)*.

---

## 3. How to Run the Application

### A. Activate Python Virtual Environment
Open a terminal in the project root:
```powershell
& ".\Milestone1\venv\Scripts\Activate.ps1"
```

### B. Start the FastAPI Backend
```powershell
cd Milestone2\backend
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
- Interactive API Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Alternative Redoc Documentation: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- Database Health Check: [http://127.0.0.1:8000/health/database](http://127.0.0.1:8000/health/database)

### C. Start the React Frontend
Open a second terminal:
```powershell
cd Milestone2\frontend
npm run dev
```
- Open browser at: [http://127.0.0.1:5173](http://127.0.0.1:5173)

---

## 4. Administrator Account Setup (SEC-001/003)

> **Security notice:** Administrator credentials are no longer hardcoded.
> They must be supplied via environment variables before running the seed script.

### Step 1 — Add administrator credentials to `backend/.env`

Open `backend/.env` and add the following entries (replace placeholders with real values):

```env
# Administrator seed configuration
ADMIN_EMAIL=your-admin-email@yourdomain.com
ADMIN_PASSWORD=YourStrongPasswordHere
ADMIN_FIRST_NAME=Platform
ADMIN_LAST_NAME=Admin
```

`ADMIN_FIRST_NAME` and `ADMIN_LAST_NAME` are optional (they default to `Platform` and `Admin`).

`ADMIN_PASSWORD` must be at least 8 characters. Choose a strong, unique password and store it
in a password manager — the script will not display it after account creation.

### Step 2 — Run the seed script

```powershell
& ".\Milestone1\venv\Scripts\Activate.ps1"
cd Milestone2\backend
python scripts/seed_admin.py
```

Expected output on success:
```
[SUCCESS] Administrator account created for: your-admin-email@yourdomain.com
[INFO] Store the password securely. It will not be displayed again.
```

If the account already exists, the script exits without modifying it:
```
[INFO] An administrator account for '...' already exists. No changes were made.
```

### Student and Teacher accounts

| Role | How to create | Access route |
| :--- | :--- | :--- |
| **Student** | Self-registration via UI or `POST /auth/student/register` | `/student/register` |
| **Teacher** | Self-registration via UI or `POST /auth/teacher/register` | `/teacher/register` |

---

## 5. Automated Verification Test Suite

To run all 15 automated backend integration tests:
```powershell
& ".\Milestone1\venv\Scripts\python.exe" ".\Milestone2\backend\scripts\test_api_suite.py"
```
All tests verify:
1. `GET /health` is 200 OK
2. `GET /health/database` connects to database `User` on PostgreSQL 18
3. Student registration enforces password confirmation
4. Student registration creates user and returns JWT token
5. Duplicate student registration is blocked
6. Student login succeeds with valid password
7. Student login fails with invalid password
8. Teacher registration creates faculty profile
9. Teacher login succeeds
10. Admin login succeeds with the administrator credentials configured in `backend/.env`
11. Protected student endpoint `/students/me` accessible only to students
12. Role-based guard blocks teacher from accessing student-only routes (403 Forbidden)
13. Protected teacher endpoint `/teachers/me` accessible to teachers
14. Admin lists all platform users from PostgreSQL `Student` and `Teacher` tables
15. Unauthenticated requests are rejected with 401 Unauthorized

---

## 6. Rate Limiting and Abuse Prevention (Phase B)

The application enforces strict rate limiting and brute-force protection across authentication, registration, database health, and sensitive endpoints.

### Rate Limit Configuration (`backend/.env`)

All limits are configurable via environment variables in `backend/.env`. If omitted, the following secure defaults apply:

| Environment Variable | Default Value | Description |
| :--- | :--- | :--- |
| `RATE_LIMIT_ENABLED` | `true` | Master switch to enable or disable rate limiting |
| `RATE_LIMIT_LOGIN_IP` | `10/15minutes` | IP-level limit on candidate and teacher login endpoints |
| `RATE_LIMIT_ADMIN_LOGIN_IP` | `5/15minutes` | Stricter IP-level limit on administrator sign-in |
| `RATE_LIMIT_REGISTER_IP` | `5/hour` | IP-level limit on student and teacher registration |
| `RATE_LIMIT_HEALTH_DB` | `10/minute` | Rate limit on expensive database ping endpoint |
| `RATE_LIMIT_AUTHENTICATED` | `30/minute` | Per-IP limit on dashboard summaries and user registries |
| `RATE_LIMIT_GENERAL_IP` | `100/minute` | Global default limit applied to all other endpoints |
| `RATE_LIMIT_LOGIN_ACCOUNT` | `5` | Maximum failed password attempts per account before lockout |
| `RATE_LIMIT_LOGIN_LOCKOUT_MINUTES` | `15` | Duration of temporary account lockout in minutes |
| `TRUSTED_PROXIES` | `""` | Comma-separated list of trusted upstream proxy IPs (e.g., `10.0.0.1,192.168.1.1`) |
| `REDIS_URL` | `""` | Optional Redis URI (e.g., `redis://localhost:6379/0`) for multi-worker deployments |

### Security Design Features
- **No Account Enumeration:** Response codes (401 vs 429) and response messages are identical whether an email exists in the database or not.
- **Safe Temporary Lockout:** Lockouts are temporary sliding windows (15 minutes). Legitimate users are never permanently locked out.
- **Success Counter Reset:** A successful login clears the failed-attempt counter, preventing denial-of-service against real account owners.
- **RFC-Compliant 429 Response:** Exceeded limits return HTTP 429 with `Retry-After` header and generic error payloads without internal stack traces or secrets.
- **Strict Proxy Validation:** Forwarded headers (`X-Forwarded-For`) are strictly ignored unless the direct socket client matches `TRUSTED_PROXIES`.

### Running Abuse Prevention Tests

```powershell
& ".\Milestone1\venv\Scripts\python.exe" ".\Milestone2\backend\scripts\test_rate_limits.py"
```
