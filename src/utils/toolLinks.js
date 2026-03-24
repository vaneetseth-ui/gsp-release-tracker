/**
 * Jira browse URLs + optional Monday deep links (env-configurable).
 * Used by DataContext normalization and Ask / Partner / Exception views.
 */

const DEFAULT_JIRA_BROWSE = 'https://jira.ringcentral.com/browse';

/** Jira issue key pattern (e.g. GSP-123, PTR-1042, GSP-0278) */
const ISSUE_KEY_RE = /^[A-Z][A-Z0-9_]*-\d+$/i;

/** Keys embedded in prose or labels (e.g. "RingCX - Contact Center - GSP-0278") */
const INLINE_ISSUE_KEY = /\b[A-Z][A-Z0-9_]*-\d+\b/gi;

export function splitIssueKeys(raw) {
  if (raw == null || raw === '') return [];
  const s = String(raw).trim();
  if (!s) return [];
  return s
    .split(/[,;]\s*/)
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * Ordered unique keys from free text: comma/semicolon-separated lists plus any key-shaped tokens in each segment.
 */
export function collectIssueKeys(raw) {
  if (raw == null || raw === '') return [];
  const segments = splitIssueKeys(String(raw));
  const out = [];
  const seen = new Set();
  for (const seg of segments) {
    const t = seg.trim();
    if (!t) continue;
    if (ISSUE_KEY_RE.test(t)) {
      const k = t.toUpperCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(k);
      }
      continue;
    }
    const found = t.match(INLINE_ISSUE_KEY);
    if (!found) continue;
    for (const m of found) {
      const k = m.toUpperCase();
      if (!ISSUE_KEY_RE.test(k) || seen.has(k)) continue;
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

/** Merge structured + free-text Jira fields so links are found even when only one field is populated. */
export function jiraTextForLinkParsing(r) {
  if (!r || typeof r !== 'object') return null;
  const parts = [r.jira_number, r.jira_key, r.jira]
    .filter((x) => x != null && String(x).trim() !== '')
    .map((x) => String(x).trim());
  if (!parts.length) return null;
  return parts.join('; ');
}

export function getJiraBrowseBase() {
  const v =
    typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_JIRA_BROWSE_BASE;
  const base = (v && String(v).trim()) || DEFAULT_JIRA_BROWSE;
  return base.replace(/\/+$/, '');
}

/**
 * Full /browse/{KEY} URL for a single key, or null if not key-shaped.
 */
export function jiraBrowseUrlForKey(key, baseOverride) {
  const k = String(key || '').trim();
  if (!ISSUE_KEY_RE.test(k)) return null;
  const base = (baseOverride || getJiraBrowseBase()).replace(/\/+$/, '');
  return `${base}/${encodeURIComponent(k)}`;
}

/**
 * @param {string|null|undefined} raw — keys, comma/semicolon lists, or prose containing keys
 * @returns {{ key: string, href: string }[]}
 */
export function buildJiraLinks(raw) {
  const base = getJiraBrowseBase();
  const out = [];
  const seen = new Set();
  for (const key of collectIssueKeys(raw)) {
    const href = jiraBrowseUrlForKey(key, base);
    if (!href || seen.has(key)) continue;
    seen.add(key);
    out.push({ key, href });
  }
  return out;
}

export function getMondayPulseBase() {
  const v =
    typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_MONDAY_PULSE_URL_BASE;
  return v && String(v).trim() ? String(v).trim().replace(/\/+$/, '') : '';
}

/**
 * Monday link: explicit URL from API, or pulse base + numeric id when configured.
 */
export function resolveMondayUrl(record) {
  if (!record || typeof record !== 'object') return null;
  const direct =
    record.monday_url ||
    record.monday_item_url ||
    record.mondayUrl ||
    null;
  if (direct && /^https?:\/\//i.test(String(direct))) return String(direct).trim();

  const id = record.monday_item_id ?? record.mondayItemId ?? null;
  if (id == null || id === '') return null;
  const base = getMondayPulseBase();
  if (!base) return null;
  const sid = String(id).replace(/^\//, '');
  return `${base}/${encodeURIComponent(sid)}`;
}
