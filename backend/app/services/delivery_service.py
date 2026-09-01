from datetime import datetime, time
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.delivery_zone import DeliveryZone
from app.config import settings
from app.schemas.delivery import DeliveryEstimateResponse

FAISALABAD_DEFAULT_ZONES = [
    {"name": "D Ground & Peoples Colony No. 1", "sector_code": "FSD-DG", "base_delivery_fee_pkr": 100.0, "allows_same_day": True, "same_day_cutoff_hour": 17},
    {"name": "Peoples Colony No. 2", "sector_code": "FSD-PC2", "base_delivery_fee_pkr": 100.0, "allows_same_day": True, "same_day_cutoff_hour": 17},
    {"name": "Madina Town & Susan Road", "sector_code": "FSD-MT", "base_delivery_fee_pkr": 100.0, "allows_same_day": True, "same_day_cutoff_hour": 17},
    {"name": "Kohinoor City & Jaranwala Road", "sector_code": "FSD-KC", "base_delivery_fee_pkr": 100.0, "allows_same_day": True, "same_day_cutoff_hour": 17},
    {"name": "Canal Road & Eden Valley", "sector_code": "FSD-CR", "base_delivery_fee_pkr": 120.0, "allows_same_day": True, "same_day_cutoff_hour": 16},
    {"name": "Gulberg & Jinnah Colony", "sector_code": "FSD-GB", "base_delivery_fee_pkr": 120.0, "allows_same_day": True, "same_day_cutoff_hour": 16},
    {"name": "Batala Colony & Satyana Road", "sector_code": "FSD-BC", "base_delivery_fee_pkr": 120.0, "allows_same_day": True, "same_day_cutoff_hour": 16},
    {"name": "Ghulam Muhammad Abad", "sector_code": "FSD-GMA", "base_delivery_fee_pkr": 130.0, "allows_same_day": True, "same_day_cutoff_hour": 15},
    {"name": "Sargodha Road & Millat Town", "sector_code": "FSD-SR", "base_delivery_fee_pkr": 130.0, "allows_same_day": True, "same_day_cutoff_hour": 15},
    {"name": "Samanabad & Novelty Bridge", "sector_code": "FSD-SB", "base_delivery_fee_pkr": 130.0, "allows_same_day": True, "same_day_cutoff_hour": 15},
    {"name": "Clock Tower (8 Bazaars / Rail Bazaar)", "sector_code": "FSD-CT", "base_delivery_fee_pkr": 100.0, "allows_same_day": True, "same_day_cutoff_hour": 17},
]

def seed_default_delivery_zones(db: Session):
    for z in FAISALABAD_DEFAULT_ZONES:
        existing = db.query(DeliveryZone).filter(DeliveryZone.name == z["name"]).first()
        if not existing:
            zone = DeliveryZone(
                name=z["name"],
                sector_code=z["sector_code"],
                base_delivery_fee_pkr=z["base_delivery_fee_pkr"],
                allows_same_day=z["allows_same_day"],
                same_day_cutoff_hour=z["same_day_cutoff_hour"],
                standard_delivery_hours=24,
                is_active=True,
                description="Fast local courier within Faisalabad municipal limits."
            )
            db.add(zone)
    db.commit()

def calculate_delivery_estimate(
    db: Session,
    locality: str,
    subtotal_pkr: float = 0.0,
    delivery_speed: str = "Standard Delivery"
) -> DeliveryEstimateResponse:
    zone = db.query(DeliveryZone).filter(
        DeliveryZone.name.ilike(f"%{locality}%"),
        DeliveryZone.is_active == True
    ).first()

    now = datetime.now()
    current_hour = now.hour

    if not zone:
        # Generic Faisalabad zone fallback
        base_fee = settings.DEFAULT_DELIVERY_FEE_PKR
        cutoff_hour = settings.SAME_DAY_CUTOFF_HOUR
        allows_same_day = True
        is_valid = True
    else:
        base_fee = zone.base_delivery_fee_pkr
        cutoff_hour = zone.same_day_cutoff_hour
        allows_same_day = zone.allows_same_day
        is_valid = True

    is_same_day_available_now = allows_same_day and (current_hour < cutoff_hour)
    
    if subtotal_pkr >= settings.FREE_DELIVERY_THRESHOLD_PKR:
        final_fee = 0.0
        free_applied = True
    else:
        final_fee = base_fee + (settings.SAME_DAY_EXTRA_FEE_PKR if delivery_speed == "Same-Day Express" else 0.0)
        free_applied = False

    cutoff_formatted = f"{cutoff_hour % 12 or 12}:00 {'PM' if cutoff_hour >= 12 else 'AM'}"
    cutoff_notice = f"Order before {cutoff_formatted} for Same-Day Delivery in {locality or 'Faisalabad'}"

    if delivery_speed == "Same-Day Express" and is_same_day_available_now:
        arrival_text = f"Today by 8:00 PM (Express to {locality})"
    elif is_same_day_available_now and allows_same_day:
        arrival_text = f"Today or Tomorrow morning in {locality}"
    else:
        arrival_text = f"Tomorrow by 2:00 PM - 6:00 PM in {locality}"

    return DeliveryEstimateResponse(
        locality=locality or "Faisalabad",
        is_valid_zone=is_valid,
        allows_same_day=allows_same_day,
        is_same_day_available_now=is_same_day_available_now,
        cutoff_time_notice=cutoff_notice,
        base_fee_pkr=base_fee,
        final_fee_pkr=final_fee,
        free_delivery_applied=free_applied,
        estimated_arrival=arrival_text
    )
