import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/kanan_db")

engine = create_engine(DATABASE_URL)

try:
    with engine.begin() as conn:
        print("Attempting to normalize user roles to uppercase...")
        # First, query all users to see if we can just update via python if SQL cast is tricky
        users = conn.execute(text("SELECT id, role FROM users")).fetchall()
        for user_id, role in users:
            new_role = str(role).upper()
            if str(role) != new_role:
                print(f"Updating user {user_id}: {role} -> {new_role}")
                conn.execute(text("UPDATE users SET role = :new_role WHERE id = :id"), {"new_role": new_role, "id": user_id})
        
        print("Optimization complete: All roles are now uppercase.")
except Exception as e:
    print(f"Critical normalization error: {e}")
