import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal
import app.models  # ensure all models including RBAC are registered
from app.seed.seed_rbac import seed_rbac_data
from app.seed.seed_data import seed_database

# Import routers
from app.routers import auth, categories, products, search, cart, orders, delivery, admin, admin_rbac

# Lifespan event to create tables and seed data
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    Base.metadata.create_all(bind=engine)
    # Seed database
    db = SessionLocal()
    try:
        seed_rbac_data(db)
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration to allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
api_v1_prefix = settings.API_V1_STR
app.include_router(auth.router, prefix=api_v1_prefix)
app.include_router(categories.router, prefix=api_v1_prefix)
app.include_router(products.router, prefix=api_v1_prefix)
app.include_router(search.router, prefix=api_v1_prefix)
app.include_router(cart.router, prefix=api_v1_prefix)
app.include_router(orders.router, prefix=api_v1_prefix)
app.include_router(delivery.router, prefix=api_v1_prefix)
app.include_router(admin.router, prefix=api_v1_prefix)
app.include_router(admin_rbac.router, prefix=api_v1_prefix)

@app.get("/")
def root():
    return {
        "marketplace": settings.PROJECT_NAME,
        "city": "Faisalabad, Pakistan",
        "status": "Online",
        "docs": "/docs",
        "api_prefix": settings.API_V1_STR
    }
