from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import attendance, auth, dashboard, fees, students
from app.core.config import settings

# ── App factory ───────────────────────────────────────────────────────────────

app = FastAPI(
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

app.include_router(auth.router,       prefix=_V1)
app.include_router(students.router,   prefix=_V1)
app.include_router(attendance.router, prefix=_V1)
app.include_router(fees.router,       prefix=_V1)
app.include_router(dashboard.router,  prefix=_V1)


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
