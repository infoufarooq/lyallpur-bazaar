import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import Settings

def test_supabase_url_normalization():
    s = Settings(DATABASE_URL="postgres://user:pass@db.supabase.co:6543/postgres?sslmode=require")
    normalized = s.get_database_url(s.DATABASE_URL)
    assert normalized.startswith("postgresql+psycopg2://")
    assert "sslmode=require" in normalized

def test_sqlite_url_preservation():
    s = Settings(DATABASE_URL="sqlite:///./test.db")
    normalized = s.get_database_url(s.DATABASE_URL)
    assert normalized.startswith("sqlite:///")

def test_postgresql_prefix_normalization():
    s = Settings(DATABASE_URL="postgresql://user:pass@db.supabase.co:6543/postgres?sslmode=require")
    normalized = s.get_database_url(s.DATABASE_URL)
    assert normalized.startswith("postgresql+psycopg2://")

def test_already_normalized_psycopg2_url():
    s = Settings(DATABASE_URL="postgresql+psycopg2://user:pass@db.supabase.co:6543/postgres?sslmode=require")
    normalized = s.get_database_url(s.DATABASE_URL)
    assert normalized.startswith("postgresql+psycopg2://")
