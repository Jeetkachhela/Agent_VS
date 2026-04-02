from fastapi import APIRouter, Depends, HTTPException, status
import os
from dotenv import load_dotenv
from ...schemas import UserOut
from ...db.session import get_db
from ..deps import get_current_active_user
from pymongo.database import Database
import logging
import re

load_dotenv()

logger = logging.getLogger("kanan_ops")

router = APIRouter()

PROMPT_CONTEXT = """
You are a highly specialized AI assistant for the Kanan Agent Visit Survey System. 
Your role is to help agents and admins with:
1. Answering questions about Kanan partner accounts, agents, cities, regions, and teams using the DATA provided below.
2. Explaining the survey process.
3. Providing advice on client interactions for meeting surveys.
4. Troubleshooting basic app features.
5. Answering questions about the Kanan project goals: precision, real-time tracking, and role-based data integrity.

RULES:
- If DATA is provided, use it to give precise, factual answers. Cite account names and details.
- If a question is about accounts/partners/agents/cities/regions, ONLY use the DATA provided. Do NOT make up information.
- If no relevant data is found, say "I couldn't find matching records for that query."
- Be professional, concise, and helpful.
- Format responses clearly with bullet points or tables when listing multiple items.
"""


def search_kanan_accounts(db: Database, query: str, limit: int = 15):
    """Search the kanan_accounts collection for relevant data."""
    try:
        count = db.kanan_accounts.count_documents({})
        if count == 0:
            return []

        # Try text search first
        try:
            results = list(db.kanan_accounts.find(
                {"$text": {"$search": query}},
                {"score": {"$meta": "textScore"}, "_id": 0}
            ).sort([("score", {"$meta": "textScore"})]).limit(limit))
            if results:
                # Remove score field from results
                for r in results:
                    r.pop("score", None)
                return results
        except Exception:
            pass

        # Fallback: regex search across key fields
        search_fields = ["K-Apply Account Name", "City", "State", "Zone", "RM Name", "BDM", "Region", "Team", "Category Type"]
        regex = {"$regex": query, "$options": "i"}
        or_conditions = [{field: regex} for field in search_fields]
        
        results = list(db.kanan_accounts.find(
            {"$or": or_conditions},
            {"_id": 0}
        ).limit(limit))
        
        return results
    except Exception as e:
        logger.warning(f"Kanan account search failed: {e}")
        return []


def format_account_data(accounts):
    """Format account data into readable context for the AI."""
    if not accounts:
        return ""
    
    lines = [f"\n--- KANAN ACCOUNT DATA ({len(accounts)} matching records) ---"]
    for i, acc in enumerate(accounts, 1):
        parts = []
        if acc.get("K-Apply Account Name"):
            parts.append(f"Account: {acc['K-Apply Account Name']}")
        if acc.get("Category Type"):
            parts.append(f"Category: {acc['Category Type']}")
        if acc.get("City"):
            parts.append(f"City: {acc['City']}")
        if acc.get("State"):
            parts.append(f"State: {acc['State']}")
        if acc.get("Zone"):
            parts.append(f"Zone: {acc['Zone']}")
        if acc.get("Region"):
            parts.append(f"Region: {acc['Region']}")
        if acc.get("Team"):
            parts.append(f"Team: {acc['Team']}")
        if acc.get("RM Name"):
            parts.append(f"RM: {acc['RM Name']}")
        if acc.get("BDM"):
            parts.append(f"BDM: {acc['BDM']}")
        if acc.get("Rank"):
            parts.append(f"Rank: {acc['Rank']}")
        if acc.get("Active"):
            parts.append(f"Active: {acc['Active']}")
        if acc.get("Mobile"):
            parts.append(f"Mobile: {acc['Mobile']}")
        lines.append(f"{i}. {' | '.join(parts)}")
    lines.append("--- END DATA ---\n")
    return "\n".join(lines)


