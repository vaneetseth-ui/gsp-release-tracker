# GSP Release Tracker — Deployment Guide

Two options: **Heroku** (recommended for your existing account) or **Render** (free tier).

---

## Option A: Heroku (interlock360 account)

### Step 1 — Push code to GitHub

**A. Create the GitHub repo first:**
1. Go to [github.com/new](https://github.com/new)
2. Name it `gsp-release-tracker`
3. Set to **Private**
4. **Do NOT** add README, .gitignore, or license (already included)
5. Click **Create repository**

**B. Create a GitHub Personal Access Token:**
1. Go to [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
2. Note: `gsp-release-tracker push`
3. Expiration: 90 days
4. Scopes: check **repo** (full control)
5. Click **Generate token** — copy it immediately

**C. Run the push script** (from the `dashboard/` folder on your machine):
```bash
bash push-to-github.sh
# Enter your token when prompted
```

Your code is now at: `https://github.com/vaneetseth-ui/gsp-release-tracker`

---

### Step 2 — Create Heroku app

1. Log in to [dashboard.heroku.com](https://dashboard.heroku.com)
2. Click **New** → **Create new app**
3. App name: `gsp-release-tracker` (or any available name)
4. Region: United States
5. Click **Create app**

---

### Step 3 — Connect GitHub to Heroku

In your new Heroku app dashboard:

1. Go to **Deploy** tab
2. Under "Deployment method" → click **GitHub**
3. Click **Connect to GitHub** and authorize
4. Search for `gsp-release-tracker` → click **Connect**
5. Under "Automatic deploys" → click **Enable Automatic Deploys** (branch: `main`)
6. Under "Manual deploy" → click **Deploy Branch** (this deploys immediately)

Heroku will:
- Run `npm install`
- Run `npm run heroku-postbuild` (builds the React app → `dist/`)
- Start the server via `Procfile`: `node server/index.js`

---

### Step 4 — Verify it's live

Click **Open app** in the Heroku dashboard. You should see:

| URL | Expected |
|-----|----------|
| `/` | React dashboard loads |
| `/api/health` | `{"status":"ok","dataSource":"sqlite",...}` |
| `/api/summary` | Portfolio stats JSON |
| `/api/exceptions` | 6 exception records |

---

### Step 5 — Share with stakeholders

Your live URL will be: `https://gsp-release-tracker.herokuapp.com`

Send this to your team for feedback. No login required.

> **Note:** Heroku free dynos spin down after 30 min of inactivity. First request after idle takes ~10–20 seconds. Upgrade to Eco ($5/mo) for always-on.

---

## Option B: Render (alternative)

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo (`gsp-release-tracker`)
3. Render detects `render.yaml` automatically
4. Click **Create Web Service**

Live URL: `https://gsp-release-tracker.onrender.com`

---

## Running locally

```bash
# Install dependencies
npm install

# Start full stack (React dev + Express API)
npm run dev:full

# Or separately:
npm run dev          # Vite → http://localhost:5174
npm run dev:server   # Express API → http://localhost:3001
```

---

## Project structure

```
├── Procfile              ← Heroku: start command
├── render.yaml           ← Render: deploy config
├── push-to-github.sh     ← One-time GitHub push script
├── server/
│   ├── index.js          ← Express API (6 endpoints)
│   ├── db.js             ← Query layer (pure-JS in-memory)
│   ├── data.js           ← 85 partner-product records
│   ├── schema.sql        ← SQLite schema (for prod data wiring)
│   └── seed.js           ← DB seed script
├── src/
│   ├── App.jsx           ← Shell + tab navigation
│   ├── api.js            ← API client + fallback
│   └── components/
│       ├── MatrixView.jsx
│       ├── PartnerView.jsx
│       ├── ExceptionPanel.jsx
│       └── ChangelogFeed.jsx
└── package.json          ← engines + heroku-postbuild
```

---

## API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health + last sync time |
| GET | `/api/summary` | Portfolio stats |
| GET | `/api/partners` | All partner names |
| GET | `/api/releases` | Releases (`?partner=X&product=Y&stage=Z`) |
| GET | `/api/exceptions` | Unmanaged Jira rows (optional `?type=unmanaged`) |
| GET | `/api/changelog` | Recent changes (`?limit=N&partner=X`) |
| POST | `/api/query` | Natural language query → 4-tier result |

---

## Wiring to live data (Phase 2)

1. Update `server/db.js` to use the SQLite version (scaffolded in `server/schema.sql`)
2. Run `python sync_gsp_tracker.py` to populate `gsp_tracker.db`
3. Commit and push → Heroku auto-deploys

The dashboard UI stays exactly the same.

---

## Post-deploy checklist (v1.3)

1. **Postgres migration:** On first boot, `ensureSchema` drops legacy exception columns and renames `Blocked` → `OnHold`. Run **`node scripts/sync-local.js`** from a trusted network (with `MONDAY_API_KEY`, `JIRA_PAT`, `HEROKU_URL`, optional `INGEST_TOKEN`) so `/api/ingest` repopulates releases.
2. **`POST /api/sync/trigger`:** Set **`SYNC_LOCAL_SCRIPT_PATH`** on the dyno only if that host can run `node /absolute/path/to/scripts/sync-local.js` with the same env; otherwise rely on Mac cron (below).
3. **Mac cron (30 min):** From `dashboard/`, run **`bash scripts/setup-mac-cron.sh`** (interactive: Jira PAT, etc.). Updates crontab to `*/30 * * * *`.
4. **Python pipeline merge:** If you use `pipeline/ingest/schema.py`, **`SOURCE_PRIORITY` is Monday-first** (v1.3). That folder is outside this git repo — copy or version it alongside your connector jobs.

---

*RingCentral PMO — GSP Release Tracker Agent v1.0*
