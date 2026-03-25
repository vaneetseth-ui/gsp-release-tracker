#!/usr/bin/env node
/**
 * GSP Release Tracker — Monday-first 7-step ingest (v1.2) + Jira GSP supplement.
 *
 * Usage: node scripts/sync-local.js
 * Env: MONDAY_API_KEY, JIRA_PAT, HEROKU_URL, optional INGEST_TOKEN,
 *      optional LEGACY_ARCHIVE_JSON (path to JSON map partnerLower -> { planning, golive })
 *
 * Phase 2 stubs (DB columns exist; wire when links/creds exist):
 *   — salesforce_account_id, bug_report_count, bug_reports_url on each release row
 */
import { readFileSync, existsSync } from 'fs';
import { buildJiraSearchFields, collectFieldIdsFromEnv, extractCustomFieldValue } from './jira-field-utils.js';
import { productBucketForProduct } from '../src/data/constants.js';
import { normalizePartnerToken } from '../src/utils/partnerUtils.js';

const CONFIG = {
  jiraUrl: process.env.JIRA_URL || 'https://jira.ringcentral.com',
  jiraPat: process.env.JIRA_PAT || '',
  mondayKey: process.env.MONDAY_API_KEY || '',
  herokuUrl: process.env.HEROKU_URL || 'https://gsp-release-tracker-ffa0c1ec9485.herokuapp.com',
  ingestToken: process.env.INGEST_TOKEN || '',
};

const BOARD_PRIORITIES = '18396681774';
const BOARD_TRACKER_1 = '18399812494';
const BOARD_TRACKER_2 = '18399616718';

const JQL_GSP = 'project = GSP AND resolution = Unresolved ORDER BY priority DESC, updated DESC';

const PMO_TO_STAGE = {
  done: 'GA',
  closed: 'GA',
  released: 'GA',
  ga: 'GA',
  live: 'GA',
  'generally available': 'GA',
  'ready for ga': 'GA',
  'in beta': 'Beta',
  beta: 'Beta',
  'beta testing': 'Beta',
  eap: 'EAP',
  'early access': 'EAP',
  'early adopter': 'EAP',
  'in progress': 'Dev',
  'in development': 'Dev',
  dev: 'Dev',
  development: 'Dev',
  planned: 'Planned',
  'to do': 'Planned',
  open: 'Planned',
  backlog: 'Planned',
  blocked: 'Blocked',
  impediment: 'Blocked',
  'on hold': 'Blocked',
};

function normStageFromPmo(text) {
  if (!text || typeof text !== 'string') return 'Planned';
  const k = text.trim().toLowerCase();
  return PMO_TO_STAGE[k] || PMO_TO_STAGE[k.replace(/\s+/g, ' ')] || 'Dev';
}

function col(item, title) {
  const c = (item.column_values || []).find((x) => x.title?.toLowerCase() === title.toLowerCase());
  return c?.text != null && String(c.text).trim() ? String(c.text).trim() : null;
}

function colObj(item, title) {
  return (item.column_values || []).find((x) => x.title?.toLowerCase() === title.toLowerCase()) || null;
}

function parseLinkedPulseId(column) {
  if (!column?.value) return null;
  try {
    const v = JSON.parse(column.value);
    if (v.linkedPulseIds?.linkedPulseIds?.length)
      return String(v.linkedPulseIds.linkedPulseIds[0].linkedPulseId);
    if (Array.isArray(v.linkedPulseIds) && v.linkedPulseIds.length)
      return String(v.linkedPulseIds[0]);
    if (v.item_ids?.length) return String(v.item_ids[0]);
    if (v.boardIds && v.itemId) return String(v.itemId);
    if (v.linked_item_ids?.length) return String(v.linked_item_ids[0]);
  } catch {
    /* ignore */
  }
  return null;
}

function impactFromDescription(desc) {
  if (!desc) return null;
  const text = String(desc)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  const parts = text.split(/(?<=[.!?])\s+/).slice(0, 2);
  return parts.join(' ').slice(0, 400) || null;
}

async function mondayGraphql(query) {
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: CONFIG.mondayKey },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data;
}

async function fetchBoardItems(boardId, label) {
  const q = `query {
    boards(ids: [${boardId}]) {
      items(limit: 100) {
        id
        name
        column_values { id title text value }
      }
    }
  }`;
  process.stdout.write(`  Monday ${label}…\r`);
  const data = await mondayGraphql(q);
  const items = data?.boards?.[0]?.items || [];
  console.log(`  ✓ ${items.length} items (${label})`);
  return items.map((i) => ({ ...i, board_id: boardId }));
}

