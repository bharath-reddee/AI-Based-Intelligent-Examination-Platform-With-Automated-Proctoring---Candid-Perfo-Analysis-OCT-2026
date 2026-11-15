from fastapi import APIRouter, HTTPException, Request, status
from database import verify_database_health
from services.redis_service import check_redis_health
import schemas
from services.rate_limit_service import limiter, RATE_LIMIT_HEALTH_DB

router = APIRouter(tags=["System Health"])


@router.get("/health", response_model=schemas.HealthCheckResponse, summary="General application health check")
async def health_check():
    redis_info = await check_redis_health()
    return schemas.HealthCheckResponse(
        status="online",
        environment="production" if "prod" in router.tags else "development",
        database_connected=True,
        version="2.0.0",
        redis_connected=bool(redis_info.get("connected", False)),
    )


@router.get("/health/redis", summary="Inspect Redis connectivity, pool status, and ping latency")
@limiter.limit(RATE_LIMIT_HEALTH_DB)
async def redis_health_check(request: Request):
    return await check_redis_health()


@router.get("/health/database", summary="Read-only PostgreSQL database connectivity and table inspection")
@limiter.limit(RATE_LIMIT_HEALTH_DB)
def database_health_check(request: Request):
    try:
        report = verify_database_health()
        return report
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database health check failed: {str(exc)}",
        )
