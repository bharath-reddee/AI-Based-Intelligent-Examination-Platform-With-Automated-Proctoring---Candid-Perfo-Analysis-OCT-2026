"""
IntelliExam AI — Automated Redis Integration Verification Test Suite
===================================================================
Covers all requirements from prompt:
1. Connection pool initialization & health checks.
2. Dashboard caching (Hit, Miss, TTL expiration).
3. Targeted cache invalidation upon mutations.
4. Distributed rate limiting & account brute-force protection.
5. Real-time active exam presence & heartbeat tracking.
6. Atomic distributed submission locking (double-submit prevention).
7. Live proctoring telemetry violation counters.
8. Live answer caching.
9. Graceful degradation when Redis is offline or disconnected.
"""

import sys
import os
import asyncio
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import fakeredis.aioredis
from services import redis_service
from services.rate_limit_service import account_lockout_manager


class TestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.results = []

    def assert_true(self, condition: bool, test_name: str, detail: str = ""):
        if condition:
            self.passed += 1
            print(f"  [PASS] {test_name}")
            self.results.append((test_name, "PASS", detail))
        else:
            self.failed += 1
            print(f"  [FAIL] {test_name}: {detail}")
            self.results.append((test_name, "FAIL", detail))

    def assert_equal(self, actual, expected, test_name: str):
        if actual == expected:
            self.passed += 1
            print(f"  [PASS] {test_name}")
            self.results.append((test_name, "PASS", f"Value: {actual}"))
        else:
            self.failed += 1
            print(f"  [FAIL] {test_name}: Expected {expected}, got {actual}")
            self.results.append((test_name, "FAIL", f"Expected {expected}, got {actual}"))


