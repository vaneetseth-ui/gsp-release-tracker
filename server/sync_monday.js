import { readFileSync, existsSync } from 'fs';
import { buildJiraSearchFields, collectFieldIdsFromEnv } from '../scripts/jira-field-utils.js';
import { productBucketForProduct } from '../src/data/constants.js';
import { normalizePartnerToken } from '../src/utils/partnerUtils.js';

const MONDAY_PAGE_LIMIT = 500;

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
  blocked: 'OnHold',
  impediment: 'OnHold',
  'on hold': 'OnHold',
};

const MONDAY_ITEM_FIELDS = `
  id
  name
  updated_at
  url
  column_values {
    id
    text
    type
    value
    ... on BoardRelationValue {
      linked_item_ids
      display_value
    }
    ... on MirrorValue {
      display_value
    }
  }
`;

const PRIORITIES_FIELD_SPECS = {
  partner: { aliases: ['Partner'], required: true },
  status: { aliases: ['Status'], required: true },
  comment: { aliases: ['Comment', 'Notes'], required: true },
  seLead: { aliases: ['SE Lead'], required: true },
  schedule: { aliases: ['Schedule', 'Schedule link', 'Link', 'Tracker link'], required: true },
  jiraNumber: { aliases: ['Jira Number', 'Jira'], required: true },
  productManager: { aliases: ['Product Manager', 'PM'], required: true },
  marketType: { aliases: ['Market Type'], required: true },
  productTrack: { aliases: ['Product Track', 'Product'], required: true },
  priority: { aliases: ['Priority'], required: false },
};

const TRACKER_FIELD_SPECS = {
  groupName: { aliases: ['Group Name', 'Group', 'Name'], required: true },
  productReadinessDate: { aliases: ['Product Readiness Date', 'Product Readiness'], required: false },
  gspLaunchDate: { aliases: ['GSP / Partner Launch Date', 'GSP Launch Date', 'Partner Launch Date'], required: false },
};