# --- Provider 1: Groq (free, no billing required) ---
def call_groq(message: str, system_prompt: str) -> str:
    from groq import Groq
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise Exception("GROQ_API_KEY not set")
    
    client = Groq(api_key=api_key)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message}
        ],
        temperature=0.7,
        max_tokens=1024
    )
    return response.choices[0].message.content

# --- Provider 2: Google Gemini (fallback) ---
def call_gemini(message: str, system_prompt: str) -> str:
    from google import genai
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise Exception("GEMINI_API_KEY not set")
    
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=f"{system_prompt}\n\nClient/Agent Message: {message}"
    )
    return response.text

# --- Provider 3: Local Rule-Based Assistant (Ultimate Fallback) ---
def call_local_assistant(message: str, system_prompt: str) -> str:
    msg = message.lower()
    
    # Simple knowledge base mapping keywords to helpful Kanan Platform answers
    kb = {
        r"survey|form|questions": "To start a survey, go to 'New Survey' in your sidebar. Fill in the pre-meeting details before the client visit, and complete the post-meeting section immediately after.",
        r"track|location|map|gps": "The platform tracks your location in real-time while you're on duty. You can see your own route on your dashboard, and admins see the global active agent map.",
        r"login|password|access": "If you are having trouble logging in, please contact your B2C Admin to reset your credentials or check your role assignments.",
        r"client|meeting|visit": "When meeting a client, ensure you have a stable network connection. If offline, the app cache will attempt to store your survey data until you're back online.",
        r"hello|hi|hey": "Hello! I am the Kanan Support AI. I can help you with questions about surveys, tracking, account data, or app navigation. What can I help you with today?",
        r"who are you|what is this": "I am the Kanan Assistant. My goal is to ensure field agents have all the information they need to conduct high-quality surveys and maintain data integrity."
    }
    
    for pattern, response in kb.items():
        if re.search(pattern, msg):
            return f"🤖 [Local Mode] {response}"
            
    return "🤖 [Local Mode] I'm currently in offline mode and couldn't find a specific answer for that. Please try asking about 'surveys', 'tracking', or 'app help', or check back later when cloud services are online."

# --- Try providers in order ---
async def get_ai_response(message: str, system_prompt: str) -> str:
    providers = [
        ("Groq", call_groq),
        ("Gemini", call_gemini),
        ("Local Assistant", call_local_assistant),
    ]
    
    for name, provider_fn in providers:
        try:
            logger.info(f"Trying AI provider: {name}")
            result = provider_fn(message, system_prompt)
            return result
        except Exception as e:
            logger.warning(f"AI provider {name} failed: {str(e)[:100]}")
            continue
    
    return "The AI assistant is temporarily unavailable. Please try again in a minute."

from pydantic import BaseModel
from typing import List, Optional

class ChatMessage(BaseModel):
    role: str  # "user" or "bot"
    text: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

@router.post("/chat")
async def chat_with_ai(
    request: ChatRequest,
    db: Database = Depends(get_db),
    current_user: UserOut = Depends(get_current_active_user)
):
    try:
        # Search for relevant account data based on the user's message
        account_data = search_kanan_accounts(db, request.message)
        data_context = format_account_data(account_data)
        
        # Build conversation context from history (last 5 messages)
        conversation_context = ""
        if request.history:
            recent_history = request.history[-5:]
            history_lines = []
            for msg in recent_history:
                role_label = "User" if msg.role == "user" else "Assistant"
                history_lines.append(f"{role_label}: {msg.text}")
            conversation_context = "\n\nCONVERSATION HISTORY:\n" + "\n".join(history_lines) + "\n"
        
        # Compose full system prompt with data + history
        full_prompt = PROMPT_CONTEXT + data_context + conversation_context
        
        response_text = await get_ai_response(request.message, full_prompt)
        return {"response": response_text}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {"response": "⚠️ Error processing your request. Please contact support."}
