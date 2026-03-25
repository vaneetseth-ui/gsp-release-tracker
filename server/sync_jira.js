/**
 * sync_jira.js — Jira → GSP Release Tracker data sync
 *
 * Fetches issues from Jira (project GSP only, v1.2) and transforms them
 * into the dashboard schema (v1.3): partner from components[0] or custom field;
 * product from labels/summary/additional components; jira_status verbatim; no legacy exception flags.
 *
 * Field mapping strategy:
 *   - summary          → parsed for product names (partner is component[0], v1.3 Ch.16)
 *   - status.name      → normalized stage (on hold → OnHold, not Blocked)
 *   - assignee         → PM
 *   - duedate          → target_date
 *   - resolutiondate   → actual_date
 *   - labels           → ARR hints only
 *   - components[1+]   → product hints (components[0] is partner)
 *   - custom fields    → overrideable via env vars (see FIELD_MAP below)
 *
 * Env vars:
 *   JIRA_URL           https://jira.ringcentral.com
 *   JIRA_PAT           Bearer token
 *   JIRA_FIELD_PARTNER customfield_XXXXX  (optional, for explicit partner field)
 *   JIRA_FIELD_PRODUCT customfield_XXXXX  (optional, for explicit product field)
 *   JIRA_FIELD_SE      customfield_XXXXX  (optional, SE Lead field)
 *   JIRA_FIELD_CSM     customfield_XXXXX  (optional, CSM field)
 *   JIRA_FIELD_ARR     customfield_XXXXX  (optional, ARR at risk field)
 *   JIRA_FIELD_STAGE   customfield_XXXXX  (optional, if stage is a custom field)
 *   JIRA_FIELD_MONDAY_URL     customfield_XXXXX  (optional, Monday board/item URL)
 *   JIRA_FIELD_MONDAY_ITEM_ID customfield_XXXXX  (optional, Monday pulse/item id)
 */

const JIRA_URL = process.env.JIRA_URL || 'https://jira.ringcentral.com';
const JIRA_PAT = process.env.JIRA_PAT || '';

// Custom field IDs — set these via Heroku config vars once you know them
// Run GET /api/sync/fields to discover the available custom fields
const FIELD_MAP = {
  partner:        process.env.JIRA_FIELD_PARTNER || null,
  product:        process.env.JIRA_FIELD_PRODUCT || null,
  se_lead:        process.env.JIRA_FIELD_SE      || null,
  csm:            process.env.JIRA_FIELD_CSM     || null,
  arr:            process.env.JIRA_FIELD_ARR     || null,
  stage:          process.env.JIRA_FIELD_STAGE   || null,
  monday_url:     process.env.JIRA_FIELD_MONDAY_URL || null,
  monday_item_id: process.env.JIRA_FIELD_MONDAY_ITEM_ID || null,
};

// Known GSP products — used to parse product from issue summary or labels
const KNOWN_PRODUCTS = ['Nova IVA', 'RingCX', 'AIR', 'MVP', 'ACO', 'RingEX'];

// Known GSP partners — used to parse partner from summary
const KNOWN_PARTNERS = [
  'AT&T', "AT&T O@H", 'Avaya', 'BT', 'Deutsche Telekom', 'DT-Unify', 'Ecotel',
  'MCM', 'NTT', 'Orange', 'Rogers', 'SoftBank', 'Swisscom', 'Telus',
  'Telefonica', 'Versatel', 'Vodafone', 'Verizon', 'KDDI', 'TELUS',
];

