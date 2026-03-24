#!/usr/bin/env node
/**
 * scripts/sync-local.js
 *
 * Run this from YOUR MACHINE (inside the RingCentral corporate network).
 * It fetches live data from Jira and pushes it to the Heroku dashboard.
 *
 * Usage:
 *   node scripts/sync-local.js
 *
 * Or with env vars inline:
 *   JIRA_PAT=xxx HEROKU_URL=https://... node scripts/sync-local.js
 *
 * Optional — map Jira custom fields (IDs from Issue → Configure fields, or REST metadata):
 *   JIRA_FIELD_PARTNER  JIRA_FIELD_PRODUCT  JIRA_FIELD_SE  JIRA_FIELD_CSM
 *   JIRA_FIELD_ARR      JIRA_FIELD_STAGE
 *   JIRA_FIELD_MONDAY_URL  JIRA_FIELD_MONDAY_ITEM_ID  (optional Monday links from Jira)
 * Example: export JIRA_FIELD_PARTNER=customfield_12345
 *
 * Config — edit these or set as environment variables:
 */

import { buildJiraSearchFields, collectFieldIdsFromEnv, extractCustomFieldValue } from './jira-field-utils.js';
import { KNOWN_PRODUCTS_SORTED, productAreaForProduct } from '../src/data/constants.js';

const CONFIG = {
  jiraUrl:     process.env.JIRA_URL      || 'https://jira.ringcentral.com',
  jiraPat:     process.env.JIRA_PAT      || '',   // set via: export JIRA_PAT=your-token
  herokuUrl:   process.env.HEROKU_URL    || 'https://gsp-release-tracker-ffa0c1ec9485.herokuapp.com',
  ingestToken: process.env.INGEST_TOKEN  || '',   // optional — set if you added INGEST_TOKEN on Heroku
};

const JQL_QUERIES = [
  'project = GSP AND resolution = Unresolved ORDER BY priority DESC, updated DESC',
  'project = PTR AND resolution = Unresolved ORDER BY priority DESC, updated DESC',
];

// ── Known values for field parsing ───────────────────────────────────────────

const KNOWN_PARTNERS = [
  'AT&T', "AT&T O@H", 'Avaya', 'BT', 'Deutsche Telekom', 'DT-Unify', 'Ecotel',
  'MCM', 'NTT', 'Orange', 'Rogers', 'SoftBank', 'Swisscom', 'Telus',
  'Telefonica', 'Versatel', 'Vodafone', 'Verizon', 'KDDI', 'TELUS',
];
/** Longer names first so e.g. "Deutsche Telekom" wins over "DT" */
const KNOWN_PARTNERS_SORTED = [...KNOWN_PARTNERS].sort((a, b) => b.length - a.length);

