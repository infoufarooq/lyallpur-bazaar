-- ==============================================================================
-- Lyallpur Bazaar - Supabase PostgreSQL Production Schema & RBAC Architecture
-- Location: Faisalabad, Punjab, Pakistan
-- Target: Supabase PostgreSQL (Supports Supavisor Connection Pooling / Port 6543)
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. DYNAMIC ROLE-BASED ACCESS CONTROL (RBAC) TABLES
-- ==============================================================================

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permissions Association Table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ==============================================================================
-- 2. USERS & PROFILES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    business_name VARCHAR(150),
    vehicle_type VARCHAR(100),
    vehicle_number VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- User-Roles Association Table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Addresses Table (Faisalabad Localities)
CREATE TABLE IF NOT EXISTS addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(50) DEFAULT 'Home',
    recipient_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    city VARCHAR(50) NOT NULL DEFAULT 'Faisalabad',
    locality VARCHAR(100) NOT NULL,
    full_address TEXT NOT NULL,
    nearby_landmark VARCHAR(150),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_locality ON addresses(locality);

-- ==============================================================================
-- 3. CATALOG: CATEGORIES, BRANDS & PRODUCTS
-- ==============================================================================

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    icon_name VARCHAR(50),
    image_url VARCHAR(255),
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- Brands Table
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    logo_url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_is_active ON brands(is_active);

-- Products Table (Multi-Vendor Catalog with Seller Isolation)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(250) UNIQUE NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
    price NUMERIC(12, 2) NOT NULL,
    original_price NUMERIC(12, 2),
    discount_percent INTEGER NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 10,
    availability_status VARCHAR(30) NOT NULL DEFAULT 'In Stock',
    pack_size VARCHAR(50),
    unit VARCHAR(30),
    search_keywords TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_best_deal BOOLEAN NOT NULL DEFAULT FALSE,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 4.5,
    review_count INTEGER NOT NULL DEFAULT 12,
    estimated_delivery_days INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Product Images Table
