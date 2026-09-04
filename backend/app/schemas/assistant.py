from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.product import ProductOut

class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str

class AssistantChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    language: Optional[str] = Field("en", description="'en' or 'ur'")
    history: Optional[List[ChatMessage]] = Field(default_factory=list)

class AssistantChatResponse(BaseModel):
    reply: str
    products: List[ProductOut] = Field(default_factory=list)
    suggested_actions: List[str] = Field(default_factory=list)
    action: Optional[str] = None

class AssistantSpeakRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    language: Optional[str] = "ur"
