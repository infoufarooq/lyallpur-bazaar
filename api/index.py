import os
import sys

# Add root and backend directory to sys.path so modules resolve cleanly on Vercel
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Set VERCEL environment indicator
os.environ.setdefault("VERCEL", "1")

# Pre-initialize DB and seed data to ensure tables exist in serverless environment
try:
    from app.database import engine, Base, SessionLocal
    from app.seed.seed_data import seed_database
    from app.seed.seed_rbac import seed_rbac_data
    
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_rbac_data(db)
        seed_database(db)
    finally:
        db.close()
except Exception as e:
    print(f"Vercel DB initialization warning: {e}")

# Export FastAPI instance for Vercel Serverless Function
from app.main import app
