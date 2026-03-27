from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from app.core.config import settings
from app.db.base import Base

config = context.config

# 1. Configuración de Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from app.models import *

# 2. Configuración de Metadatos
target_metadata = Base.metadata

# 3. MANEJO DE LA URL (Crucial para Windows y SQLAlchemy 2.0)
# Usamos la URL que viene de tus settings (que ya debería tener los nuevos nombres)
# y escapamos el símbolo % por si la contraseña contiene caracteres especiales.
database_url = settings.DATABASE_URL
if database_url:
    # Alembic usa ConfigParser internamente, el cual requiere que los % sean %%
    database_url = database_url.replace("%", "%%")

config.set_main_option("sqlalchemy.url", database_url)
#config.set_main_option("sqlalchemy.url", "postgresql+psycopg://electromanfer:mi_password_seguro_2026@localhost:5432/electromanfer_db")

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    # Usamos la configuración cargada en config.set_main_option arriba
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()