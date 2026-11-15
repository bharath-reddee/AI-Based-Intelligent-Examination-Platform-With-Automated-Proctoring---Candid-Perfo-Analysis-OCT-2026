"""
Redis Service Module for IntelliExam AI Platform.

Provides asynchronous connection pooling, robust caching, distributed rate limiting,
active exam session presence, proctoring telemetry counters, and submission locking.

Architectural Guarantees:
1. PostgreSQL remains the authoritative, persistent system of record.
2. Redis acts as a supplementary acceleration and coordination layer.
3. Fail-open for non-critical performance caches (smooth degradation to PostgreSQL on failure).
4. No sensitive credentials or user data are exposed in logs or monitoring.
5. All operations are safe for multi-worker FastAPI deployments.
"""

import os
import json
import time
import logging
from datetime import datetime, date
from typing import Any, Dict, List, Optional, Tuple, Union
from pathlib import Path
from dotenv import load_dotenv

import redis.asyncio as aioredis
from redis.exceptions import RedisError, ConnectionError, TimeoutError

logger = logging.getLogger("redis_service")

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BACKEND_DIR / ".env")

REDIS_URL: str = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0").strip()
REDIS_ENABLED: bool = os.getenv("REDIS_ENABLED", "true").lower() in ("true", "1", "yes")
REDIS_CONNECT_TIMEOUT: float = float(os.getenv("REDIS_CONNECT_TIMEOUT", "2.0"))
REDIS_SOCKET_TIMEOUT: float = float(os.getenv("REDIS_SOCKET_TIMEOUT", "2.0"))
REDIS_MAX_CONNECTIONS: int = int(os.getenv("REDIS_MAX_CONNECTIONS", "20"))

DEFAULT_DASHBOARD_TTL: int = int(os.getenv("CACHE_TTL_DASHBOARD", "30"))
DEFAULT_PRESENCE_TTL: int = int(os.getenv("CACHE_TTL_PRESENCE", "60"))
DEFAULT_LOCK_TTL: int = int(os.getenv("LOCK_TTL_SUBMISSION", "15"))

_pool: Optional[aioredis.ConnectionPool] = None
_client: Optional[aioredis.Redis] = None
_is_connected: bool = False
_connection_attempted: bool = False


class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if hasattr(obj, "model_dump"):
            return obj.model_dump()
        if hasattr(obj, "dict"):
            return obj.dict()
        return super().default(obj)


def serialize_data(val: Any) -> str:
    """Safely serialize python objects into JSON strings."""
    return json.dumps(val, cls=CustomJSONEncoder)


def deserialize_data(raw: Union[str, bytes]) -> Any:
    """Safely deserialize JSON strings into python objects."""
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8")
    return json.loads(raw)


async def init_redis_pool() -> bool:
    """Initialize the asynchronous Redis connection pool and test connectivity."""
    global _pool, _client, _is_connected, _connection_attempted
    _connection_attempted = True

    if not REDIS_ENABLED:
        logger.info("[REDIS INFO] Redis integration is disabled via REDIS_ENABLED=false.")
        _is_connected = False
        return False

    try:
        display_url = REDIS_URL
        if "@" in display_url:
            protocol, rest = display_url.split("://", 1)
            creds, host = rest.split("@", 1)
            display_url = f"{protocol}://***:***@{host}"

        logger.info(f"[REDIS INFO] Initializing Redis connection pool to {display_url} (max_connections={REDIS_MAX_CONNECTIONS})...")

        _pool = aioredis.ConnectionPool.from_url(
            REDIS_URL,
            max_connections=REDIS_MAX_CONNECTIONS,
            socket_connect_timeout=REDIS_CONNECT_TIMEOUT,
            socket_timeout=REDIS_SOCKET_TIMEOUT,
            decode_responses=True,
        )
        _client = aioredis.Redis(connection_pool=_pool)

        t0 = time.time()
        await _client.ping()
        latency_ms = round((time.time() - t0) * 1000, 2)

        _is_connected = True
        logger.info(f"[REDIS SUCCESS] Connected to Redis successfully (ping latency: {latency_ms}ms).")
        return True

    except Exception as exc:
        _is_connected = False
        logger.warning(
            f"[REDIS WARNING] Could not connect to Redis at {display_url}: {exc}. "
            "System will operate normally using PostgreSQL fallback."
        )
        return False


async def close_redis_pool() -> None:
    """Close the Redis client and release all connections in the pool."""
    global _pool, _client, _is_connected
    logger.info("[REDIS INFO] Closing Redis connections...")
    try:
        if _client:
            await _client.aclose()
        if _pool:
            await _pool.disconnect()
    except Exception as exc:
        logger.warning(f"[REDIS WARNING] Error during Redis pool shutdown: {exc}")
    finally:
        _client = None
        _pool = None
        _is_connected = False


