import os
import sys
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models
from app.database import Base
from app.models.category import Category
from app.models.product import Product
from app.seed.seed_data import seed_database
from app.schemas.assistant import (
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantSpeakRequest,
    ChatMessage,
)
from app.services.assistant_service import process_assistant_chat, _smart_fallback_matcher

TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_database(db)

    # Ensure "Daal Chana" product exists in test catalog for search
    chana = db.query(Product).filter(Product.name.ilike("%chana%")).first()
    if not chana:
        cat = db.query(Category).first()
        chana_prod = Product(
            name="Special Daal Chana 1kg",
            slug="special-daal-chana-1kg",
            sku="GR-CHANA-001",
            category_id=cat.id if cat else 1,
            price=290.0,
            original_price=320.0,
            stock_quantity=40,
            availability_status="In Stock",
            pack_size="1 kg",
            unit="kg",
            search_keywords="daal chana pulses dal lentils grocery rashan",
            is_active=True,
            description="High quality polished Daal Chana staple for Faisalabad households."
        )
        db.add(chana_prod)
        db.commit()

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)

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

def test_smart_fallback_general_delivery(db_session):
    req = AssistantChatRequest(message="What are your delivery options?", language="en")
    res = process_assistant_chat(req, db_session)
    assert isinstance(res, AssistantChatResponse)
    assert "Faisalabad" in res.reply
    assert "2,500" in res.reply or "2500" in res.reply

def test_smart_fallback_greeting(db_session):
    req = AssistantChatRequest(message="Hello there!", language="en")
    res = process_assistant_chat(req, db_session)
    assert isinstance(res, AssistantChatResponse)
    assert "Lyallpur Bazaar" in res.reply

def test_schemas_validation():
    msg = ChatMessage(role="user", content="Hello")
    assert msg.role == "user"
    assert msg.content == "Hello"

    req = AssistantChatRequest(message="Test", language="ur", history=[msg])
    assert req.message == "Test"
    assert req.language == "ur"
    assert len(req.history) == 1

    speak_req = AssistantSpeakRequest(text="Salam", language="ur")
    assert speak_req.text == "Salam"
    assert speak_req.language == "ur"

def test_gemini_api_success_path(db_session, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "dummy-gemini-key")
    fake_response = MagicMock()
    fake_response.status_code = 200
    fake_response.json.return_value = {
        "candidates": [{
            "content": {
                "parts": [{"text": "We have fresh Daal Chana available in 1kg packs!"}]
            }
        }]
    }

    with patch("httpx.Client.post", return_value=fake_response):
        req = AssistantChatRequest(message="Show me Daal Chana", language="en")
        res = process_assistant_chat(req, db_session)
        assert isinstance(res, AssistantChatResponse)
        assert res.reply == "We have fresh Daal Chana available in 1kg packs!"
        assert any("chana" in p.name.lower() or "daal" in p.name.lower() for p in res.products)

def test_gemini_api_network_error_fallback(db_session, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "dummy-gemini-key")
    
    with patch("httpx.Client.post", side_effect=Exception("Network timeout")):
        req = AssistantChatRequest(message="Show me Daal Chana", language="en")
        res = process_assistant_chat(req, db_session)
        assert isinstance(res, AssistantChatResponse)
        assert len(res.reply) > 0
        assert any("chana" in p.name.lower() or "daal" in p.name.lower() for p in res.products)
