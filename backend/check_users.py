import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/kanan_db")

engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    result = conn.execute(text("SELECT id, email, role, is_active FROM users"))
    print("Listing existing users and their roles:")
    for row in result:
        print(f"ID: {row[0]}, Email: {row[1]}, Role: {row[2]} (Type: {type(row[2])}), Active: {row[3]}")