function buildTrackerIndex(trackerItems) {
  const byId = new Map();
  for (const item of trackerItems) {
    const group =
      col(item, 'Group Name') ||
      col(item, 'Group') ||
      col(item, 'Name') ||
      item.name ||
      '';
    const pr = col(item, 'Product Readiness Date') || col(item, 'Product Readiness') || null;
    const gl = col(item, 'GSP / Partner Launch Date') || col(item, 'GSP Launch Date') || col(item, 'Partner Launch Date') || null;
    byId.set(String(item.id), {
      id: String(item.id),
      groupName: group,
      product_readiness_date: pr,
      gsp_launch_date: gl,
    });
  }
  return byId;
}

function findTrackerRowByPartner(byId, partnerRaw, provenance) {
  const p = normalizePartnerToken(partnerRaw);
  if (!p) return null;
  const candidates = [];
  for (const row of byId.values()) {
    const g = normalizePartnerToken(row.groupName || '');
    if (!g) continue;
    if (g === p || g.includes(p) || p.includes(g)) candidates.push(row);
  }
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    provenance.push('step3_ambiguous_group');
    return candidates[0];
  }
  return null;
}

function loadLegacyPartnerDates() {
  const path = process.env.LEGACY_ARCHIVE_JSON || '';
  if (!path || !existsSync(path)) return new Map();
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    const m = new Map();
    for (const [k, v] of Object.entries(raw)) {
      m.set(normalizePartnerToken(k), {
        planning: v.planning || v.d || v.col_d || null,
        golive: v.golive || v.e || v.col_e || null,
      });
    }
    return m;
  } catch (e) {
    console.warn('LEGACY_ARCHIVE_JSON read failed:', e.message);
    return new Map();
  }
}

async function fetchAllJira(jql) {
  const issues = [];
  let startAt = 0;
  while (true) {
    const url = new URL(`${CONFIG.jiraUrl}/rest/api/2/search`);
    url.searchParams.set('jql', jql);
    url.searchParams.set('startAt', String(startAt));
    url.searchParams.set('maxResults', '100');
    url.searchParams.set('fields', buildJiraSearchFields());
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${CONFIG.jiraPat}`, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Jira ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    issues.push(...(data.issues || []));
    if (issues.length >= (data.total || 0) || (data.issues || []).length === 0) break;
    startAt += data.issues.length;
  }
  return issues;
}

function jiraPartnerFromIssue(issue) {
  const comp = issue.fields?.components?.[0]?.name;
  if (comp && String(comp).trim()) return String(comp).trim();
  const parts = (issue.fields?.summary || '').split('|').map((s) => s.trim());
  return parts[0] || 'Unknown';
}

function buildJiraIndex(issues) {
  const byKey = new Map();
  for (const issue of issues) {
    byKey.set(issue.key.toUpperCase(), issue);
  }
  return byKey;
}

function extractJiraKeyFromText(text) {
  if (!text) return null;
  const m = String(text).match(/\b(GSP-\d+)\b/i);
  return m ? m[1].toUpperCase() : null;
}

async function wakeupHeroku() {
  const url = `${CONFIG.herokuUrl}/api/health`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 30000);
  try {
    console.log('▶ Waking dashboard (GET /api/health)…');
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) console.warn(`  Health HTTP ${res.status} — continuing`);
    else console.log('  ✓ Ready');
  } catch (e) {
    clearTimeout(t);
    console.warn(`  Wake-up: ${e.message} — continuing`);
  }
}

function baseRecord(mondayItem, provenance) {
  const partner = col(mondayItem, 'Partner') || mondayItem.name || 'Unknown';
  const pmoRaw = col(mondayItem, 'Status') || 'Planned';
  const productTrack = col(mondayItem, 'Product Track') || col(mondayItem, 'Product') || 'General';
  const product = productTrack;
  const prNum = col(mondayItem, 'Priority');
  let priority_number = null;
  if (prNum != null) {
    const n = parseInt(String(prNum).replace(/\D/g, ''), 10);
    if (!Number.isNaN(n)) priority_number = n;
  }
  const jiraNumRaw = col(mondayItem, 'Jira Number') || col(mondayItem, 'Jira') || '';
  const jira_number = extractJiraKeyFromText(jiraNumRaw) || extractJiraKeyFromText(mondayItem.name);

  return {
    release_key: `monday:${mondayItem.id}`,
    partner: String(partner).trim(),
    product: String(product).trim() || 'General',
    product_area: productBucketForProduct(productTrack),
    stage: normStageFromPmo(pmoRaw),
    pmo_status: pmoRaw,
    jira_status: null,
    project_title: null,
    impact_summary: null,
    desc_raw: null,
    product_track: productTrack,
    market_type: col(mondayItem, 'Market Type'),
    priority_number,
    product_readiness_date: null,
    gsp_launch_date: null,
    schedule_url: null,
    tracker_group: null,
    monday_comment: col(mondayItem, 'Comment') || col(mondayItem, 'Notes'),
    comment_updated_at: null,
    target_date: null,
    actual_date: null,
    jira_number,
    pm: col(mondayItem, 'Product Manager') || col(mondayItem, 'PM'),
    se_lead: col(mondayItem, 'SE Lead'),
    csm: null,
    notes: null,
    blocked: 0,
    red_account: 0,
    missing_pm: 0,
    days_overdue: null,
    days_in_eap: null,
    arr_at_risk: null,
    source: 'monday',
    monday_url: `https://monday.com/boards/${mondayItem.board_id}/pulses/${mondayItem.id}`,
    monday_item_id: String(mondayItem.id),
    data_provenance: JSON.stringify(provenance),
    is_unmanaged_jira: 0,
    include_in_matrix: 1,
    legacy_planning_date: null,
    legacy_golive_date: null,
    legacy_sourced: 0,
    salesforce_account_id: null,
    bug_report_count: null,
    bug_reports_url: null,
  };
}

