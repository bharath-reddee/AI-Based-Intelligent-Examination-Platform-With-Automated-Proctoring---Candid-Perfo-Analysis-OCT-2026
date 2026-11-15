import os
import time
import logging
from typing import Dict, List, Optional
from threading import Lock
from pathlib import Path
from dotenv import load_dotenv
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded

logger = logging.getLogger("rate_limit_service")

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BACKEND_DIR / ".env")

RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() in ("true", "1", "yes")

RATE_LIMIT_LOGIN_IP: str = os.getenv("RATE_LIMIT_LOGIN_IP", "10/15minutes")
RATE_LIMIT_ADMIN_LOGIN_IP: str = os.getenv("RATE_LIMIT_ADMIN_LOGIN_IP", "5/15minutes")
RATE_LIMIT_REGISTER_IP: str = os.getenv("RATE_LIMIT_REGISTER_IP", "5/hour")
RATE_LIMIT_HEALTH_DB: str = os.getenv("RATE_LIMIT_HEALTH_DB", "10/minute")
RATE_LIMIT_AUTHENTICATED: str = os.getenv("RATE_LIMIT_AUTHENTICATED", "30/minute")
RATE_LIMIT_GENERAL_IP: str = os.getenv("RATE_LIMIT_GENERAL_IP", "100/minute")
RATE_LIMIT_AI_GEN: str = os.getenv("RATE_LIMIT_AI_GEN", "10/minute")

MAX_FAILED_LOGIN_ATTEMPTS: int = int(os.getenv("RATE_LIMIT_LOGIN_ACCOUNT", "5"))
LOGIN_LOCKOUT_MINUTES: int = int(os.getenv("RATE_LIMIT_LOGIN_LOCKOUT_MINUTES", "15"))
LOGIN_WINDOW_SECONDS: int = 15 * 60

TRUSTED_PROXIES_RAW: str = os.getenv("TRUSTED_PROXIES", "").strip()
TRUSTED_PROXIES: List[str] = [p.strip() for p in TRUSTED_PROXIES_RAW.split(",") if p.strip()]
REDIS_URL: Optional[str] = os.getenv("REDIS_URL", "").strip() or None


def get_client_ip(request: Request) -> str:
    """Safely extract the client IP address.

    Security Rule:
    - Never trust forwarded headers (X-Forwarded-For) unless the direct socket peer
      matches a configured, trusted proxy.
    - If TRUSTED_PROXIES is empty or peer IP is untrusted, strictly return direct client IP.
    """
    direct_peer = request.client.host if request.client else "127.0.0.1"

    if not TRUSTED_PROXIES:
        return direct_peer

    if direct_peer not in TRUSTED_PROXIES:
        return direct_peer

    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        ips = [ip.strip() for ip in forwarded_for.split(",") if ip.strip()]
        if ips:
            return ips[0]

    return direct_peer


