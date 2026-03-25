/**
 * Product buckets v1.2 — RingEX / RingCX / AI Portfolio (Change 8).
 * Matrix columns + badge styling.
 */
import productsOverride from './products-override.js';

export const PRODUCT_BUCKETS = {
  RingEX: [
    'RingEX',
    'MVP',
    'RingCentral Video',
    'RingCentral Phone',
    'CEB',
    'Customer Engagement Bundle',
    'ACO',
  ],
  RingCX: [
    'RingCX',
    'RingCentral Contact Center',
    'Engage Voice',
    'RingSense for CX',
    'RingWEM',
  ],
  'AI Portfolio': [
    'AIR',
    'AIR Pro',
    'AVA',
    'ACE',
    'RingSense',
    'Nova IVA',
    'RingSense for Sales',
  ],
};

/** @deprecated use PRODUCT_BUCKETS */
export const PRODUCT_AREAS = {
  RingEX: PRODUCT_BUCKETS.RingEX,
  RingCX: PRODUCT_BUCKETS.RingCX,
  'AI Portfolio': PRODUCT_BUCKETS['AI Portfolio'],
};

/** { bucket, products }[] in display order */
export const PRODUCT_BUCKET_GROUPS = Object.entries(PRODUCT_BUCKETS).map(([bucket, products]) => ({
  area: bucket,
  bucket,
  products,
}));

/** @deprecated */
export const PRODUCT_AREA_GROUPS = PRODUCT_BUCKET_GROUPS;

/** Matrix columns left → right */
export const MATRIX_PRODUCT_ORDER = PRODUCT_BUCKET_GROUPS.flatMap((g) => g.products);

/** Longest names first — used when matching summary / labels / components */
export const KNOWN_PRODUCTS_SORTED = [...MATRIX_PRODUCT_ORDER].sort((a, b) => b.length - a.length);

const productToBucketExact = new Map();
for (const [bucket, products] of Object.entries(PRODUCT_BUCKETS)) {
  for (const p of products) {
    productToBucketExact.set(p.toLowerCase(), bucket);
  }
}
const overrideMap = new Map(
  Object.entries(productsOverride.productToBucket || {}).map(([k, v]) => [k.toLowerCase(), v])
);

/**
 * Bucket for a resolved product / track string (RingEX | RingCX | AI Portfolio | Other).
 */
export function productBucketForProduct(product) {
  if (!product || typeof product !== 'string') return 'Other';
  const trimmed = product.trim();
  if (!trimmed) return 'Other';
  const o = overrideMap.get(trimmed.toLowerCase());
  if (o) return o;
  const exact = productToBucketExact.get(trimmed.toLowerCase());
  if (exact) return exact;
  const lower = trimmed.toLowerCase();
  for (const p of KNOWN_PRODUCTS_SORTED) {
    if (lower.includes(p.toLowerCase())) {
      return productToBucketExact.get(p.toLowerCase()) || 'Other';
    }
  }
  return 'Other';
}

/**
 * @deprecated use productBucketForProduct
 */
export function productAreaForProduct(product) {
  return productBucketForProduct(product);
}

/**
 * Prefer stored DB/sync value if it matches a known bucket; else derive from product / track.
 */
const LEGACY_AREA_TO_BUCKET = {
  'Intelligent Voice & AI': 'AI Portfolio',
  'Contact Center': 'RingCX',
  'Unified Communications': 'RingEX',
  'Strategic Programs': 'RingEX',
};

export function normalizeProductArea(stored, product, productTrack) {
  const s = stored != null && String(stored).trim();
  if (s) {
    if (PRODUCT_BUCKETS[s]) return String(stored).trim();
    const mapped = LEGACY_AREA_TO_BUCKET[s];
    if (mapped) return mapped;
    if (['RingEX', 'RingCX', 'AI Portfolio'].includes(String(stored).trim()))
      return String(stored).trim();
  }
  const fromTrack = productTrack ? productBucketForProduct(String(productTrack)) : 'Other';
  if (fromTrack !== 'Other') return fromTrack;
  return productBucketForProduct(product);
}

export const PRODUCT_AREA_BADGE_CLASS = {
  RingEX:
    'bg-teal-50 text-teal-800 ring-1 ring-teal-100/90 dark:bg-teal-950/45 dark:text-teal-100 dark:ring-teal-800/45',
  RingCX:
    'bg-sky-50 text-sky-800 ring-1 ring-sky-100/90 dark:bg-sky-950/45 dark:text-sky-100 dark:ring-sky-800/45',
  'AI Portfolio':
    'bg-violet-50 text-violet-800 ring-1 ring-violet-100/90 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-800/50',
  Other:
    'bg-slate-50 text-slate-600 ring-1 ring-slate-200/70 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-600/50',
};

export function productAreaBadgeClass(area) {
  return PRODUCT_AREA_BADGE_CLASS[area] || PRODUCT_AREA_BADGE_CLASS.Other;
}
