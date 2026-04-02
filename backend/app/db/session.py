import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

# We no longer fall back to localhost to prevent local DB accidents in deployment.
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set!")

client = MongoClient(DATABASE_URL)
db = client.get_default_database()

def get_db():
    yield db
