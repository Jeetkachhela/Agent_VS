import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "mongodb://localhost:27017/agent_survey")

client = MongoClient(DATABASE_URL)
db = client.get_database("kanan_db") if "?auth" in DATABASE_URL else client.get_default_database()
if db.name == 'test': # fallback if no db name in url
    db = client.get_database("agent_survey")

def get_db():
    yield db