def get_redis_client() -> Optional[aioredis.Redis]:
    """Get the active asynchronous Redis client, or None if unavailable."""
    if _is_connected and _client is not None:
        return _client
    return None


def is_redis_online() -> bool:
    """Returns True if Redis is initialized and ready for operations."""
    return bool(_is_connected and _client is not None)


async def check_redis_health() -> Dict[str, Any]:
    """Health check helper returning connectivity status and latency."""
    client = get_redis_client()
    if not client:
        return {
            "status": "disabled" if not REDIS_ENABLED else "offline",
            "connected": False,
            "latency_ms": None,
            "backend": "none",
        }

    try:
        t0 = time.time()
        await client.ping()
        latency_ms = round((time.time() - t0) * 1000, 2)
        return {
            "status": "healthy",
            "connected": True,
            "latency_ms": latency_ms,
            "backend": "redis",
        }
    except Exception as exc:
        logger.warning(f"[REDIS HEALTH CHECK FAILED] {exc}")
        return {
            "status": "degraded",
            "connected": False,
            "latency_ms": None,
            "backend": "none",
            "error": str(exc),
        }


def make_admin_dashboard_key() -> str:
    """Key for platform administrator dashboard overview."""
    return "cache:admin:dashboard:summary"


def make_teacher_dashboard_key(teacher_email: str) -> str:
    """Key for teacher-specific dashboard summary."""
    clean = teacher_email.strip().lower()
    return f"cache:teacher:{clean}:dashboard:summary"


def make_student_dashboard_key(student_email: str) -> str:
    """Key for student-specific dashboard summary."""
    clean = student_email.strip().lower()
    return f"cache:student:{clean}:dashboard:summary"


async def get_cached_json(key: str) -> Optional[Any]:
    """Retrieve and deserialize a JSON cached item. Returns None on miss or failure."""
    client = get_redis_client()
    if not client:
        return None

    try:
        raw = await client.get(key)
        if raw is not None:
            return deserialize_data(raw)
        return None
    except Exception as exc:
        logger.debug(f"[CACHE MISS/ERROR] Failed to read key '{key}': {exc}")
        return None


async def set_cached_json(key: str, data: Any, ttl_seconds: int = DEFAULT_DASHBOARD_TTL) -> bool:
    """Serialize and cache a JSON item with a specific TTL."""
    client = get_redis_client()
    if not client:
        return False

    try:
        payload = serialize_data(data)
        await client.set(key, payload, ex=ttl_seconds)
        return True
    except Exception as exc:
        logger.debug(f"[CACHE WRITE ERROR] Failed to set key '{key}': {exc}")
        return False


async def delete_cached_key(key: str) -> bool:
    """Delete a single cache key."""
    client = get_redis_client()
    if not client:
        return False

    try:
        await client.delete(key)
        return True
    except Exception as exc:
        logger.debug(f"[CACHE DELETE ERROR] Failed to delete key '{key}': {exc}")
        return False


async def delete_cached_pattern(pattern: str) -> int:
    """Safely delete all keys matching a pattern using non-blocking SCAN."""
    client = get_redis_client()
    if not client:
        return 0

    deleted_count = 0
    try:
        cursor = 0
        while True:
            cursor, keys = await client.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                await client.delete(*keys)
                deleted_count += len(keys)
            if cursor == 0:
                break
        return deleted_count
    except Exception as exc:
        logger.debug(f"[CACHE PURGE ERROR] Failed pattern purge '{pattern}': {exc}")
        return deleted_count


async def invalidate_admin_cache() -> None:
    """Invalidate platform admin dashboard statistics."""
    await delete_cached_key(make_admin_dashboard_key())


async def invalidate_teacher_cache(teacher_email: Optional[str] = None) -> None:
    """Invalidate specific or all teacher dashboard summaries."""
    if teacher_email:
        await delete_cached_key(make_teacher_dashboard_key(teacher_email))
    else:
        await delete_cached_pattern("cache:teacher:*:dashboard:*")


async def invalidate_student_cache(student_email: Optional[str] = None) -> None:
    """Invalidate specific or all student dashboard summaries."""
    if student_email:
        await delete_cached_key(make_student_dashboard_key(student_email))
    else:
        await delete_cached_pattern("cache:student:*:dashboard:*")


async def invalidate_exam_related_caches(teacher_email: Optional[str] = None) -> None:
    """Cascade invalidate admin, teacher, and student dashboards upon exam changes."""
    await invalidate_admin_cache()
    if teacher_email:
        await invalidate_teacher_cache(teacher_email)
    else:
        await invalidate_teacher_cache()
    await invalidate_student_cache()


