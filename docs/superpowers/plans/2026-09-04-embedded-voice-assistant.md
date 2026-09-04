# Embedded AI Voice Shopping Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and embed an interactive two-way AI voice shopping assistant into the Lyallpur Bazaar website that supports spoken queries in Urdu, Roman Urdu, and English, queries the Supabase product catalog and Faisalabad delivery sectors, speaks answers back via natural TTS, and provides direct "+ Add to Cart" buttons.

**Architecture:** Hybrid low-latency pipeline: Client-side browser Web Speech API for real-time speech-to-text with bilingual toggling (`ur-PK` / `en-US`), FastAPI backend `/api/assistant/chat` powered by Gemini Flash with intelligent zero-key SQL fallback for catalog and delivery matching, server-side `edge-tts` streaming fallback on `/api/assistant/speak`, and an interactive floating widget in React with animated waveform, markdown responses, and cart integration.

**Tech Stack:** React 18, Vite, Tailwind CSS, Lucide React, Web Speech API (SpeechRecognition & SpeechSynthesis), FastAPI, SQLAlchemy, Supabase PostgreSQL, Gemini API (`google-genai` / HTTP), Edge-TTS.

**Spec:** [docs/superpowers/specs/2026-09-04-embedded-voice-assistant-design.md](file:///c:/Users/User/Documents/Projects/Daraz-alike/docs/superpowers/specs/2026-09-04-embedded-voice-assistant-design.md)

## Global Constraints

- Python 3.12+ compatibility with clean typing and Pydantic v2 schemas.
- All existing 53 test suites in `backend/tests` must continue to pass with zero regressions.
- Zero-API-Key resilience: The assistant must function with intelligent local SQL catalog matching even if `GEMINI_API_KEY` is not present.
- Support both Urdu (`ur-PK`) and English (`en-US` / `en-PK`) speech recognition and synthesis.
- Frontend must build cleanly with Vite (`npm run build`) without ESLint or syntax errors.
- Never commit credentials or secrets; respect `.gitignore`.

---

### Task 1: Assistant Schemas & Core AI Service

**Files:**
- Create: `backend/app/schemas/assistant.py`
- Create: `backend/app/services/assistant_service.py`
- Create: `backend/tests/test_assistant_service.py`

**Interfaces:**
- Consumes: `Product` ([backend/app/models/product.py](file:///c:/Users/User/Documents/Projects/Daraz-alike/backend/app/models/product.py)), `DeliveryZone` ([backend/app/models/order.py](file:///c:/Users/User/Documents/Projects/Daraz-alike/backend/app/models/order.py)), `ProductOut` ([backend/app/schemas/product.py](file:///c:/Users/User/Documents/Projects/Daraz-alike/backend/app/schemas/product.py))
- Produces: `AssistantChatRequest`, `AssistantChatResponse`, `AssistantSpeakRequest`, `process_assistant_chat(request, db)`

- [ ] **Step 1: Write the failing tests in `backend/tests/test_assistant_service.py`**

```python
import pytest
from app.schemas.assistant import AssistantChatRequest, AssistantChatResponse
from app.services.assistant_service import process_assistant_chat

def test_smart_fallback_product_search(db_session):
    req = AssistantChatRequest(message="Show me Daal Chana", language="en")
    res = process_assistant_chat(req, db_session)
    assert isinstance(res, AssistantChatResponse)
    assert len(res.reply) > 0
    assert any("chana" in p.name.lower() or "daal" in p.name.lower() for p in res.products)

def test_smart_fallback_delivery_inquiry(db_session):
    req = AssistantChatRequest(message="Do you deliver to D Ground and what is the fee?", language="en")
    res = process_assistant_chat(req, db_session)
    assert isinstance(res, AssistantChatResponse)
    assert "100" in res.reply or "D Ground" in res.reply

def test_smart_fallback_urdu_query(db_session):
    req = AssistantChatRequest(message="دال چنا کی قیمت کیا ہے؟", language="ur")
    res = process_assistant_chat(req, db_session)
    assert isinstance(res, AssistantChatResponse)
    assert len(res.reply) > 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_assistant_service.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.schemas.assistant'`

- [ ] **Step 3: Implement `backend/app/schemas/assistant.py`**

```python
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.product import ProductOut

class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str

class AssistantChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    language: Optional[str] = Field("en", description="'en' or 'ur'")
    history: Optional[List[ChatMessage]] = []

class AssistantChatResponse(BaseModel):
    reply: str
    products: List[ProductOut] = []
    suggested_actions: List[str] = []
    action: Optional[str] = None

class AssistantSpeakRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    language: Optional[str] = "ur"
```

- [ ] **Step 4: Implement `backend/app/services/assistant_service.py`**

```python
import os
import re
import json
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.schemas.assistant import AssistantChatRequest, AssistantChatResponse, ChatMessage
from app.schemas.product import ProductOut
from app.models.product import Product
from app.models.category import Category
from app.models.order import DeliveryZone

SYSTEM_PROMPT = """You are 'Lyallpur Assistant', a friendly, polite, and knowledgeable shopping concierge for 'Lyallpur Bazaar', a premier local marketplace in Faisalabad, Pakistan.
You assist shoppers with finding groceries, fabrics (lawn, unstitched cotton, khaddi), household goods, and answering delivery questions.
Faisalabad key sectors: Peoples Colony (Rs 100), D Ground (Rs 100), Batala Colony, Madina Town (Rs 120), Susan Road, Kohinoor City (Rs 120), Ghulam Muhammad Abad (Rs 150), Millat Town (Rs 150). Standard free delivery threshold is Rs 2,500. Same-day cutoff is 4:00 PM.
Respond in the language the user speaks (English, Urdu, or Roman Urdu). Keep spoken responses concise (1-3 sentences) suitable for text-to-speech reading."""

def _smart_fallback_matcher(message: str, language: str, db: Session) -> AssistantChatResponse:
    clean_msg = message.lower().strip()
    is_urdu = language == "ur" or any('\u0600' <= char <= '\u06FF' for char in message)
    
    # 1. Delivery Zone check
    zones = db.query(DeliveryZone).filter(DeliveryZone.is_active == True).all()
    matched_zone = None
    for zone in zones:
        zone_keywords = zone.name.lower().replace("&", " ").split()
        if any(kw in clean_msg for kw in zone_keywords if len(kw) > 3):
            matched_zone = zone
            break
            
    if matched_zone or "delivery" in clean_msg or "shipping" in clean_msg or "ڈیلیوری" in message:
        if matched_zone:
            fee = int(matched_zone.base_delivery_fee_pkr)
            same_day = "available before 4:00 PM" if matched_zone.allows_same_day else "within 24-36 hours"
            if is_urdu:
                reply = f"جی ہاں! ہم {matched_zone.name} میں ڈیلیوری فراہم کرتے ہیں۔ ڈیلیوری فیس صرف {fee} روپے ہے اور سیم ڈے ڈیلیوری شام 4 بجے تک دستیاب ہے۔"
            else:
                reply = f"Yes! We deliver to {matched_zone.name} for Rs. {fee}. Same-day delivery is {same_day}. Orders above Rs. 2,500 enjoy free delivery!"
            return AssistantChatResponse(
                reply=reply,
                products=[],
                suggested_actions=["View Popular Products", "Free Delivery Deals", "Check Cart"]
            )
        else:
            if is_urdu:
                reply = "ہم پورے فیصل آباد بشمول ڈی گراؤنڈ، پیپلز کالونی، مدینہ ٹاؤن، اور غلام محمد آباد میں ڈیلیوری فراہم کرتے ہیں۔ 2500 روپے سے زائد پر فری ڈیلیوری ہے!"
            else:
                reply = "We deliver across all of Faisalabad including D Ground, Peoples Colony, Madina Town, and Ghulam Muhammad Abad. Standard delivery is Rs. 100-150, and FREE for orders above Rs. 2,500!"
            return AssistantChatResponse(
                reply=reply,
                products=[],
                suggested_actions=["D Ground Delivery", "Madina Town Delivery", "Peoples Colony Delivery"]
            )

    # 2. Product Search Matcher
    # Extract search tokens
    stop_words = {"show", "me", "find", "looking", "for", "price", "of", "what", "is", "the", "in", "stock", "kya", "hai", "mujhe", "chahiye", "dikhao"}
    tokens = [w for w in re.findall(r'\w+', clean_msg) if len(w) > 2 and w not in stop_words]
    
    query = db.query(Product).filter(Product.is_active == True)
    if tokens:
        filters = []
        for t in tokens:
            filters.append(Product.name.ilike(f"%{t}%"))
            filters.append(Product.description.ilike(f"%{t}%"))
            filters.append(Product.search_keywords.ilike(f"%{t}%"))
        query = query.filter(or_(*filters))
    
    matched_products = query.limit(6).all()
    
    if matched_products:
        p_outs = [ProductOut.model_validate(p) for p in matched_products]
        names = ", ".join([p.name for p in matched_products[:2]])
        if is_urdu:
            reply = f"مجھے آپ کے لیے یہ اشیاء مل گئی ہیں: {names}۔ آپ سیدھے اپنے کارٹ میں شامل کر سکتے ہیں۔"
        else:
            reply = f"I found these products for you including {names}. You can add them directly to your cart!"
        return AssistantChatResponse(
            reply=reply,
            products=p_outs,
            suggested_actions=["View Cart", "Checkout Now", "More Items"]
        )
        
    # Default greeting or help
    if is_urdu:
        reply = "خوش آمدید! میں لائل پور بازار کا اسسٹنٹ ہوں۔ میں مصنوعات تلاش کرنے اور فیصل آباد میں ڈیلیوری کے بارے میں آپ کی مدد کر سکتا ہوں۔ آپ کیا تلاش کر رہے ہیں؟"
    else:
        reply = "Welcome to Lyallpur Bazaar! I can help you find fresh groceries, local lawn suits, and check delivery rates across Faisalabad. What are you looking for today?"
        
    return AssistantChatResponse(
        reply=reply,
        products=[],
        suggested_actions=["Show Lawn Suits", "Grocery Staples", "Delivery Rates"]
    )

def process_assistant_chat(request: AssistantChatRequest, db: Session) -> AssistantChatResponse:
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_key:
        return _smart_fallback_matcher(request.message, request.language or "en", db)

    try:
        import httpx
        # Call Gemini 1.5 Flash REST API with tools
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
        
        # Build prompt with marketplace context
        recent_history = [f"{msg.role}: {msg.content}" for msg in (request.history or [])[-4:]]
        prompt = f"{SYSTEM_PROMPT}\n\nRecent Conversation:\n" + "\n".join(recent_history) + f"\nUser: {request.message}\nProvide helpful response and list relevant search query keywords if product search is needed."
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 300}
        }
        
        with httpx.Client(timeout=5.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                # Run product query to accompany response
                fallback = _smart_fallback_matcher(request.message, request.language or "en", db)
                return AssistantChatResponse(
                    reply=text,
                    products=fallback.products,
                    suggested_actions=fallback.suggested_actions
                )
    except Exception as e:
        print(f"Gemini API invocation error: {e}, falling back to local engine")
        
    return _smart_fallback_matcher(request.message, request.language or "en", db)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `python -m pytest backend/tests/test_assistant_service.py -v`
Expected: PASS (all 3 tests pass)

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas/assistant.py backend/app/services/assistant_service.py backend/tests/test_assistant_service.py
git commit -m "feat(assistant): add assistant schemas and dual-mode AI service with smart fallback"
```

---

### Task 2: Assistant API Router & Edge-TTS Audio Generation

**Files:**
- Create: `backend/app/routers/assistant.py`
- Modify: `backend/app/main.py:20-80`
- Modify: `api/index.py:25-35`
- Create: `backend/tests/test_assistant_api.py`

**Interfaces:**
- Consumes: `AssistantChatRequest`, `AssistantChatResponse`, `AssistantSpeakRequest`, `process_assistant_chat`, `get_db`
- Produces: `POST /api/assistant/chat`, `POST /api/assistant/speak`

- [ ] **Step 1: Write integration tests in `backend/tests/test_assistant_api.py`**

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_assistant_chat_endpoint():
    res = client.post("/api/assistant/chat", json={
        "message": "Do you deliver to Peoples Colony?",
        "language": "en",
        "history": []
    })
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert "products" in data
    assert "suggested_actions" in data

def test_api_assistant_chat_product_query():
    res = client.post("/api/assistant/chat", json={
        "message": "Show me Basmati Rice",
        "language": "en"
    })
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data["products"], list)

@pytest.mark.asyncio
async def test_api_assistant_speak_endpoint():
    res = client.post("/api/assistant/speak", json={
        "text": "خوش آمدید، لائل پور بازار میں آپ کا استقبال ہے۔",
        "language": "ur"
    })
    # Either 200 with audio/mpeg or 503 if edge-tts network is unreachable in CI
    assert res.status_code in (200, 503)
    if res.status_code == 200:
        assert res.headers["content-type"] == "audio/mpeg"
        assert len(res.content) > 100
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_assistant_api.py -v`
Expected: FAIL with 404 Not Found (`/api/assistant/chat` route does not exist)

- [ ] **Step 3: Implement `backend/app/routers/assistant.py`**

```python
import io
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.assistant import (
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantSpeakRequest
)
from app.services.assistant_service import process_assistant_chat

router = APIRouter(prefix="/assistant", tags=["Assistant"])

@router.post("/chat", response_model=AssistantChatResponse)
def assistant_chat(request: AssistantChatRequest, db: Session = Depends(get_db)):
    """Process a spoken or typed shopper query and return response with matching products."""
    try:
        return process_assistant_chat(request, db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Assistant processing failed: {str(e)}"
        )

@router.post("/speak")
async def assistant_speak(request: AssistantSpeakRequest):
    """Generate high-fidelity Pakistani Urdu/English neural speech audio via edge-tts."""
    try:
        import edge_tts
        voice = "ur-PK-UzmaNeural" if request.language == "ur" else "en-PK-UzmaNeural"
        communicate = edge_tts.Communicate(request.text, voice)
        mp3_buffer = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                mp3_buffer.write(chunk["data"])
        mp3_buffer.seek(0)
        return Response(content=mp3_buffer.read(), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Neural speech synthesis unavailable: {str(e)}"
        )
```

- [ ] **Step 4: Register router in `backend/app/main.py` and `api/index.py`**

In `backend/app/main.py`:
```python
from app.routers.assistant import router as assistant_router
# Include router
app.include_router(assistant_router, prefix=settings.API_V1_STR)
```

- [ ] **Step 5: Run integration tests to verify they pass**

Run: `python -m pytest backend/tests/test_assistant_api.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/assistant.py backend/app/main.py backend/tests/test_assistant_api.py
git commit -m "feat(api): add assistant chat and neural speak streaming endpoints"
```

---

### Task 3: Frontend Speech Recognition & Synthesis Hooks

**Files:**
- Create: `frontend/src/hooks/useSpeechRecognition.js`
- Create: `frontend/src/hooks/useSpeechSynthesis.js`

**Interfaces:**
- Produces: `useSpeechRecognition(options)` -> `{ isListening, transcript, interimTranscript, startListening, stopListening, isSupported, error }`
- Produces: `useSpeechSynthesis(options)` -> `{ isSpeaking, isMuted, toggleMute, speak, stopSpeaking }`

- [ ] **Step 1: Implement `frontend/src/hooks/useSpeechRecognition.js`**

```javascript
import { useState, useEffect, useRef, useCallback } from 'react';

export function useSpeechRecognition({ onResult, language = 'en-US' } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  const isSupported = typeof window !== 'undefined' && 
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!isSupported) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language === 'ur' ? 'ur-PK' : 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript('');
      setInterimTranscript('');
      // Silence timeout after 7 seconds
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        recognition.stop();
      }, 7000);
    };

    recognition.onresult = (event) => {
      clearTimeout(timerRef.current);
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInterimTranscript(interim);
      if (final) {
        setTranscript(final);
        if (onResult) onResult(final);
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      clearTimeout(timerRef.current);
      if (event.error !== 'no-speech') {
        setError(event.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      clearTimeout(timerRef.current);
    };

    recognitionRef.current = recognition;

    return () => {
      clearTimeout(timerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isSupported, language, onResult]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.lang = language === 'ur' ? 'ur-PK' : 'en-US';
      recognitionRef.current.start();
    } catch (err) {
      console.warn('SpeechRecognition start warning:', err);
    }
  }, [language]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.warn('SpeechRecognition stop warning:', err);
    }
    clearTimeout(timerRef.current);
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    isSupported,
    error,
  };
}
```

- [ ] **Step 2: Implement `frontend/src/hooks/useSpeechSynthesis.js`**

```javascript
import { useState, useEffect, useRef, useCallback } from 'react';

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('lyallpur_assistant_muted') === 'true';
  });
  const audioRef = useRef(null);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem('lyallpur_assistant_muted', String(next));
      if (next) {
        stopSpeaking();
      }
      return next;
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback((text, language = 'en') => {
    if (isMuted || !text) return;
    stopSpeaking();

    // 1. Try Browser window.speechSynthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'ur' ? 'ur-PK' : 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
      return;
    }

    // 2. Fallback to server /api/assistant/speak endpoint
    const url = `/api/assistant/speak`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language })
    })
      .then((res) => {
        if (!res.ok) throw new Error('Audio generation failed');
        return res.blob();
      })
      .then((blob) => {
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        audio.play();
      })
      .catch(() => {
        setIsSpeaking(false);
      });
  }, [isMuted, stopSpeaking]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  return {
    isSpeaking,
    isMuted,
    toggleMute,
    speak,
    stopSpeaking,
  };
}
```

- [ ] **Step 3: Verify with Vite build dry check**

Run: `& "C:\Users\User\AppData\Local\OpenAI\Codex\runtimes\cua_node\2c6075088d3180ec\bin\npm.cmd" run build` in `frontend`
Expected: Build passes with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useSpeechRecognition.js frontend/src/hooks/useSpeechSynthesis.js
git commit -m "feat(frontend): add useSpeechRecognition and useSpeechSynthesis custom hooks"
```

