/**
 * server/index.js — GSP Release Tracker API Server
 * Serves both the React build (static) and REST API endpoints
 *
 * Endpoints:
 *   GET  /api/health            — health check + last sync time
 *   GET  /api/summary           — portfolio stats
 *   GET  /api/releases          — all releases (?partner=X &product=Y &stage=Z)
 *   GET  /api/exceptions        — unmanaged Jira rows (?type=unmanaged optional)
 *   POST /api/sync/trigger      — optional background Monday sync (SYNC_LOCAL_SCRIPT_PATH + auth)
 *   GET  /api/changelog         — recent changes (?limit=N &partner=X)
 *   POST /api/query             — natural language query → tier-routed result
 *   POST /api/ingest            — push releases from local Jira sync (optional Bearer INGEST_TOKEN)
 *   POST /api/sync/confluence   — fetch configured wiki pages, parse tables, merge (Bearer INGEST_TOKEN if set)
 *   POST /api/sync/all          — Jira full ingest (if JIRA_PAT) then Confluence merge (if base URL set); optional Bearer INGEST_TOKEN
 */
import express   from 'express';
import cors      from 'cors';
import { spawn } from 'node:child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as db from './db.js';
import { runConfluenceIngestBuild, CONFLUENCE_PAGES } from './confluence/ingest.js';
import { syncFromJira } from './sync_jira.js';
import { postGlipMessage, formatNotifyCardPayload } from './glip.js';
import { runAskQuery } from './askEngine.js';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const PORT       = process.env.PORT || 3001;
const app        = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Serve React build in production ──────────────────────────────────────────
const DIST = join(__dirname, '..', 'dist');
app.use(express.static(DIST));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  try {
    const summary = db.getSummary();
    const lastSync = db.getLastSync();
    res.json({
      status: 'ok',
      dataSource: db.getDataSource(),
      lastSync,
      last_sync: lastSync,
      syncedAt: lastSync,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (e) {
    res.status(503).json({ status: 'error', message: e.message });
  }
});

function requireIngestAuth(req, res) {
  const token = process.env.INGEST_TOKEN;
  if (!token) return true;
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${token}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

app.post('/api/ingest', async (req, res) => {
  if (!requireIngestAuth(req, res)) return;
  try {
    const result = await db.applyIngest(req.body || {});
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/** Pull configured Confluence wiki pages, parse tables, merge into releases (source: confluence). */
app.post('/api/sync/confluence', async (req, res) => {
  if (!requireIngestAuth(req, res)) return;
  try {
    const { rows, pageErrors } = await runConfluenceIngestBuild();
    const result = await db.mergeConfluenceReleases(rows);
    res.json({
      ok: true,
      pages: CONFLUENCE_PAGES.length,
      parsedRows: rows.length,
      pageErrors,
      ...result,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Jira replace-all ingest + Confluence merge. Monday.com has no API ingest here; use JIRA_FIELD_MONDAY_* for links. */
app.post('/api/sync/all', async (req, res) => {
  if (!requireIngestAuth(req, res)) return;

  /** @type {object[]} */
  const steps = [];

  if (process.env.JIRA_PAT?.trim()) {
    try {
      const bundle = await syncFromJira();
      await db.applyIngest({
        releases: bundle.releases,
        changelog: undefined,
        meta: { fetchedAt: bundle.fetchedAt },
      });
      steps.push({
        jira: { ok: true, count: bundle.releases.length, fetchedAt: bundle.fetchedAt },
      });
    } catch (e) {
      steps.push({ jira: { ok: false, error: e?.message || String(e) } });
    }
  } else {
    steps.push({
      jira: { skipped: true, reason: 'JIRA_PAT not set' },
    });
  }

  const confBase =
    process.env.CONFLUENCE_BASE_URL ||
    process.env.ATLASSIAN_SITE_URL ||
    process.env.CONFLUENCE_URL ||
    '';

  if (confBase.trim()) {
    try {
      const { rows, pageErrors } = await runConfluenceIngestBuild();
      const result = await db.mergeConfluenceReleases(rows);
      steps.push({
        confluence: {
          ok: true,
          pages: CONFLUENCE_PAGES.length,
          parsedRows: rows.length,
          pageErrors,
          ...result,
        },
      });
    } catch (e) {
      steps.push({ confluence: { ok: false, error: e?.message || String(e) } });
    }
  } else {
    steps.push({
      confluence: {
        skipped: true,
        reason: 'Set CONFLUENCE_BASE_URL, ATLASSIAN_SITE_URL, or CONFLUENCE_URL',
      },
    });
  }

  steps.push({
    monday: {
      note: 'Use local `node scripts/sync-local.js` (Monday-first v1.2) from a trusted network; POST /api/ingest. Optional JIRA_FIELD_MONDAY_* still supported.',
    },
  });

  const anyFailed = steps.some((s) => {
    const v = Object.values(s)[0];
    return v && typeof v === 'object' && v.ok === false;
  });

  res.json({
    ok: !anyFailed,
    steps,
    lastSync: db.getLastSync(),
  });
});

// ── Summary ───────────────────────────────────────────────────────────────────
app.get('/api/summary', (_req, res) => {
  res.json(db.getSummary());
});

// ── Partners list ─────────────────────────────────────────────────────────────
app.get('/api/partners', (_req, res) => {
  res.json(db.getPartners());
});

// ── Releases — filtered ───────────────────────────────────────────────────────
app.get('/api/releases', (req, res) => {
  const { partner, product, stage } = req.query;
  try {
    let data;
    if (partner && product) data = [db.getRelease(partner, product)].filter(Boolean);
    else if (partner)       data = db.getReleasesByPartner(partner);
    else if (product)       data = db.getReleasesByProduct(product);
    else if (stage)         data = db.getReleasesByStage(stage);
    else                    data = db.getAllReleases();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Exceptions (v1.3: unmanaged Jira only; data gaps are UI-only) ─────────────
app.get('/api/exceptions', (req, res) => {
  const { type } = req.query;
  try {
    if (type && type !== 'unmanaged') {
      return res.status(410).json({
        error:
          'Legacy ?type=blocked|red|nopm|eap was removed in v1.3. Use the Exceptions tab or ?type=unmanaged.',
      });
    }
    res.json(db.getUnmanagedJiraReleases());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** v1.3 Ch.23 — on-demand sync when host can run Monday-first script (e.g. Mac mini); Heroku usually omits SYNC_LOCAL_SCRIPT_PATH. */
app.post('/api/sync/trigger', (req, res) => {
  if (!requireIngestAuth(req, res)) return;
  const scriptPath = (process.env.SYNC_LOCAL_SCRIPT_PATH || '').trim();
  if (!scriptPath) {
    return res.status(501).json({
      ok: false,
      error:
        'SYNC_LOCAL_SCRIPT_PATH is not set. Run sync from your machine: node scripts/sync-local.js (see scripts/setup-mac-cron.sh).',
    });
  }
  const child = spawn(process.execPath, [scriptPath], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  });
  child.unref();
  res.status(202).json({ ok: true, message: 'Sync process started' });
});

// ── Changelog ─────────────────────────────────────────────────────────────────
app.get('/api/changelog', (req, res) => {
  const limit   = parseInt(req.query.limit)   || 50;
  const partner = req.query.partner           || null;
  try {
    const data = partner ? db.getChangelogByPartner(partner) : db.getChangelog(limit);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Natural language query — Postgres cache, v1.2 structured types ────────────
app.post('/api/query', (req, res) => {
  const { q: rawInput } = req.body;
  if (!rawInput?.trim()) return res.status(400).json({ error: 'Query required' });
  try {
    const result = runAskQuery(rawInput, db);
    res.json({ query: rawInput, ...result, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/glip', async (req, res) => {
  try {
    const payload = formatNotifyCardPayload(req.body || {});
    await postGlipMessage(payload);
    res.json({ ok: true });
  } catch (e) {
    const status = e.code === 'NO_WEBHOOK' ? 503 : 500;
    res.status(status).json({ ok: false, error: e.message || String(e) });
  }
});

// ── SPA fallback (serve index.html for any non-API route) ────────────────────
app.get('*', (_req, res) => {
  res.sendFile(join(DIST, 'index.html'));
});

async function start() {
  await db.initDataStore();
  app.listen(PORT, () => {
    console.log(`\n🚀  GSP Release Tracker API`);
    console.log(`   http://localhost:${PORT}/api/health`);
    console.log(`   http://localhost:${PORT}          (React dashboard)\n`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
