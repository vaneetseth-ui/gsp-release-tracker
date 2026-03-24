/**
 * Product area taxonomy — canonical sub-products per area for Jira parsing,
 * matrix column grouping, and badges.
 */
export const PRODUCT_AREAS = {
  'Intelligent Voice & AI': [
    'Nova IVA',
    'AIR',
    'RingSense',
    'RingSense for Sales',
  ],
  'Contact Center': [
    'RingCX',
    'RingSense for CX',
    'Engage Voice',
  ],
  'Unified Communications': [
    'MVP',
    'RingEX',
    'RingCentral Video',
  ],
  'Strategic Programs': ['ACO'],
};

/** { area, products }[] in display order */
export const PRODUCT_AREA_GROUPS = Object.entries(PRODUCT_AREAS).map(([area, products]) => ({
  area,
  products,
}));

/** Matrix columns left → right */
export const MATRIX_PRODUCT_ORDER = PRODUCT_AREA_GROUPS.flatMap((g) => g.products);

/** Longest names first — used when matching summary / labels / components */
export const KNOWN_PRODUCTS_SORTED = [...MATRIX_PRODUCT_ORDER].sort((a, b) => b.length - a.length);

const productToAreaExact = new Map();
for (const [area, products] of Object.entries(PRODUCT_AREAS)) {
  for (const p of products) {
    productToAreaExact.set(p.toLowerCase(), area);
  }
}

/**
 * Area for a resolved canonical product name (or best-effort for unknown strings).
 */
export function productAreaForProduct(product) {
  if (!product || typeof product !== 'string') return 'Other';
  const trimmed = product.trim();
  if (!trimmed) return 'Other';
  const exact = productToAreaExact.get(trimmed.toLowerCase());
  if (exact) return exact;
  const lower = trimmed.toLowerCase();
  for (const p of KNOWN_PRODUCTS_SORTED) {
    if (lower.includes(p.toLowerCase())) {
      return productToAreaExact.get(p.toLowerCase()) || 'Other';
    }
  }
  return 'Other';
}

/**
 * Prefer stored DB/sync value; fall back to mapping from product.
 */
export function normalizeProductArea(stored, product) {
  const s = stored != null && String(stored).trim();
  if (s) return String(stored).trim();
  return productAreaForProduct(product);
}

export const PRODUCT_AREA_BADGE_CLASS = {
  'Intelligent Voice & AI':
    'bg-violet-50 text-violet-800 ring-1 ring-violet-100/90',
  'Contact Center': 'bg-sky-50 text-sky-800 ring-1 ring-sky-100/90',
  'Unified Communications': 'bg-teal-50 text-teal-800 ring-1 ring-teal-100/90',
  'Strategic Programs': 'bg-amber-50 text-amber-900 ring-1 ring-amber-100/90',
  Other: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/70',
};

export function productAreaBadgeClass(area) {
  return PRODUCT_AREA_BADGE_CLASS[area] || PRODUCT_AREA_BADGE_CLASS.Other;
}
