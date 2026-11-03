from alembic import context
from glam_api.config import Settings
from sqlalchemy import create_engine, pool


def run() -> None:
    settings = Settings()
    engine = create_engine(settings.database_url, poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, transactional_ddl=True)
        with context.begin_transaction():
            context.run_migrations()


run()