// Status → Stage normalization
const STATUS_TO_STAGE = {
  'done':            'GA',
  'closed':          'GA',
  'released':        'GA',
  'ga':              'GA',
  'generally available': 'GA',
  'in beta':         'Beta',
  'beta':            'Beta',
  'beta testing':    'Beta',
  'eap':             'EAP',
  'early access':    'EAP',
  'early adopter':   'EAP',
  'in development':  'Dev',
  'dev':             'Dev',
  'in progress':     'Dev',
  'development':     'Dev',
  'planned':         'Planned',
  'to do':           'Planned',
  'open':            'Planned',
  'backlog':         'Planned',
  /** Never surface generic "Blocked" for PMO — align with v1.3 Ch.19 */
  'blocked':         'OnHold',
  'impediment':      'OnHold',
  'on hold':         'OnHold',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeStage(statusName = '') {
  return STATUS_TO_STAGE[statusName.toLowerCase()] || 'Dev';
}

function parsePartnerFromSummary(summary = '') {
  for (const p of KNOWN_PARTNERS) {
    if (summary.toLowerCase().includes(p.toLowerCase())) return p;
  }
  // Try "[Partner] - Product" or "Partner: Product" patterns
  const m = summary.match(/^([A-Za-z0-9&@' ]+?)[\s\-:–]+/);
  return m ? m[1].trim() : 'Unknown';
}

function parseProductFromSummary(summary = '', labels = [], components = []) {
  // v1.3 Ch.16: components[0] is the GSP partner — do not use it as product.
  const productComponents = components.slice(1);
  for (const c of productComponents) {
    for (const prod of KNOWN_PRODUCTS) {
      if (c.name?.toLowerCase().includes(prod.toLowerCase())) return prod;
    }
  }
  // 2. Check labels
  for (const l of labels) {
    for (const prod of KNOWN_PRODUCTS) {
      if (l.toLowerCase().includes(prod.toLowerCase())) return prod;
    }
  }
  // 3. Parse from summary
  for (const prod of KNOWN_PRODUCTS) {
    if (summary.toLowerCase().includes(prod.toLowerCase())) return prod;
  }
  return 'Unknown';
}

function getCustomField(issue, fieldId) {
  if (!fieldId) return null;
  const val = issue.fields[fieldId];
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return val;
  if (val.displayName) return val.displayName;
  if (val.name)        return val.name;
  if (val.value)       return val.value;
  return String(val);
}

// ── Transform a single Jira issue → dashboard record ─────────────────────────

function transformIssue(issue, index) {
  const f = issue.fields;

  const summary    = f.summary || '';
  const labels     = f.labels  || [];
  const components = f.components || [];

  // Partner & product — v1.2: Jira component[0] is GSP partner when no custom field
  const partner =
    getCustomField(issue, FIELD_MAP.partner) ||
    (components[0]?.name && String(components[0].name).trim()) ||
    parsePartnerFromSummary(summary);
  const product = getCustomField(issue, FIELD_MAP.product) || parseProductFromSummary(summary, labels, components);

  // Stage
  const stageRaw = FIELD_MAP.stage
    ? getCustomField(issue, FIELD_MAP.stage)
    : f.status?.name;
  const stage = normalizeStage(stageRaw);

  // People — PM is Jira assignee; SE lead is the configured custom field (not the same as PM)
  const pm      = f.assignee?.displayName || null;
  const se_lead = getCustomField(issue, FIELD_MAP.se_lead) || null;
  const csm     = getCustomField(issue, FIELD_MAP.csm)     || null;

  const monday_url =
    getCustomField(issue, FIELD_MAP.monday_url) || null;
  const monday_item_id =
    getCustomField(issue, FIELD_MAP.monday_item_id) || null;

  // Dates
  const target_date = f.duedate      || null;
  const actual_date = f.resolutiondate ? f.resolutiondate.split('T')[0] : null;

  // ARR at risk (custom field or parsed from labels)
  let arr_at_risk = getCustomField(issue, FIELD_MAP.arr);
  if (!arr_at_risk) {
    const arrLabel = labels.find(l => /\$[\d.]+[KkMm]/.test(l));
    if (arrLabel) {
      const m = arrLabel.match(/\$([\d.]+)([KkMm])/);
      if (m) arr_at_risk = parseFloat(m[1]) * (m[2].toLowerCase() === 'm' ? 1000000 : 1000);
    }
  }

  return {
    id:           index + 1,
    release_key:  `jira:${issue.key}`,
    jira_key:     issue.key,
    partner,
    product,
    stage,
    pmo_status: null,
    jira_status: f.status?.name || null,
    target_date,
    actual_date,
    jira_number:  issue.key,
    pm,
    se_lead,
    csm,
    notes:        f.description ? String(f.description).slice(0, 200).replace(/\n/g, ' ') : null,
    arr_at_risk:  arr_at_risk ? Number(arr_at_risk) : null,
    monday_url: monday_url ? String(monday_url).trim() || null : null,
    monday_item_id: monday_item_id ? String(monday_item_id).trim() || null : null,
    source: 'jira',
    // raw for debugging
    _status_raw:  f.status?.name,
    _summary_raw: summary,
  };
}

// ── Fetch all pages from Jira search ─────────────────────────────────────────

async function fetchJiraIssues(jql, startAt = 0, maxResults = 100) {
  const url = new URL(`${JIRA_URL}/rest/api/2/search`);
  url.searchParams.set('jql',        jql);
  url.searchParams.set('startAt',    startAt);
  url.searchParams.set('maxResults', maxResults);
  url.searchParams.set('fields', [
    'summary', 'status', 'assignee', 'reporter', 'priority',
    'duedate', 'resolutiondate', 'created', 'updated',
    'labels', 'components', 'description', 'issuetype',
    // add custom fields dynamically
    ...Object.values(FIELD_MAP).filter(Boolean),
  ].join(','));

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${JIRA_PAT}`,
      'Accept':        'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira API ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json();
}

// ── Fetch ALL custom field definitions (for /api/sync/fields) ────────────────

export async function fetchJiraFields() {
  if (!JIRA_PAT) throw new Error('JIRA_PAT env var not set');
  const res = await fetch(`${JIRA_URL}/rest/api/2/field`, {
    headers: { 'Authorization': `Bearer ${JIRA_PAT}`, 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`Jira fields API ${res.status}`);
  const fields = await res.json();
  // Return custom fields only, sorted by id
  return fields
    .filter(f => f.custom)
    .map(f => ({ id: f.id, name: f.name, type: f.schema?.type }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ── Main sync function ────────────────────────────────────────────────────────

export async function syncFromJira() {
  if (!JIRA_PAT) {
    throw new Error('JIRA_PAT environment variable is not set. Add it via Heroku Config Vars.');
  }

  const JQL_QUERIES = [
    'project = GSP AND resolution = Unresolved ORDER BY priority DESC, updated DESC',
  ];

  const allIssues = [];

  for (const jql of JQL_QUERIES) {
    let startAt = 0;
    let total   = Infinity;

    while (startAt < total) {
      const data = await fetchJiraIssues(jql, startAt, 100);
      total       = data.total;
      allIssues.push(...data.issues);
      startAt    += data.issues.length;
      if (data.issues.length === 0) break;
    }
  }

  // De-duplicate by Jira key
  const seen = new Set();
  const unique = allIssues.filter(i => {
    if (seen.has(i.key)) return false;
    seen.add(i.key);
    return true;
  });

  const releases = unique.map(transformIssue);

  return {
    releases,
    fetchedAt:  new Date().toISOString(),
    totalIssues: unique.length,
    projects:   ['GSP'],
    jql:        JQL_QUERIES,
  };
}
