import os
import logging
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING
import certifi

load_dotenv()
logger = logging.getLogger("kanan_ops")

# We no longer fall back to localhost to prevent local DB accidents in deployment.
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set!")

# Optimized for serverless (Vercel/Render): small pool, short timeouts, SSL certs
client = MongoClient(
    DATABASE_URL,
    maxPoolSize=5,              # Serverless doesn't need many connections
    minPoolSize=1,              # Keep 1 warm connection if possible
    serverSelectionTimeoutMS=5000,   # Fail fast if Atlas is unreachable
    connectTimeoutMS=5000,
    socketTimeoutMS=10000,
    retryWrites=True,
    tlsCAFile=certifi.where()
)
db = client.get_default_database()

# Create indexes once (MongoDB is idempotent, so this is safe to call repeatedly)
try:
    db.users.create_index([("email", ASCENDING)], unique=True, background=True)
    db.agent_locations.create_index([("agent_id", ASCENDING), ("timestamp", ASCENDING)], background=True)
    db.survey_submissions.create_index([("agent_id", ASCENDING)], background=True)
except Exception as e:
    logger.warning(f"Index creation skipped (may already exist): {e}")

def get_db():
    yield db
