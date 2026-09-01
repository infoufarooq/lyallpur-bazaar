import re
from typing import List, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.models.product import Product, ProductImage
from app.models.brand import Brand
from app.models.category import Category
from app.config import settings

def clean_query(query: str) -> str:
    if not query:
        return ""
    return re.sub(r"[^\w\s\.-]", " ", query).strip().lower()

def score_product(product: Product, query_lower: str, query_tokens: List[str]) -> int:
    score = 0
    name_lower = product.name.lower()
    brand_name = product.brand.name.lower() if product.brand else ""
    cat_name = product.category.name.lower() if product.category else ""
    keywords = (product.search_keywords or "").lower()
    description = (product.description or "").lower()
    pack_size = (product.pack_size or "").lower()

    # 1. Exact Name Match
    if name_lower == query_lower:
        score += 150
    elif name_lower.startswith(query_lower):
        score += 100
    elif query_lower in name_lower:
        score += 75

    # 2. Brand Match
    if brand_name and query_lower in brand_name:
        score += 60
    elif brand_name == query_lower:
        score += 80

    # 3. Category Match
    if cat_name and query_lower in cat_name:
        score += 50

    # 4. Keywords Match
    if keywords and query_lower in keywords:
        score += 45

    # 5. Pack size / variant match
    if pack_size and query_lower in pack_size:
        score += 35

    # 6. Description Match
    if description and query_lower in description:
        score += 20

    # 7. Tokenized Overlap
    token_matches = 0
    for token in query_tokens:
        if len(token) < 2:
            continue
        if token in name_lower:
            score += 25
            token_matches += 1
        elif token in brand_name:
            score += 20
            token_matches += 1
        elif token in cat_name:
            score += 15
            token_matches += 1
        elif token in keywords:
            score += 15
            token_matches += 1
        elif token in description:
            score += 5

    # Boost in-stock products only if there was a real match
    if score > 0 and product.stock_quantity > 0:
        score += 10

    return score

def search_products(
    db: Session,
    query: str,
    category_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    in_stock_only: bool = False,
    same_day_only: bool = False
) -> Tuple[List[Product], bool, List[Product]]:
    """
    Returns (matched_products, is_exact_match, alternative_suggestions)
    """
    clean_q = clean_query(query)
    tokens = [t for t in clean_q.split() if len(t) > 1]

    base_query = db.query(Product).filter(Product.is_active == True)

    if category_id:
        base_query = base_query.filter(Product.category_id == category_id)
    if brand_id:
        base_query = base_query.filter(Product.brand_id == brand_id)
    if min_price is not None:
        base_query = base_query.filter(Product.price >= min_price)
    if max_price is not None:
        base_query = base_query.filter(Product.price <= max_price)
    if in_stock_only:
        base_query = base_query.filter(Product.stock_quantity > 0)
    if same_day_only:
        base_query = base_query.filter(Product.estimated_delivery_days == 0)

    all_products = base_query.all()

    if not clean_q:
        # No query string, return all sorted by featured / id
        return all_products, True, []

    # Score each product
    scored: List[Tuple[int, Product]] = []
    for prod in all_products:
        score = score_product(prod, clean_q, tokens)
        if score > 0:
            scored.append((score, prod))

    scored.sort(key=lambda x: x[0], reverse=True)
    exact_matches = [item[1] for item in scored]

    # If we have exact or good matches, return them
    if len(exact_matches) > 0:
        return exact_matches, True, []

    # If NO exact match found, generate smart alternatives:
    matched_category_id = None
    matched_brand_id = None

    for cat in db.query(Category).all():
        if cat.name.lower() in clean_q or clean_q in cat.name.lower():
            matched_category_id = cat.id
            break

    for brand in db.query(Brand).all():
        if brand.name.lower() in clean_q or clean_q in brand.name.lower():
            matched_brand_id = brand.id
            break

    # Build alternative candidate list
    alt_query = db.query(Product).filter(Product.is_active == True)
    if matched_category_id:
        alt_query = alt_query.filter(Product.category_id == matched_category_id)
    elif matched_brand_id:
        alt_query = alt_query.filter(Product.brand_id == matched_brand_id)
    else:
        # Fallback: products with partial token matches in keywords or name
        conditions = []
        for t in tokens:
            conditions.append(Product.name.ilike(f"%{t}%"))
            conditions.append(Product.search_keywords.ilike(f"%{t}%"))
            conditions.append(Product.description.ilike(f"%{t}%"))
        if conditions:
            alt_query = alt_query.filter(or_(*conditions))

    alternatives = alt_query.limit(8).all()
    if not alternatives:
        # Fallback: popular or featured items
        alternatives = db.query(Product).filter(Product.is_active == True, Product.stock_quantity > 0).order_by(Product.rating.desc()).limit(8).all()

    return [], False, alternatives

