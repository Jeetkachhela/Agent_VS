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

try:
    client = MongoClient(
        DATABASE_URL,
        maxPoolSize=5,
        minPoolSize=1,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
        socketTimeoutMS=10000,
        retryWrites=True,
        tlsCAFile=certifi.where()
    )
    # Ping the database to verify connection
    client.admin.command('ping')
    logger.info("Successfully connected to MongoDB Atlas.")
    db = client.get_default_database()
    logger.info(f"Using database: {db.name}")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB Atlas: {e}")
    raise

# Create indexes once (MongoDB is idempotent, so this is safe to call repeatedly)
try:
    db.users.create_index([("email", ASCENDING)], unique=True, background=True)
    db.agent_locations.create_index([("agent_id", ASCENDING), ("timestamp", ASCENDING)], background=True)
    db.survey_submissions.create_index([("agent_id", ASCENDING)], background=True)
except Exception as e:
    logger.warning(f"Index creation skipped (may already exist): {e}")

def get_db():
    yield db
