/**
 * v1.3.1 Ch.28 — Partner → Product Manager mapping for Release Matrix PM column.
 * Source: PMO mapping (Kevin / Venkat / Owen teams). Matrix row keys match matrixPartners.js.
 */
import { OTHER_MATRIX_BUCKET } from './matrixPartners.js';
import { normalizePartnerToken } from '../utils/partnerUtils.js';

/** Canonical matrix row key → PM display name */
export const MATRIX_ROW_PM = {
  Telus: 'Kevin Bumpus',
  'Avaya ACO': 'Kevin Bumpus',
  'AT&T O@H': 'Venkat Kethanaboyina',
  'Charter - ENT': 'Venkat Kethanaboyina',
  'Charter - SMB': 'Venkat Kethanaboyina',
  Frontier: 'Venkat Kethanaboyina',
  MCM: 'Venkat Kethanaboyina',
  DT: 'Owen Lunney / Alexey Martovoy',
  'DT - Unify': 'Owen Lunney / Alexey Martovoy',
  Ecotel: 'Owen Lunney / Alexey Martovoy',
  Versatel: 'Owen Lunney / Alexey Martovoy',
  BT: 'Owen Lunney / Stoyan Dragomanski',
  Vodafone: 'Owen Lunney',
  /** Verizon — End of Sale */
  Verizon: 'Unassigned',
  'RISE Amer': 'Roman Gertsen',
  "RISE Int'n": 'Roman Gertsen',
};

/**
 * Partners not always on their own matrix row (often under Other GSPs) → PM.
 * Matched via normalized substring on release.partner.
 */
const EXTRA_PARTNER_PM = [
  { match: ['brightspeed'], pm: 'Kevin Bumpus' },
  { match: ['cox'], pm: 'Kevin Bumpus' },
  { match: ['zayo'], pm: 'Kevin Bumpus' },
  { match: ['optus'], pm: 'Owen Lunney / Alexey Martovoy' },
  { match: ['rise amer', 'rise america', 'rise int', 'rise international'], pm: 'Roman Gertsen' },
];

function pmFromRawPartner(raw) {
  const n = normalizePartnerToken(raw);
  if (!n) return null;
  for (const { match, pm } of EXTRA_PARTNER_PM) {
    for (const m of match) {
      const t = m.trim();
      if (t.length >= 2 && (n === t || n.includes(t))) return pm;
    }
  }
  return null;
}

/**
 * PM to show in the Matrix PM column: mapping first, then optional Monday `pm` from release data.
 * @param {string} rowKey - matrix row key (e.g. Telus, Other GSPs)
 * @param {{ partner?: string, pm?: string|null }|null} firstRelease - representative release for the row
 * @returns {{ label: string, fromMapping: boolean }}
 */
export function getMatrixPmDisplay(rowKey, firstRelease) {
  if (rowKey && Object.hasOwn(MATRIX_ROW_PM, rowKey)) {
    return { label: MATRIX_ROW_PM[rowKey], fromMapping: true };
  }
  if (rowKey === OTHER_MATRIX_BUCKET && firstRelease?.partner) {
    const fromExtra = pmFromRawPartner(firstRelease.partner);
    if (fromExtra) return { label: fromExtra, fromMapping: true };
  }
  const pm = firstRelease?.pm;
  if (pm && String(pm).trim()) {
    return { label: String(pm).trim(), fromMapping: false };
  }
  return { label: '', fromMapping: false };
}

/** Reference lines for footer legend (PM + partner list) */
export const PARTNER_PM_LEGEND = [
  {
    pm: 'Kevin Bumpus',
    partners: 'Telus, Brightspeed, Cox, Avaya, Zayo',
    count: 5,
  },
  {
    pm: 'Venkat Kethanaboyina',
    partners: 'AT&T, Charter, Frontier, MCM',
    count: 4,
  },
  {
    pm: 'Owen Lunney / Alexey Martovoy',
    partners: 'DT, DT-ATOS, Versatel, Ecotel, Optus',
    count: 5,
  },
  {
    pm: 'Owen Lunney / Stoyan Dragomanski',
    partners: 'BT',
    count: 1,
  },
  {
    pm: 'Owen Lunney',
    partners: 'Vodafone',
    count: 1,
  },
  {
    pm: 'Unassigned',
    partners: 'Verizon — End of Sale',
    count: 1,
  },
  {
    pm: 'Roman Gertsen',
    partners: 'RISE Americas, RISE International',
    count: 2,
  },
];
