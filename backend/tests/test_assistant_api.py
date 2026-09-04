import os
import sys
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models
from app.main import app
from app.database import Base, get_db
from app.seed.seed_data import seed_database
from app.models.category import Category
from app.models.product import Product

TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_database(db)

    # Ensure Basmati Rice exists for search test
    rice = db.query(Product).filter(Product.name.ilike("%rice%")).first()
    if not rice:
        cat = db.query(Category).first()
        rice_prod = Product(
            name="Super Basmati Rice 5kg",
            slug="super-basmati-rice-5kg",
            description="Premium aged long-grain basmati rice from Punjab.",
            price=1450.0,
            stock_quantity=50,
            category_id=cat.id if cat else None,
            is_active=True,
            search_keywords="rice, basmati, super, chawal"
        )
        db.add(rice_prod)
        db.commit()
    db.close()

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=test_engine)

def test_api_assistant_chat_endpoint(client):
    res = client.post("/api/assistant/chat", json={
        "message": "Do you deliver to Peoples Colony?",
        "language": "en",
        "history": []
    })
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert "Peoples Colony" in data["reply"]
    assert "products" in data
    assert "suggested_actions" in data

def test_api_assistant_chat_product_query(client):
    res = client.post("/api/assistant/chat", json={
        "message": "Show me Basmati Rice",
        "language": "en"
    })
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert isinstance(data["products"], list)
    assert len(data["products"]) > 0
    assert any("rice" in p["name"].lower() for p in data["products"])

def test_api_assistant_speak_endpoint(client):
    res = client.post("/api/assistant/speak", json={
        "text": "خوش آمدید، لائل پور بازار میں آپ کا استقبال ہے۔",
        "language": "ur"
    })
    assert res.status_code in (200, 503)
    if res.status_code == 200:
        assert "audio/mpeg" in res.headers["content-type"]
        assert len(res.content) > 100

def test_api_assistant_speak_endpoint_english(client):
    res = client.post("/api/assistant/speak", json={
        "text": "Welcome to Lyallpur Bazaar shopping assistant.",
        "language": "en"
    })
    assert res.status_code in (200, 503)
    if res.status_code == 200:
        assert "audio/mpeg" in res.headers["content-type"]
        assert len(res.content) > 100

def test_api_assistant_chat_validation_error(client):
    res = client.post("/api/assistant/chat", json={
        "message": ""
    })
    assert res.status_code == 422

def test_api_assistant_speak_validation_error(client):
    res = client.post("/api/assistant/speak", json={
        "text": ""
    })
    assert res.status_code == 422

def test_api_assistant_chat_urdu_query(client):
    res = client.post("/api/assistant/chat", json={
        "message": "کیا آپ ڈی گراؤنڈ میں ڈیلیوری کرتے ہیں؟",
        "language": "ur"
    })
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert "ڈی گراؤنڈ" in data["reply"] or "ڈیلیوری" in data["reply"]

def test_api_assistant_chat_server_error_returns_500(client):
    with patch("app.routers.assistant.process_assistant_chat", side_effect=RuntimeError("Test error")):
        res = client.post("/api/assistant/chat", json={
            "message": "Do you deliver to D Ground?"
        })
        assert res.status_code == 500
        assert "Assistant processing failed" in res.json()["detail"]

def test_api_assistant_speak_network_error_returns_503(client):
    with patch("edge_tts.Communicate.stream", side_effect=Exception("Connection refused")):
        res = client.post("/api/assistant/speak", json={
            "text": "Testing error handling",
            "language": "en"
        })
        assert res.status_code == 503
        assert "Neural speech synthesis unavailable" in res.json()["detail"]
