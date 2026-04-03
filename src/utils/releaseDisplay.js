/**
 * v1.4 — Monday-native display helpers (Jira project_title / impact_summary not shown in UI).
 */

/** Card / Ask headline: partner + product */
export function mondayCardTitle(release) {
  const p = String(release?.partner || '').trim();
  const prod = String(release?.product || '').trim();
  if (p && prod) return `${p} — ${prod}`;
  if (p) return p;
  if (prod) return prod;
  return '—';
}

/** Primary description for cards / Ask (Monday Comment column) */
export function mondayDescription(release) {
  const c = release?.monday_comment;
  if (c && String(c).trim()) return String(c).trim();
  return '';
}

export function mondayDescriptionPreview(release, limit = 160) {
  const description = mondayDescription(release);
  if (!description) return '';
  if (description.length <= limit) return description;
  return `${description.slice(0, limit).trimEnd()}…`;
}

/** Matrix cell tooltip: Monday-first (no Jira summary) */
export function matrixCellTooltip(release, extraLine) {
  if (!release) return '';
  const title = mondayCardTitle(release);
  const desc = mondayDescription(release);
  const parts = [title];
  if (desc) parts.push(desc.slice(0, 280) + (desc.length > 280 ? '…' : ''));
  if (extraLine) parts.push(extraLine);
  return parts.join('\n');
}

/** Glip / Ask summary line (no Jira project_title) */
export function glipSummaryLine(release) {
  const d = mondayDescription(release);
  if (d) return `${mondayCardTitle(release)} — ${d.slice(0, 120)}${d.length > 120 ? '…' : ''}`;
  return mondayCardTitle(release);
}