async def run_tests():
    runner = TestRunner()
    print("=" * 70)
    print("INTELLIEXAM AI — REDIS INTEGRATION VERIFICATION SUITE")
    print("=" * 70)

    fake_client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    redis_service._client = fake_client
    redis_service._is_connected = True

    print("\n--- Test Suite 1: Connection Pooling & Healthcheck ---")
    health = await redis_service.check_redis_health()
    runner.assert_true(health["connected"], "Redis health check reports connected=True")
    runner.assert_true("latency_ms" in health, "Redis health check includes latency_ms measurement")
    runner.assert_true(health["latency_ms"] >= 0, "Latency measurement is non-negative")

    print("\n--- Test Suite 2: Dashboard Caching (Hit, Miss, TTL) ---")
    admin_key = redis_service.make_admin_dashboard_key()
    test_metrics = {"total_students": 42, "total_teachers": 8, "total_exams": 15}

    miss_result = await redis_service.get_cached_json(admin_key)
    runner.assert_true(miss_result is None, "Cache miss returns None for unpopulated key")

    await redis_service.set_cached_json(admin_key, test_metrics, ttl_seconds=2)
    hit_result = await redis_service.get_cached_json(admin_key)
    runner.assert_equal(hit_result, test_metrics, "Cache hit returns exact deserialized payload")

    print("  ...waiting 2.2s for TTL expiration...")
    await asyncio.sleep(2.2)
    expired_result = await redis_service.get_cached_json(admin_key)
    runner.assert_true(expired_result is None, "Cache entry expires automatically after TTL")

    print("\n--- Test Suite 3: Targeted Cache Invalidation ---")
    teacher1_key = redis_service.make_teacher_dashboard_key("teacher1@example.com")
    teacher2_key = redis_service.make_teacher_dashboard_key("teacher2@example.com")
    student1_key = redis_service.make_student_dashboard_key("student1@example.com")

    await redis_service.set_cached_json(admin_key, {"admin": True}, ttl_seconds=60)
    await redis_service.set_cached_json(teacher1_key, {"teacher": 1}, ttl_seconds=60)
    await redis_service.set_cached_json(teacher2_key, {"teacher": 2}, ttl_seconds=60)
    await redis_service.set_cached_json(student1_key, {"student": 1}, ttl_seconds=60)

    await redis_service.invalidate_teacher_cache("teacher1@example.com")
    runner.assert_true(await redis_service.get_cached_json(teacher1_key) is None, "Targeted teacher cache deleted")
    runner.assert_true(await redis_service.get_cached_json(teacher2_key) is not None, "Untargeted teacher cache preserved")

    await redis_service.invalidate_exam_related_caches(teacher_email="teacher2@example.com")
    runner.assert_true(await redis_service.get_cached_json(admin_key) is None, "Admin cache invalidated on exam mutation")
    runner.assert_true(await redis_service.get_cached_json(teacher2_key) is None, "Authoring teacher cache invalidated on exam mutation")
    runner.assert_true(await redis_service.get_cached_json(student1_key) is None, "Student cache invalidated on exam mutation")

    print("\n--- Test Suite 4: Distributed Account Lockout ---")
    test_email = "victim@example.com"
    account_lockout_manager.reset()

    locked, _ = await redis_service.redis_check_account_lockout(test_email)
    runner.assert_true(not locked, "Account initially unlocked")

    for i in range(1, 5):
        attempts, is_newly_locked = await redis_service.redis_record_login_failure(
            test_email, max_attempts=5, lockout_seconds=300, window_seconds=300
        )
        runner.assert_equal(attempts, i, f"Failure count incremented to {i}")
        runner.assert_true(not is_newly_locked, f"Attempt {i} does not trigger lockout prematurely")

    attempts, is_newly_locked = await redis_service.redis_record_login_failure(
        test_email, max_attempts=5, lockout_seconds=300, window_seconds=300
    )
    runner.assert_true(is_newly_locked, "5th failed attempt triggers account lockout")

    locked, retry_after = await redis_service.redis_check_account_lockout(test_email)
    runner.assert_true(locked, "Account is marked locked in Redis")
    runner.assert_true(retry_after > 0, f"Retry-After header reports remaining lockout seconds ({retry_after}s)")

    await redis_service.redis_record_login_success(test_email)
    locked_after_success, _ = await redis_service.redis_check_account_lockout(test_email)
    runner.assert_true(not locked_after_success, "Successful login clears active lockout")

    print("\n--- Test Suite 5: Active Examinee Presence & Heartbeat ---")
    exam_id = 999
    student_a = "alex@test.com"
    student_b = "beth@test.com"

    await redis_service.set_student_presence(
        exam_id=exam_id,
        student_email=student_a,
        metadata={"attempt_id": 101, "name": "Alex Student"},
        ttl_seconds=60,
    )
    await redis_service.set_student_presence(
        exam_id=exam_id,
        student_email=student_b,
        metadata={"attempt_id": 102, "name": "Beth Student"},
        ttl_seconds=60,
    )

    active_list = await redis_service.get_active_exam_students(exam_id)
    runner.assert_equal(len(active_list), 2, "Active examinees scan retrieves 2 students")
    emails_active = {item["student_email"] for item in active_list}
    runner.assert_true(student_a in emails_active and student_b in emails_active, "Presence list contains correct student identifiers")

    await redis_service.record_attempt_heartbeat(
        attempt_id=101,
        student_email=student_a,
        client_status={"tab_switches": 1, "battery": "95%"},
        ttl_seconds=60,
    )
    heartbeat_data = await redis_service.get_attempt_heartbeat(attempt_id=101)
    runner.assert_true(heartbeat_data is not None, "Heartbeat data successfully stored and retrieved")
    runner.assert_equal(heartbeat_data["status"]["tab_switches"], 1, "Heartbeat telemetry reflects correct tab switch count")

    await redis_service.remove_student_presence(exam_id, student_a)
    remaining_active = await redis_service.get_active_exam_students(exam_id)
    runner.assert_equal(len(remaining_active), 1, "Presence list accurately reflects departed examinee")

    print("\n--- Test Suite 6: Atomic Distributed Submission Locking ---")
    attempt_id = 777

    lock1 = await redis_service.acquire_submission_lock(attempt_id, ttl_seconds=10)
    runner.assert_true(lock1, "First submission request acquires atomic lock")

    lock2 = await redis_service.acquire_submission_lock(attempt_id, ttl_seconds=10)
    runner.assert_true(not lock2, "Simultaneous double-submit request blocked by distributed lock")

    released = await redis_service.release_submission_lock(attempt_id)
    runner.assert_true(released, "Submission lock released successfully")

    lock3 = await redis_service.acquire_submission_lock(attempt_id, ttl_seconds=10)
    runner.assert_true(lock3, "Lock can be re-acquired after completion and release")
    await redis_service.release_submission_lock(attempt_id)

    print("\n--- Test Suite 7: High-Speed Proctoring Telemetry Counters ---")
    v_exam = 501
    v_attempt = 801

    count1 = await redis_service.increment_proctoring_counter(v_exam, v_attempt, "tab_switch")
    runner.assert_equal(count1, 1, "First tab switch increments violation counter to 1")

    count2 = await redis_service.increment_proctoring_counter(v_exam, v_attempt, "tab_switch")
    runner.assert_equal(count2, 2, "Second tab switch increments violation counter to 2")

    count3 = await redis_service.increment_proctoring_counter(v_exam, v_attempt, "multiple_faces")
    runner.assert_equal(count3, 1, "Different violation type creates independent counter of 1")

    all_counters = await redis_service.get_proctoring_counters(v_exam, v_attempt)
    runner.assert_equal(all_counters.get("tab_switch"), 2, "Summary correctly retrieves tab_switch count")
    runner.assert_equal(all_counters.get("multiple_faces"), 1, "Summary correctly retrieves multiple_faces count")

    print("\n--- Test Suite 8: Fast Saved Answer Caching ---")
    await redis_service.cache_saved_answer(attempt_id=901, question_id=1, answer_text="Option B")
    await redis_service.cache_saved_answer(attempt_id=901, question_id=2, answer_text="Paris")

    cached_answers = await redis_service.get_cached_saved_answers(attempt_id=901)
    runner.assert_true(cached_answers is not None, "Answers retrieved from Redis cache")
    runner.assert_equal(cached_answers.get("1"), "Option B", "Answer for Q1 matches")
    runner.assert_equal(cached_answers.get("2"), "Paris", "Answer for Q2 matches")

    print("\n--- Test Suite 9: Graceful Degradation (Redis Offline Fallback) ---")
    redis_service._client = None
    redis_service._is_connected = False

    health_offline = await redis_service.check_redis_health()
    runner.assert_true(not health_offline["connected"], "Healthcheck gracefully reports connected=False when offline")

    miss_offline = await redis_service.get_cached_json("any_key")
    runner.assert_true(miss_offline is None, "Cache read safely returns None when Redis is unavailable")

    write_offline = await redis_service.set_cached_json("any_key", {"data": 1})
    runner.assert_true(not write_offline, "Cache write safely returns False without raising")

    lock_offline = await redis_service.acquire_submission_lock(attempt_id=999)
    runner.assert_true(lock_offline, "Submission lock fails-open (True) when Redis is down")

    presence_offline = await redis_service.get_active_exam_students(exam_id=1)
    runner.assert_equal(presence_offline, [], "Presence query safely returns empty list when Redis is down")

    counter_offline = await redis_service.increment_proctoring_counter(1, 1, "tab_switch")
    runner.assert_equal(counter_offline, 0, "Counter safely returns 0 when Redis is down")

    try:
        await redis_service.invalidate_exam_related_caches()
        runner.assert_true(True, "Cache invalidation executes safely without raising when Redis is down")
    except Exception as exc:
        runner.assert_true(False, "Cache invalidation raised exception when Redis down", str(exc))

    print("\n" + "=" * 70)
    print(f"VERIFICATION COMPLETE: {runner.passed} Passed, {runner.failed} Failed.")
    print("=" * 70)
    return runner.failed == 0


if __name__ == "__main__":
    success = asyncio.run(run_tests())
    sys.exit(0 if success else 1)