def make_lockout_failed_key(email: str) -> str:
    return f"lockout:failed:{email.strip().lower()}"


def make_lockout_blocked_key(email: str) -> str:
    return f"lockout:blocked:{email.strip().lower()}"


async def redis_check_account_lockout(email: str) -> Tuple[bool, int]:
    """Check if an account is locked out using Redis.
    
    Returns (is_locked: bool, retry_after_seconds: int).
    """
    client = get_redis_client()
    if not client:
        return False, 0

    try:
        key = make_lockout_blocked_key(email)
        ttl = await client.ttl(key)
        if ttl > 0:
            return True, ttl
        return False, 0
    except Exception as exc:
        logger.debug(f"[REDIS LOCKOUT CHECK ERROR] {exc}")
        return False, 0


async def redis_record_login_failure(
    email: str,
    max_attempts: int = 5,
    lockout_seconds: int = 900,
    window_seconds: int = 900,
) -> Tuple[int, bool]:
    """Atomically record a failed login attempt in Redis.
    
    Returns (current_attempts: int, newly_locked: bool).
    """
    client = get_redis_client()
    if not client:
        return 0, False

    try:
        failed_key = make_lockout_failed_key(email)
        blocked_key = make_lockout_blocked_key(email)

        attempts = await client.incr(failed_key)
        if attempts == 1:
            await client.expire(failed_key, window_seconds)

        if attempts >= max_attempts:
            await client.set(blocked_key, "1", ex=lockout_seconds)
            await client.delete(failed_key)
            logger.warning(
                f"[SECURITY ALERT] Redis account lockout triggered for '{email}' "
                f"after {attempts} attempts. Locked for {lockout_seconds // 60}m."
            )
            return attempts, True

        return attempts, False
    except Exception as exc:
        logger.debug(f"[REDIS RECORD FAILURE ERROR] {exc}")
        return 0, False


async def redis_record_login_success(email: str) -> None:
    """Clear failed login attempts and active lockouts upon successful auth."""
    client = get_redis_client()
    if not client:
        return

    try:
        await client.delete(make_lockout_failed_key(email))
        await client.delete(make_lockout_blocked_key(email))
    except Exception as exc:
        logger.debug(f"[REDIS RECORD SUCCESS ERROR] {exc}")


def make_presence_key(exam_id: int, student_email: str) -> str:
    clean = student_email.strip().lower()
    return f"exam:{exam_id}:presence:{clean}"


def make_heartbeat_key(attempt_id: int) -> str:
    return f"exam:attempt:{attempt_id}:heartbeat"


async def set_student_presence(
    exam_id: int,
    student_email: str,
    metadata: Optional[Dict[str, Any]] = None,
    ttl_seconds: int = DEFAULT_PRESENCE_TTL,
) -> bool:
    """Track student's active presence in an examination."""
    client = get_redis_client()
    if not client:
        return False

    try:
        key = make_presence_key(exam_id, student_email)
        payload = serialize_data({
            "student_email": student_email.strip().lower(),
            "exam_id": exam_id,
            "last_seen": datetime.utcnow().isoformat(),
            "metadata": metadata or {},
        })
        await client.set(key, payload, ex=ttl_seconds)
        return True
    except Exception as exc:
        logger.debug(f"[PRESENCE ERROR] {exc}")
        return False


async def get_active_exam_students(exam_id: int) -> List[Dict[str, Any]]:
    """Fetch list of all currently active students in an exam via SCAN."""
    client = get_redis_client()
    if not client:
        return []

    active_students = []
    pattern = f"exam:{exam_id}:presence:*"
    try:
        cursor = 0
        while True:
            cursor, keys = await client.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                values = await client.mget(*keys)
                for v in values:
                    if v:
                        active_students.append(deserialize_data(v))
            if cursor == 0:
                break
        return active_students
    except Exception as exc:
        logger.debug(f"[ACTIVE STUDENTS FETCH ERROR] {exc}")
        return []


async def remove_student_presence(exam_id: int, student_email: str) -> bool:
    """Remove student presence upon exam submission or departure."""
    client = get_redis_client()
    if not client:
        return False

    try:
        key = make_presence_key(exam_id, student_email)
        await client.delete(key)
        return True
    except Exception as exc:
        logger.debug(f"[PRESENCE REMOVAL ERROR] {exc}")
        return False


