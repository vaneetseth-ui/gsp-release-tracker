/**
 * db.js — Query layer (pure-JS in-memory for prototype; swap to SQLite for production)
 *
 * In production: replace this file with the SQLite version (see db.sqlite.js)
 * All exported function signatures stay identical — index.js doesn't change.
 */
import { RELEASES, CHANGELOG } from './data.js';

// ── Releases ──────────────────────────────────────────────────────────────────

export function getAllReleases() {
  return [...RELEASES].sort((a, b) => a.partner.localeCompare(b.partner) || a.product.localeCompare(b.product));
}

export function getReleasesByPartner(partner) {
  return RELEASES.filter(r => r.partner === partner).sort((a, b) => a.product.localeCompare(b.product));
}

export function getRelease(partner, product) {
  return RELEASES.find(r => r.partner === partner && r.product === product) || null;
}

export function getReleasesByStage(stage) {
  return RELEASES.filter(r => r.stage === stage && r.stage !== 'N/A').sort((a, b) => a.partner.localeCompare(b.partner));
}

export function getReleasesByProduct(product) {
  return RELEASES.filter(r => r.product === product && r.stage !== 'N/A').sort((a, b) => a.partner.localeCompare(b.partner));
}

// ── Exceptions ────────────────────────────────────────────────────────────────

export function getExceptions() {
  return RELEASES
    .filter(r => r.blocked || r.red_account || r.missing_pm || (r.days_in_eap && r.days_in_eap > 90))
    .sort((a, b) => {
      const rank = r => r.blocked ? 0 : r.red_account ? 1 : (r.days_in_eap > 90) ? 2 : 3;
      return rank(a) - rank(b) || a.partner.localeCompare(b.partner);
    });
}

export function getBlocked() {
  return RELEASES.filter(r => r.blocked).sort((a, b) => (b.days_overdue || 0) - (a.days_overdue || 0));
}

export function getRedAccounts() {
  return RELEASES.filter(r => r.red_account).sort((a, b) => (b.arr_at_risk || 0) - (a.arr_at_risk || 0));
}

export function getMissingPM() {
  return RELEASES.filter(r => r.missing_pm).sort((a, b) => a.partner.localeCompare(b.partner));
}

export function getOverdueEAP() {
  return RELEASES.filter(r => r.days_in_eap > 90 && !r.blocked).sort((a, b) => (b.days_in_eap || 0) - (a.days_in_eap || 0));
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
  const active = RELEASES.filter(r => r.stage !== 'N/A');

  const byStage = {};
  active.forEach(r => { byStage[r.stage] = (byStage[r.stage] || 0) + 1; });

  return {
    total:       active.length,
    byStage,
    blocked:     RELEASES.filter(r => r.blocked).length,
    redAccounts: RELEASES.filter(r => r.red_account).length,
    missingPM:   RELEASES.filter(r => r.missing_pm).length,
  };
}

// ── Partners list ─────────────────────────────────────────────────────────────

export function getPartners() {
  return [...new Set(RELEASES.map(r => r.partner))].sort();
}
