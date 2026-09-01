# Lyallpur Bazaar - REST API Documentation

FastAPI automatically generates interactive OpenAPI documentation at `/docs` (Swagger UI) and `/redoc` (ReDoc).

Base URL: `http://localhost:8000/api`

---

## 1. Authentication Endpoints

### `POST /api/auth/register`
Creates a new customer account.
- **Request Body**:
  ```json
  {
    "full_name": "Bilal Ahmed",
    "phone_number": "03001234567",
    "email": "bilal@example.com",
    "password": "Password123"
  }
  ```
- **Response**: `200 OK` with access token and user object.

### `POST /api/auth/login`
Authenticates a user using phone number or email.
- **Request Body**:
  ```json
  {
    "phone_or_email": "admin@lyallpurbazaar.pk",
    "password": "Admin@123"
  }
  ```
- **Response**: `200 OK` with JWT token.

### `GET /api/auth/me`
Returns currently authenticated user profile with saved addresses.
- **Headers**: `Authorization: Bearer <token>`

---

## 2. Products & Search Endpoints

### `GET /api/products`
Lists products with pagination and faceted filters.
- **Query Parameters**:
  - `category`: Category slug
  - `brand`: Brand slug
  - `min_price`, `max_price`: Float
  - `in_stock`: Boolean
  - `same_day`: Boolean
  - `sort_by`: `relevance` | `price_asc` | `price_desc` | `newest` | `discount`
  - `page`: Integer (default: 1)
  - `limit`: Integer (default: 12)

### `GET /api/products/{id_or_slug}`
Returns product details with specifications, image gallery, similar items, and alternative products.

### `GET /api/search`
Multi-factor search with auto-fallback to alternative products.
- **Query Parameters**: `q` (Search text), `category_id`, `brand_id`, `min_price`, `max_price`, `sort_by`.

### `GET /api/search/suggestions`
Instant auto-complete suggestions.
- **Query Parameters**: `q` (Min 1 char)

---

## 3. Cart Endpoints

### `GET /api/cart`
- **Query Parameters**: `session_token` (String)

### `POST /api/cart/items`
- **Request Body**: `{"product_id": 1, "quantity": 2}`

### `PUT /api/cart/items/{item_id}`
- **Request Body**: `{"quantity": 3}`

### `DELETE /api/cart/items/{item_id}`

---

## 4. Orders & Delivery

### `POST /api/orders`
Places an order with Faisalabad locality validation and stock deduction.
- **Request Body**:
  ```json
  {
    "customer_name": "Muhammad Usman",
    "customer_phone": "03217654321",
    "customer_email": "usman@example.com",
    "city": "Faisalabad",
    "locality": "D Ground & Peoples Colony No. 1",
    "full_address": "House 42-B, Street 7, Near Chenab Club",
    "nearby_landmark": "Near Chenab Club",
    "delivery_speed": "Standard Delivery",
    "payment_method": "Cash on Delivery",
    "cart_session_token": "cart_session_xxx"
  }
  ```

### `GET /api/orders/track/{order_number}`
Public tracking endpoint returning order status and timeline steps.

### `POST /api/delivery/estimate`
Calculates delivery fee, arrival estimate, and cutoff availability.

---

## 5. Admin Endpoints (Protected: `is_admin = True`)

- `GET /api/admin/dashboard`: Metrics for total revenue, orders, pending items, low stock.
- `GET /api/admin/products`: List and manage products.
- `POST /api/admin/products`: Create a product with images and specifications.
- `PUT /api/admin/products/{id}`: Update price, stock, discount, or active status.
- `GET /api/admin/orders`: List all customer orders.
- `PUT /api/admin/orders/{id}/status`: Update order status along the milestone pipeline.
- `GET /api/admin/zones`: Manage Faisalabad delivery zones and fee rules.
