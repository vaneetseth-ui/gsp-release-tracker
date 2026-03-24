/**
 * Release Matrix: fixed strategic partner rows + "Other GSPs" for everything else.
 * Match order: longer aliases first (e.g. "DT - Unify" before "DT").
 */

export const OTHER_MATRIX_BUCKET = 'Other GSPs';

/** Display order (17). Each row aggregates all releases whose partner maps here. */
export const STRATEGIC_PARTNER_DEFS = [
  { key: 'AT&T O@H', segment: 'Telco US', aliases: ['AT&T O@H', 'AT&T', 'ATT', 'AT&T O@H'] },
  { key: 'Avaya ACO', segment: 'UCaaS OEM', aliases: ['Avaya ACO', 'Avaya'] },
  { key: 'BT', segment: 'Telco UK', aliases: ['BT', 'British Telecom'] },
  { key: 'Charter - ENT', segment: 'Telco US', aliases: ['Charter - ENT', 'Charter ENT', 'Charter-ENT'] },
  { key: 'Charter - SMB', segment: 'Telco US', aliases: ['Charter - SMB', 'Charter SMB', 'Charter-SMB'] },
  { key: 'DT', segment: 'Telco DE', aliases: ['DT', 'Deutsche Telekom'] },
  { key: 'DT - Unify', segment: 'Telco DE', aliases: ['DT - Unify', 'DT-Unify', 'DT Unify'] },
  { key: 'Ecotel', segment: 'Telco DE', aliases: ['Ecotel'] },
  { key: 'Frontier', segment: 'Telco US', aliases: ['Frontier'] },
  { key: 'MCM', segment: 'Distributor', aliases: ['MCM'] },
  { key: 'RISE Amer', segment: 'Program', aliases: ['RISE Amer', 'RISE Americas', 'RISE America'] },
  {
    key: "RISE Int'n",
    segment: 'Program',
    aliases: ["RISE Int'n", "RISE Int'l", 'RISE International', 'RISE Intn'],
  },
  { key: 'Telus', segment: 'Telco CA', aliases: ['Telus', 'TELUS'] },
  { key: 'Unify', segment: 'UCaaS OEM', aliases: ['Unify'] },
  { key: 'Verizon', segment: 'Telco US', aliases: ['Verizon'] },
  { key: 'Versatel', segment: 'Telco DE', aliases: ['Versatel'] },
  { key: 'Vodafone', segment: 'Telco Global', aliases: ['Vodafone', 'VF', 'Vodafone Group'] },
];

export const STRATEGIC_PARTNER_ORDER = STRATEGIC_PARTNER_DEFS.map((d) => d.key);

const keyToSegment = Object.fromEntries(STRATEGIC_PARTNER_DEFS.map((d) => [d.key, d.segment]));

export function matrixPartnerSegment(canonicalKey) {
  return keyToSegment[canonicalKey] || null;
}

function norm(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\u2019/g, "'");
}

/** @returns {string | null} canonical strategic key, or null → Other GSPs */
export function matrixPartnerBucket(rawPartner) {
  const p = norm(rawPartner);
  if (!p) return null;

  for (const def of STRATEGIC_PARTNER_DEFS) {
    for (const a of def.aliases) {
      if (norm(a) === p) return def.key;
    }
  }

  const scored = [];
  for (const def of STRATEGIC_PARTNER_DEFS) {
    for (const a of def.aliases) {
      const na = norm(a);
      if (na.length < 2) continue;
      scored.push({ key: def.key, token: na, len: na.length });
    }
  }
  scored.sort((x, y) => y.len - x.len);

  for (const { key, token } of scored) {
    if (p === token || p.includes(token) || token.includes(p)) return key;
  }

  return null;
}

/** Severity for picking one cell when multiple releases share a bucket + product */
export function matrixCellSeverity(r) {
  if (!r) return 0;
  if (r.blocked) return 50;
  if (r.redAccount) return 40;
  if (r.missingPM) return 30;
  if ((r.daysInEAP || 0) > 90) return 20;
  return 10;
}

export function pickRepresentativeRelease(candidates) {
  if (!candidates?.length) return null;
  return [...candidates].sort((a, b) => matrixCellSeverity(b) - matrixCellSeverity(a))[0];
}
