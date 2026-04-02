from fastapi import APIRouter, Depends, HTTPException, status
import os
from dotenv import load_dotenv
from ...schemas import UserOut
from ..deps import get_current_active_user
import logging
import re

load_dotenv()

logger = logging.getLogger("kanan_ops")

router = APIRouter()

PROMPT_CONTEXT = """
You are a highly specialized AI assistant for the Kanan Agent Visit Survey System. 
Your role is to help agents in the field with:
1. Explaining the survey process.
2. Providing advice on client interactions for meeting surveys.
3. Troubleshooting basic app features.
4. Answering questions about the Kanan project goals: precision, real-time tracking, and role-based data integrity.

Be professional, concise, and helpful. If you don't know something specific about a client, admit it but offer general guidance.
"""

# --- Provider 1: Groq (free, no billing required) ---
def call_groq(message: str) -> str:
    from groq import Groq
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise Exception("GROQ_API_KEY not set")
    
    client = Groq(api_key=api_key)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": PROMPT_CONTEXT},
            {"role": "user", "content": message}
        ],
        temperature=0.7,
        max_tokens=1024
    )
    return response.choices[0].message.content

# --- Provider 2: Google Gemini (fallback) ---
def call_gemini(message: str) -> str:
    from google import genai
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise Exception("GEMINI_API_KEY not set")
    
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=f"{PROMPT_CONTEXT}\n\nClient/Agent Message: {message}"
    )
    return response.text

# --- Provider 3: Local Rule-Based Assistant (Ultimate Fallback) ---
def call_local_assistant(message: str) -> str:
    msg = message.lower()
    
    # Simple knowledge base mapping keywords to helpful Kanan Platform answers
    kb = {
        r"survey|form|questions": "To start a survey, go to 'New Survey' in your sidebar. Fill in the pre-meeting details before the client visit, and complete the post-meeting section immediately after.",
        r"track|location|map|gps": "The platform tracks your location in real-time while you're on duty. You can see your own route on your dashboard, and admins see the global active agent map.",
        r"login|password|access": "If you are having trouble logging in, please contact your B2C Admin to reset your credentials or check your role assignments.",
        r"client|meeting|visit": "When meeting a client, ensure you have a stable network connection. If offline, the app cache will attempt to store your survey data until you're back online.",
        r"hello|hi|hey": "Hello! I am the Kanan Support AI. I can help you with questions about surveys, tracking, or app navigation. What can I help you with today?",
        r"who are you|what is this": "I am the Kanan Assistant. My goal is to ensure field agents have all the information they need to conduct high-quality surveys and maintain data integrity."
    }
    
    for pattern, response in kb.items():
        if re.search(pattern, msg):
            return f"🤖 [Local Mode] {response}"
            
    return "🤖 [Local Mode] I'm currently in offline mode and couldn't find a specific answer for that. Please try asking about 'surveys', 'tracking', or 'app help', or check back later when cloud services are online."

# --- Try providers in order ---
async def get_ai_response(message: str) -> str:
    providers = [
        ("Groq", call_groq),
        ("Gemini", call_gemini),
        ("Local Assistant", call_local_assistant),
    ]
    
    for name, provider_fn in providers:
        try:
            logger.info(f"Trying AI provider: {name}")
            result = provider_fn(message)
            return result
        except Exception as e:
            logger.warning(f"AI provider {name} failed: {str(e)[:100]}")
            continue
    
    return "The AI assistant is temporarily unavailable. Please try again in a minute."

from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat_with_ai(
    request: ChatRequest,
    current_user: UserOut = Depends(get_current_active_user)
):
    try:
        response_text = await get_ai_response(request.message)
        return {"response": response_text}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {"response": "⚠️ Error processing your request. Please contact support."}
