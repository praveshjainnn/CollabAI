import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.core.config import settings
from app.core.deps import get_current_user
from app.models.models import User

router = APIRouter(prefix="/ai", tags=["AI Commands"])

DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile"
DEFAULT_GEMINI_MODEL = "gemini-2.0-flash"

def build_prompt(instruction: str, selectionText: str, documentText: str) -> str:
    return "\n".join([
        "You are an elite collaborative writing assistant and AI consultant.",
        "Your goal is to provide high-quality, professional, and contextually aware text enhancements.",
        "",
        "RULES:",
        "- Return ONLY the final text to be inserted/replaced.",
        "- DO NOT include markdown code blocks (```) or conversational filler.",
        "- Maintain the existing tone and formatting of the document.",
        "- If summarizing, be concise but provide value.",
        "- If refining, improve clarity, grammar, and impact.",
        "- If brainstorming, provide a clear, bulleted list of ideas.",
        "",
        f"INSTRUCTION: {instruction}",
        "",
        "SELECTED TEXT TO OPERATE ON:",
        selectionText or "(none)",
        "",
        "FULL DOCUMENT CONTEXT (for situational awareness):",
        documentText or "(none)",
        "",
        "RESPONSE:",
    ])

def build_autocomplete_prompt(document_text: str) -> str:
    return "\n".join([
        "You are an AI writing assistant providing \"ghost text\" autocomplete.",
        "Given the text below, suggest the next few words or the rest of the current phrase.",
        "",
        "RULES:",
        "- Return ONLY the completion text.",
        "- DO NOT repeat the input text.",
        "- DO NOT use markdown.",
        "- Keep it short (max 15 words).",
        "- Match the style exactly.",
        "",
        "TEXT BEFORE CURSOR:",
        document_text,
        "",
        "COMPLETION:",
    ])

async def call_llm(prompt: str, max_tokens: int = 1024, temperature: float = 0.5) -> str:
    # 1. Prefer Google Gemini if configured
    if settings.GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model_name = settings.GEMINI_MODEL or DEFAULT_GEMINI_MODEL
            model = genai.GenerativeModel(model_name)
            
            # Configure generation parameters
            generation_config = genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )
            
            response = await model.generate_content_async(
                prompt,
                generation_config=generation_config
            )
            return response.text.strip()
        except Exception as e:
            print(f"[GEMINI ERROR] {e}")
            # Fall back to Groq if configured, else raise exception
            if not settings.GROQ_API_KEY:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Gemini generation failed: {str(e)}"
                )

    # 2. Fall back to Groq if configured
    if settings.GROQ_API_KEY:
        try:
            model = settings.AI_MODEL or DEFAULT_GROQ_MODEL
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {settings.GROQ_API_KEY}"
            }
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code != 200:
                    raise Exception(f"Groq returned status {response.status_code}: {response.text}")
                    
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"[GROQ ERROR] {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Groq generation failed: {str(e)}"
            )
            
    # 3. Neither key is configured
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="AI assistant is not configured. Please add GEMINI_API_KEY or GROQ_API_KEY to your backend .env file."
    )

@router.post("/command")
async def ai_command(
    body: dict,
    current_user: User = Depends(get_current_user)
):
    instruction = body.get("instruction", "").strip()[:2000]
    selectionText = body.get("selectionText", "").strip()
    documentText = body.get("documentText", "").strip()[:20000]
    
    if not instruction:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="instruction is required"
        )
        
    prompt = build_prompt(instruction, selectionText, documentText)
    output = await call_llm(prompt, max_tokens=1024, temperature=0.5)
    
    model_used = settings.GEMINI_MODEL if settings.GEMINI_API_KEY else settings.AI_MODEL
    return {"output": output, "model": model_used}

@router.post("/autocomplete")
async def ai_autocomplete(
    body: dict,
    current_user: User = Depends(get_current_user)
):
    documentText = body.get("documentText", "").strip()[-2000:]
    if not documentText:
        return {"output": ""}
        
    prompt = build_autocomplete_prompt(documentText)
    output = await call_llm(prompt, max_tokens=64, temperature=0.1)
    return {"output": output}
