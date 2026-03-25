/**
 * Partner name normalization for sync + fuzzy grouping (v1.2 Change 7).
 */
import partnersOverride from '../data/partners-override.js';

export function normalizePartnerToken(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2019']/g, "'")
    .replace(/[^a-z0-9&@\s'-]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @returns {{ key: string, aliases: string[] }[]} */
export function partnerOverrideGroups() {
  const g = partnersOverride.groups || partnersOverride.canonicalGroups || [];
  return g.map((row) => ({
    key: row.key || row.canonical,
    aliases: row.aliases || [],
    override: row.override === true,
  }));
}

/**
 * Map raw partner string to strategic matrix row key using override file only.
 * @returns {string|null}
 */
export function partnerKeyFromOverrides(raw) {
  const p = normalizePartnerToken(raw);
  if (!p) return null;
  for (const { key, aliases } of partnerOverrideGroups()) {
    if (!key) continue;
    for (const a of aliases) {
      if (normalizePartnerToken(a) === p) return key;
    }
  }
  return null;
}
