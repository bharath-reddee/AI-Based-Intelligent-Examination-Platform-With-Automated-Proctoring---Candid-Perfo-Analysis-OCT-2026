import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

load_dotenv(dotenv_path=BACKEND_DIR / ".env")

from fastapi.testclient import TestClient
from main import app
from services.rate_limit_service import (
    limiter,
    account_lockout_manager,
    get_client_ip,
    RATE_LIMIT_LOGIN_IP,
    RATE_LIMIT_REGISTER_IP,
    RATE_LIMIT_HEALTH_DB,
    RATE_LIMIT_AUTHENTICATED,
    MAX_FAILED_LOGIN_ATTEMPTS,
)

client = TestClient(app)


def test_phase_b_rate_limiting():
    print("==================================================")
    print("STARTING PHASE B RATE LIMITING & ABUSE TEST SUITE")
    print("==================================================")

    limiter.reset()
    account_lockout_manager.reset()

    res = client.get("/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    print("[PASS] 1. Baseline: GET /health responds with 200 OK")

    hit_429 = False
    rate_limit_resp = None
    for i in range(15):
        res = client.get("/health/database")
        if res.status_code == 429:
            hit_429 = True
            rate_limit_resp = res
            print(f"[PASS] 2. GET /health/database correctly returned 429 on request #{i + 1}")
            break

    assert hit_429, "Failed to trigger HTTP 429 on /health/database after 15 requests"

    assert "Retry-After" in rate_limit_resp.headers, "HTTP 429 response missing Retry-After header"
    data = rate_limit_resp.json()
    assert "detail" in data, f"Response missing 'detail' field: {data}"
    assert "retry_after" in data, f"Response missing 'retry_after' field: {data}"
    res_text = rate_limit_resp.text.lower()
    assert "password" not in res_text
    assert "secret" not in res_text
    assert "traceback" not in res_text
    print(f"[PASS] 3. Rate-limit response format verified: Retry-After='{rate_limit_resp.headers['Retry-After']}', detail='{data['detail']}'")

    account_lockout_manager.reset()
    test_target_email = "victim.candidate@university.edu"

    for attempt in range(1, MAX_FAILED_LOGIN_ATTEMPTS + 1):
        res = client.post("/auth/student/login", json={
            "email": test_target_email,
            "password": f"WrongPassword_{attempt}",
        })
        assert res.status_code == 401, f"Attempt {attempt} expected 401, got {res.status_code}: {res.text}"

    print(f"[PASS] 4a. 5 consecutive bad-password attempts returned 401 Unauthorized")

    res_lockout = client.post("/auth/student/login", json={
        "email": test_target_email,
        "password": "AnyPasswordHere",
    })
    assert res_lockout.status_code == 429, f"Expected 429 Lockout, got {res_lockout.status_code}: {res_lockout.text}"
    assert "Retry-After" in res_lockout.headers, "Lockout response missing Retry-After header"
    lockout_data = res_lockout.json()
    assert "Too many failed login attempts" in lockout_data.get("detail", "")
    print(f"[PASS] 4b. 6th attempt successfully triggered Account Lockout (429) with Retry-After={res_lockout.headers.get('Retry-After')}s")

    limiter.reset()
    account_lockout_manager.reset()
    nonexistent_email = "nonexistent.random.user.999@domain.org"

    for attempt in range(1, MAX_FAILED_LOGIN_ATTEMPTS + 1):
        res = client.post("/auth/student/login", json={
            "email": nonexistent_email,
            "password": "WrongPassword!",
        })
        assert res.status_code == 401, f"Attempt {attempt} expected 401, got {res.status_code}: {res.text}"

    res_lockout_nonexistent = client.post("/auth/student/login", json={
        "email": nonexistent_email,
        "password": "AnyPasswordHere",
    })
    assert res_lockout_nonexistent.status_code == 429
    assert res_lockout_nonexistent.json()["detail"] == lockout_data["detail"], (
        "Lockout message differs between existing and nonexistent accounts! Leaking account existence!"
    )
    print("[PASS] 5. Nonexistent accounts produce identical 401 and 429 responses (Zero account enumeration)")

    limiter.reset()
    account_lockout_manager.reset()
    test_student_email = "ratelimit.reset.test@example.edu"
    test_student_pw = "ValidPassword123!"

    from database import SessionLocal
    import models
    from services.auth_service import hash_password
    db = SessionLocal()
    try:
        db.query(models.Student).filter(models.Student.email == test_student_email).delete()
        db.commit()
        student = models.Student(
            first_name="Reset",
            last_name="Tester",
            email=test_student_email,
            institute="Test Univ",
            roll_number="RL-999",
            class_year="1st Year",
            password=hash_password(test_student_pw),
            approval_status="approved",
            is_active=True,
        )
        db.add(student)
        db.commit()
    finally:
        db.close()

    for _ in range(2):
        res = client.post("/auth/student/login", json={
            "email": test_student_email,
            "password": "WrongPassword!",
        })
        assert res.status_code == 401

    res_success = client.post("/auth/student/login", json={
        "email": test_student_email,
        "password": test_student_pw,
    })
    assert res_success.status_code == 200, f"Expected 200 on valid login, got {res_success.status_code}"
    print("[PASS] 6a. Valid login succeeds (200)")

    for i in range(4):
        res = client.post("/auth/student/login", json={
            "email": test_student_email,
            "password": "WrongPassword!",
        })
        assert res.status_code == 401, f"Attempt {i+1} after reset was unexpectedly locked out"

    print("[PASS] 6b. Counter was verified cleared: 4 subsequent failures did not trigger lockout (prevents legitimate user lockout)")

    db = SessionLocal()
    try:
        db.query(models.Student).filter(models.Student.email == test_student_email).delete()
        db.commit()
    finally:
        db.close()

    fake_spoofed_ip = "203.0.113.199"
    class DummyRequest:
        client = type("Client", (), {"host": "127.0.0.1"})()
        headers = {"x-forwarded-for": fake_spoofed_ip}

    resolved_ip = get_client_ip(DummyRequest())
    assert resolved_ip == "127.0.0.1", f"Expected '127.0.0.1', but got spoofed IP '{resolved_ip}'"
    print("[PASS] 7. Client IP resolution: Forged X-Forwarded-For is ignored when proxy is untrusted")

    import services.rate_limit_service as rls
    original_trusted = rls.TRUSTED_PROXIES
    try:
        rls.TRUSTED_PROXIES = ["127.0.0.1", "10.0.0.1"]
        trusted_resolved = get_client_ip(DummyRequest())
        assert trusted_resolved == fake_spoofed_ip, f"Expected '{fake_spoofed_ip}', got '{trusted_resolved}'"
        print("[PASS] 8. Client IP resolution: X-Forwarded-For honored ONLY from verified trusted proxy")
    finally:
        rls.TRUSTED_PROXIES = original_trusted

    account_lockout_manager.reset()
    temp_email = "temp.lockout@test.com"
    for _ in range(5):
        account_lockout_manager.record_failure(temp_email)

    locked = False
    try:
        account_lockout_manager.check_lockout(temp_email)
    except Exception as e:
        locked = True
        assert "Too many failed login attempts" in str(e)
    assert locked, "Account was not locked"

    with account_lockout_manager._lock:
        account_lockout_manager._lockouts[temp_email] = time.time() - 1

    account_lockout_manager.check_lockout(temp_email)
    print("[PASS] 9. Lockouts expire after configured window (No permanent account lockouts)")

    print("\n==================================================")
    print("ALL 9 PHASE B ABUSE PREVENTION TESTS PASSED 100%!")
    print("==================================================")


if __name__ == "__main__":
    test_phase_b_rate_limiting()
