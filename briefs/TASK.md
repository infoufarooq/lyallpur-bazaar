# Task brief

## Goal

Transform Lyallpur Bazaar into a voice-first, AI-powered e-commerce marketplace with an embedded bilingual (Urdu & English) voice shopping concierge, dynamic Role-Based Access Control (RBAC), multi-role portals (Admin, Seller, Rider, Customer), and Supabase PostgreSQL backing.

## In scope

### AI Voice Shopping Assistant (Tasks 1–5)
- Multilingual conversational assistant backend with `/api/assistant/chat` and `/api/assistant/speak` endpoints.
- Faisalabad localization engine with Urdu keyword mapping (`URDU_SEARCH_MAP`) and delivery zone recognition (`URDU_ZONE_MAP`).
- Edge-TTS neural speech synthesis using high-fidelity voices (`ur-PK-UzmaNeural`, `en-US-JennyNeural`) with automatic audio caching.
- Gemini 1.5 Flash REST integration with resilient local rule-based catalog search fallback.
- Client-side Web Speech recognition hook (`useSpeechRecognition`) with interim transcripts, silence timeout, and Urdu/English language switching.
- Speech synthesis hook (`useSpeechSynthesis`) with `window.speechSynthesis` invocation, persistent mute controls, and `/api/assistant/speak` fallback.
- Floating conversational UI widget (`VoiceAssistantWidget`) with minimized pill button, expandable drawer, animated soundbar visualizer (`VoiceVisualizer`), mini product cards (`AssistantProductCard`), and quick action pills.
- Storefront integration persistently mounted in `frontend/src/App.jsx` with bidirectional text support (`dir="auto"`) and cart drawer/navigation action dispatch.

### Multi-Vendor Marketplace & RBAC
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

- Backend: `python -m pytest backend/tests -v` (all 70 tests passing with 0 regressions).
- Frontend: `npm run build` in `frontend` (clean Vite compilation with 0 errors, 1677 modules transformed).

## Ownership

Lead agent: Antigravity

Assignments:
- Antigravity: End-to-end implementation across database, backend RBAC & portal routers, schemas, integration tests, frontend portals, and embedded AI voice shopping assistant.
