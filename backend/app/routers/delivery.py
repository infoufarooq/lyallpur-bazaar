from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.delivery_zone import DeliveryZone
from app.schemas.delivery import DeliveryZoneOut, DeliveryEstimateRequest, DeliveryEstimateResponse
from app.services.delivery_service import calculate_delivery_estimate

router = APIRouter(prefix="/delivery", tags=["Delivery"])

@router.get("/zones", response_model=List[DeliveryZoneOut])
def get_delivery_zones(db: Session = Depends(get_db)):
    return db.query(DeliveryZone).filter(DeliveryZone.is_active == True).all()

@router.post("/estimate", response_model=DeliveryEstimateResponse)
def estimate_delivery(req: DeliveryEstimateRequest, db: Session = Depends(get_db)):
    return calculate_delivery_estimate(
        db=db,
        locality=req.locality,
        subtotal_pkr=req.subtotal_pkr,
        delivery_speed=req.delivery_speed
    )
