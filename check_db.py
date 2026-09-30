import os
from sqlalchemy import create_engine, text

engine = create_engine(os.environ["DATABASE_URL"])

with engine.connect() as connection:
    result = connection.execute(
        text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
    )

    for row in result:
        print(row[0])