---

### Task 4: Voice Assistant Widget & Interactive UI Components

**Files:**
- Create: `frontend/src/components/assistant/VoiceVisualizer.jsx`
- Create: `frontend/src/components/assistant/AssistantProductCard.jsx`
- Create: `frontend/src/components/assistant/VoiceAssistantWidget.jsx`

**Interfaces:**
- Consumes: `useSpeechRecognition`, `useSpeechSynthesis`, `useCart` ([frontend/src/context/CartContext.jsx](file:///c:/Users/User/Documents/Projects/Daraz-alike/frontend/src/context/CartContext.jsx)), `client` ([frontend/src/api/client.js](file:///c:/Users/User/Documents/Projects/Daraz-alike/frontend/src/api/client.js))
- Produces: `<VoiceAssistantWidget />` component

- [ ] **Step 1: Implement `frontend/src/components/assistant/VoiceVisualizer.jsx`**

```jsx
import React from 'react';

export default function VoiceVisualizer({ isListening, isSpeaking }) {
  if (!isListening && !isSpeaking) return null;

  return (
    <div className="flex items-center justify-center gap-1 py-2 px-3 bg-emerald-50 rounded-xl border border-emerald-100">
      <span className="text-xs font-semibold text-emerald-700 mr-2 animate-pulse">
        {isListening ? 'Listening to your voice...' : 'Lyallpur AI Speaking...'}
      </span>
      <div className="flex items-end gap-1 h-5">
        {[40, 75, 100, 60, 90, 50, 80].map((h, i) => (
          <span
            key={i}
            className="w-1 bg-emerald-500 rounded-full animate-bounce"
            style={{
              height: `${h}%`,
              animationDelay: `${i * 0.1}s`,
              animationDuration: '0.6s'
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `frontend/src/components/assistant/AssistantProductCard.jsx`**

```jsx
import React, { useState } from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function AssistantProductCard({ product }) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const imageSrc = product.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200';

  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow min-w-[220px] max-w-[240px] flex-shrink-0">
      <img
        src={imageSrc}
        alt={product.name}
        className="w-12 h-12 rounded-lg object-cover bg-gray-50 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-gray-900 truncate" title={product.name}>
          {product.name}
        </h4>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs font-extrabold text-emerald-600">
            Rs. {Number(product.price).toLocaleString()}
          </span>
          <button
            onClick={handleAdd}
            className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
              added
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {added ? <Check className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement `frontend/src/components/assistant/VoiceAssistantWidget.jsx`**

```jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ChevronDown
} from 'lucide-react';
import client from '../../api/client';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import VoiceVisualizer from './VoiceVisualizer';
import AssistantProductCard from './AssistantProductCard';

export default function VoiceAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState('en'); // 'en' or 'ur'
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your Lyallpur Bazaar assistant. Ask me about fresh groceries, lawn fabrics, or delivery across Faisalabad!',
      products: []
    }
  ]);

  const messagesEndRef = useRef(null);
  const { isSpeaking, isMuted, toggleMute, speak, stopSpeaking } = useSpeechSynthesis();

  const handleSpeechResult = (spokenText) => {
    if (spokenText.trim()) {
      sendMessage(spokenText);
    }
  };

  const {
    isListening,
    startListening,
    stopListening,
    isSupported,
    error: speechError
  } = useSpeechRecognition({
    onResult: handleSpeechResult,
    language
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const toggleLanguage = () => {
    const next = language === 'en' ? 'ur' : 'en';
    setLanguage(next);
    stopSpeaking();
    stopListening();
  };

  const handleMicClick = () => {
    stopSpeaking();
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const sendMessage = async (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim() || isLoading) return;

    setInputText('');
    stopSpeaking();
    stopListening();

    const userMsg = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content
      }));

      const res = await client.post('/assistant/chat', {
        message: query,
        language,
        history: historyPayload
      });

      const assistantMsg = {
        role: 'assistant',
        content: res.data.reply,
        products: res.data.products || [],
        suggested_actions: res.data.suggested_actions || []
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speak(res.data.reply, language);
    } catch (err) {
      console.error('Assistant error:', err);
      const errorMsg = {
        role: 'assistant',
        content: language === 'ur' 
          ? 'معذرت، رابطہ نہیں ہو سکا۔ براہ کرم دوبارہ کوشش کریں۔'
          : 'Sorry, I had trouble connecting. Please try again in a moment.',
        products: []
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* 1. Minimized Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-white"
          title="Open AI Voice Assistant"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 animate-spin text-amber-300" style={{ animationDuration: '6s' }} />
            <Mic className="w-4 h-4 absolute -bottom-1 -right-1 text-white" />
          </div>
          <span className="text-sm font-extrabold tracking-tight">Ask Lyallpur AI</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200"></span>
          </span>
        </button>
      )}

      {/* 2. Expanded Conversational Drawer */}
      {isOpen && (
        <div className="w-96 max-w-[calc(100vw-2rem)] h-[540px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
                <Bot className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-none flex items-center gap-1.5">
                  Lyallpur Concierge
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </h3>
                <span className="text-[11px] text-emerald-100 font-medium">
                  {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Online & Ready'}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5">
              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="px-2 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-bold transition-colors border border-white/20"
                title="Switch Language"
              >
                {language === 'en' ? '🌐 UR' : '🌐 EN'}
              </button>

              {/* Mute/Unmute */}
              <button
                onClick={toggleMute}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/90"
                title={isMuted ? 'Unmute Assistant Voice' : 'Mute Assistant Voice'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-300" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Minimize */}
              <button
                onClick={() => {
                  stopSpeaking();
                  stopListening();
                  setIsOpen(false);
                }}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80"
                title="Close Assistant"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Waveform Bar */}
          <VoiceVisualizer isListening={isListening} isSpeaking={isSpeaking} />

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                      : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.content}</p>
                </div>

                {/* Product Recommendations Horizontal Carousel */}
                {m.products && m.products.length > 0 && (
                  <div className="mt-2 w-full overflow-x-auto pb-1 flex gap-2">
                    {m.products.map((prod) => (
                      <AssistantProductCard key={prod.id} product={prod} />
                    ))}
                  </div>
                )}

                {/* Suggested Action Chips */}
                {m.suggested_actions && m.suggested_actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.suggested_actions.map((act, actIdx) => (
                      <button
                        key={actIdx}
                        onClick={() => sendMessage(act)}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-semibold transition-colors shadow-2xs"
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 p-2 text-xs text-gray-500 font-medium">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>Thinking & searching catalog...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Controls */}
          <div className="p-3 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2">
              {/* Push-To-Talk Mic Button */}
              {isSupported ? (
                <button
                  type="button"
                  onClick={handleMicClick}
                  className={`p-2.5 rounded-2xl flex items-center justify-center transition-all ${
                    isListening
                      ? 'bg-red-500 text-white shadow-lg ring-4 ring-red-200 animate-pulse'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                  title={isListening ? 'Stop listening' : 'Speak to search or ask'}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              ) : null}

              {/* Text Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex-1 flex items-center gap-1.5 bg-gray-50 rounded-2xl border border-gray-200 px-3 py-1.5 focus-within:border-emerald-500 focus-within:bg-white transition-all"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={language === 'ur' ? 'یہاں ٹائپ کریں یا بولیں...' : 'Ask or search products...'}
                  className="w-full bg-transparent text-xs text-gray-900 focus:outline-none placeholder-gray-400"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="p-1.5 text-emerald-600 hover:text-emerald-700 disabled:opacity-30 transition-opacity"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify clean Vite build**

Run: `& "C:\Users\User\AppData\Local\OpenAI\Codex\runtimes\cua_node\2c6075088d3180ec\bin\npm.cmd" run build` in `frontend`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/assistant/
git commit -m "feat(frontend): create VoiceAssistantWidget, VoiceVisualizer, and AssistantProductCard"
```

---

### Task 5: Storefront Integration, Verification & Handoff

**Files:**
- Modify: `frontend/src/App.jsx:1-40`
- Modify: `briefs/TASK.md`
- Modify: `briefs/HANDOFF.md`

- [ ] **Step 1: Mount `VoiceAssistantWidget` in `frontend/src/App.jsx`**

Import and render `<VoiceAssistantWidget />` at the root layout of `App.jsx` inside the `BrowserRouter` and `CartProvider`:
```jsx
import VoiceAssistantWidget from './components/assistant/VoiceAssistantWidget';

// Inside App component:
<VoiceAssistantWidget />
```

- [ ] **Step 2: Run all backend tests**

Run: `python -m pytest backend/tests -v`
Expected: All tests pass (including existing 53 tests + new assistant tests).

- [ ] **Step 3: Run frontend production build**

Run: `& "C:\Users\User\AppData\Local\OpenAI\Codex\runtimes\cua_node\2c6075088d3180ec\bin\npm.cmd" run build` in `frontend`
Expected: 0 errors, clean build.

- [ ] **Step 4: Update `briefs/TASK.md` and `briefs/HANDOFF.md`**

Record the completed feature, acceptance verification results, and usage guide.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.jsx briefs/TASK.md briefs/HANDOFF.md
git commit -m "feat(assistant): integrate voice assistant widget into storefront and update handoff"
```