function processMondayItem(mondayItem, ctx) {
  const provenance = ['step1_priorities'];
  const rec = baseRecord(mondayItem, provenance);

  const linkCol =
    colObj(mondayItem, 'Schedule link') ||
    colObj(mondayItem, 'Schedule') ||
    colObj(mondayItem, 'Link') ||
    colObj(mondayItem, 'Tracker link');
  const linkedId = linkCol ? parseLinkedPulseId(linkCol) : null;
  const linkText = linkCol?.text || null;
  if (linkText && String(linkText).startsWith('http')) rec.schedule_url = String(linkText).trim();

  let trackerRow = null;
  if (linkedId && ctx.trackerById.has(linkedId)) {
    trackerRow = ctx.trackerById.get(linkedId);
    provenance.push('step2_link');
    provenance.push('step3_linked_row');
  } else {
    provenance.push('step2_no_link');
    trackerRow = findTrackerRowByPartner(ctx.trackerById, rec.partner, provenance);
    if (trackerRow) provenance.push('step3_semantic_match');
  }

  if (trackerRow) {
    rec.tracker_group = trackerRow.groupName || null;
    rec.product_readiness_date = trackerRow.product_readiness_date || null;
    rec.gsp_launch_date = trackerRow.gsp_launch_date || null;
    provenance.push('step4_tracker_dates');
  } else {
    provenance.push('step4_not_scheduled');
  }

  const issue = rec.jira_number ? ctx.jiraByKey.get(String(rec.jira_number).toUpperCase()) : null;
  if (issue) {
    provenance.push('step5_jira');
    rec.jira_status = issue.fields?.status?.name || null;
    rec.project_title = issue.fields?.summary || null;
    rec.desc_raw =
      typeof issue.fields?.description === 'string'
        ? issue.fields.description
        : issue.fields?.description != null
          ? JSON.stringify(issue.fields.description)
          : null;
    rec.impact_summary = impactFromDescription(rec.desc_raw);
    rec.notes = rec.project_title ? String(rec.project_title).slice(0, 200) : null;
    ctx.matchedJiraKeys.add(issue.key.toUpperCase());
  } else if (rec.jira_number) {
    provenance.push('step5_jira_missing');
  } else {
    provenance.push('step5_no_jira_field');
  }

  provenance.push('step6_pmo_managed');

  const legacy = ctx.legacyMap.get(normalizePartnerToken(rec.partner));
  let usedLegacy = false;
  if (legacy && (!rec.product_readiness_date || !rec.gsp_launch_date)) {
    if (!rec.product_readiness_date && legacy.planning) {
      rec.product_readiness_date = legacy.planning;
      rec.legacy_planning_date = legacy.planning;
      usedLegacy = true;
    }
    if (!rec.gsp_launch_date && legacy.golive) {
      rec.gsp_launch_date = legacy.golive;
      rec.legacy_golive_date = legacy.golive;
      usedLegacy = true;
    }
    if (usedLegacy) {
      provenance.push('step7_legacy_archive');
      rec.legacy_sourced = 1;
    }
  } else {
    provenance.push('step7_no_legacy');
  }

  rec.data_provenance = JSON.stringify(provenance);
  return rec;
}

