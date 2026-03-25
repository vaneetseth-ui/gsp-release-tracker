/**
 * v1.2 Ask tab — structured queries over cached releases (no live Jira/Monday).
 */
import { productBucketForProduct } from '../src/data/constants.js';

function norm(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

function confidenceForRow(r) {
  const src = norm(r.source);
  if (src.includes('monday')) return 'High';
  if (src.includes('jira')) return 'Medium';
  if (r.legacy_sourced) return 'Low';
  return 'Medium';
}

function matchPartner(q, partners) {
  const ql = norm(q);
  let best = partners.find((p) => ql.includes(norm(p)));
  if (best) return best;
  best = partners.find((p) =>
    norm(p)
      .split(/[\s&@'.-]+/)
      .filter((w) => w.length > 2)
      .some((w) => ql.includes(w))
  );
  return best || null;
}

/**
 * @param {string} rawInput
 * @param {object} db — db.js module
 */
export function runAskQuery(rawInput, db) {
  const q = rawInput.toLowerCase().trim();
  const all = db.getAllReleases();
  const isUm = (r) => r.is_unmanaged_jira === 1 || r.is_unmanaged_jira === true;
  const matrix = all.filter((r) => !isUm(r) && r.include_in_matrix !== 0 && r.include_in_matrix !== false);
  const partners = db.getPartners();

  const PRODUCTS = [
    'Nova IVA',
    'RingCX',
    'AIR',
    'MVP',
    'ACO',
    'RingEX',
    'RingSense',
    'RingCentral Video',
  ];
  const PALIAS = {
    talos: 'RingCX',
    'nova iva': 'Nova IVA',
    nova: 'Nova IVA',
    iva: 'Nova IVA',
    ringcx: 'RingCX',
    'ring cx': 'RingCX',
    rcx: 'RingCX',
    mvp: 'MVP',
    aco: 'ACO',
    air: 'AIR',
  };

  let matchedProduct = PRODUCTS.find((p) => q.includes(p.toLowerCase()));
  if (!matchedProduct) {
    for (const [alias, prod] of Object.entries(PALIAS)) {
      if (q.includes(alias)) {
        matchedProduct = prod;
        break;
      }
    }
  }

  const matchedPartner = matchPartner(q, partners);

  // Type 4 — set difference: Jira not in Monday
  if (
    q.includes('not in monday') ||
    q.includes('without monday') ||
    (q.includes('jira') && q.includes('not') && q.includes('monday'))
  ) {
    const rows = db.getAllReleases().filter((r) => isUm(r));
    return {
      tier: 3,
      askType: 4,
      intent: 'jira_not_monday',
      confidence: 'High',
      rows,
      message:
        rows.length === 0
          ? 'No matches found — all GSP Jira tickets in cache appear linked to Monday, or cache is empty.'
          : `${rows.length} Jira GSP item(s) not on Monday.`,
      sources: ['postgres_cache'],
    };
  }

  // Type 3 — count RCX + schedule
  if (
    (q.includes('how many') || q.includes('count')) &&
    (q.includes('rcx') || q.includes('ringcx') || q.includes('ring cx') || q.includes('contact center'))
  ) {
    const rows = matrix.filter((r) => {
      const b = productBucketForProduct(r.product_track || r.product);
      return b === 'RingCX' && (r.gsp_launch_date || r.product_readiness_date || r.target_date);
    });
    return {
      tier: 2,
      askType: 3,
      intent: 'count_scheduled_rcx',
      confidence: 'High',
      count: rows.length,
      rows: rows.slice(0, 50),
      message:
        rows.length === 0
          ? 'No matches found — no RingCX-bucket rows with schedule dates on record.'
          : `${rows.length} PMO-managed RingCX-bucket release(s) with schedule data.`,
      sources: ['postgres_cache'],
    };
  }

  // Type 6 — launch dates by partner / row
  if (q.includes('launch date') || q.includes('dates for all') || q.includes('by row')) {
    const rows = [...matrix]
      .filter((r) => r.include_in_matrix !== 0)
      .sort((a, b) => String(a.partner).localeCompare(String(b.partner)));
    return {
      tier: 2,
      askType: 6,
      intent: 'date_list',
      confidence: 'High',
      rows,
      message: rows.length ? `Showing ${rows.length} row(s) from cache.` : 'No matches found.',
      sources: ['postgres_cache'],
    };
  }

  // Type 2 — top N critical by partner + priority
  if (q.includes('top ') && (q.includes('critical') || q.includes('priority'))) {
    const n = parseInt(/\btop\s+(\d+)\b/.exec(q)?.[1] || '5', 10) || 5;
    let pool = matrix;
    if (matchedPartner) pool = pool.filter((r) => norm(r.partner).includes(norm(matchedPartner)) || norm(matchedPartner).includes(norm(r.partner)));
    pool = [...pool].sort((a, b) => (Number(b.priority_number) || 0) - (Number(a.priority_number) || 0));
    const rows = pool.slice(0, n);
    return {
      tier: 2,
      askType: 2,
      intent: 'top_priority',
      confidence: 'High',
      rows,
      message:
        rows.length === 0
          ? 'No matches found — try another partner or check Exceptions for data gaps.'
          : `Top ${rows.length} by Monday priority #.`,
      sources: ['postgres_cache'],
    };
  }

  // Type 5 — product / codename status (free text)
  if (matchedProduct && (q.includes('live') || q.includes('status') || q.includes('launched'))) {
    const rows = matrix.filter(
      (r) =>
        norm(r.product).includes(matchedProduct.toLowerCase()) ||
        norm(r.product_track).includes(matchedProduct.toLowerCase())
    );
    const record = rows[0] || null;
    return {
      tier: 1,
      askType: 5,
      intent: 'product_status',
      confidence: record ? confidenceForRow(record) : 'High',
      record,
      rows,
      message: record
        ? null
        : 'Not on record — no matching product row in cache. Check Exceptions or spelling.',
      sources: ['postgres_cache'],
    };
  }

  // Type 1 — simple partner + product / bucket lookup
  if (matchedPartner && (matchedProduct || q.includes('status'))) {
    const rows = matrix.filter((r) => {
      const pOk =
        norm(r.partner).includes(norm(matchedPartner)) || norm(matchedPartner).includes(norm(r.partner));
      if (!matchedProduct) return pOk;
      const b = productBucketForProduct(r.product_track || r.product);
      const prodOk =
        norm(r.product).includes(matchedProduct.toLowerCase()) ||
        norm(r.product_track).includes(matchedProduct.toLowerCase()) ||
        b === productBucketForProduct(matchedProduct);
      return pOk && prodOk;
    });
    const record = rows[0] || null;
    return {
      tier: 1,
      askType: 1,
      intent: 'direct_lookup',
      confidence: record ? confidenceForRow(record) : 'High',
      record,
      rows,
      matchedPartner,
      matchedProduct,
      message: record
        ? null
        : 'Not on record — no row for that partner/product mix in cache.',
      sources: ['postgres_cache'],
    };
  }

  if (matchedPartner) {
    const rows = matrix.filter(
      (r) =>
        norm(r.partner).includes(norm(matchedPartner)) || norm(matchedPartner).includes(norm(r.partner))
    );
    return {
      tier: 1,
      askType: 1,
      intent: 'partner_summary',
      confidence: 'High',
      rows,
      matchedPartner,
      message: rows.length ? null : 'No matches found for that partner.',
      sources: ['postgres_cache'],
    };
  }

  return {
    tier: 0,
    askType: 0,
    intent: 'unknown',
    confidence: 'High',
    message:
      "No matches found — try a partner name (e.g. Telus), product (RingCX), or ask which Jira items are not in Monday. Open the Exceptions tab for data gaps.",
    sources: ['postgres_cache'],
  };
}
