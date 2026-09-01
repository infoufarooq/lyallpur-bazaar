# 🚀 Deploying Lyallpur Bazaar to Vercel

This repository is configured for fullstack deployment on **Vercel** with a React (Vite) frontend and a Python (FastAPI) Serverless backend in a unified monorepo.

---

## 🛠️ How It Works on Vercel

1. **Frontend (React + Vite)**:
   - Built from `frontend/` into `frontend/dist`.
   - Client-side Single Page Application (SPA) routing is handled via `vercel.json` rewrites so that deep links like `/cart`, `/checkout`, `/account`, `/admin`, and `/search` do not return 404.

2. **Backend (FastAPI Serverless)**:
   - Managed through `api/index.py`.
   - Vercel automatically routes all `/api/*`, `/docs`, and `/openapi.json` requests to the FastAPI serverless handler.
   - SQLite automatically operates inside the writable `/tmp` directory on serverless runtimes.
   - Initial database tables and Faisalabad catalog seed data are populated on startup.

---

## ⚙️ Recommended Vercel Project Settings

When importing this repository into Vercel:

| Setting | Value |
|---|---|
| **Framework Preset** | `Other` or `Vite` |
| **Root Directory** | `./` *(leave as repository root)* |
| **Build Command** | `cd frontend && npm install && npm run build` *(configured in `vercel.json`)* |
| **Output Directory** | `frontend/dist` *(configured in `vercel.json`)* |

---

## 🌐 Optional Environment Variables

If you want to use an external PostgreSQL database (e.g., Supabase, Neon, Railway) or connect the frontend to a remote backend:

- `DATABASE_URL`: Connection string for PostgreSQL (e.g. `postgresql://postgres:password@db.supabase.co:5432/postgres`).
- `SECRET_KEY`: Custom JWT signature secret.
- `VITE_API_URL`: (Optional) Remote backend URL if hosting FastAPI separately (e.g. `https://api.lyallpurbazaar.pk/api`). If omitted, it defaults to the same domain `/api`.

---

## 🔄 Deployment Checklist

1. Push the new commits (`vercel.json`, `package.json`, `requirements.txt`, `api/index.py`, `frontend/vercel.json`) to GitHub.
2. In the Vercel Dashboard:
   - Go to your project `lyallpur-bazaar-gwxv`.
   - Ensure the **Root Directory** in **Project Settings > General** is set to `./` (root).
   - Trigger a **Redeploy** (or push to the connected git branch).
