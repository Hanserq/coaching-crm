from __future__ import annotations

import subprocess
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import attendance, auth, dashboard, fees, students
from app.api.routers import settings as settings_router
from app.api.routers import leads as leads_router
from app.api.routers import courses as courses_router
from app.api.routers.exams import exam_router, notice_router
from app.core.config import settings

logger = logging.getLogger(__name__)


# ── Auto-migrate on startup ───────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run Alembic migrations when the API process starts."""
    try:
        logger.info("Running database migrations...")
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode == 0:
            logger.info("Migrations complete:\n%s", result.stdout)
        else:
            logger.error("Migration failed:\n%s", result.stderr)
    except Exception as exc:
        logger.error("Could not run migrations: %s", exc)
    yield  # App is running
    # (cleanup on shutdown — nothing needed here)


# ── App factory ───────────────────────────────────────────────────────────────

app = FastAPI(
    lifespan=lifespan,
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    description=(
        "Multi-tenant Coaching Center CRM API. "
        "Every request is scoped to a single Organisation via JWT claims."
    ),
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routers (all versioned under /api/v1) ─────────────────────────────────
_V1 = "/api/v1"

app.include_router(auth.router,              prefix=_V1)
app.include_router(students.router,          prefix=_V1)
app.include_router(attendance.router,        prefix=_V1)
app.include_router(fees.router,              prefix=_V1)
app.include_router(dashboard.router,         prefix=_V1)
app.include_router(settings_router.router,   prefix=_V1)
app.include_router(leads_router.router,      prefix=_V1)
app.include_router(courses_router.router,    prefix=_V1)
app.include_router(exam_router,              prefix=_V1)
app.include_router(notice_router,            prefix=_V1)



# ── Root / health endpoints ───────────────────────────────────────────────────

@app.get("/", tags=["Root"], summary="API welcome message.")
def root() -> dict[str, str]:
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"], summary="Liveness probe.")
def health_check() -> dict[str, str]:
    return {"status": "ok", "version": settings.APP_VERSION}
