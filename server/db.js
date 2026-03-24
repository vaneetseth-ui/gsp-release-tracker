/**
 * server/db.js — Unified query layer
 *
 * Data priority:
 *   1. PostgreSQL (when DATABASE_URL env var is set — Heroku Postgres addon)
 *   2. liveCache  — in-memory data pushed via /api/ingest
 *   3. MOCK_RELEASES — hardcoded fallback until first sync
 */
import { RELEASES as MOCK_RELEASES, CHANGELOG } from './data.js';
import {
  isDbAvailable, dbGetAllReleases, dbGetLastSyncMeta,
} from './database.js';

// ── In-memory live cache (used when no DB) ─────────────────────────────────────
let liveCache  = null;
let lastSyncAt = null;
let lastSyncMeta = null;

export function setLiveData(releases, meta = {}) {
  liveCache    = releases;
  lastSyncAt   = new Date().toISOString();
  lastSyncMeta = meta;
}

export function getLiveMeta() {
  return {
    mode:       isDbAvailable() ? 'postgres' : (liveCache ? 'live' : 'mock'),
    lastSyncAt,
    issueCount: liveCache?.length ?? MOCK_RELEASES.length,
    ...lastSyncMeta,
  };
}

// ── Data source resolver ───────────────────────────────────────────────────────
// Synchronous — uses liveCache or mock (Postgres queries are handled separately via async wrappers)
function DATA() {
  return liveCache ?? MOCK_RELEASES;
}

// ── Async wrapper: preloads Postgres data into liveCache on first call ─────────
let pgLoadPromise = null;

export async function ensureDataLoaded() {
  if (!isDbAvailable()) return;
  if (liveCache !== null) return; // already loaded
  if (pgLoadPromise) return pgLoadPromise;

  pgLoadPromise = (async () => {
    try {
      const rows = await dbGetAllReleases();
      const meta = await dbGetLastSyncMeta();
      if (rows.length > 0) {
        liveCache  = rows;
        lastSyncAt = meta?.created_at?.toISOString() || null;
        lastSyncMeta = { totalIssues: meta?.total_issues, source: meta?.source };
        console.log(`[db] Loaded ${rows.length} releases from PostgreSQL`);
      }
    } catch (e) {
      console.error('[db] Failed to load from Postgres:', e.message);
    } finally {
      pgLoadPromise = null;
    }
  })();
  return pgLoadPromise;
}

// ── Releases ──────────────────────────────────────────────────────────────────

export function getAllReleases() {
  return [...DATA()].sort((a, b) => a.partner?.localeCompare(b.partner) || a.product?.localeCompare(b.product));
}

export function getReleasesByPartner(partner) {
  return DATA().filter(r => r.partner === partner).sort((a, b) => a.product?.localeCompare(b.product));
}

export function getRelease(partner, product) {
  return DATA().find(r => r.partner === partner && r.product === product) || null;
}

export function getReleasesByStage(stage) {
  return DATA().filter(r => r.stage === stage && r.stage !== 'N/A').sort((a, b) => a.partner?.localeCompare(b.partner));
}

export function getReleasesByProduct(product) {
  return DATA().filter(r => r.product === product && r.stage !== 'N/A').sort((a, b) => a.partner?.localeCompare(b.partner));
}

// ── Exceptions ────────────────────────────────────────────────────────────────

export function getExceptions() {
  return DATA()
    .filter(r => r.blocked || r.red_account || r.missing_pm || (r.days_in_eap && r.days_in_eap > 90))
    .sort((a, b) => {
      const rank = r => r.blocked ? 0 : r.red_account ? 1 : (r.days_in_eap > 90) ? 2 : 3;
      return rank(a) - rank(b) || a.partner?.localeCompare(b.partner);
    });
}

export function getBlocked() {
  return DATA().filter(r => r.blocked).sort((a, b) => (b.days_overdue || 0) - (a.days_overdue || 0));
}

export function getRedAccounts() {
  return DATA().filter(r => r.red_account).sort((a, b) => (b.arr_at_risk || 0) - (a.arr_at_risk || 0));
}

export function getMissingPM() {
  return DATA().filter(r => r.missing_pm).sort((a, b) => a.partner?.localeCompare(b.partner));
}

export function getOverdueEAP() {
  return DATA().filter(r => r.days_in_eap > 90 && !r.blocked).sort((a, b) => (b.days_in_eap || 0) - (a.days_in_eap || 0));
}

// ── Changelog ─────────────────────────────────────────────────────────────────

export function getChangelog(limit = 50) {
  return [...CHANGELOG].sort((a, b) => b.change_date.localeCompare(a.change_date)).slice(0, limit);
}

export function getChangelogByPartner(partner) {
  return CHANGELOG.filter(c => c.partner === partner).sort((a, b) => b.change_date.localeCompare(a.change_date));
}

// ── Summary stats ─────────────────────────────────────────────────────────────

export function getSummary() {
  const d = DATA();
  const active = d.filter(r => r.stage !== 'N/A');
  const byStage = {};
  active.forEach(r => { byStage[r.stage] = (byStage[r.stage] || 0) + 1; });

  return {
    total:       active.length,
    byStage,
    blocked:     d.filter(r => r.blocked).length,
    redAccounts: d.filter(r => r.red_account).length,
    missingPM:   d.filter(r => r.missing_pm).length,
    mode:        isDbAvailable() ? 'postgres' : (liveCache ? 'live' : 'mock'),
    lastSyncAt,
  };
}

// ── Partners list ─────────────────────────────────────────────────────────────

export function getPartners() {
  return [...new Set(DATA().map(r => r.partner).filter(Boolean))].sort();
}
