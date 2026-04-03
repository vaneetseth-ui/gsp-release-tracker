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
  group {
    id
    title
  }
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
  subitems {
    id
    name
    updated_at
    url
    parent_item {
      id
      name
    }
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
  dri: { aliases: ['DRI'], required: false },
  timeline: { aliases: ['Timeline'], required: false },
  status: { aliases: ['Status'], required: false },
  comment: { aliases: ['Comment'], required: false },
  jiraTickets: { aliases: ['JIRA Tickets / Links', 'Jira ticket/links', 'Jira Tickets / Links'], required: false },
  criticalDependency: { aliases: ['Critical dependency', 'Critical Dependency'], required: false },
  dependency: { aliases: ['Dependency'], required: false },
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

function extractBoardIdFromUrl(url) {
  if (!url) return null;
  const m = String(url).match(/\/boards\/(\d+)/i);
  return m ? m[1] : null;
}

function extractUrlFromText(text) {
  if (!text) return null;
  const m = String(text).match(/https?:\/\/\S+/i);
  return m ? m[0] : null;
}

function normalizeProjectTitle(text, partner = '') {
  const partnerTokens = normalizePartnerToken(partner)
    .replace(/&/g, ' ')
    .split(' ')
    .filter((token) => token.length > 1);
  const raw = String(text || '')
    .replace(/\[[^\]]+\]\s*$/g, ' ')
    .replace(/\bex\b\s*[-:]\s*/gi, ' ')
    .replace(/\bgsp(?:\s*[-:]|\b)/gi, ' ')
    .replace(/\bdse\b\s*[-:]?\s*/gi, ' ')
    .replace(/\bfrontier\s+iot\b/gi, ' frontier ')
    .replace(/\byealink\s+t\d+\b/gi, ' yealink ')
    .replace(/\baia\b/gi, ' ai assistant ')
    .replace(/\bto align with rc direct\b/gi, ' ')
    .replace(/\bincluding ultra(?: equivalent)?\b/gi, ' ')
    .replace(/\band ultra equivalent\b/gi, ' ')
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9\s]+/gi, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  const filtered = raw
    .split(' ')
    .filter((token) => token && token !== 'ex' && token !== 'gsp' && token !== 'dse')
    .filter((token) => !partnerTokens.includes(token))
    .filter((token) => !/^t\d+$/.test(token));
  return filtered.join(' ').trim();
}

function extractJiraKeys(text) {
  if (!text) return [];
  return [...new Set([...String(text).matchAll(/\b([A-Z][A-Z0-9_]+-\d+)\b/gi)].map((m) => m[1].toUpperCase()))];
}

function parseTimelineColumn(column) {
  const raw = fieldValueText(column);
  let start = null;
  let end = null;
  if (column?.value) {
    try {
      const value = JSON.parse(column.value);
      start = value?.from ?? value?.start_date ?? value?.startDate ?? value?.timeline?.from ?? null;
      end = value?.to ?? value?.end_date ?? value?.endDate ?? value?.timeline?.to ?? null;
    } catch {
      /* ignore */
    }
  }
  return {
    raw: raw || null,
    start: start || null,
    end: end || null,
  };
}

function statusRank(status) {
  const raw = normalizeTitle(status);
  if (!raw) return { rank: -1, label: null };
  if (/(blocked|on hold|stuck|impediment)/i.test(raw)) return { rank: 4, label: 'Blocked' };
  if (/(at risk|risk)/i.test(raw)) return { rank: 3, label: 'At Risk' };
  if (/(working on it|in progress)/i.test(raw)) return { rank: 2, label: 'In Progress' };
  if (/(planned|not started|backlog|to do|open)/i.test(raw)) return { rank: 1, label: 'Planned' };
  if (/(done|complete|ga|released|closed|live)/i.test(raw)) return { rank: 0, label: 'Done' };
  return { rank: 2, label: String(status).trim() || null };
}

