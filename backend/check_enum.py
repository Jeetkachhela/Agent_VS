import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/kanan_db")

engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    # Query enum labels directly
    q = text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'userrole'")
    res = conn.execute(q).fetchall()
    print("Postgres enum labels for 'userrole':", [r[0] for r in res])
