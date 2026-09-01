# 🛍️ Lyallpur Bazaar - Faisalabad Local Online Marketplace

A modern, production-ready local e-commerce marketplace built specifically for **Faisalabad, Pakistan**. Inspired by leading marketplaces for product discovery and ease of use, with original branding, clean architecture, and localized delivery logic.

---

## 🌟 Key Features

- 📍 **Faisalabad Delivery Zone Engine**: Supports key sectors (D Ground, Peoples Colony, Madina Town, Kohinoor City, Canal Road, Ghulam Muhammad Abad, Clock Tower, etc.) with same-day cutoff calculations and configurable charges.
- 🔍 **Multi-Tier Search & Fuzzy Engine**: Relevance ranking across product titles, brands, categories, pack sizes, and Roman Urdu keywords.
- 💡 **Smart Alternative Product Recommendations**: Automatically surfaces alternative brands, pack sizes, and comparable choices ($\pm 30\%$ price range) when an exact item is unavailable or out of stock.
- 🛒 **Interactive Shopping Cart & Free Delivery Meter**: Real-time subtotal, free shipping progress (orders $\ge$ Rs. 2,500), and slide-out quick cart drawer.
- 📦 **4-Step Local Checkout & Live Order Tracking**: Cash on Delivery (COD) default, unique order numbers (`FSD-2026-XXXX`), and milestone tracker (*Pending $\to$ Confirmed $\to$ Processing $\to$ Packed $\to$ Out for Delivery $\to$ Delivered*).
- 🛡️ **Protected Admin Portal**: Real-time sales metrics (PKR), product inventory management, order status progression, and delivery zone configurator.
- 🇵🇰 **Pre-seeded Pakistani Catalog**: 40+ realistic products in PKR across Grocery, Household, Cleaning, Personal Care, Electronics, and Faisalabad Textiles.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.12, FastAPI, Pydantic v2, Uvicorn, Bcrypt, PyJWT |
| **Database** | SQLite with WAL mode, SQLAlchemy 2.0 ORM (PostgreSQL ready) |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide React, React Router v6, Axios |
| **Testing** | Pytest, HTTPX TestClient (11 automated test suites passing) |

---

## 🚀 Quickstart Guide

### Prerequisites
- **Python 3.12+** installed
- **Node.js (v18+)** and **npm** installed

---

### 1. Start the Backend API Server

Open a terminal in the project root:

```powershell
# Navigate to backend directory
cd backend

# Install Python requirements (if not already installed)
python -m pip install -r requirements.txt

# Start the FastAPI server with auto-reload
python -m uvicorn app.main:app --reload --port 8000
```

The API will be live at:
- **API Base URL**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`

---

### 2. Start the React Frontend

Open a second terminal:

```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Start Vite development server
npm run dev
```

Open your browser at **`http://localhost:3000`** (or the URL shown in terminal).

---

## 🔐 Sample Demo Credentials

| Role | Email / Phone | Password | Access Level |
|---|---|---|---|
| **Administrator** | `admin@lyallpurbazaar.pk` | `Admin@123` | Full Admin Portal (`/admin`), Orders, Inventory, Zones |
| **Customer** | `03217654321` | `Customer@123` | Customer Account (`/account`), Saved Addresses, Orders |

*You can also click the quick demo buttons on the `/login` page.*

---

## 🧪 Running Backend Automated Tests

Run the full pytest suite:

```powershell
python -m pytest backend/tests -v
```

**Results: 11 / 11 tests passed.**

---

## 📁 Project Structure

```
Daraz-alike/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app initialization, lifespan DB seed, CORS
│   │   ├── config.py            # Settings & Faisalabad delivery defaults
│   │   ├── database.py          # SQLAlchemy engine (WAL mode) & SessionLocal
│   │   ├── models/              # User, Category, Brand, Product, Cart, Order, DeliveryZone
│   │   ├── schemas/             # Pydantic validation & response models
│   │   ├── services/            # Search, Product, Cart, Order, Delivery, Auth services
│   │   ├── routers/             # API routes (/auth, /products, /search, /cart, /orders, /delivery, /admin)
│   │   └── seed/                # 40+ Pakistani FMCG, grocery, and electronics products
│   ├── tests/                   # Pytest automated test suite
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/                 # Axios client with JWT interceptor
│   │   ├── context/             # AuthContext, CartContext, DeliveryContext
│   │   ├── components/          # Header, Footer, HeroBanner, CategoryGrid, ProductCard, SearchBar, etc.
│   │   ├── pages/               # HomePage, SearchResultsPage, ProductDetailPage, CartPage, CheckoutPage, etc.
│   │   └── utils/               # Formatters (PKR) and Faisalabad locality constants
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── docs/
│   ├── ARCHITECTURE.md          # Detailed architecture & search ranking math
│   └── API_DOCUMENTATION.md     # Full REST API specifications
└── README.md
```

---

## ⚡ Deployment on Vercel

Lyallpur Bazaar is configured for fullstack monorepo deployment on **Vercel** (React Vite frontend + FastAPI serverless backend):

1. Connect the repository to Vercel (keep **Root Directory** as `./`).
2. Vercel automatically detects `vercel.json`, `package.json`, and `api/index.py`.
3. For full details and environment variables, see [docs/VERCEL_DEPLOYMENT.md](file:///c:/Users/User/Documents/Projects/Daraz-alike/docs/VERCEL_DEPLOYMENT.md).

---

## ⚖️ License
Built for educational and prototype demonstration purposes for Faisalabad local commerce.