function normalizeTitle(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normStageFromPmo(text) {
  if (!text || typeof text !== 'string') return 'Planned';
  const k = text.trim().toLowerCase();
  return PMO_TO_STAGE[k] || PMO_TO_STAGE[k.replace(/\s+/g, ' ')] || 'Dev';
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

function extractJiraKeyFromText(text) {
  if (!text) return null;
  const m = String(text).match(/\b(GSP-\d+)\b/i);
  return m ? m[1].toUpperCase() : null;
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

function loadLegacyPartnerDates(env = process.env) {
  const path = env.LEGACY_ARCHIVE_JSON || '';
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
    throw new Error(`LEGACY_ARCHIVE_JSON read failed: ${e.message}`);
  }
}

function fieldValueText(column) {
  const text = column?.text != null && String(column.text).trim() ? String(column.text).trim() : null;
  if (text) return text;
  return column?.display_value != null && String(column.display_value).trim()
    ? String(column.display_value).trim()
    : null;
}

function parseLinkedPulseId(column) {
  if (Array.isArray(column?.linked_item_ids) && column.linked_item_ids.length) {
    return String(column.linked_item_ids[0]);
  }
  if (!column?.value) return null;
  try {
    const v = JSON.parse(column.value);
    if (v.linkedPulseIds?.linkedPulseIds?.length) {
      return String(v.linkedPulseIds.linkedPulseIds[0].linkedPulseId);
    }
    if (Array.isArray(v.linkedPulseIds) && v.linkedPulseIds.length) {
      return String(v.linkedPulseIds[0]);
    }
    if (v.item_ids?.length) return String(v.item_ids[0]);
    if (v.boardIds && v.itemId) return String(v.itemId);
    if (v.linked_item_ids?.length) return String(v.linked_item_ids[0]);
  } catch {
    /* ignore */
  }
  return null;
}

function columnByRef(item, fieldRef) {
  if (!fieldRef) return null;
  const cols = item.column_values || [];
  return cols.find((x) => x.id === fieldRef.id) || cols.find((x) => normalizeTitle(x.title) === normalizeTitle(fieldRef.title)) || null;
}

function textByRef(item, fieldRef) {
  return fieldValueText(columnByRef(item, fieldRef));
}

export function resolveBoardFieldRefs(columns, specs, boardLabel, { strict = true } = {}) {
  const refs = {};
  const missing = [];
  const cols = Array.isArray(columns) ? columns : [];
  for (const [key, spec] of Object.entries(specs)) {
    const aliases = spec.aliases.map(normalizeTitle);
    const match = cols.find((column) => aliases.includes(normalizeTitle(column.title)));
    if (match) {
      refs[key] = { id: String(match.id), title: match.title, type: match.type || null };
    } else if (spec.required) {
      missing.push(spec.aliases[0]);
    } else {
      refs[key] = null;
    }
  }
  if (strict && missing.length) {
    throw new Error(`Monday board "${boardLabel}" is missing required columns: ${missing.join(', ')}`);
  }
  return refs;
}

function summarizeFieldRefs(fieldRefs) {
  return Object.fromEntries(
    Object.entries(fieldRefs).map(([key, ref]) => [
      key,
      ref ? { id: ref.id, title: ref.title, type: ref.type } : null,
    ])
  );
}

function getMondaySyncConfig(env = process.env) {
  return {
    jiraUrl: env.JIRA_URL || 'https://jira.ringcentral.com',
    jiraPat: env.JIRA_PAT || '',
    mondayKey: env.MONDAY_API_KEY || '',
    mondayApiVersion: env.MONDAY_API_VERSION || '2026-04',
    prioritiesBoardId: env.MONDAY_BOARD_PRIORITIES_ID || '18396681774',
    trackerBoard1Id: env.MONDAY_BOARD_TRACKER_1_ID || '18399812494',
    trackerBoard2Id: env.MONDAY_BOARD_TRACKER_2_ID || '18399616718',
  };
}

async function mondayGraphql(query, variables, config) {
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: config.mondayKey,
      'API-Version': config.mondayApiVersion,
    },
    body: JSON.stringify({ query, variables }),
  });
  const rawText = await res.text();
  let json;
  try {
    json = JSON.parse(rawText);
  } catch {
    throw new Error(`Monday HTTP ${res.status}: ${rawText.slice(0, 300)}`);
  }
  if (!res.ok) {
    const message = json?.errors?.map((e) => e.message).join('; ') || rawText.slice(0, 300);
    throw new Error(`Monday HTTP ${res.status}: ${message}`);
  }
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  return json.data;
}

async function fetchBoardBundle(boardId, label, fieldSpecs, config) {
  const initialQuery = `query GetBoardItems($boardId: [ID!], $limit: Int!) {
    boards(ids: $boardId) {
      id
      name
      columns {
        id
        title
        type
      }
      items_page(limit: $limit) {
        cursor
        items {
          ${MONDAY_ITEM_FIELDS}
        }
      }
    }
  }`;
  const nextQuery = `query GetNextBoardItems($cursor: String!, $limit: Int!) {
    next_items_page(cursor: $cursor, limit: $limit) {
      cursor
      items {
        ${MONDAY_ITEM_FIELDS}
      }
    }
  }`;

  const data = await mondayGraphql(initialQuery, { boardId: [String(boardId)], limit: MONDAY_PAGE_LIMIT }, config);
  const board = data?.boards?.[0];
  if (!board) {
    throw new Error(`Monday board ${boardId} (${label}) not found or inaccessible`);
  }

  const fieldRefs = resolveBoardFieldRefs(board.columns || [], fieldSpecs, board.name || label, {
    strict: Object.values(fieldSpecs).some((spec) => spec.required),
  });
  let items = [...(board.items_page?.items || [])];
  let cursor = board.items_page?.cursor || null;
  while (cursor) {
    const nextData = await mondayGraphql(nextQuery, { cursor, limit: MONDAY_PAGE_LIMIT }, config);
    const page = nextData?.next_items_page;
    items.push(...(page?.items || []));
    cursor = page?.cursor || null;
  }

  return {
    boardId: String(board.id),
    boardName: board.name || label,
    fieldRefs,
    items: items.map((item) => ({
      ...item,
      board_id: String(board.id),
      board_name: board.name || label,
    })),
  };
}

