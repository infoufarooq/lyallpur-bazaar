# Lyallpur Bazaar - System Architecture & Technical Design

## 1. Overview
**Lyallpur Bazaar** is a modern, hyper-local e-commerce marketplace built specifically for **Faisalabad, Pakistan**. It delivers a high-speed, discovery-driven shopping experience inspired by leading marketplaces while having original branding, design, and modular code.

---

## 2. Architecture Diagram

```
+-------------------------------------------------------------------------+
|                              React Frontend                             |
|  (Vite + Tailwind CSS + Lucide Icons + React Router DOM + Axios Client) |
+------------------------------------+------------------------------------+
                                     |
                         HTTP / REST API Requests
                                     |
+------------------------------------v------------------------------------+
|                         FastAPI Backend Application                     |
|  +--------------------+---------------------+------------------------+  |
|  | Authentication     | Search & Suggestion | Product Catalog        |  |
|  | (JWT, Bcrypt)      | (Multi-tier Scoring)| (Faceted Filters)      |  |
|  +--------------------+---------------------+------------------------+  |
|  | Cart & Calculations| Order Lifecycle     | Faisalabad Delivery    |  |
|  | (Session & User)   | (State Transitions) | (Zone Cutoff & Rules)  |  |
|  +--------------------+---------------------+------------------------+  |
|  | Admin Management   | Alternative Product | Database Migrations    |  |
|  | (KPIs, CRUD)       | Matching (+/- 30%)  | (SQLAlchemy ORM)       |  |
|  +--------------------+---------------------+------------------------+  |
+------------------------------------+------------------------------------+
                                     |
                              SQLAlchemy ORM
                                     |
+------------------------------------v------------------------------------+
|                         SQLite Database (WAL Mode)                       |
|   Users • Categories • Brands • Products • Images • Specs • Carts      |
|                      CartItems • Orders • OrderItems • DeliveryZones    |
+-------------------------------------------------------------------------+
```

---

## 3. Core Subsystems

### 3.1 Multi-Tier Search & Fuzzy Engine
The search engine in `backend/app/services/search_service.py` scores products using a multi-factor relevance ranking:
1. **Exact Product Name Match** ($+150$ pts)
2. **Prefix Match** ($+100$ pts)
3. **Substring in Product Name** ($+75$ pts)
4. **Exact Brand Match** ($+80$ pts) / Substring ($+60$ pts)
5. **Category Name Match** ($+50$ pts)
6. **Search Keywords & Roman Urdu Tokens** ($+45$ pts)
7. **Pack Size Match** ($+35$ pts)
8. **Product Description Match** ($+20$ pts)
9. **Individual Token Overlap** ($+15$ to $+25$ pts)
10. **In-Stock Availability Boost** ($+10$ pts only if matched)

### 3.2 Intelligent Alternative Product Logic
When a product or search query is out of stock or returns no exact matches:
- Identifies intent based on category, brand, and keywords.
- Surfaces **alternative products** in the same category or brand within a configurable price tolerance ($\pm 30\%$).
- Surfaces different pack sizes (e.g. if 1kg is unavailable, shows 500g or 2kg mega saver).

### 3.3 Faisalabad Delivery Zones & Same-Day Rules
- **Pre-configured Localities**:
  - D Ground & Peoples Colony No. 1
  - Peoples Colony No. 2
  - Madina Town & Susan Road
  - Kohinoor City & Jaranwala Road
  - Canal Road & Eden Valley
  - Gulberg & Jinnah Colony
  - Batala Colony & Satyana Road
  - Ghulam Muhammad Abad
  - Sargodha Road & Millat Town
  - Samanabad & Novelty Bridge
  - Clock Tower (8 Bazaars / Rail Bazaar)
- **Same-Day Cutoff**: Configurable cutoff time (default: 4:00 PM - 5:00 PM). Orders placed before the cutoff qualify for Same-Day Express Delivery.
- **Delivery Fees**: Base zone rate (Rs. 100 - Rs. 130). Orders exceeding **Rs. 2,500** automatically qualify for **FREE Delivery**.

### 3.4 Order State Machine
Each order progresses through 6 deterministic milestones:
$$\text{Pending} \longrightarrow \text{Confirmed} \longrightarrow \text{Processing} \longrightarrow \text{Packed} \longrightarrow \text{Out for Delivery} \longrightarrow \text{Delivered}$$
(or $\text{Cancelled}$). Each order receives a unique trackable code formatted as `FSD-2026-XXXX`.

---

## 4. Migration Path to PostgreSQL
The backend uses SQLAlchemy 2.0 declarative models with standard datatypes. Migrating from SQLite to PostgreSQL only requires updating `DATABASE_URL` in `.env` to a `postgresql://user:pass@host:5432/dbname` connection string.
