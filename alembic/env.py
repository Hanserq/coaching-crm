from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# ── Import ALL models so Alembic can detect them ──────────────────────────────
# Each import registers the model's table metadata with Base.metadata.
# Add new model modules here as you create them.
from app.db.database import Base  # noqa: F401 — registers DeclarativeBase
from app.models import user, crm   # noqa: F401 — registers all ORM tables

# ── Alembic Config + Settings ─────────────────────────────────────────────────
# Import settings AFTER models so the Base is fully populated.
from app.core.config import settings  # noqa: F401

config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Feed our SQLAlchemy metadata so --autogenerate can diff it
target_metadata = Base.metadata


# ── Read DATABASE_URL from already-loaded pydantic Settings ──────────────────
def _get_url() -> str:
    """
    Use settings.DATABASE_URL (loaded from .env by pydantic-settings) rather
    than reading the raw OS environment, so that the .env file is always used
    when alembic is run locally without exporting vars to the shell.
    """
    return settings.DATABASE_URL


# ── Offline migrations (no live DB connection) ────────────────────────────────

def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    This is useful for generating raw SQL scripts that can be reviewed before
    applying to production (e.g. ``alembic upgrade head --sql > migration.sql``).
    """
    context.configure(
        url=_get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,          # Detect column type changes
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online migrations (live DB connection) ────────────────────────────────────

def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode (the default for ``alembic upgrade``).

    Creates a real connection to the database and applies changes
    inside a transaction that rolls back automatically on failure.
    """
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = _get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # Use NullPool for migrations — no persistent connections
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


# ── Entry point ───────────────────────────────────────────────────────────────

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
