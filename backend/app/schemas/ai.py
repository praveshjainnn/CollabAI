from pydantic import BaseModel

class AIRequest(BaseModel):
    command: str  # 'summarize' | 'refine' | 'continue'
    text: str
