from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class DeliveryZoneBase(BaseModel):
    name: str
    sector_code: Optional[str] = None
    base_delivery_fee_pkr: float = 120.0
    allows_same_day: bool = True
    same_day_cutoff_hour: int = 16
    standard_delivery_hours: int = 24
    is_active: bool = True
    description: Optional[str] = None

class DeliveryZoneCreate(DeliveryZoneBase):
    pass

class DeliveryZoneUpdate(BaseModel):
    name: Optional[str] = None
    sector_code: Optional[str] = None
    base_delivery_fee_pkr: Optional[float] = None
    allows_same_day: Optional[bool] = None
    same_day_cutoff_hour: Optional[int] = None
    standard_delivery_hours: Optional[int] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None

class DeliveryZoneOut(DeliveryZoneBase):
    model_config = ConfigDict(from_attributes=True)
    id: int

class DeliveryEstimateRequest(BaseModel):
    locality: str
    subtotal_pkr: float = 0.0
    delivery_speed: str = "Standard Delivery"

class DeliveryEstimateResponse(BaseModel):
    locality: str
    is_valid_zone: bool
    allows_same_day: bool
    is_same_day_available_now: bool
    cutoff_time_notice: str
    base_fee_pkr: float
    final_fee_pkr: float
    free_delivery_applied: bool
    estimated_arrival: str