async function fetchAllJira(config) {
  const issues = [];
  let startAt = 0;
  while (true) {
    const url = new URL(`${config.jiraUrl}/rest/api/2/search`);
    url.searchParams.set('jql', 'project = GSP AND resolution = Unresolved ORDER BY priority DESC, updated DESC');
    url.searchParams.set('startAt', String(startAt));
    url.searchParams.set('maxResults', '100');
    url.searchParams.set('fields', buildJiraSearchFields());
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${config.jiraPat}`, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Jira ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    issues.push(...(data.issues || []));
    if (issues.length >= (data.total || 0) || (data.issues || []).length === 0) break;
    startAt += data.issues.length;
  }
  return issues;
}

function buildTrackerIndex(trackerBundles) {
  const byId = new Map();
  for (const bundle of trackerBundles) {
    for (const item of bundle.items) {
      const group = textByRef(item, bundle.fieldRefs.groupName) || item.name || '';
      const productReadinessDate = textByRef(item, bundle.fieldRefs.productReadinessDate);
      const gspLaunchDate = textByRef(item, bundle.fieldRefs.gspLaunchDate);
      byId.set(String(item.id), {
        id: String(item.id),
        boardId: bundle.boardId,
        boardName: bundle.boardName,
        groupName: group,
        product_readiness_date: productReadinessDate || null,
        gsp_launch_date: gspLaunchDate || null,
        url: item.url || null,
      });
    }
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

function baseRecord(mondayItem, fieldRefs, provenance) {
  const partner = textByRef(mondayItem, fieldRefs.partner) || mondayItem.name || 'Unknown';
  const pmoRaw = textByRef(mondayItem, fieldRefs.status) || 'Planned';
  const productTrack = textByRef(mondayItem, fieldRefs.productTrack) || 'General';
  const prNum = textByRef(mondayItem, fieldRefs.priority);
  let priorityNumber = null;
  if (prNum != null) {
    const n = parseInt(String(prNum).replace(/\D/g, ''), 10);
    if (!Number.isNaN(n)) priorityNumber = n;
  }
  const jiraNumRaw = textByRef(mondayItem, fieldRefs.jiraNumber) || '';
  const jiraNumber = extractJiraKeyFromText(jiraNumRaw) || extractJiraKeyFromText(mondayItem.name);

  return {
    release_key: `monday:${mondayItem.id}`,
    partner: String(partner).trim(),
    product: String(productTrack).trim() || 'General',
    product_area: productBucketForProduct(productTrack),
    stage: normStageFromPmo(pmoRaw),
    pmo_status: pmoRaw,
    jira_status: null,
    project_title: null,
    impact_summary: null,
    desc_raw: null,
    product_track: productTrack,
    market_type: textByRef(mondayItem, fieldRefs.marketType),
    priority_number: priorityNumber,
    product_readiness_date: null,
    gsp_launch_date: null,
    schedule_url: null,
    tracker_group: null,
    monday_comment: textByRef(mondayItem, fieldRefs.comment),
    comment_updated_at: mondayItem.updated_at || null,
    target_date: null,
    actual_date: null,
    jira_number: jiraNumber,
    pm: textByRef(mondayItem, fieldRefs.productManager),
    se_lead: textByRef(mondayItem, fieldRefs.seLead),
    csm: null,
    notes: null,
    arr_at_risk: null,
    source: 'monday',
    monday_url:
      mondayItem.url || `https://ringcentral.monday.com/boards/${mondayItem.board_id}/pulses/${mondayItem.id}`,
    monday_board_id: mondayItem.board_id ? String(mondayItem.board_id) : null,
    monday_board_name: mondayItem.board_name || null,
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

function processMondayItem(mondayItem, ctx, fieldRefs) {
  const provenance = ['step1_priorities'];
  const rec = baseRecord(mondayItem, fieldRefs, provenance);

  const scheduleColumn = columnByRef(mondayItem, fieldRefs.schedule);
  const linkedId = scheduleColumn ? parseLinkedPulseId(scheduleColumn) : null;
  const scheduleText = fieldValueText(scheduleColumn);
  if (scheduleText && String(scheduleText).startsWith('http')) {
    rec.schedule_url = String(scheduleText).trim();
  }

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
    rec.schedule_url = rec.schedule_url || trackerRow.url || null;
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
    arr_at_risk: null,
    source: 'jira',
    monday_url: null,
    monday_board_id: null,
    monday_board_name: null,
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

export async function runMondayFirstSync({ env = process.env, logger = console } = {}) {
  const config = getMondaySyncConfig(env);
  const customIds = collectFieldIdsFromEnv();
  if (!config.mondayKey) {
    throw new Error('MONDAY_API_KEY is required');
  }

  if (customIds.length) logger.log(`Jira custom fields: ${customIds.join(', ')}`);
  logger.log('▶ Step 1 — Monday GSP Priorities');
  const prioritiesBoard = await fetchBoardBundle(config.prioritiesBoardId, 'GSP Priorities', PRIORITIES_FIELD_SPECS, config);
  const priorityItems = prioritiesBoard.items;
  if (!priorityItems.length) {
    throw new Error('No Monday Priorities items returned');
  }

  logger.log('▶ Monday tracker boards (Steps 2–4)');
  const trackerBoard1 = await fetchBoardBundle(config.trackerBoard1Id, 'Tracker 1', TRACKER_FIELD_SPECS, config);
  const trackerBoard2 = await fetchBoardBundle(config.trackerBoard2Id, 'Tracker 2', TRACKER_FIELD_SPECS, config);
  const trackerById = buildTrackerIndex([trackerBoard1, trackerBoard2]);

  let jiraIssues = [];
  if (config.jiraPat) {
    logger.log('▶ Jira GSP (supplement + unmanaged detection)');
    jiraIssues = await fetchAllJira(config);
    logger.log(`  ✓ ${jiraIssues.length} GSP issues`);
  } else {
    logger.warn('⚠ JIRA_PAT not set — sync will use Monday only, without Jira enrichment or unmanaged detection.');
  }

  const jiraByKey = buildJiraIndex(jiraIssues);
  const matchedJiraKeys = new Set();
  const legacyMap = loadLegacyPartnerDates(env);
  const ctx = { trackerById, jiraByKey, matchedJiraKeys, legacyMap };

  logger.log('▶ Building release rows');
  const releases = priorityItems.map((item) => processMondayItem(item, ctx, prioritiesBoard.fieldRefs));

  if (config.jiraPat) {
    for (const issue of jiraIssues) {
      const key = issue.key.toUpperCase();
      if (!matchedJiraKeys.has(key)) releases.push(unmanagedRecord(issue));
    }
  }

  const unmanagedRowCount = releases.length - priorityItems.length;
  const jiraLinkedToMonday = matchedJiraKeys.size;
  const boardStats = [
    {
      key: 'priorities',
      id: prioritiesBoard.boardId,
      name: prioritiesBoard.boardName,
      items: priorityItems.length,
      fields: summarizeFieldRefs(prioritiesBoard.fieldRefs),
    },
    {
      key: 'tracker_1',
      id: trackerBoard1.boardId,
      name: trackerBoard1.boardName,
      items: trackerBoard1.items.length,
      fields: summarizeFieldRefs(trackerBoard1.fieldRefs),
    },
    {
      key: 'tracker_2',
      id: trackerBoard2.boardId,
      name: trackerBoard2.boardName,
      items: trackerBoard2.items.length,
      fields: summarizeFieldRefs(trackerBoard2.fieldRefs),
    },
  ];

  return {
    releases,
    meta: {
      fetchedAt: new Date().toISOString(),
      source: 'sync-monday-server-v1.0',
      mondayPriorities: priorityItems.length,
      trackerRows: trackerById.size,
      jiraGsp: jiraIssues.length,
      jiraLinkedToMonday,
      unmanagedJiraRows: Math.max(0, unmanagedRowCount),
      mondayApiVersion: config.mondayApiVersion,
      boardStats,
      requiredFields: {
        priorities: Object.keys(PRIORITIES_FIELD_SPECS),
        trackers: Object.keys(TRACKER_FIELD_SPECS),
      },
    },
    stats: {
      mondayPriorities: priorityItems.length,
      trackerRowsIndexed: trackerById.size,
      jiraIssuesPulled: jiraIssues.length,
      jiraLinkedToMonday,
      unmanagedJiraRows: Math.max(0, unmanagedRowCount),
      totalReleases: releases.length,
    },
  };
}
