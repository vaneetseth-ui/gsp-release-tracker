/**
 * db.js — Query layer with live Jira cache
 *
 * Data priority:
 *   1. liveCache  — populated by POST /api/sync (fetches from Jira)
 *   2. RELEASES   — mock data fallback (used until first sync runs)
 *
 * All exported function signatures stay identical — index.js doesn't change.
 */
import { RELEASES as MOCK_RELEASES, CHANGELOG } from './data.js';

// ── Live data cache (in-memory, populated by syncFromJira()) ──────────────────
let liveCache = null;   // null = not yet synced; array = live data
let lastSyncAt = null;
let lastSyncMeta = null;

export function setLiveData(releases, meta = {}) {
  liveCache   = releases;
  lastSyncAt  = new Date().toISOString();
  lastSyncMeta = meta;
}

export function getLiveMeta() {
  return {
    mode:      liveCache ? 'live' : 'mock',
    lastSyncAt,
    issueCount: liveCache?.length ?? MOCK_RELEASES.length,
    ...lastSyncMeta,
  };
}

// Use live data if available, otherwise fall back to mock
function DATA() {
  return liveCache ?? MOCK_RELEASES;
}

// ── Releases ──────────────────────────────────────────────────────────────────

export function getAllReleases() {
  return [...DATA()].sort((a, b) => a.partner.localeCompare(b.partner) || a.product.localeCompare(b.product));
}

export function getReleasesByPartner(partner) {
  return DATA().filter(r => r.partner === partner).sort((a, b) => a.product.localeCompare(b.product));
}

export function getRelease(partner, product) {
  return DATA().find(r => r.partner === partner && r.product === product) || null;
}

export function getReleasesByStage(stage) {
  return DATA().filter(r => r.stage === stage && r.stage !== 'N/A').sort((a, b) => a.partner.localeCompare(b.partner));
}

export function getReleasesByProduct(product) {
  return DATA().filter(r => r.product === product && r.stage !== 'N/A').sort((a, b) => a.partner.localeCompare(b.partner));
}

// ── Exceptions ────────────────────────────────────────────────────────────────

export function getExceptions() {
  return DATA()
    .filter(r => r.blocked || r.red_account || r.missing_pm || (r.days_in_eap && r.days_in_eap > 90))
    .sort((a, b) => {
      const rank = r => r.blocked ? 0 : r.red_account ? 1 : (r.days_in_eap > 90) ? 2 : 3;
      return rank(a) - rank(b) || a.partner.localeCompare(b.partner);
    });
}

export function getBlocked() {
  return DATA().filter(r => r.blocked).sort((a, b) => (b.days_overdue || 0) - (a.days_overdue || 0));
}

export function getRedAccounts() {
  return DATA().filter(r => r.red_account).sort((a, b) => (b.arr_at_risk || 0) - (a.arr_at_risk || 0));
}

export function getMissingPM() {
  return DATA().filter(r => r.missing_pm).sort((a, b) => a.partner.localeCompare(b.partner));
}

export function getOverdueEAP() {
  return DATA().filter(r => r.days_in_eap > 90 && !r.blocked).sort((a, b) => (b.days_in_eap || 0) - (a.days_in_eap || 0));
}

// ── Changelog ─────────────────────────────────────────────────────────────────

export function getChangelog(limit = 50) {
  return [...CHANGELOG]
    .sort((a, b) => b.change_date.localeCompare(a.change_date))
    .slice(0, limit);
}

export function getChangelogByPartner(partner) {
  return CHANGELOG
    .filter(c => c.partner === partner)
    .sort((a, b) => b.change_date.localeCompare(a.change_date));
}

// ── Summary stats ─────────────────────────────────────────────────────────────

export function getSummary() {
  const d      = DATA();
  const active = d.filter(r => r.stage !== 'N/A');
  const byStage = {};
  active.forEach(r => { byStage[r.stage] = (byStage[r.stage] || 0) + 1; });

  return {
    total:       active.length,
    byStage,
    blocked:     d.filter(r => r.blocked).length,
    redAccounts: d.filter(r => r.red_account).length,
    missingPM:   d.filter(r => r.missing_pm).length,
    mode:        liveCache ? 'live' : 'mock',
    lastSyncAt,
  };
}

// ── Partners list ─────────────────────────────────────────────────────────────

export function getPartners() {
  return [...new Set(DATA().map(r => r.partner))].sort();
}