CREATE TABLE IF NOT EXISTS product_images (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(200),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- Product Specifications Table
CREATE TABLE IF NOT EXISTS product_specifications (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    spec_key VARCHAR(100) NOT NULL,
    spec_value VARCHAR(255) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_product_specs_product_id ON product_specifications(product_id);

-- ==============================================================================
-- 4. CARTS & ITEMS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_session_token ON carts(session_token);

CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- ==============================================================================
-- 5. ORDERS, ITEMS & RIDER DISPATCH
-- ==============================================================================

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rider_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(120),
    city VARCHAR(50) NOT NULL DEFAULT 'Faisalabad',
    locality VARCHAR(100) NOT NULL,
    full_address TEXT NOT NULL,
    nearby_landmark VARCHAR(150),
    delivery_speed VARCHAR(50) NOT NULL DEFAULT 'Standard Delivery',
    subtotal_pkr NUMERIC(12, 2) NOT NULL,
    delivery_fee_pkr NUMERIC(12, 2) NOT NULL DEFAULT 120.0,
    discount_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    total_amount_pkr NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash on Delivery',
    payment_status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    order_status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    estimated_delivery_date VARCHAR(100),
    delivery_notes TEXT,
    assigned_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_rider_id ON orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(200) NOT NULL,
    product_sku VARCHAR(50),
    product_image VARCHAR(500),
    unit_price_pkr NUMERIC(12, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    subtotal_pkr NUMERIC(12, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- ==============================================================================
-- 6. FAISALABAD DELIVERY ZONES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS delivery_zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    sector_code VARCHAR(30),
    base_delivery_fee_pkr NUMERIC(10, 2) NOT NULL DEFAULT 120.0,
    allows_same_day BOOLEAN NOT NULL DEFAULT TRUE,
    same_day_cutoff_hour INTEGER NOT NULL DEFAULT 16,
    standard_delivery_hours INTEGER NOT NULL DEFAULT 24,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_delivery_zones_name ON delivery_zones(name);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_is_active ON delivery_zones(is_active);

-- ==============================================================================
-- 7. INITIAL SEED DATA: PERMISSIONS & SYSTEM ROLES
-- ==============================================================================

-- 15 Standard Permissions
INSERT INTO permissions (code, category, description) VALUES
    ('profile:read_write', 'account', 'View & manage personal profile and addresses'),
    ('order:create', 'orders', 'Place new customer orders'),
    ('order:view_own', 'orders', 'View customer''s placed orders'),
    ('product:view_own', 'catalog', 'View seller''s catalog & stock'),
    ('product:create', 'catalog', 'Create new seller products'),
    ('product:update_own', 'catalog', 'Update price/stock for seller''s own products'),
    ('product:delete_own', 'catalog', 'Deactivate seller''s own products'),
    ('order:view_seller_items', 'orders', 'View order items containing seller''s goods'),
    ('delivery:view_assigned', 'delivery', 'View assigned delivery runs'),
    ('delivery:update_status', 'delivery', 'Update delivery progress (Out for Delivery -> Delivered)'),
    ('order:assign_rider', 'orders', 'Dispatch and assign riders to customer orders'),
    ('admin:rbac_manage', 'admin', 'Create/edit roles, map permissions, assign user roles'),
    ('admin:catalog_manage_all', 'admin', 'Edit or delete any product across all sellers'),
    ('admin:zones_manage', 'admin', 'Configure Faisalabad delivery sectors and fees'),
    ('admin:metrics_view', 'admin', 'View platform-wide revenue and performance metrics')
ON CONFLICT (code) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description;

-- 4 Foundational System Roles
INSERT INTO roles (name, description, is_system_role) VALUES
    ('admin', 'Platform administrator with full governance access across all operations', TRUE),
    ('seller', 'Local merchant who manages their own store catalog, inventory, and order items', TRUE),
    ('rider', 'Delivery rider operating across Faisalabad localities to fulfill orders', TRUE),
    ('customer', 'Verified consumer who browses, purchases, and tracks local deliveries', TRUE)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    is_system_role = EXCLUDED.is_system_role;

-- Map Permissions to Roles
-- 1. Admin Role (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- 2. Seller Role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'profile:read_write',
    'product:view_own',
    'product:create',
    'product:update_own',
    'product:delete_own',
    'order:view_seller_items'
)
WHERE r.name = 'seller'
ON CONFLICT DO NOTHING;

-- 3. Rider Role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'profile:read_write',
    'delivery:view_assigned',
    'delivery:update_status'
)
WHERE r.name = 'rider'
ON CONFLICT DO NOTHING;

-- 4. Customer Role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'profile:read_write',
    'order:create',
    'order:view_own'
)
WHERE r.name = 'customer'
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 8. INITIAL SEED DATA: FAISALABAD DELIVERY ZONES
-- ==============================================================================

INSERT INTO delivery_zones (name, sector_code, base_delivery_fee_pkr, allows_same_day, same_day_cutoff_hour, standard_delivery_hours, is_active, description) VALUES
    ('Peoples Colony No. 1 & 2', 'FSD-PC', 100.0, TRUE, 16, 24, TRUE, 'Core commercial and residential hub in Faisalabad.'),
    ('D Ground & Batala Colony', 'FSD-DG', 100.0, TRUE, 16, 24, TRUE, 'Primary shopping and food district around D Ground.'),
    ('Madina Town & Susan Road', 'FSD-MT', 120.0, TRUE, 16, 24, TRUE, 'Dense retail corridor and high-density family residences.'),
    ('Kohinoor City & Jaranwala Road', 'FSD-KC', 120.0, TRUE, 16, 24, TRUE, 'Modern residential apartments and retail commercial centers.'),
    ('Gulberg & Civil Lines', 'FSD-GB', 120.0, TRUE, 16, 24, TRUE, 'Historic administrative quarter and central urban zone.'),
    ('Ghulam Muhammad Abad', 'FSD-GMA', 150.0, TRUE, 15, 24, TRUE, 'Large residential colony in western Faisalabad.'),
    ('Millat Town & Sargodha Road', 'FSD-MLT', 150.0, TRUE, 15, 24, TRUE, 'Northern Faisalabad residential and industrial expansion.'),
    ('Samanabad & Iron Market', 'FSD-SMN', 140.0, TRUE, 15, 24, TRUE, 'Southern residential sector near commercial trade markets.'),
    ('Eden Garden & Canal Road', 'FSD-EDN', 130.0, TRUE, 16, 24, TRUE, 'Canal expressway residential societies and gated communities.'),
    ('Mansoorabad & Motorway City', 'FSD-MNB', 160.0, FALSE, 14, 36, TRUE, 'Outer perimeter neighborhoods bordering M-4 Motorway.')
ON CONFLICT (name) DO UPDATE SET
    base_delivery_fee_pkr = EXCLUDED.base_delivery_fee_pkr,
    allows_same_day = EXCLUDED.allows_same_day,
    same_day_cutoff_hour = EXCLUDED.same_day_cutoff_hour;
