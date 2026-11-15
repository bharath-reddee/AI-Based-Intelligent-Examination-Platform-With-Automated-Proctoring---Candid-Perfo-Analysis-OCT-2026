from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from database import verify_database_health
from services.redis_service import init_redis_pool, close_redis_pool
from routers import auth, students, teachers, admins, health, exams, mocks


from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from services.rate_limit_service import limiter, rate_limit_exceeded_handler


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[FASTAPI STARTUP] Verifying PostgreSQL database connectivity...")
    try:
        report = verify_database_health()
        print(f"[FASTAPI STARTUP] Connected to database: '{report['database_name']}' on server {report['server_version']}")
        print(f"[FASTAPI STARTUP] Existing tables found: {report['tables_found']}")
    except Exception as exc:
        print(f"[FASTAPI STARTUP ERROR] Could not verify database: {exc}")

    try:
        await init_redis_pool()
    except Exception as exc:
        print(f"[FASTAPI STARTUP ERROR] Redis pool initialization failed: {exc}")

    yield

    try:
        await close_redis_pool()
    except Exception as exc:
        print(f"[FASTAPI SHUTDOWN ERROR] Redis cleanup error: {exc}")

    print("[FASTAPI SHUTDOWN] Shutting down application cleanly.")


app = FastAPI(
    title="AI-Based Intelligent Examination Platform with Automated Proctoring",
    description="Intelligent Examination Platform with Automated Proctoring and Candidate Performance Analysis. Developed for G. Pulla Reddy Engineering College by Bharath.",
    version="2.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_details = []
    for err in exc.errors():
        field = " -> ".join([str(loc) for loc in err.get("loc", [])])
        msg = err.get("msg")
        error_details.append(f"{field}: {msg}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": error_details,
            "message": "Input validation error occurred. Please verify required fields.",
        },
    )


app.include_router(health.router)
app.include_router(auth.router)
app.include_router(students.router)
app.include_router(teachers.router)
app.include_router(admins.router)
app.include_router(exams.router)
app.include_router(mocks.router)

import os
from fastapi.staticfiles import StaticFiles
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/", tags=["Root"])
def root_endpoint():
    return {
        "platform": "AI-Based Intelligent Examination Platform with Automated Proctoring",
        "institution": "G. Pulla Reddy Engineering College",
        "project_owner": "Bharath",
        "version": "2.0.0",
        "documentation": "/docs",
        "status": "operational",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
