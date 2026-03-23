# GSP Release Tracker — Deployment Guide

Get a live URL in ~5 minutes using Render's free tier. No credit card needed.

---

## 1. Push to GitHub

Create a new **private** GitHub repo (e.g. `gsp-release-tracker`) and push this folder:

```bash
# From the dashboard/ folder
git init
git add .
git commit -m "Initial commit — GSP Release Tracker v1"
git remote add origin https://github.com/YOUR_ORG/gsp-release-tracker.git
git push -u origin main
```

> **Important:** Add `node_modules/` and `dist/` to `.gitignore` before committing.

---

## 2. Deploy on Render

1. Go to **[render.com](https://render.com)** → Sign in with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo (`gsp-release-tracker`)
4. Render auto-detects `render.yaml` — confirm the settings:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node server/index.js`
   - **Environment:** Node
5. Click **"Create Web Service"**

Render will build and deploy. First deploy takes ~2–3 minutes.

---

## 3. Confirm it's live

Once deployed, open your Render URL (e.g. `https://gsp-release-tracker.onrender.com`):

| URL | Expected |
|-----|----------|
| `/` | React dashboard loads |
| `/api/health` | `{"status":"ok","dataSource":"sqlite",...}` |
| `/api/summary` | Portfolio stats JSON |
| `/api/exceptions` | Exception records |

---

## 4. Share with stakeholders

Send your team the Render URL — it's publicly accessible (no login required for this prototype).

> **Tip:** Bookmark `/api/health` to check if the service is up. Free tier spins down after 15 min of inactivity; first request after spin-down takes ~30 seconds.

---

## Running locally

```bash
# Install dependencies
npm install

# Start the full stack (React dev server + Express API)
npm run dev:full

# Or run servers separately:
npm run dev          # Vite on http://localhost:5174
npm run dev:server   # Express API on http://localhost:3001
```

The Vite dev server proxies `/api/*` requests to the Express server automatically.

---

## Project structure

```
dashboard/
├── server/
│   ├── index.js      ← Express API server (6 endpoints)
│   ├── db.js         ← Query layer (pure-JS for prototype, SQLite for prod)
│   ├── data.js       ← In-memory mock dataset (85 partner-product records)
│   ├── schema.sql    ← SQLite schema (for production wiring to real data)
│   └── seed.js       ← Seed script (run once: node server/seed.js)
├── src/
│   ├── App.jsx               ← Main shell + tab navigation
│   ├── api.js                ← API client with health-check fallback
│   ├── components/
│   │   ├── MatrixView.jsx    ← 17×5 release matrix grid
│   │   ├── PartnerView.jsx   ← Side panel: partner deep-dive
│   │   ├── ExceptionPanel.jsx← Tier 3 exception view
│   │   └── ChangelogFeed.jsx ← Recent status changes
│   └── data/mockData.js      ← Frontend mock data (for offline/demo mode)
├── render.yaml       ← Render deployment config
└── package.json
```

---

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check + last sync time |
| GET | `/api/summary` | Portfolio stats (counts by stage, exceptions) |
| GET | `/api/partners` | List of all partner names |
| GET | `/api/releases` | All releases (`?partner=X&product=Y&stage=Z`) |
| GET | `/api/exceptions` | Exception records (`?type=blocked\|red\|nopm\|eap`) |
| GET | `/api/changelog` | Recent changes (`?limit=N&partner=X`) |
| POST | `/api/query` | Natural language query → 4-tier routed result |

---

## Connecting to real data (Phase 2)

When you're ready to wire in live data from Jira / Monday / SFDC:

1. Update `server/db.js` to use the SQLite version (already scaffolded in `server/schema.sql`)
2. Run the pipeline: `python sync_gsp_tracker.py` to populate `gsp_tracker.db`
3. Set `USE_DB=1` env var in Render dashboard
4. Redeploy — the API automatically serves live data

The dashboard UI and all API endpoints stay the same.

---

*Built for RingCentral PMO — GSP Release Tracker Agent v1.0*