def find_alternative_products(db: Session, product: Product, limit: int = 6) -> List[Product]:
    """
    Finds direct alternatives for a given product based on:
    - Same category
    - Similar brand
    - Price tolerance within +/- 30%
    """
    min_p = product.price * (1 - settings.PRICE_TOLERANCE_PERCENT / 100.0)
    max_p = product.price * (1 + settings.PRICE_TOLERANCE_PERCENT / 100.0)

    alts = db.query(Product).filter(
        Product.id != product.id,
        Product.category_id == product.category_id,
        Product.price >= min_p,
        Product.price <= max_p,
        Product.is_active == True
    ).order_by(Product.stock_quantity.desc(), Product.rating.desc()).limit(limit).all()

    if len(alts) < limit:
        alt_ids = [a.id for a in alts] + [product.id]
        more_alts = db.query(Product).filter(
            ~Product.id.in_(alt_ids),
            Product.category_id == product.category_id,
            Product.is_active == True
        ).order_by(Product.rating.desc()).limit(limit - len(alts)).all()
        alts.extend(more_alts)

    return alts

def find_similar_products(db: Session, product: Product, limit: int = 6) -> List[Product]:
    return db.query(Product).filter(
        Product.id != product.id,
        or_(
            Product.category_id == product.category_id,
            Product.brand_id == product.brand_id
        ),
        Product.is_active == True
    ).order_by(Product.rating.desc()).limit(limit).all()

def get_search_suggestions(db: Session, query: str, limit: int = 8) -> List[dict]:
    clean_q = clean_query(query)
    if not clean_q:
        return []

    suggestions = []

    products = db.query(Product).filter(
        Product.is_active == True,
        Product.name.ilike(f"%{clean_q}%")
    ).limit(5).all()

    for p in products:
        primary_img = next((img.image_url for img in p.images if img.is_primary), None)
        if not primary_img and p.images:
            primary_img = p.images[0].image_url
        suggestions.append({
            "id": p.id,
            "title": p.name,
            "type": "product",
            "slug": p.slug,
            "category_name": p.category.name if p.category else "",
            "price": p.price,
            "image_url": primary_img
        })

    brands = db.query(Brand).filter(
        Brand.is_active == True,
        Brand.name.ilike(f"%{clean_q}%")
    ).limit(2).all()

    for b in brands:
        suggestions.append({
            "id": b.id,
            "title": b.name,
            "type": "brand",
            "slug": b.slug,
            "category_name": "Brand",
            "price": None,
            "image_url": b.logo_url
        })

    categories = db.query(Category).filter(
        Category.is_active == True,
        Category.name.ilike(f"%{clean_q}%")
    ).limit(2).all()

    for c in categories:
        suggestions.append({
            "id": c.id,
            "title": c.name,
            "type": "category",
            "slug": c.slug,
            "category_name": "Category",
            "price": None,
            "image_url": c.image_url
        })

    return suggestions[:limit]