const STATUS_TO_STAGE = {
  'done': 'GA', 'closed': 'GA', 'released': 'GA', 'ga': 'GA', 'generally available': 'GA',
  'in beta': 'Beta', 'beta': 'Beta', 'beta testing': 'Beta',
  'eap': 'EAP', 'early access': 'EAP', 'early adopter': 'EAP',
  'in development': 'Dev', 'dev': 'Dev', 'in progress': 'Dev', 'development': 'Dev',
  'planned': 'Planned', 'to do': 'Planned', 'open': 'Planned', 'backlog': 'Planned',
  'blocked': 'Blocked', 'impediment': 'Blocked', 'on hold': 'Blocked',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeStage(s = '') {
  return STATUS_TO_STAGE[s.toLowerCase()] || 'Dev';
}

function parsePartner(summary = '') {
  const s = summary.toLowerCase();
  for (const p of KNOWN_PARTNERS_SORTED) {
    if (s.includes(p.toLowerCase())) return p;
  }
  const m = summary.match(/^([A-Za-z0-9&@' ]+?)[\s\-:–]+/);
  return m ? m[1].trim() : 'Unknown';
}

function parseProduct(summary = '', labels = [], components = []) {
  for (const c of components) {
    for (const prod of KNOWN_PRODUCTS_SORTED) {
      if (c.name?.toLowerCase().includes(prod.toLowerCase())) return prod;
    }
  }
  for (const l of labels) {
    for (const prod of KNOWN_PRODUCTS_SORTED) {
      if (l.toLowerCase().includes(prod.toLowerCase())) return prod;
    }
  }
  for (const prod of KNOWN_PRODUCTS_SORTED) {
    if (summary.toLowerCase().includes(prod.toLowerCase())) return prod;
  }
  return 'Unknown';
}

function cf(issue, fieldId) {
  if (!fieldId) return null;
  const v = issue.fields[fieldId];
  return extractCustomFieldValue(v);
}

function daysBetween(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000);
}

/** Heroku eco dynos sleep; small GET wakes the app before a large POST. */
async function wakeupHeroku() {
  const url = `${CONFIG.herokuUrl}/api/health`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 30000);
  try {
    console.log('▶ Waking dashboard (GET /api/health)…');
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) console.warn(`  Health returned HTTP ${res.status} — continuing`);
    else console.log('  ✓ Ready');
  } catch (e) {
    clearTimeout(t);
    console.warn(`  Wake-up: ${e.message} — continuing`);
  }
}

function transform(issue, idx) {
  const f = issue.fields;
  const labels     = f.labels     || [];
  const components = f.components || [];
  const summary    = f.summary    || '';

  // Use custom field overrides if set via env vars
  const FIELDS = {
    partner:        process.env.JIRA_FIELD_PARTNER || null,
    product:        process.env.JIRA_FIELD_PRODUCT || null,
    se_lead:        process.env.JIRA_FIELD_SE      || null,
    csm:            process.env.JIRA_FIELD_CSM     || null,
    arr:            process.env.JIRA_FIELD_ARR     || null,
    stage:          process.env.JIRA_FIELD_STAGE   || null,
    monday_url:     process.env.JIRA_FIELD_MONDAY_URL || null,
    monday_item_id: process.env.JIRA_FIELD_MONDAY_ITEM_ID || null,
  };

  const partner = cf(issue, FIELDS.partner) || parsePartner(summary);
  const product = cf(issue, FIELDS.product) || parseProduct(summary, labels, components);
  const product_area = productAreaForProduct(product);
  const stageRaw = FIELDS.stage ? cf(issue, FIELDS.stage) : f.status?.name;
  const stage   = normalizeStage(stageRaw);

  const pm      = f.assignee?.displayName || null;
  const se_lead = cf(issue, FIELDS.se_lead) || null;
  const csm     = cf(issue, FIELDS.csm)     || null;

  const blocked    = stage === 'Blocked' || labels.some(l => /blocked|impediment|on.hold/i.test(l)) ? 1 : 0;
  const red_account = labels.some(l => /red.account|red.acct|at.risk/i.test(l)) ? 1 : 0;
  const missing_pm = !f.assignee ? 1 : 0;

  const target_date = f.duedate || null;
  const actual_date = f.resolutiondate ? f.resolutiondate.split('T')[0] : null;
  const days_in_eap  = stage === 'EAP' ? daysBetween(f.created) : null;
  const days_overdue = (blocked && target_date && new Date(target_date) < new Date())
    ? daysBetween(target_date) : null;

  let arr_at_risk = cf(issue, FIELDS.arr);
  if (!arr_at_risk) {
    const arrLabel = labels.find(l => /\$[\d.]+[KkMm]/.test(l));
    if (arrLabel) {
      const m = arrLabel.match(/\$([\d.]+)([KkMm])/);
      if (m) arr_at_risk = parseFloat(m[1]) * (m[2].toLowerCase() === 'm' ? 1000000 : 1000);
    }
  }

  return {
    id: idx + 1,
    jira_key:    issue.key,
    partner,
    product,
    product_area,
    stage,
    target_date,
    actual_date,
    jira_number: issue.key,
    pm,
    se_lead,
    csm,
    // Short summary for UI + smaller ingest payload (see BUILD-LOG issue #6)
    notes: summary ? String(summary).slice(0, 200) : null,
    blocked,
    red_account,
    missing_pm,
    days_overdue,
    days_in_eap,
    arr_at_risk: arr_at_risk ? Number(arr_at_risk) : null,
    monday_url: cf(issue, FIELDS.monday_url) || null,
    monday_item_id: cf(issue, FIELDS.monday_item_id) || null,
    source: 'jira',
  };
}

// ── Fetch all Jira issues for a JQL query ─────────────────────────────────────

async function fetchAll(jql) {
  const issues = [];
  let startAt = 0;

  while (true) {
    const url = new URL(`${CONFIG.jiraUrl}/rest/api/2/search`);
    url.searchParams.set('jql',        jql);
    url.searchParams.set('startAt',    startAt);
    url.searchParams.set('maxResults', 100);
    url.searchParams.set('fields', buildJiraSearchFields());

    process.stdout.write(`  Fetching issues ${startAt}–${startAt + 100}…\r`);

    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${CONFIG.jiraPat}`,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Jira API ${res.status}: ${text.slice(0, 300)}`);
    }

    const data = await res.json();
    issues.push(...data.issues);

    if (issues.length >= data.total || data.issues.length === 0) break;
    startAt += data.issues.length;
  }

  return issues;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  GSP Release Tracker — Local Jira Sync       ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  console.log(`Jira:   ${CONFIG.jiraUrl}`);
  console.log(`Heroku: ${CONFIG.herokuUrl}`);
  const customIds = collectFieldIdsFromEnv();
  if (customIds.length) {
    console.log(`Fields: ${customIds.join(', ')} (from JIRA_FIELD_* env)\n`);
  } else {
    console.log(`Fields: summary-only parsing (set JIRA_FIELD_PARTNER / JIRA_FIELD_PRODUCT etc.)\n`);
  }

  // 1. Fetch from Jira
  const allIssues = [];
  for (const jql of JQL_QUERIES) {
    console.log(`▶ Querying: ${jql}`);
    try {
      const issues = await fetchAll(jql);
      console.log(`  ✓ ${issues.length} issues fetched`);
      allIssues.push(...issues);
    } catch (e) {
      console.error(`  ✗ Failed: ${e.message}`);
    }
  }

  if (allIssues.length === 0) {
    console.error('\n✗ No issues fetched. Check your PAT and network connection.');
    process.exit(1);
  }

  // 2. De-duplicate by Jira key
  const seen = new Set();
  const unique = allIssues.filter(i => {
    if (seen.has(i.key)) return false;
    seen.add(i.key);
    return true;
  });

  // 3. Transform to dashboard schema
  const releases = unique.map(transform);
  console.log(`\n▶ Transformed ${releases.length} releases from ${unique.length} issues`);

  // Show a quick preview
  const partners = [...new Set(releases.map(r => r.partner))].slice(0, 8);
  console.log(`  Partners found: ${partners.join(', ')}${partners.length < releases.length ? '…' : ''}`);

  // 4. Wake Heroku (eco dynos sleep) then push
  await wakeupHeroku();

  console.log(`\n▶ Pushing to ${CONFIG.herokuUrl}/api/ingest…`);
  const headers = { 'Content-Type': 'application/json' };
  if (CONFIG.ingestToken) headers['Authorization'] = `Bearer ${CONFIG.ingestToken}`;

  const body = JSON.stringify({
    releases,
    meta: {
      totalIssues: unique.length,
      projects:    ['GSP', 'PTR'],
      fetchedAt:   new Date().toISOString(),
      source:      'local-sync',
    },
  });

  const controller = new AbortController();
  const ingestTimeout = setTimeout(() => controller.abort(), 120000);
  let ingestRes;
  try {
    ingestRes = await fetch(`${CONFIG.herokuUrl}/api/ingest`, {
      method:  'POST',
      headers,
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(ingestTimeout);
  }

  const rawText = await ingestRes.text();
  let result;
  try {
    result = JSON.parse(rawText);
  } catch {
    console.error(`\n✗ Ingest failed (not JSON, HTTP ${ingestRes.status}): ${rawText.slice(0, 400)}`);
    process.exit(1);
  }

  if (!ingestRes.ok) {
    console.error(`\n✗ Ingest failed: ${JSON.stringify(result)}`);
    process.exit(1);
  }

  console.log(`\n✅  Done! ${result.releases} releases now live on the dashboard.`);
  console.log(`   ${CONFIG.herokuUrl}\n`);
}

main().catch(e => {
  console.error('\n✗ Fatal error:', e.message);
  process.exit(1);
});
