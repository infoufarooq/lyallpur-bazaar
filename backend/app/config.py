import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    model_config = ConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

    PROJECT_NAME: str = "Lyallpur Bazaar"
    PROJECT_DESCRIPTION: str = "Faisalabad Local Online Marketplace API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = "sqlite:///./lyallpur_bazaar.db"
    
    # Security
    SECRET_KEY: str = "lyallpur-bazaar-super-secret-key-fsd-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Faisalabad Delivery Rules
    DEFAULT_DELIVERY_FEE_PKR: float = 120.0
    FREE_DELIVERY_THRESHOLD_PKR: float = 2500.0
    SAME_DAY_CUTOFF_HOUR: int = 16  # 4:00 PM cutoff for same-day delivery
    SAME_DAY_EXTRA_FEE_PKR: float = 80.0
    
    # Alternative Product Matching
    PRICE_TOLERANCE_PERCENT: float = 30.0  # +/- 30% for comparable alternatives

settings = Settings()
