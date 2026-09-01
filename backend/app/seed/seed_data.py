from sqlalchemy.orm import Session
from app.models.user import User, Address
from app.models.category import Category
from app.models.brand import Brand
from app.models.product import Product, ProductImage, ProductSpecification
from app.models.delivery_zone import DeliveryZone
from app.services.auth_service import get_password_hash
from app.services.delivery_service import seed_default_delivery_zones

def seed_database(db: Session):
    # Check if already seeded
    if db.query(Product).count() > 0:
        return

    # 1. Delivery Zones
    seed_default_delivery_zones(db)

    # 2. Users (Admin and Demo Customer)
    admin_user = User(
        full_name="Lyallpur Admin",
        email="admin@lyallpurbazaar.pk",
        phone_number="03001234567",
        hashed_password=get_password_hash("Admin@123"),
        is_admin=True,
        is_active=True
    )
    db.add(admin_user)

    customer_user = User(
        full_name="Muhammad Usman",
        email="usman@example.com",
        phone_number="03217654321",
        hashed_password=get_password_hash("Customer@123"),
        is_admin=False,
        is_active=True
    )
    db.add(customer_user)
    db.flush()

    # Customer Default Address in Faisalabad
    addr = Address(
        user_id=customer_user.id,
        title="Home",
        recipient_name="Muhammad Usman",
        phone_number="03217654321",
        city="Faisalabad",
        locality="Peoples Colony No. 1",
        full_address="House 42-B, Street 7, Near Chenab Club, Peoples Colony No. 1",
        nearby_landmark="Near Chenab Club / D Ground",
        is_default=True
    )
    db.add(addr)

    # 3. Brands
    brands_data = [
        {"name": "Dalda", "slug": "dalda", "description": "Pakistan's premium cooking oil & Banaspati brand."},
        {"name": "Surf Excel", "slug": "surf-excel", "description": "Leading stain removal laundry detergent."},
        {"name": "Ariel", "slug": "ariel", "description": "High performance washing powder and pods."},
        {"name": "Shan Foods", "slug": "shan-foods", "description": "Authentic recipe mixes, spices and masalas."},
        {"name": "National Foods", "slug": "national-foods", "description": "Pakistan's heritage brand for pickles, spices & recipe mixes."},
        {"name": "Tapal", "slug": "tapal", "description": "Pakistan's favorite tea brand (Danedar, Mezban)."},
        {"name": "Olpers", "slug": "olpers", "description": "Pure and wholesome UHT milk & dairy products."},
        {"name": "Rooh Afza", "slug": "rooh-afza", "description": "Hamdard's summer drink of the east."},
        {"name": "Audionic", "slug": "audionic", "description": "Sound and mobile audio accessories leader in Pakistan."},
        {"name": "Dawlance", "slug": "dawlance", "description": "Reliable Pakistani home appliances."},
        {"name": "Anex", "slug": "anex", "description": "Durable kitchen appliances and food processors."},
        {"name": "Sitara Textiles", "slug": "sitara-textiles", "description": "Faisalabad's famous cotton fabrics and bed linens."},
        {"name": "Guard", "slug": "guard", "description": "Finest Super Kernel Basmati Rice."},
        {"name": "Dettol", "slug": "dettol", "description": "Antiseptic liquids, soaps and hand sanitizers."},
        {"name": "Harpic", "slug": "harpic", "description": "Powerful toilet cleaner & bathroom disinfection."},
        {"name": "Pampers", "slug": "pampers", "description": "All-around protection baby diapers."},
        {"name": "Sensodyne", "slug": "sensodyne", "description": "Dentist recommended toothpaste for sensitivity."},
        {"name": "Xiaomi / Redmi", "slug": "xiaomi", "description": "Smart electronics, powerbanks and mobile accessories."}
    ]
    brand_map = {}
    for b in brands_data:
        brand = Brand(name=b["name"], slug=b["slug"], description=b["description"])
        db.add(brand)
        db.flush()
        brand_map[b["slug"]] = brand.id

    # 4. Categories
    categories_data = [
        {"name": "Grocery & Staples", "slug": "grocery-staples", "icon_name": "ShoppingBag", "display_order": 1},
        {"name": "Beverages & Dairy", "slug": "beverages-dairy", "icon_name": "Coffee", "display_order": 2},
        {"name": "Household & Cleaning", "slug": "household-cleaning", "icon_name": "Sparkles", "display_order": 3},
        {"name": "Personal Care", "slug": "personal-care", "icon_name": "Heart", "display_order": 4},
        {"name": "Baby Care", "slug": "baby-care", "icon_name": "Baby", "display_order": 5},
        {"name": "Electronics & Appliances", "slug": "electronics-appliances", "icon_name": "Tv", "display_order": 6},
        {"name": "Mobile Accessories", "slug": "mobile-accessories", "icon_name": "Smartphone", "display_order": 7},
        {"name": "Home & Kitchen", "slug": "home-kitchen", "icon_name": "Home", "display_order": 8},
        {"name": "Faisalabad Textiles & Fashion", "slug": "textiles-fashion", "icon_name": "Shirt", "display_order": 9},
        {"name": "Health & Wellness", "slug": "health-wellness", "icon_name": "Activity", "display_order": 10},
    ]
    cat_map = {}
    for c in categories_data:
        cat = Category(name=c["name"], slug=c["slug"], icon_name=c["icon_name"], display_order=c["display_order"])
        db.add(cat)
        db.flush()
        cat_map[c["slug"]] = cat.id

    # 5. Realistic Pakistani Products
    products_seed = [
        # --- GROCERY & STAPLES ---
        {
            "name": "Dalda Fortified Cooking Oil Pouch 1 Litre x 5",
            "slug": "dalda-fortified-cooking-oil-1l-x5",
            "sku": "GR-DAL-001",
            "category_slug": "grocery-staples",
            "brand_slug": "dalda",
            "price": 2650.0,
            "original_price": 2850.0,
            "discount_percent": 7,
            "stock_quantity": 35,
            "pack_size": "5 x 1 Litre",
            "unit": "pack",
            "search_keywords": "dalda oil cooking oil tail ghee banaspati 1 litre grocery rashan",
            "is_featured": True,
            "is_best_deal": True,
            "estimated_delivery_days": 0,
            "rating": 4.8,
            "description": "Dalda Fortified Cooking Oil with Vitamin A and D. Pure cholesterol-free cooking oil for delicious and healthy daily cooking for Pakistani families.",
            "images": ["https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Net Volume", "5 Litres (5 Pouches)"), ("Cholesterol", "0mg"), ("Vitamins", "Enriched with A & D"), ("Origin", "Pakistan")]
        },
        {
            "name": "Dalda Fortified Cooking Oil 1 Litre Pouch",
            "slug": "dalda-fortified-cooking-oil-1l-single",
            "sku": "GR-DAL-002",
            "category_slug": "grocery-staples",
            "brand_slug": "dalda",
            "price": 540.0,
            "original_price": 570.0,
            "discount_percent": 5,
            "stock_quantity": 40,
            "pack_size": "1 Litre",
            "unit": "litre",
            "search_keywords": "dalda oil cooking oil pouch 1l 1 litre tail ghee rashan",
            "is_featured": False,
            "is_best_deal": False,
            "estimated_delivery_days": 0,
            "rating": 4.7,
            "description": "Single pouch of Dalda Fortified Cooking Oil 1 Litre.",
            "images": ["https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Net Volume", "1 Litre"), ("Type", "Cooking Oil"), ("Enriched", "Vitamin A, D")]
        },
        {
            "name": "Guard Super Kernel Basmati Rice 5kg",
            "slug": "guard-super-kernel-basmati-rice-5kg",
            "sku": "GR-GUA-001",
            "category_slug": "grocery-staples",
            "brand_slug": "guard",
            "price": 2250.0,
            "original_price": 2450.0,
            "discount_percent": 8,
            "stock_quantity": 25,
            "pack_size": "5 kg",
            "unit": "bag",
            "search_keywords": "guard rice chawal basmati super kernel 5kg biryani palao rice rashan",
            "is_featured": True,
            "is_best_deal": False,
            "estimated_delivery_days": 0,
            "rating": 4.9,
            "description": "Guard Super Kernel Basmati Rice offers long aromatic grains aged to perfection. Ideal for Pakistani Biryani, Pulao, and daily dining in Faisalabad.",
            "images": ["https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Weight", "5 Kilograms"), ("Grain Type", "Super Kernel Basmati"), ("Aged", "1+ Year"), ("Origin", "Punjab, Pakistan")]
        },
        {
            "name": "Shan Bombay Biryani Masala Recipe Mix (Pack of 3)",
            "slug": "shan-bombay-biryani-masala-pack-of-3",
            "sku": "GR-SHN-001",
            "category_slug": "grocery-staples",
            "brand_slug": "shan-foods",
            "price": 420.0,
            "original_price": 450.0,
            "discount_percent": 7,
            "stock_quantity": 60,
            "pack_size": "3 x 50g",
            "unit": "pack",
            "search_keywords": "shan biryani masala bombay biryani spice recipe mix national masala packet",
            "is_featured": True,
            "is_best_deal": False,
            "estimated_delivery_days": 0,
            "rating": 4.9,
            "description": "Shan Bombay Biryani Recipe Mix contains an exotic blend of fragrant spices for authentic spicy Bombay style biryani.",
            "images": ["https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Net Weight", "150g (3 x 50g)"), ("Servings", "6-8 per pack"), ("Form", "Powder spice mix")]
        },
        {
            "name": "National Biryani Masala Double Pack 100g",
            "slug": "national-biryani-masala-100g",
            "sku": "GR-NAT-001",
            "category_slug": "grocery-staples",
            "brand_slug": "national-foods",
            "price": 280.0,
            "original_price": 300.0,
            "discount_percent": 7,
            "stock_quantity": 50,
            "pack_size": "100g",
            "unit": "pack",
            "search_keywords": "national biryani masala spices shan masala recipe mix spicy chawal",
            "is_featured": False,
            "is_best_deal": False,
            "estimated_delivery_days": 0,
            "rating": 4.7,
            "description": "National Biryani Masala mix with traditional spices and dried plums for lip-smacking homemade Karachi and Faisalabadi biryani.",
            "images": ["https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Weight", "100g"), ("Flavor", "Classic Biryani"), ("Brand", "National Foods")]
        },
        {
            "name": "National Mixed Pickle (Achar) 1kg Glass Jar",
            "slug": "national-mixed-pickle-1kg",
            "sku": "GR-NAT-002",
            "category_slug": "grocery-staples",
            "brand_slug": "national-foods",
            "price": 580.0,
            "original_price": 620.0,
            "discount_percent": 6,
            "stock_quantity": 30,
            "pack_size": "1 kg",
            "unit": "jar",
            "search_keywords": "national mixed pickle achar aam ka achar lehsan mirch pickle jar",
            "is_featured": False,
            "is_best_deal": False,
            "estimated_delivery_days": 0,
            "rating": 4.6,
            "description": "National Mixed Pickle made from fresh mangoes, carrots, green chillies, and aromatic mustard oil.",
            "images": ["https://images.unsplash.com/photo-1589135233689-d56d10c2c1c6?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Weight", "1 Kilogram"), ("Packaging", "Jar"), ("Type", "Mixed Vegetable Pickle")]
        },

        # --- BEVERAGES & DAIRY ---
        {
            "name": "Tapal Danedar Black Tea Economy Pack 900g",
            "slug": "tapal-danedar-tea-900g",
            "sku": "BEV-TAP-001",
            "category_slug": "beverages-dairy",
            "brand_slug": "tapal",
            "price": 1690.0,
            "original_price": 1850.0,
            "discount_percent": 9,
            "stock_quantity": 45,
            "pack_size": "900 g",
            "unit": "pack",
            "search_keywords": "tapal danedar chai patti tea black tea economy pack lipton supreme",
            "is_featured": True,
            "is_best_deal": True,
            "estimated_delivery_days": 0,
            "rating": 4.9,
            "description": "Tapal Danedar tea is renowned for its unmatched aroma, strong blend, and golden rich color that fuels mornings across Pakistan.",
            "images": ["https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Weight", "900 Grams"), ("Type", "Black Granular Tea"), ("Origin", "Kenya / Pakistan")]
        },
        {
            "name": "Tapal Danedar Black Tea 450g",
            "slug": "tapal-danedar-tea-450g",
            "sku": "BEV-TAP-002",
            "category_slug": "beverages-dairy",
            "brand_slug": "tapal",
            "price": 870.0,
            "original_price": 930.0,
            "discount_percent": 6,
            "stock_quantity": 55,
            "pack_size": "450 g",
            "unit": "pack",
            "search_keywords": "tapal danedar chai patti 450g tea black tea medium pack",
            "is_featured": False,
            "is_best_deal": False,
            "estimated_delivery_days": 0,
            "rating": 4.8,
            "description": "Tapal Danedar 450g box. Perfect rich blend for daily cups of chai.",
            "images": ["https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Weight", "450 Grams"), ("Packaging", "Box")]
        },
        {
            "name": "Olper's UHT Pure Full Cream Milk 1 Litre (Pack of 12)",
            "slug": "olpers-milk-1l-pack-of-12",
            "sku": "BEV-OLP-001",
            "category_slug": "beverages-dairy",
            "brand_slug": "olpers",
            "price": 3480.0,
            "original_price": 3720.0,
            "discount_percent": 6,
            "stock_quantity": 20,
            "pack_size": "12 x 1 Litre",
            "unit": "carton",
            "search_keywords": "olpers milk doodh milk pack tetra pack uht dairy cream carton 12 litre",
            "is_featured": True,
            "is_best_deal": True,
            "estimated_delivery_days": 0,
            "rating": 4.9,
            "description": "Olper's Full Cream UHT Milk is 100% preservative-free, pure, and enriched with calcium and minerals for healthy bones.",
            "images": ["https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Net Volume", "12 Litres (12 Cartons)"), ("Type", "UHT Homogenized Full Cream"), ("Preservatives", "Zero")]
        },
        {
            "name": "Olper's UHT Pure Milk 1 Litre Single",
            "slug": "olpers-milk-1l-single",
            "sku": "BEV-OLP-002",
            "category_slug": "beverages-dairy",
            "brand_slug": "olpers",
            "price": 295.0,
            "original_price": 310.0,
            "discount_percent": 5,
            "stock_quantity": 50,
            "pack_size": "1 Litre",
            "unit": "carton",
            "search_keywords": "olpers milk doodh single 1 litre tetra pack",
            "is_featured": False,
            "is_best_deal": False,
            "estimated_delivery_days": 0,
            "rating": 4.8,
            "description": "Olper's Full Cream UHT Milk 1 Litre single pack.",
            "images": ["https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Net Volume", "1 Litre"), ("Fat Content", "3.5%")]
        },
        {
            "name": "Hamdard Rooh Afza Sharbat 800ml Bottle",
            "slug": "hamdard-rooh-afza-800ml",
            "sku": "BEV-HAM-001",
            "category_slug": "beverages-dairy",
            "brand_slug": "rooh-afza",
            "price": 440.0,
            "original_price": 470.0,
            "discount_percent": 6,
            "stock_quantity": 40,
            "pack_size": "800 ml",
            "unit": "bottle",
            "search_keywords": "rooh afza sharbat jam e shirin hamdard red syrup summer drink iftari doodh roohafza",
            "is_featured": True,
            "is_best_deal": False,
            "estimated_delivery_days": 0,
            "rating": 4.9,
            "description": "Hamdard Rooh Afza - Refreshing herbal syrup crafted with natural herbal extracts and cooling floral essences. Loved in Faisalabad during hot summers.",
            "images": ["https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Volume", "800 ml"), ("Serving", "Mix with chilled water or milk"), ("Form", "Syrup")]
        },

        # --- HOUSEHOLD & CLEANING ---
        {
            "name": "Surf Excel Quick Wash Detergent Powder 1kg",
            "slug": "surf-excel-quick-wash-1kg",
            "sku": "HSD-SRF-001",
            "category_slug": "household-cleaning",
            "brand_slug": "surf-excel",
            "price": 680.0,
            "original_price": 750.0,
            "discount_percent": 9,
            "stock_quantity": 50,
            "pack_size": "1 kg",
            "unit": "pack",
            "search_keywords": "surf excel quick wash 1kg washing powder surf detergent kapray dhonay wala ariel brite",
            "is_featured": True,
            "is_best_deal": False,
            "estimated_delivery_days": 0,
            "rating": 4.8,
            "description": "Surf Excel Quick Wash with X-Tra Clean Particles removes tough stains easily in just 1 wash, preserving color and fragrance.",
            "images": ["https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Weight", "1 Kilogram"), ("Machine/Hand", "Suitable for both"), ("Scent", "Fresh Floral")]
        },
        {
            "name": "Surf Excel Quick Wash Detergent Powder 500g",
            "slug": "surf-excel-quick-wash-500g",
            "sku": "HSD-SRF-002",
            "category_slug": "household-cleaning",
            "brand_slug": "surf-excel",
            "price": 360.0,
            "original_price": 390.0,
            "discount_percent": 8,
            "stock_quantity": 40,
            "pack_size": "500 g",
            "unit": "pack",
            "search_keywords": "surf excel 500g quick wash detergent washing powder small pack",
            "is_featured": False,
            "is_best_deal": False,
            "estimated_delivery_days": 0,
            "rating": 4.7,
            "description": "Surf Excel 500g small pack for convenient stain removal.",
            "images": ["https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Weight", "500 Grams"), ("Brand", "Surf Excel")]
        },
        {
            "name": "Surf Excel Quick Wash Detergent Powder 2kg Mega Saver",
            "slug": "surf-excel-quick-wash-2kg",
            "sku": "HSD-SRF-003",
            "category_slug": "household-cleaning",
            "brand_slug": "surf-excel",
            "price": 1290.0,
            "original_price": 1450.0,
            "discount_percent": 11,
            "stock_quantity": 30,
            "pack_size": "2 kg",
            "unit": "pack",
            "search_keywords": "surf excel 2kg mega pack washing powder detergent saver",
            "is_featured": False,
            "is_best_deal": True,
            "estimated_delivery_days": 0,
            "rating": 4.9,
            "description": "Surf Excel 2kg Mega Saver pack. Maximum stain removal at the best value.",
            "images": ["https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Weight", "2 Kilograms"), ("Value", "Mega Saver")]
        },
        {
            "name": "Ariel Original Washing Powder 1kg",
            "slug": "ariel-original-washing-powder-1kg",
            "sku": "HSD-ARL-001",
            "category_slug": "household-cleaning",
            "brand_slug": "ariel",
            "price": 670.0,
            "original_price": 730.0,
            "discount_percent": 8,
            "stock_quantity": 40,
            "pack_size": "1 kg",
            "unit": "pack",
            "search_keywords": "ariel washing powder 1kg surf detergent kapray stain remover alternative surf excel",
            "is_featured": True,
            "is_best_deal": False,
            "estimated_delivery_days": 0,
            "rating": 4.8,
            "description": "Ariel Original Washing Powder with deep clean formula for impeccable whites and vibrant colored clothes.",
            "images": ["https://images.unsplash.com/photo-1585670210693-e7fdd16b142e?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Weight", "1 Kilogram"), ("Type", "Detergent Powder"), ("Formula", "Deep Stain Lift")]
        },
        {
            "name": "Harpic Power Plus Toilet Cleaner Original 1 Litre",
            "slug": "harpic-power-plus-toilet-cleaner-1l",
            "sku": "HSD-HRP-001",
            "category_slug": "household-cleaning",
            "brand_slug": "harpic",
            "price": 540.0,
            "original_price": 590.0,
            "discount_percent": 8,
            "stock_quantity": 35,
            "pack_size": "1 Litre",
            "unit": "bottle",
            "search_keywords": "harpic toilet cleaner power plus bathroom cleaner disinfectant flush cleaner",
            "is_featured": False,
            "is_best_deal": False,
            "estimated_delivery_days": 0,
            "rating": 4.8,
            "description": "Harpic Power Plus 10x Max Clean removes limescale, yellow stains, and eliminates 99.9% of germs.",
            "images": ["https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Volume", "1000 ml"), ("Formula", "Thick Liquid Gel"), ("Target", "Disinfection & Descaling")]
        },
        {
            "name": "Dettol Antiseptic Liquid Disinfectant 500ml",
            "slug": "dettol-antiseptic-liquid-500ml",
            "sku": "HSD-DET-001",
            "category_slug": "household-cleaning",
            "brand_slug": "dettol",
            "price": 690.0,
            "original_price": 750.0,
            "discount_percent": 8,
            "stock_quantity": 30,
            "pack_size": "500 ml",
            "unit": "bottle",
            "search_keywords": "dettol liquid antiseptic disinfectant first aid germs cleaning floor wash",
            "is_featured": False,
            "is_best_deal": False,
            "estimated_delivery_days": 0,
            "rating": 4.9,
            "description": "Dettol Antiseptic Disinfectant Liquid protects against 100 illness-causing germs. Suitable for first aid, surface sanitization, and laundry.",
            "images": ["https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Volume", "500 ml"), ("Usage", "Multi-purpose antiseptic"), ("Brand", "Dettol")]
        },

        # --- PERSONAL CARE ---
        {
            "name": "Sensodyne Multi Care Sensitive Toothpaste 100g",
            "slug": "sensodyne-multi-care-toothpaste-100g",
            "sku": "PC-SEN-001",
            "category_slug": "personal-care",
            "brand_slug": "sensodyne",
            "price": 460.0,
            "original_price": 490.0,
            "discount_percent": 6,
            "stock_quantity": 45,
            "pack_size": "100 g",
            "unit": "tube",
            "search_keywords": "sensodyne toothpaste dental care teeth sensitivity colgate medicated paste",
            "is_featured": True,
            "is_best_deal": False,
            "estimated_delivery_days": 0,
            "rating": 4.8,
            "description": "Sensodyne Multi Care clinically proven daily relief from tooth sensitivity with 24/7 protection and fresh breath.",
            "images": ["https://images.unsplash.com/photo-1559591937-e1032b90f42b?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Weight", "100 Grams"), ("Benefits", "Cavity protection, sensitivity relief")]
        },
        {
            "name": "Dettol Original Anti-Bacterial Soap (Pack of 3 x 120g)",
            "slug": "dettol-soap-original-pack-of-3",
            "sku": "PC-DET-002",
            "category_slug": "personal-care",
            "brand_slug": "dettol",
            "price": 480.0,
            "original_price": 540.0,
            "discount_percent": 11,
            "stock_quantity": 50,
            "pack_size": "3 x 120g",
            "unit": "pack",
            "search_keywords": "dettol soap sabun bathing soap anti bacterial safeguard lifebuoy hygiene",
            "is_featured": False,
            "is_best_deal": True,
            "estimated_delivery_days": 0,
            "rating": 4.8,
            "description": "Dettol Original Germ Protection Bathing Bar enriched with moisturizers for clean and healthy skin.",
            "images": ["https://images.unsplash.com/photo-1607006314777-62885973b185?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Pack Size", "3 Bars x 120g (360g Total)"), ("Type", "Anti-bacterial Bath Soap")]
        },

        # --- BABY CARE ---
        {
            "name": "Pampers Baby Dry Diapers Large Size 4 (Pack of 48)",
            "slug": "pampers-baby-dry-large-size-4-48pcs",
            "sku": "BABY-PAM-001",
            "category_slug": "baby-care",
            "brand_slug": "pampers",
            "price": 2890.0,
            "original_price": 3150.0,
            "discount_percent": 8,
            "stock_quantity": 25,
            "pack_size": "48 Pieces",
            "unit": "pack",
            "search_keywords": "pampers diaper baby dry size 4 large baby pampers canbebe molfix huggies bachy",
            "is_featured": True,
            "is_best_deal": False,
            "estimated_delivery_days": 0,
            "rating": 4.9,
            "description": "Pampers Baby Dry Diapers with air channels for breathable overnight dryness and anti-rash lotion.",
            "images": ["https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Size", "Size 4 (Large, 9-14 kg)"), ("Quantity", "48 Diapers"), ("Leak Lock", "Up to 12 Hours")]
        },

        # --- MOBILE ACCESSORIES ---
        {
            "name": "Audionic Airbud 425 TWS Wireless Bluetooth Earbuds",
            "slug": "audionic-airbud-425-tws-earbuds",
            "sku": "MOB-AUD-001",
            "category_slug": "mobile-accessories",
            "brand_slug": "audionic",
            "price": 3499.0,
            "original_price": 4200.0,
            "discount_percent": 16,
            "stock_quantity": 20,
            "pack_size": "1 Set",
            "unit": "piece",
            "search_keywords": "audionic earbuds airbuds wireless bluetooth handsfree headphones airpod mobile charger",
            "is_featured": True,
            "is_best_deal": True,
            "estimated_delivery_days": 0,
            "rating": 4.7,
            "description": "Audionic Airbud 425 with Environmental Noise Cancellation (ENC), Quad Mics, 30 hours playtime, and Type-C fast charging.",
            "images": ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Playtime", "Up to 30 Hours with Case"), ("Bluetooth", "v5.3"), ("ENC", "Quad Mic Noise Cancellation"), ("Warranty", "1 Year Official")]
        },
        {
            "name": "Xiaomi Mi 33W Fast Charger with Type-C Cable",
            "slug": "xiaomi-33w-fast-charger-type-c",
            "sku": "MOB-XIA-001",
            "category_slug": "mobile-accessories",
            "brand_slug": "xiaomi",
            "price": 2350.0,
            "original_price": 2800.0,
            "discount_percent": 16,
            "stock_quantity": 30,
            "pack_size": "Adapter + Cable",
            "unit": "set",
            "search_keywords": "charger mobile charger 33w fast charger type c cable xiaomi redmi samsung adapter data cable",
            "is_featured": True,
            "is_best_deal": False,
            "estimated_delivery_days": 0,
            "rating": 4.8,
            "description": "Xiaomi 33W SonicCharge 2.0 Fast Wall Charger with included 1-meter high-speed Type-C copper data cable. Supports Quick Charge 3.0.",
            "images": ["https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Output", "33W Max Quick Charge"), ("Port", "USB-A to Type-C"), ("Compatibility", "Xiaomi, Samsung, Infinix, Tecno")]
        },
        {
            "name": "Xiaomi 20000mAh Power Bank 3 Fast Charge (18W)",
            "slug": "xiaomi-20000mah-power-bank-3",
            "sku": "MOB-XIA-002",
            "category_slug": "mobile-accessories",
            "brand_slug": "xiaomi",
            "price": 5450.0,
            "original_price": 6200.0,
            "discount_percent": 12,
            "stock_quantity": 18,
            "pack_size": "1 Unit",
            "unit": "piece",
            "search_keywords": "power bank powerbank 20000mah xiaomi portable battery mobile charger",
            "is_featured": False,
            "is_best_deal": True,
            "estimated_delivery_days": 1,
            "rating": 4.9,
            "description": "High capacity 20,000mAh Lithium Polymer powerbank with dual USB output and two-way 18W fast charging.",
            "images": ["https://images.unsplash.com/photo-1609592426508-cc02150e41a8?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Capacity", "20,000 mAh"), ("Ports", "Dual USB-A + Type-C Input/Output"), ("Safety", "9 Layer Circuit Protection")]
        },

        # --- ELECTRONICS & HOME APPLIANCES ---
        {
            "name": "Anex Deluxe Electric Kettle 1.7L Stainless Steel",
            "slug": "anex-deluxe-electric-kettle-1-7l",
            "sku": "ELC-ANX-001",
            "category_slug": "electronics-appliances",
            "brand_slug": "anex",
            "price": 4650.0,
            "original_price": 5200.0,
            "discount_percent": 10,
            "stock_quantity": 15,
            "pack_size": "1.7 Litre",
            "unit": "unit",
            "search_keywords": "electric kettle anex water heater boiler tea maker appliances kitchen kettle",
            "is_featured": False,
            "is_best_deal": False,
            "estimated_delivery_days": 1,
            "rating": 4.6,
            "description": "Anex Stainless Steel Fast Boiling Electric Kettle 1.7L with auto shut-off, boil-dry protection, and 360-degree cordless base.",
            "images": ["https://images.unsplash.com/photo-1594213114663-d94db9b17125?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Capacity", "1.7 Litres"), ("Power", "1850 - 2200 Watts"), ("Material", "Food Grade Stainless Steel"), ("Warranty", "2 Years")]
        },
        {
            "name": "Dawlance Heavy Weight Dry Iron (1000W)",
            "slug": "dawlance-heavy-weight-dry-iron",
            "sku": "ELC-DAW-001",
            "category_slug": "electronics-appliances",
            "brand_slug": "dawlance",
            "price": 5200.0,
            "original_price": 5800.0,
            "discount_percent": 10,
            "stock_quantity": 16,
            "pack_size": "1 Unit",
            "unit": "piece",
            "search_keywords": "iron istri dawlance heavy dry iron kapray press kapre press karachi faisalabad",
            "is_featured": True,
            "is_best_deal": False,
            "estimated_delivery_days": 1,
            "rating": 4.8,
            "description": "Classic heavy weight dry iron with gold-coated non-stick soleplate and adjustable fabric thermostat for crisp Shalwar Kameez ironing.",
            "images": ["https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Weight", "2.5 kg Heavy Body"), ("Power", "1000W"), ("Soleplate", "Gold Non-stick Teflon"), ("Warranty", "1 Year")]
        },

        # --- FAISALABAD TEXTILES & FASHION ---
        {
            "name": "Sitara Classic Unstitched Men's Wash & Wear Suit 4 Meters",
            "slug": "sitara-mens-wash-and-wear-suit-4m",
            "sku": "TEX-SIT-001",
            "category_slug": "textiles-fashion",
            "brand_slug": "sitara-textiles",
            "price": 2850.0,
            "original_price": 3500.0,
            "discount_percent": 18,
            "stock_quantity": 25,
            "pack_size": "4 Meters",
            "unit": "suit",
            "search_keywords": "sitara textiles mens fabric wash and wear shalwar kameez faisalabad cloth kapra unstitched suit",
            "is_featured": True,
            "is_best_deal": True,
            "estimated_delivery_days": 0,
            "rating": 4.9,
            "description": "Authentic Faisalabad premium blended Wash & Wear fabric from Sitara Textiles. Wrinkle-resistant, lightweight, and perfect for all seasons in Pakistan.",
            "images": ["https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Length", "4 Meters (Full Suit Cut)"), ("Fabric", "Premium Blended Wash & Wear"), ("Weave", "Faisalabad Textile Mills"), ("Color", "Steel Grey")]
        },
        {
            "name": "Faisalabad Pure Cotton Printed King Size Bedsheet Set with 2 Pillow Covers",
            "slug": "faisalabad-cotton-king-bedsheet-set",
            "sku": "TEX-FSD-002",
            "category_slug": "textiles-fashion",
            "brand_slug": "sitara-textiles",
            "price": 1950.0,
            "original_price": 2400.0,
            "discount_percent": 18,
            "stock_quantity": 20,
            "pack_size": "1 Sheet + 2 Covers",
            "unit": "set",
            "search_keywords": "bedsheet king size cotton bed cover pillow cases chadar faisalabad bedsheets home decor",
            "is_featured": False,
            "is_best_deal": True,
            "estimated_delivery_days": 0,
            "rating": 4.7,
            "description": "100% export quality pure cotton king size bed sheet with vibrant floral reactive printing directly from the weavers of Faisalabad.",
            "images": ["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&auto=format&fit=crop&q=80"],
            "specs": [("Size", "King Size (95 x 100 inches)"), ("Pillows", "2 Matching Pillow Covers (19 x 29 in)"), ("Material", "100% Breathable Cotton")]
        }
    ]

    for p_data in products_seed:
        cat_id = cat_map[p_data["category_slug"]]
        brand_id = brand_map.get(p_data["brand_slug"])
        
        prod = Product(
            name=p_data["name"],
            slug=p_data["slug"],
            sku=p_data["sku"],
            category_id=cat_id,
            brand_id=brand_id,
            price=p_data["price"],
            original_price=p_data["original_price"],
            discount_percent=p_data["discount_percent"],
            stock_quantity=p_data["stock_quantity"],
            availability_status="In Stock" if p_data["stock_quantity"] > 0 else "Out of Stock",
            pack_size=p_data["pack_size"],
            unit=p_data["unit"],
            search_keywords=p_data["search_keywords"],
            is_featured=p_data["is_featured"],
            is_best_deal=p_data["is_best_deal"],
            is_active=True,
            rating=p_data["rating"],
            review_count=p_data.get("review_count", 15),
            estimated_delivery_days=p_data["estimated_delivery_days"],
            description=p_data["description"]
        )
        db.add(prod)
        db.flush()

        for idx, img_url in enumerate(p_data["images"]):
            img = ProductImage(
                product_id=prod.id,
                image_url=img_url,
                alt_text=prod.name,
                is_primary=(idx == 0),
                display_order=idx
            )
            db.add(img)

        for idx, (k, v) in enumerate(p_data["specs"]):
            spec = ProductSpecification(
                product_id=prod.id,
                spec_key=k,
                spec_value=v,
                display_order=idx
            )
            db.add(spec)

    db.commit()
    print("Successfully seeded Faisalabad marketplace database!")
