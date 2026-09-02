# Task brief

## Goal

Transform Lyallpur Bazaar into a production-grade multi-vendor marketplace backed by Supabase PostgreSQL with dynamic Role-Based Access Control (RBAC), multi-role portals (Admin, Seller, Rider, Customer), and catalog/order isolation.

## In scope

- Supabase PostgreSQL engine configuration, psycopg2-binary integration, connection pooler (Supavisor / port 6543) readiness, and SQLite local test fallback preservation.
- Complete 16-table PostgreSQL DDL schema with foreign key cascade rules, performance indexes, and seed data in `supabase/schema.sql`.
- Dynamic RBAC schema: `roles`, `permissions`, `role_permissions`, and `user_roles` with 4 system roles and 15 granular permissions.
- Extended domain entities: `User` (business name, vehicle info, roles), `Product` (seller ownership), `Order` (rider assignment, timestamps).
- Fast, secure JWT authorization dependencies (`require_roles`, `require_permissions`) with admin wildcard bypass.
- Admin dynamic RBAC management APIs (`/api/admin/rbac/*`) and Rider Dispatch endpoint (`/api/admin/orders/{id}/assign-rider`).
- Seller Portal API (`/api/seller/*`) with strict multi-vendor catalog isolation and order line isolation.
- Rider Delivery Portal API (`/api/rider/*`) with active delivery runs, status transitions, COD automatic payment reconciliation, and history logs.
- Frontend role-aware auth context, protected route authorization guard (`ProtectedRoute`), role-based navigation badges, and one-click demo logins.
- Frontend dedicated portals: Seller Hub (`/seller`), Rider Delivery Portal (`/rider`), and Admin RBAC Matrix view (`/admin`).

## Out of scope

- Direct external SMS gateway dispatch (mocked/phone validated).
- Live bank card processing / payment gateway webhook integration (COD and standard payment models maintained).
- Mobile native application wrapper (web/responsive portal optimized).

## Acceptance checks

- Backend: `python -m pytest backend/tests -v` (all 53 tests passing).
- Frontend: `npm run build` in `frontend` (clean compilation with 0 errors).

## Ownership

Lead agent: Antigravity

Assignments:
- Antigravity: End-to-end implementation across database, backend RBAC & portal routers, schemas, integration tests, and frontend portals.