async def record_attempt_heartbeat(
    attempt_id: int,
    student_email: str,
    client_status: Optional[Dict[str, Any]] = None,
    ttl_seconds: int = 90,
) -> bool:
    """Record high-frequency telemetry heartbeat without hammering PostgreSQL."""
    client = get_redis_client()
    if not client:
        return False

    try:
        key = make_heartbeat_key(attempt_id)
        payload = serialize_data({
            "attempt_id": attempt_id,
            "student_email": student_email.strip().lower(),
            "last_heartbeat": datetime.utcnow().isoformat(),
            "status": client_status or {},
        })
        await client.set(key, payload, ex=ttl_seconds)
        return True
    except Exception as exc:
        logger.debug(f"[HEARTBEAT ERROR] {exc}")
        return False


async def get_attempt_heartbeat(attempt_id: int) -> Optional[Dict[str, Any]]:
    """Retrieve last recorded heartbeat for an attempt."""
    client = get_redis_client()
    if not client:
        return None

    try:
        raw = await client.get(make_heartbeat_key(attempt_id))
        return deserialize_data(raw) if raw else None
    except Exception as exc:
        logger.debug(f"[HEARTBEAT FETCH ERROR] {exc}")
        return None


def make_violation_counter_key(exam_id: int, attempt_id: int) -> str:
    return f"exam:{exam_id}:attempt:{attempt_id}:violations"


async def increment_proctoring_counter(
    exam_id: int,
    attempt_id: int,
    violation_type: str,
    ttl_seconds: int = 86400,
) -> int:
    """Increment real-time violation counter for rapid telemetry without DB count queries.
    
    Note: The authoritative violation log is ALWAYS written directly to PostgreSQL.
    """
    client = get_redis_client()
    if not client:
        return 0

    try:
        key = make_violation_counter_key(exam_id, attempt_id)
        field = violation_type.strip().lower()
        new_val = await client.hincrby(key, field, 1)
        await client.expire(key, ttl_seconds)
        return new_val
    except Exception as exc:
        logger.debug(f"[VIOLATION COUNTER ERROR] {exc}")
        return 0


async def get_proctoring_counters(exam_id: int, attempt_id: int) -> Dict[str, int]:
    """Retrieve fast live violation counters from Redis."""
    client = get_redis_client()
    if not client:
        return {}

    try:
        key = make_violation_counter_key(exam_id, attempt_id)
        data = await client.hgetall(key)
        return {k: int(v) for k, v in data.items()}
    except Exception as exc:
        logger.debug(f"[VIOLATION COUNTER FETCH ERROR] {exc}")
        return {}


def make_submission_lock_key(attempt_id: int) -> str:
    return f"lock:submit:attempt:{attempt_id}"


async def acquire_submission_lock(attempt_id: int, ttl_seconds: int = DEFAULT_LOCK_TTL) -> bool:
    """Acquire an atomic distributed lock for exam attempt submission.
    
    Prevents race conditions from simultaneous double-clicks or repeated network retries.
    Returns True if the lock was acquired, False if a submission is already processing.
    """
    client = get_redis_client()
    if not client:
        return True

    try:
        key = make_submission_lock_key(attempt_id)
        acquired = await client.set(key, "locked", nx=True, ex=ttl_seconds)
        return bool(acquired)
    except Exception as exc:
        logger.debug(f"[SUBMISSION LOCK ERROR] {exc}")
        return True


async def release_submission_lock(attempt_id: int) -> bool:
    """Release the submission lock after processing finishes."""
    client = get_redis_client()
    if not client:
        return True

    try:
        key = make_submission_lock_key(attempt_id)
        await client.delete(key)
        return True
    except Exception as exc:
        logger.debug(f"[SUBMISSION UNLOCK ERROR] {exc}")
        return False


def make_answers_cache_key(attempt_id: int) -> str:
    return f"exam:attempt:{attempt_id}:answers"


async def cache_saved_answer(attempt_id: int, question_id: int, answer_text: str, ttl_seconds: int = 86400) -> bool:
    """Cache the student's current saved answer in Redis for low-latency pre-check."""
    client = get_redis_client()
    if not client:
        return False

    try:
        key = make_answers_cache_key(attempt_id)
        await client.hset(key, str(question_id), answer_text or "")
        await client.expire(key, ttl_seconds)
        return True
    except Exception as exc:
        logger.debug(f"[ANSWER CACHE ERROR] {exc}")
        return False


async def get_cached_saved_answers(attempt_id: int) -> Optional[Dict[str, str]]:
    """Retrieve all cached answers for an attempt from Redis."""
    client = get_redis_client()
    if not client:
        return None

    try:
        key = make_answers_cache_key(attempt_id)
        data = await client.hgetall(key)
        return data if data else None
    except Exception as exc:
        logger.debug(f"[ANSWER CACHE FETCH ERROR] {exc}")
        return None

