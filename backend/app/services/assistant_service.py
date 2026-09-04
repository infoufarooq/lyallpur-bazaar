import os
import re
import json
import logging
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.schemas.assistant import AssistantChatRequest, AssistantChatResponse, ChatMessage
from app.schemas.product import ProductOut
from app.models.product import Product
from app.models.category import Category
from app.models.delivery_zone import DeliveryZone
from app.services.product_service import format_product_out

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are 'Lyallpur Assistant', a friendly, polite, and knowledgeable shopping concierge for 'Lyallpur Bazaar', a premier local marketplace in Faisalabad, Pakistan.
You assist shoppers with finding groceries, fabrics (lawn, unstitched cotton, khaddi), household goods, and answering delivery questions.
Faisalabad key sectors: Peoples Colony (Rs 100), D Ground (Rs 100), Batala Colony, Madina Town (Rs 120), Susan Road, Kohinoor City (Rs 120), Ghulam Muhammad Abad (Rs 150), Millat Town (Rs 150). Standard free delivery threshold is Rs 2,500. Same-day cutoff is 4:00 PM.
Respond in the language the user speaks (English, Urdu, or Roman Urdu). Keep spoken responses concise (1-3 sentences) suitable for text-to-speech reading."""

# Mapping common Urdu terms to English keywords for catalog search
URDU_SEARCH_MAP = {
    "دال": "daal",
    "چنا": "chana",
    "چاول": "rice",
    "تیل": "oil",
    "گھی": "ghee",
    "چائے": "tea",
    "پتی": "danedar",
    "دودھ": "milk",
    "صابن": "soap",
    "سرف": "surf",
    "چینی": "sugar",
    "آٹا": "flour",
    "لان": "lawn",
    "کپڑا": "fabric",
    "سوٹ": "suit",
    "کھڈی": "khaddi",
    "بریانی": "biryani",
    "مصالحہ": "masala",
    "اچار": "pickle",
}

# Mapping Urdu locality names to English sector keywords
URDU_ZONE_MAP = {
    "ڈی گراؤنڈ": "d ground",
    "پیپلز کالونی": "peoples colony",
    "مدینہ ٹاؤن": "madina town",
    "کوہ نور": "kohinoor",
    "کینال روڈ": "canal road",
    "غلام محمد آباد": "ghulam muhammad abad",
    "ملت ٹاؤن": "millat town",
    "سمانہ آباد": "samanabad",
    "گھنٹہ گھر": "clock tower",
    "سوسن روڈ": "susan road",
    "بٹالہ کالونی": "batala colony",
    "جناح کالونی": "jinnah colony",
}

def _to_product_out(product: Product) -> ProductOut:
    try:
        return format_product_out(product)
    except Exception:
        return ProductOut.model_validate(product)

def _smart_fallback_matcher(message: str, language: str, db: Session) -> AssistantChatResponse:
    clean_msg = message.lower().strip()
    is_urdu = language == "ur" or any('\u0600' <= char <= '\u06FF' for char in message)
    
    # 1. Delivery Zone check
    zones = db.query(DeliveryZone).filter(DeliveryZone.is_active == True).all()
    matched_zone = None

    # Check Urdu zone terms first
    for urdu_name, eng_kw in URDU_ZONE_MAP.items():
        if urdu_name in message:
            for zone in zones:
                if eng_kw in zone.name.lower():
                    matched_zone = zone
                    break
            if matched_zone:
                break

    # Check English / Roman Urdu zone terms
    if not matched_zone:
        for zone in zones:
            zone_name_lower = zone.name.lower()
            segments = [s.strip() for s in zone_name_lower.split("&")]
            for seg in segments:
                seg_clean = re.sub(r' no\.? \d+', '', seg).strip()
                if seg_clean and seg_clean in clean_msg:
                    matched_zone = zone
                    break
                if seg and seg in clean_msg:
                    matched_zone = zone
                    break
            if matched_zone:
                break

    if not matched_zone:
        for zone in zones:
            zone_keywords = [w for w in re.findall(r'\w+', zone.name.lower()) if len(w) > 3 and w not in {"road", "city", "town"}]
            if any(kw in clean_msg for kw in zone_keywords):
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
    stop_words = {
        "show", "me", "find", "looking", "for", "price", "of", "what", "is", "the",
        "in", "stock", "kya", "hai", "mujhe", "chahiye", "dikhao", "batao", "rate",
        "cost", "do", "you", "have", "please", "ka", "ki", "ke", "ko"
    }
    tokens = [w for w in re.findall(r'\w+', clean_msg) if len(w) > 2 and w not in stop_words]

    # Check for Urdu keyword mappings
    for urdu_kw, eng_kw in URDU_SEARCH_MAP.items():
        if urdu_kw in message:
            tokens.append(eng_kw)
    
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
            p_outs = [_to_product_out(p) for p in matched_products]
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
        logger.warning(f"Gemini API invocation error: {e}, falling back to local engine")
        
    return _smart_fallback_matcher(request.message, request.language or "en", db)
