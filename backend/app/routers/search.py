import math
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.product import PaginatedProducts, SearchSuggestionOut
from app.services.search_service import search_products, get_search_suggestions
from app.services.product_service import format_product_out, get_facets

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("", response_model=PaginatedProducts)
def search(
    q: str = Query("", description="Search query string"),
    category_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    in_stock: Optional[bool] = None,
    same_day: Optional[bool] = None,
    sort_by: str = Query("relevance", pattern="^(relevance|price_asc|price_desc|newest|discount)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db)
):
    matched_prods, is_exact, alternatives = search_products(
        db=db,
        query=q,
        category_id=category_id,
        brand_id=brand_id,
        min_price=min_price,
        max_price=max_price,
        in_stock_only=bool(in_stock),
        same_day_only=bool(same_day)
    )

    # If we have matches, sort them if requested
    if sort_by == "price_asc":
        matched_prods.sort(key=lambda x: x.price)
    elif sort_by == "price_desc":
        matched_prods.sort(key=lambda x: x.price, reverse=True)
    elif sort_by == "newest":
        matched_prods.sort(key=lambda x: x.created_at, reverse=True)
    elif sort_by == "discount":
        matched_prods.sort(key=lambda x: x.discount_percent, reverse=True)

    facets = get_facets(db, matched_prods if is_exact else alternatives)

    total = len(matched_prods)
    total_pages = math.ceil(total / limit) if total > 0 else 1
    offset = (page - 1) * limit
    paged_items = matched_prods[offset:offset + limit]

    return PaginatedProducts(
        items=[format_product_out(p) for p in paged_items],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        min_price=facets["min_price"],
        max_price=facets["max_price"],
        is_exact_match=is_exact,
        alternative_suggestions=[format_product_out(p) for p in alternatives],
        categories=facets["categories"],
        brands=facets["brands"]
    )

@router.get("/suggestions", response_model=List[SearchSuggestionOut])
def suggestions(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    raw_suggs = get_search_suggestions(db, q, limit=8)
    return [SearchSuggestionOut(**s) for s in raw_suggs]