function isoDateOrNull(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function firstNonEmpty(values) {
  for (const value of values) {
    if (value != null && String(value).trim() !== '') return String(value).trim();
  }
  return null;
}

function mostFrequentNonEmpty(values) {
  const counts = new Map();
  for (const value of values) {
    const k = value != null ? String(value).trim() : '';
    if (!k) continue;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  let winner = null;
  let best = -1;
  for (const [value, count] of counts.entries()) {
    if (count > best) {
      winner = value;
      best = count;
    }
  }
  return winner;
}

function uniqueText(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function itemFieldSnapshot(item, fieldRefs) {
  const timeline = parseTimelineColumn(columnByRef(item, fieldRefs.timeline));
  return {
    id: String(item.id),
    name: item.name || '',
    parent_id: item.parent_item?.id ? String(item.parent_item.id) : null,
    parent_name: item.parent_item?.name || null,
    url: item.url || null,
    dri: textByRef(item, fieldRefs.dri),
    timeline_raw: timeline.raw,
    timeline_start: timeline.start,
    timeline_end: timeline.end,
    status_raw: textByRef(item, fieldRefs.status),
    comment: textByRef(item, fieldRefs.comment),
    jira_links: extractJiraKeys(textByRef(item, fieldRefs.jiraTickets)),
    critical_dependency: textByRef(item, fieldRefs.criticalDependency),
    dependency: textByRef(item, fieldRefs.dependency),
  };
}

function milestoneKindFromName(name) {
  const normalized = normalizeTitle(name);
  if (!normalized) return null;
  if (normalized.includes('product readiness')) return 'product_readiness';
  if (normalized.includes('gsp launch') || normalized.includes(' launch') || normalized.endsWith(' launch')) {
    return 'gsp_launch';
  }
  return null;
}

function deriveMilestoneSummary(milestoneRoot, lineItems) {
  const items = Array.isArray(lineItems) ? lineItems : [];
  const timelineStarts = items.map((item) => isoDateOrNull(item.timeline_start)).filter(Boolean);
  const timelineEnds = items.map((item) => isoDateOrNull(item.timeline_end)).filter(Boolean);
  const ranked = items
    .map((item) => statusRank(item.status_raw))
    .filter((item) => item.label != null)
    .sort((a, b) => b.rank - a.rank);
  const status = ranked[0]?.label || statusRank(milestoneRoot.status_raw).label || null;
  const dri = milestoneRoot.dri || mostFrequentNonEmpty(items.map((item) => item.dri));
  const comment = milestoneRoot.comment || firstNonEmpty(items.map((item) => item.comment));
  return {
    id: milestoneRoot.id,
    name: milestoneRoot.name,
    dri: dri || null,
    status,
    timeline_start: timelineStarts.sort()[0] || isoDateOrNull(milestoneRoot.timeline_start),
    timeline_end: timelineEnds.sort().slice(-1)[0] || isoDateOrNull(milestoneRoot.timeline_end),
    comment: comment || null,
    jira_links: uniqueText([...(milestoneRoot.jira_links || []), ...items.flatMap((item) => item.jira_links || [])]),
    dependency: uniqueText([milestoneRoot.dependency, ...items.map((item) => item.dependency)]),
    critical_dependency: uniqueText([milestoneRoot.critical_dependency, ...items.map((item) => item.critical_dependency)]),
    line_items: items.map((item) => ({
      item: item.name,
      dri: item.dri || null,
      raw_timeline: item.timeline_raw || null,
      derived_start: isoDateOrNull(item.timeline_start),
      derived_end: isoDateOrNull(item.timeline_end),
      raw_status: item.status_raw || null,
      comment: item.comment || null,
      jira_links: item.jira_links || [],
      dependency: item.dependency || null,
      critical_dependency: item.critical_dependency || null,
    })),
  };
}

function partnerLookup(partnerNames = []) {
  const map = new Map();
  for (const partner of partnerNames) {
    const normalized = normalizePartnerToken(partner);
    if (normalized) map.set(normalized, partner);
  }
  return map;
}

function extractPartnerFromText(text, partnersByNormalized) {
  const normalized = normalizePartnerToken(text);
  if (!normalized) return null;
  const textTokens = normalized.replace(/&/g, ' ').split(' ').filter(Boolean);
  let winner = null;
  for (const [token, canonical] of partnersByNormalized.entries()) {
    const tokenParts = token.replace(/&/g, ' ').split(' ').filter(Boolean);
    const allPartsPresent = tokenParts.length > 0 && tokenParts.every((part) => textTokens.includes(part));
    if (normalized === token || normalized.includes(token) || allPartsPresent) {
      if (!winner || token.length > winner.token.length) winner = { token, canonical };
    }
  }
  return winner?.canonical || null;
}

function trackerSchemaWarnings(boardName, fieldRefs) {
  const warnings = [];
  if (!fieldRefs.timeline) warnings.push(`${boardName}: Timeline column not available in API; milestone dates will remain null until exposed.`);
  if (!fieldRefs.status) warnings.push(`${boardName}: Status column not available in API; milestone status will remain null until exposed.`);
  if (!fieldRefs.criticalDependency) warnings.push(`${boardName}: Critical dependency column not available in API; field will stay null.`);
  return warnings;
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

function buildTrackerEntry({
  boardId,
  boardName,
  projectTitle,
  partner,
  projectItemIds,
  url,
  milestones,
}) {
  const productReadiness = milestones.product_readiness || null;
  const gspLaunch = milestones.gsp_launch || null;
  return {
    boardId,
    boardName,
    projectTitle,
    projectTitleNormalized: normalizeProjectTitle(projectTitle, partner),
    partner,
    partnerNormalized: normalizePartnerToken(partner),
    projectItemIds: [...new Set((projectItemIds || []).map((id) => String(id)))],
    url: url || null,
    milestones: {
      product_readiness: productReadiness,
      gsp_launch: gspLaunch,
    },
    product_readiness_date: productReadiness?.timeline_end || null,
    gsp_launch_date: gspLaunch?.timeline_end || null,
  };
}

export function parseTracker1Entries(bundle) {
  const entries = [];
  for (const item of bundle.items || []) {
    const top = itemFieldSnapshot(item, bundle.fieldRefs);
    const descendants = (item.subitems || []).map((subitem) => itemFieldSnapshot(subitem, bundle.fieldRefs));
    const byParent = new Map();
    for (const descendant of descendants) {
      const list = byParent.get(descendant.parent_id || '') || [];
      list.push(descendant);
      byParent.set(descendant.parent_id || '', list);
    }
    const milestoneRoots = descendants.filter(
      (descendant) => descendant.parent_id === top.id && milestoneKindFromName(descendant.name)
    );
    const milestones = {};
    for (const milestoneRoot of milestoneRoots) {
      const milestoneKey = milestoneKindFromName(milestoneRoot.name);
      if (!milestoneKey) continue;
      const lineItems = descendants.filter((descendant) => descendant.parent_id !== top.id && descendant.parent_id != null)
        .filter((descendant) => {
          let current = descendant;
          const seen = new Set();
          while (current?.parent_id && !seen.has(current.parent_id)) {
            if (current.parent_id === milestoneRoot.id) return true;
            seen.add(current.parent_id);
            current = descendants.find((candidate) => candidate.id === current.parent_id) || null;
          }
          return false;
        });
      milestones[milestoneKey] = deriveMilestoneSummary(milestoneRoot, lineItems);
    }
    entries.push(
      buildTrackerEntry({
        boardId: bundle.boardId,
        boardName: bundle.boardName,
        projectTitle: item.group?.title || item.name || '',
        partner: item.name || '',
        projectItemIds: [item.id, ...milestoneRoots.map((root) => root.id)],
        url: item.url || null,
        milestones,
      })
    );
  }
  return entries;
}

export function parseTracker2Entries(bundle, priorityPartners = []) {
  const partnersByNormalized = partnerLookup(priorityPartners);
  const grouped = new Map();

  for (const item of bundle.items || []) {
    const milestoneKey = milestoneKindFromName(item.name);
    if (!milestoneKey) continue;
    const groupKey = item.group?.id || `${bundle.boardId}:${item.name}`;
    const projectTitle = item.group?.title || item.name || '';
    const descendants = (item.subitems || []).map((subitem) => itemFieldSnapshot(subitem, bundle.fieldRefs));
    const directChildren = descendants.filter((descendant) => descendant.parent_id === String(item.id));

    for (const partnerRoot of directChildren) {
      const partner =
        extractPartnerFromText(partnerRoot.name, partnersByNormalized) ||
        extractPartnerFromText(projectTitle, partnersByNormalized);
      if (!partner) continue;

      const lineItems = descendants.filter((descendant) => descendant.parent_id !== String(item.id) && descendant.parent_id != null)
        .filter((descendant) => {
          let current = descendant;
          const seen = new Set();
          while (current?.parent_id && !seen.has(current.parent_id)) {
            if (current.parent_id === partnerRoot.id) return true;
            seen.add(current.parent_id);
            current = descendants.find((candidate) => candidate.id === current.parent_id) || null;
          }
          return false;
        });

      const entryKey = `${groupKey}|||${normalizePartnerToken(partner)}`;
      const existing = grouped.get(entryKey) || {
        boardId: bundle.boardId,
        boardName: bundle.boardName,
        projectTitle,
        partner,
        projectItemIds: [],
        url: item.url || null,
        milestones: {},
      };
      existing.projectItemIds.push(item.id, partnerRoot.id);
      existing.milestones[milestoneKey] = deriveMilestoneSummary(partnerRoot, lineItems);
      grouped.set(entryKey, existing);
    }

    const aggregatePartner = extractPartnerFromText(projectTitle, partnersByNormalized);
    if (aggregatePartner) {
      const entryKey = `${groupKey}|||${normalizePartnerToken(aggregatePartner)}`;
      const existing = grouped.get(entryKey) || {
        boardId: bundle.boardId,
        boardName: bundle.boardName,
        projectTitle,
        partner: aggregatePartner,
        projectItemIds: [],
        url: item.url || null,
        milestones: {},
      };
      existing.projectItemIds.push(item.id);
      existing.milestones[milestoneKey] = deriveMilestoneSummary(itemFieldSnapshot(item, bundle.fieldRefs), descendants);
      grouped.set(entryKey, existing);
    }
  }

  return [...grouped.values()].map((entry) => buildTrackerEntry(entry));
}

export function buildTrackerContext(trackerBundles, priorityPartners = []) {
  const warnings = trackerBundles.flatMap((bundle) => trackerSchemaWarnings(bundle.boardName, bundle.fieldRefs));
  const entries = [
    ...parseTracker1Entries(trackerBundles[0]),
    ...parseTracker2Entries(trackerBundles[1], priorityPartners),
  ];
  const byItemId = new Map();
  const byProjectPartner = new Map();
  for (const entry of entries) {
    for (const itemId of entry.projectItemIds) {
      const list = byItemId.get(itemId) || [];
      list.push(entry);
      byItemId.set(itemId, list);
    }
    byProjectPartner.set(`${entry.boardId}|||${entry.projectTitleNormalized}|||${entry.partnerNormalized}`, entry);
  }
  return { entries, byItemId, byProjectPartner, warnings };
}

export function matchTrackerEntryForRelease(context, { linkedId = null, scheduleUrl = null, partner = '', priorityTitle = '' }, provenance = []) {
  const partnerNormalized = normalizePartnerToken(partner);
  const boardId = extractBoardIdFromUrl(scheduleUrl);
  if (linkedId) {
    const candidates = (context.byItemId.get(String(linkedId)) || []).filter(
      (entry) => entry.partnerNormalized === partnerNormalized
    );
    if (candidates.length === 1) {
      provenance.push('step2_link');
      provenance.push('step3_linked_row');
      return candidates[0];
    }
    if (candidates.length > 1) provenance.push('step3_ambiguous_link');
  } else {
    provenance.push('step2_no_link');
  }

  const normalizedTitle = normalizeProjectTitle(priorityTitle, partner);
  if (!normalizedTitle || !partnerNormalized) return null;
  const scopedEntries = context.entries.filter((entry) => {
    if (entry.partnerNormalized !== partnerNormalized) return false;
    if (boardId && entry.boardId !== boardId) return false;
    return entry.projectTitleNormalized === normalizedTitle;
  });
  if (scopedEntries.length === 1) {
    provenance.push('step3_title_partner_match');
    return scopedEntries[0];
  }
  if (scopedEntries.length > 1) provenance.push('step3_ambiguous_title_partner');
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
    tracker_project_title: null,
    product_readiness_dri: null,
    product_readiness_status: null,
    product_readiness_start_date: null,
    product_readiness_end_date: null,
    product_readiness_comment: null,
    gsp_launch_dri: null,
    gsp_launch_status: null,
    gsp_launch_start_date: null,
    gsp_launch_end_date: null,
    gsp_launch_comment: null,
    tracker_details_json: null,
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
  const priorityProjectTitle = mondayItem.name || '';

  const scheduleColumn = columnByRef(mondayItem, fieldRefs.schedule);
  const linkedId = scheduleColumn ? parseLinkedPulseId(scheduleColumn) : null;
  const scheduleText = fieldValueText(scheduleColumn);
  const scheduleUrl = extractUrlFromText(scheduleText);
  if (scheduleUrl) {
    rec.schedule_url = scheduleUrl;
  }

  const trackerEntry = matchTrackerEntryForRelease(
    ctx.trackerContext,
    {
      linkedId,
      scheduleUrl: rec.schedule_url,
      partner: rec.partner,
      priorityTitle: priorityProjectTitle,
    },
    provenance
  );

  if (trackerEntry) {
    rec.tracker_group = trackerEntry.projectTitle || null;
    rec.tracker_project_title = trackerEntry.projectTitle || null;
    rec.product_readiness_date = trackerEntry.product_readiness_date || null;
    rec.gsp_launch_date = trackerEntry.gsp_launch_date || null;
    rec.schedule_url = rec.schedule_url || trackerEntry.url || null;
    const productReadiness = trackerEntry.milestones.product_readiness || null;
    const gspLaunch = trackerEntry.milestones.gsp_launch || null;
    rec.product_readiness_dri = productReadiness?.dri || null;
    rec.product_readiness_status = productReadiness?.status || null;
    rec.product_readiness_start_date = productReadiness?.timeline_start || null;
    rec.product_readiness_end_date = productReadiness?.timeline_end || null;
    rec.product_readiness_comment = productReadiness?.comment || null;
    rec.gsp_launch_dri = gspLaunch?.dri || null;
    rec.gsp_launch_status = gspLaunch?.status || null;
    rec.gsp_launch_start_date = gspLaunch?.timeline_start || null;
    rec.gsp_launch_end_date = gspLaunch?.timeline_end || null;
    rec.gsp_launch_comment = gspLaunch?.comment || null;
    rec.tracker_details_json = JSON.stringify({
      board_id: trackerEntry.boardId,
      board_name: trackerEntry.boardName,
      project_title: trackerEntry.projectTitle,
      partner: trackerEntry.partner,
      project_item_ids: trackerEntry.projectItemIds,
      milestones: trackerEntry.milestones,
    });
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
    tracker_project_title: null,
    product_readiness_dri: null,
    product_readiness_status: null,
    product_readiness_start_date: null,
    product_readiness_end_date: null,
    product_readiness_comment: null,
    gsp_launch_dri: null,
    gsp_launch_status: null,
    gsp_launch_start_date: null,
    gsp_launch_end_date: null,
    gsp_launch_comment: null,
    tracker_details_json: null,
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
  const priorityPartners = [...new Set(priorityItems.map((item) => textByRef(item, prioritiesBoard.fieldRefs.partner) || item.name).filter(Boolean))];
  const trackerContext = buildTrackerContext([trackerBoard1, trackerBoard2], priorityPartners);

  let jiraIssues = [];
  let jiraError = null;
  if (config.jiraPat) {
    try {
      logger.log('▶ Jira GSP (supplement + unmanaged detection)');
      jiraIssues = await fetchAllJira(config);
      logger.log(`  ✓ ${jiraIssues.length} GSP issues`);
    } catch (e) {
      jiraError = e?.message || String(e);
      jiraIssues = [];
      logger.warn(`⚠ Jira supplement skipped: ${jiraError}`);
    }
  } else {
    logger.warn('⚠ JIRA_PAT not set — sync will use Monday only, without Jira enrichment or unmanaged detection.');
  }

  const jiraByKey = buildJiraIndex(jiraIssues);
  const matchedJiraKeys = new Set();
  const legacyMap = loadLegacyPartnerDates(env);
  const ctx = { trackerContext, jiraByKey, matchedJiraKeys, legacyMap };

  logger.log('▶ Building release rows');
  const releases = priorityItems.map((item) => processMondayItem(item, ctx, prioritiesBoard.fieldRefs));
  const unmanagedRowCount = jiraIssues.filter((issue) => !matchedJiraKeys.has(issue.key.toUpperCase())).length;
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
      parsedEntries: trackerContext.entries.filter((entry) => entry.boardId === trackerBoard1.boardId).length,
      fields: summarizeFieldRefs(trackerBoard1.fieldRefs),
    },
    {
      key: 'tracker_2',
      id: trackerBoard2.boardId,
      name: trackerBoard2.boardName,
      items: trackerBoard2.items.length,
      parsedEntries: trackerContext.entries.filter((entry) => entry.boardId === trackerBoard2.boardId).length,
      fields: summarizeFieldRefs(trackerBoard2.fieldRefs),
    },
  ];

  return {
    releases,
    meta: {
      fetchedAt: new Date().toISOString(),
      source: 'sync-monday-server-v1.0',
      mondayPriorities: priorityItems.length,
      trackerRows: trackerContext.entries.length,
      jiraGsp: jiraIssues.length,
      jiraError,
      jiraLinkedToMonday,
      unmanagedJiraRows: Math.max(0, unmanagedRowCount),
      trackerSchemaWarnings: trackerContext.warnings,
      mondayApiVersion: config.mondayApiVersion,
      boardStats,
      requiredFields: {
        priorities: Object.keys(PRIORITIES_FIELD_SPECS),
        trackers: Object.keys(TRACKER_FIELD_SPECS),
      },
    },
    stats: {
      mondayPriorities: priorityItems.length,
      trackerRowsIndexed: trackerContext.entries.length,
      jiraIssuesPulled: jiraIssues.length,
      jiraError,
      jiraLinkedToMonday,
      trackerSchemaWarnings: trackerContext.warnings,
      unmanagedJiraRows: Math.max(0, unmanagedRowCount),
      totalReleases: releases.length,
    },
  };
}
