# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 – Builder
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

# Keeps Python from generating .pyc files and enables unbuffered stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

# Install only build-time OS deps needed to compile psycopg2-binary & cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps into an isolated prefix so we can copy only them
COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 – Runtime
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # Point Python to the deps we installed in the builder stage
    PYTHONPATH="/app"

WORKDIR /app

# Runtime OS deps: libpq is the only native runtime requirement for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder — no gcc / build tools in the final image
COPY --from=builder /install /usr/local

# Copy application source
COPY . .

# Non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

# Expose the port Uvicorn will listen on
EXPOSE 8000

# Healthcheck: tests the liveness endpoint every 30 s
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Default entrypoint — override with `command:` in docker-compose for dev
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "2"]
