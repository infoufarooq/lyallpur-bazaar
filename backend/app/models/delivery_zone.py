from sqlalchemy import Column, Integer, String, Float, Boolean
from app.database import Base

class DeliveryZone(Base):
    __tablename__ = "delivery_zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False) # Area name in Faisalabad
    sector_code = Column(String(30), nullable=True) # e.g. FSD-PC, FSD-DG, FSD-MT
    base_delivery_fee_pkr = Column(Float, default=120.0)
    allows_same_day = Column(Boolean, default=True)
    same_day_cutoff_hour = Column(Integer, default=16) # 4 PM
    standard_delivery_hours = Column(Integer, default=24) # 24 hours (next day)
    is_active = Column(Boolean, default=True)
    description = Column(String(255), nullable=True)
