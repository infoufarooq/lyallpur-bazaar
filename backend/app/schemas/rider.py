from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, model_validator

class RiderDeliveryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    order_id: int
    order_number: str
    customer_name: str
    customer_phone: str
    locality: str
    full_address: str
    nearby_landmark: Optional[str] = None
    total_amount_pkr: float
    order_status: str
    payment_method: str
    payment_status: str
    delivery_notes: Optional[str] = None
    assigned_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    recipient_name: Optional[str] = None
    recipient_phone: Optional[str] = None

    @model_validator(mode="after")
    def populate_recipient_aliases(self):
        if not self.recipient_name:
            self.recipient_name = self.customer_name
        if not self.recipient_phone:
            self.recipient_phone = self.customer_phone
        return self

class RiderStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str
    delivery_notes: Optional[str] = None

class RiderDashboardMetrics(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    pending_deliveries: int
    delivered_today: int
    cod_cash_collected_pkr: float