function unmanagedRecord(issue) {
  const partner = jiraPartnerFromIssue(issue);
  const summary = issue.fields?.summary || '';
  const descRaw =
    typeof issue.fields?.description === 'string'
      ? issue.fields.description
      : issue.fields?.description != null
        ? JSON.stringify(issue.fields.description)
        : null;
  const provenance = ['step6_unmanaged_jira'];
  return {
    release_key: `jira-only:${issue.key}`,
    partner,
    product: 'General',
    product_area: productBucketForProduct(''),
    stage: normStageFromPmo(issue.fields?.status?.name || 'Planned'),
    pmo_status: null,
    jira_status: issue.fields?.status?.name || null,
    project_title: summary,
    impact_summary: impactFromDescription(descRaw),
    desc_raw: descRaw,
    product_track: null,
    market_type: null,
    priority_number: null,
    product_readiness_date: null,
    gsp_launch_date: null,
    schedule_url: null,
    tracker_group: null,
    monday_comment: null,
    comment_updated_at: null,
    target_date: issue.fields?.duedate || null,
    actual_date: null,
    jira_number: issue.key,
    pm: issue.fields?.assignee?.displayName || null,
    se_lead: null,
    csm: null,
    notes: summary ? summary.slice(0, 200) : null,
    blocked: 0,
    red_account: 0,
    missing_pm: 0,
    days_overdue: null,
    days_in_eap: null,
    arr_at_risk: null,
    source: 'jira',
    monday_url: null,
    monday_item_id: null,
    data_provenance: JSON.stringify(provenance),
    is_unmanaged_jira: 1,
    include_in_matrix: 0,
    legacy_planning_date: null,
    legacy_golive_date: null,
    legacy_sourced: 0,
    salesforce_account_id: null,
    bug_report_count: null,
    bug_reports_url: null,
  };
}

async function main() {
  const customIds = collectFieldIdsFromEnv();
  if (customIds.length) console.log('Jira custom fields:', customIds.join(', '));

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  GSP Release Tracker — v1.2 Monday-first sync   ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  if (!CONFIG.mondayKey) {
    console.error('✗ MONDAY_API_KEY is required (Step 1).');
    process.exit(1);
  }
  if (!CONFIG.jiraPat) {
    console.warn('⚠ JIRA_PAT not set — Step 5–6 will lack Jira enrichment and unmanaged detection.');
  }

  console.log('▶ Step 1 — Monday GSP Priorities');
  const priorityItems = await fetchBoardItems(BOARD_PRIORITIES, 'GSP Priorities');
  if (!priorityItems.length) {
    console.error('✗ No Monday Priorities items — aborting (no partial ingest).');
    process.exit(1);
  }

  console.log('\n▶ Monday tracker boards (Steps 2–4)');
  const t1 = await fetchBoardItems(BOARD_TRACKER_1, 'Tracker 1');
  const t2 = await fetchBoardItems(BOARD_TRACKER_2, 'Tracker 2');
  const trackerById = buildTrackerIndex([...t1, ...t2]);

  let jiraIssues = [];
  if (CONFIG.jiraPat) {
    console.log('\n▶ Jira GSP (supplement + unmanaged detection)');
    jiraIssues = await fetchAllJira(JQL_GSP);
    console.log(`  ✓ ${jiraIssues.length} GSP issues`);
  }
  const jiraByKey = buildJiraIndex(jiraIssues);
  const matchedJiraKeys = new Set();
  const legacyMap = loadLegacyPartnerDates();

  const ctx = { trackerById, jiraByKey, matchedJiraKeys, legacyMap };

  console.log('\n▶ Building release rows (7-step pipeline per item)…');
  const releases = priorityItems.map((item) => processMondayItem(item, ctx));

  if (CONFIG.jiraPat) {
    for (const issue of jiraIssues) {
      const k = issue.key.toUpperCase();
      if (!matchedJiraKeys.has(k)) releases.push(unmanagedRecord(issue));
    }
  }

  console.log(`  ✓ ${releases.length} total rows (${priorityItems.length} Monday + ${releases.length - priorityItems.length} unmanaged Jira)`);

  await wakeupHeroku();
  console.log(`\n▶ POST ${CONFIG.herokuUrl}/api/ingest`);
  const headers = { 'Content-Type': 'application/json' };
  if (CONFIG.ingestToken) headers.Authorization = `Bearer ${CONFIG.ingestToken}`;
  const body = JSON.stringify({
    releases,
    meta: {
      fetchedAt: new Date().toISOString(),
      source: 'sync-local-v1.2',
      mondayPriorities: priorityItems.length,
      trackerRows: trackerById.size,
      jiraGsp: jiraIssues.length,
    },
  });
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 120000);
  let ingestRes;
  try {
    ingestRes = await fetch(`${CONFIG.herokuUrl}/api/ingest`, {
      method: 'POST',
      headers,
      body,
      signal: ac.signal,
    });
  } finally {
    clearTimeout(to);
  }
  const rawText = await ingestRes.text();
  let result;
  try {
    result = JSON.parse(rawText);
  } catch {
    console.error(`✗ Ingest not JSON (HTTP ${ingestRes.status}): ${rawText.slice(0, 400)}`);
    process.exit(1);
  }
  if (!ingestRes.ok) {
    console.error('✗ Ingest failed:', result);
    process.exit(1);
  }
  console.log(`\n✅ Done — ${result.releases} releases live.\n`);
}

main().catch((e) => {
  console.error('\n✗ Fatal:', e.message);
  process.exit(1);
});