class AccountLockoutManager:
    """Tracks failed login attempts per account to prevent brute-force attacks.

    Safety Features:
    - Sliding window (15 min) for failed attempts.
    - Temporary lockout only (default 15 min); avoids permanent DoS against users.
    - Successful login resets the counter for the account.
    - Identical response whether account exists or not (prevents account enumeration).
    - Thread-safe in-memory storage for single-instance; upgradeable to Redis.
    """

    def __init__(self, max_attempts: int = MAX_FAILED_LOGIN_ATTEMPTS, lockout_minutes: int = LOGIN_LOCKOUT_MINUTES):
        self.max_attempts = max_attempts
        self.lockout_seconds = lockout_minutes * 60
        self._lock = Lock()
        self._failures: Dict[str, List[float]] = {}
        self._lockouts: Dict[str, float] = {}

    def _normalize(self, email: str) -> str:
        return email.strip().lower()

    def check_lockout(self, email: str) -> None:
        """Check if an account is currently in an active lockout window.
        
        Raises HTTP 429 if the account is locked out.
        """
        if not RATE_LIMIT_ENABLED or not email:
            return

        norm_email = self._normalize(email)
        now = time.time()

        with self._lock:
            locked_until = self._lockouts.get(norm_email)
            if locked_until:
                if now < locked_until:
                    retry_after = int(locked_until - now) + 1
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Too many failed login attempts. Please try again later.",
                        headers={"Retry-After": str(retry_after)},
                    )
                else:
                    del self._lockouts[norm_email]
                    self._failures.pop(norm_email, None)

    def record_failure(self, email: str) -> bool:
        """Record a failed login attempt for an email.
        
        Returns True if the attempt triggered a new lockout, False otherwise.
        """
        if not RATE_LIMIT_ENABLED or not email:
            return False

        norm_email = self._normalize(email)
        now = time.time()
        window_start = now - LOGIN_WINDOW_SECONDS

        with self._lock:
            current_failures = [t for t in self._failures.get(norm_email, []) if t > window_start]
            current_failures.append(now)
            self._failures[norm_email] = current_failures

            if len(current_failures) >= self.max_attempts:
                locked_until = now + self.lockout_seconds
                self._lockouts[norm_email] = locked_until
                logger.warning(
                    f"[SECURITY EVENT] Account lockout triggered for '{norm_email}' "
                    f"after {len(current_failures)} failed attempts. Locked for {self.lockout_seconds // 60}m."
                )
                return True

        return False

    def record_success(self, email: str) -> None:
        """Clear failed attempts upon successful login."""
        if not email:
            return

        norm_email = self._normalize(email)
        with self._lock:
            self._failures.pop(norm_email, None)
            self._lockouts.pop(norm_email, None)

    async def check_lockout_async(self, email: str) -> None:
        """Asynchronously check account lockout using Redis with in-memory fallback."""
        if not RATE_LIMIT_ENABLED or not email:
            return

        try:
            from services.redis_service import redis_check_account_lockout
            is_locked, retry_after = await redis_check_account_lockout(email)
            if is_locked:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many failed login attempts. Please try again later.",
                    headers={"Retry-After": str(retry_after)},
                )
        except HTTPException:
            raise
        except Exception as exc:
            logger.debug(f"[LOCKOUT ASYNC CHECK FALLBACK] {exc}")

        self.check_lockout(email)

    async def record_failure_async(self, email: str) -> bool:
        """Asynchronously record login failure in Redis with in-memory fallback."""
        if not RATE_LIMIT_ENABLED or not email:
            return False

        try:
            from services.redis_service import redis_record_login_failure
            _, newly_locked = await redis_record_login_failure(
                email,
                max_attempts=self.max_attempts,
                lockout_seconds=self.lockout_seconds,
            )
            self.record_failure(email)
            return newly_locked
        except Exception as exc:
            logger.debug(f"[LOCKOUT ASYNC FAILURE RECORD FALLBACK] {exc}")
            return self.record_failure(email)

    async def record_success_async(self, email: str) -> None:
        """Asynchronously record login success in Redis and in-memory."""
        if not email:
            return

        try:
            from services.redis_service import redis_record_login_success
            await redis_record_login_success(email)
        except Exception as exc:
            logger.debug(f"[LOCKOUT ASYNC SUCCESS RECORD FALLBACK] {exc}")

        self.record_success(email)

    def reset(self) -> None:
        """Reset all counters and lockouts (for test cleanup)."""
        with self._lock:
            self._failures.clear()
            self._lockouts.clear()


account_lockout_manager = AccountLockoutManager()


def create_limiter() -> Limiter:
    """Initialize and configure the SlowAPI limiter instance with graceful in-memory fallback."""
    storage_uri = "memory://"
    if REDIS_URL:
        try:
            import redis as sync_redis
            test_client = sync_redis.from_url(REDIS_URL, socket_connect_timeout=1, socket_timeout=1)
            test_client.ping()
            storage_uri = REDIS_URL
            logger.info(f"[SECURITY INFO] Initializing rate limiter with verified Redis storage: {storage_uri}")
        except Exception as exc:
            logger.warning(
                f"[SECURITY ALERT] Redis storage configured at '{REDIS_URL}' is not reachable ({exc}). "
                f"Falling back smoothly to in-memory rate limiting. Multi-instance rate limiting degraded."
            )
            storage_uri = "memory://"
    else:
        logger.info(
            "[SECURITY INFO] Rate limiting using in-memory storage (single-instance development). "
            "For production multi-worker deployment, configure REDIS_URL."
        )

    return Limiter(
        key_func=get_client_ip,
        default_limits=[RATE_LIMIT_GENERAL_IP] if RATE_LIMIT_ENABLED else [],
        storage_uri=storage_uri,
        enabled=RATE_LIMIT_ENABLED,
    )


limiter = create_limiter()


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Safe, uniform HTTP 429 response handler.
    
    Guarantees:
    - Never leaks internal stack traces, system paths, or credential details.
    - Sets standard RFC-compliant Retry-After header.
    - Consistent response schema matching the platform's API standards.
    """
    retry_after = 60
    try:
        if hasattr(exc, "limit") and hasattr(exc.limit, "limit") and hasattr(exc.limit.limit, "get_expiry"):
            retry_after = int(exc.limit.limit.get_expiry())
    except Exception:
        pass

    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        headers={"Retry-After": str(retry_after)},
        content={
            "detail": "Rate limit exceeded. Too many requests.",
            "message": "Too many requests. Please wait before retrying.",
            "retry_after": retry_after,
        },
    )
