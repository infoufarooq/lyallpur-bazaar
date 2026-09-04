import io
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.assistant import (
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantSpeakRequest,
)
from app.services.assistant_service import process_assistant_chat

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assistant", tags=["Assistant"])


@router.post("/chat", response_model=AssistantChatResponse)
def assistant_chat(request: AssistantChatRequest, db: Session = Depends(get_db)):
    """Process a spoken or typed shopper query and return response with matching products."""
    try:
        return process_assistant_chat(request, db)
    except Exception as e:
        logger.error(f"Assistant chat processing failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Assistant processing failed: {str(e)}"
        )


@router.post("/speak")
async def assistant_speak(request: AssistantSpeakRequest):
    """Generate high-fidelity Pakistani Urdu/English neural speech audio via edge-tts."""
    try:
        import edge_tts
        lang = (request.language or "ur").lower()
        voice = "ur-PK-UzmaNeural" if lang.startswith("ur") else "en-US-JennyNeural"
        communicate = edge_tts.Communicate(request.text, voice)
        mp3_buffer = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                mp3_buffer.write(chunk["data"])
        mp3_buffer.seek(0)
        return Response(content=mp3_buffer.read(), media_type="audio/mpeg")
    except Exception as e:
        logger.warning(f"Neural speech synthesis unavailable: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Neural speech synthesis unavailable: {str(e)}"
        )
