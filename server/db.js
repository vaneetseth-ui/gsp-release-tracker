/**
 * db.js — in-memory store with optional PostgreSQL persistence
 */
import { RELEASES as BUILTIN_RELEASES, CHANGELOG as BUILTIN_CHANGELOG } from './data.js';
import { initDatabase, loadFromPostgres, replaceAllData } from './database.js';
import { MONDAY_CANONICAL_FIELDS } from './releaseFields.js';
import { normalizeProductArea } from '../src/data/constants.js';

/** @type {{ releases: object[], changelog: object[], lastSync: string|null, dataSource: string, lastIngestMeta: object|null }} */
let store = {
  releases: [],
  changelog: [],
  lastSync: null,
  dataSource: 'memory',
  lastIngestMeta: null,
};

function flag(v) {
  return v === 1 || v === true || v === '1';
}

function str(v) {
  return v == null ? '' : String(v);
}

function cmpStr(a, b) {
  return str(a).localeCompare(str(b));
}

export async function initDataStore() {
  store.releases = BUILTIN_RELEASES.map((r) => normalizeRelease(r));
  store.changelog = [...BUILTIN_CHANGELOG];
  store.lastSync = null;
  store.dataSource = 'memory';
  store.lastIngestMeta = null;

  const { enabled } = await initDatabase();
  if (!enabled) return;

  try {
    const data = await loadFromPostgres();
    if (data.lastIngestMeta != null) {
      store.lastIngestMeta = data.lastIngestMeta;
    }
    if (data.releases.length > 0) {
      store.releases = data.releases.map((r) => normalizeRelease(r));
      store.changelog = data.changelog.length ? data.changelog : store.changelog;
      store.lastSync = data.lastSync;
      store.dataSource = 'postgres';
    }
  } catch (e) {
    console.error('initDataStore: Postgres load failed, using in-memory fallback:', e.message);
  }
}

export function getLastSync() {
  return store.lastSync;
}

export function getDataSource() {
  return store.dataSource;
}

export async function applyIngest({ releases, changelog, meta }) {
  if (!releases?.length) {
    throw new Error('releases array required');
  }
  const lastSync = meta?.fetchedAt || new Date().toISOString();
  store.releases = releases.map(normalizeRelease);
  if (changelog !== undefined) {
    store.changelog = (changelog || []).map(normalizeChangelog);
  }
  store.lastSync = lastSync;
  store.dataSource = process.env.DATABASE_URL ? 'postgres' : 'memory';

  if (meta != null && typeof meta === 'object') {
    store.lastIngestMeta = meta;
  }

  try {
    await replaceAllData({
      releases: store.releases,
      changelog: changelog !== undefined ? store.changelog : null,
      lastSync,
      ingestMeta: meta != null && typeof meta === 'object' ? meta : null,
    });
  } catch (e) {
    console.error('applyIngest: persist failed:', e.message);
    throw e;
  }

  return { releases: store.releases.length, lastSync };
}

function normalizeRelease(r) {
  const product = r.product;
  const rk =
    r.release_key != null && String(r.release_key).trim() !== ''
      ? String(r.release_key).trim()
      : null;
  return {
    id: r.id,
    release_key: rk ?? `legacy:${String(r.partner || '')}|${String(product || '')}`,
    partner: r.partner,
    product,
    product_area: normalizeProductArea(r.product_area, product, r.product_track),
    stage: r.stage ?? 'Dev',
    pmo_status: r.pmo_status != null ? String(r.pmo_status) : null,
    jira_status: r.jira_status != null ? String(r.jira_status) : null,
    project_title: r.project_title ?? null,
    impact_summary: r.impact_summary ?? null,
    desc_raw: r.desc_raw ?? null,
    product_track: r.product_track ?? null,
    market_type: r.market_type ?? null,
    priority_number: r.priority_number != null ? Number(r.priority_number) : null,
    product_readiness_date: r.product_readiness_date ?? null,
    gsp_launch_date: r.gsp_launch_date ?? null,
    schedule_url: r.schedule_url ?? null,
    tracker_group: r.tracker_group ?? null,
    monday_comment: r.monday_comment ?? null,
    comment_updated_at: r.comment_updated_at ?? null,
    target_date: r.target_date ?? null,
    actual_date: r.actual_date ?? null,
    jira_number: r.jira_number ?? r.jira_key ?? null,
    pm: r.pm ?? null,
    se_lead: r.se_lead ?? null,
    csm: r.csm ?? null,
    notes: r.notes ?? null,
    arr_at_risk: r.arr_at_risk != null ? Number(r.arr_at_risk) : null,
    source: r.source != null && r.source !== '' ? String(r.source) : null,
    monday_url:
      r.monday_url != null && String(r.monday_url).trim() !== ''
        ? String(r.monday_url).trim()
        : null,
    monday_item_id:
      r.monday_item_id != null && String(r.monday_item_id).trim() !== ''
        ? String(r.monday_item_id).trim()
        : null,
    data_provenance: r.data_provenance != null ? String(r.data_provenance) : null,
    is_unmanaged_jira: flag(r.is_unmanaged_jira) ? 1 : 0,
    include_in_matrix: r.include_in_matrix === 0 || r.include_in_matrix === false ? 0 : 1,
    legacy_planning_date: r.legacy_planning_date ?? null,
    legacy_golive_date: r.legacy_golive_date ?? null,
    legacy_sourced: flag(r.legacy_sourced) ? 1 : 0,
    salesforce_account_id: r.salesforce_account_id ?? null,
    bug_report_count: r.bug_report_count != null ? Number(r.bug_report_count) : null,
    bug_reports_url: r.bug_reports_url ?? null,
  };
}

function releaseMergeKey(r) {
  const rk = String(r.release_key || '').trim();
  if (rk) return rk;
  const p = String(r.partner || '')
    .trim()
    .toLowerCase();
  const prod = String(r.product || '')
    .trim()
    .toLowerCase();
  return `${p}|||${prod}`;
}

function isMondayPrimaryRow(r) {
  const src = (r.source || '').toLowerCase();
  if (src.includes('monday')) return true;
  if (r.monday_item_id && String(r.monday_item_id).trim()) return true;
  if (r.pmo_status != null && String(r.pmo_status).trim()) return true;
  return false;
}

/**
 * Pure merge: Confluence rows into an existing release list (same rules as mergeConfluenceReleases).
 * Used by scripts that pull wiki data locally then POST /api/ingest.
 */
export function mergeConfluenceIntoExisting(existingReleases, confluenceRows) {
  const map = new Map();
  for (const r of existingReleases) {
    map.set(releaseMergeKey(r), { ...normalizeRelease(r) });
  }

  let added = 0;
  let updated = 0;
  let skipped = 0;

  if (!confluenceRows?.length) {
    return {
      releases: [...map.values()].map((r) => normalizeRelease(r)),
      added: 0,
      updated: 0,
      skipped: 0,
    };
  }

  for (const raw of confluenceRows) {
    const c = normalizeRelease({ ...raw, source: 'confluence' });
    if (!c.partner?.trim() || !c.product?.trim()) {
      skipped++;
      continue;
    }
    if (c.product === 'Unknown' || c.partner === 'Unknown') {
      skipped++;
      continue;
    }

    const k = releaseMergeKey(c);
    const existing = map.get(k);

    if (!existing) {
      map.set(k, c);
      added++;
      continue;
    }

    const src = (existing.source || '').toLowerCase();
    const mondayPrimary = isMondayPrimaryRow(existing);
    if (src === 'jira' || existing.jira_number || mondayPrimary) {
      const merged = { ...existing };
      merged.notes = [existing.notes, c.notes].filter(Boolean).join('\n\n');
      const fillFields = [
        'target_date',
        'actual_date',
        'stage',
        'pm',
        'se_lead',
        'csm',
        'product_area',
        'monday_url',
        'monday_item_id',
        'pmo_status',
        'jira_status',
        'project_title',
        'product_track',
        'market_type',
        'product_readiness_date',
        'gsp_launch_date',
      ];
      for (const f of fillFields) {
        if (mondayPrimary && MONDAY_CANONICAL_FIELDS.has(f)) continue;
        if ((merged[f] == null || merged[f] === '') && c[f] != null && c[f] !== '') merged[f] = c[f];
      }
      map.set(k, normalizeRelease(merged));
      updated++;
    } else {
      map.set(
        k,
        normalizeRelease({
          ...existing,
          ...c,
          source: 'confluence',
          id: existing.id,
        })
      );
      updated++;
    }
  }

  return {
    releases: [...map.values()].map((r) => normalizeRelease(r)),
    added,
    updated,
    skipped,
  };
}

/**
 * Upsert wiki-parsed rows. New keys get source confluence. Existing Jira rows keep source jira and merge notes/empty fields.
 */
export async function mergeConfluenceReleases(confluenceRows) {
  if (!confluenceRows?.length) {
    return { added: 0, updated: 0, skipped: 0, total: R().length };
  }

  const { releases, added, updated, skipped } = mergeConfluenceIntoExisting(R(), confluenceRows);
  store.releases = releases;
  const lastSync = new Date().toISOString();
  store.lastSync = lastSync;
  store.dataSource = process.env.DATABASE_URL ? 'postgres' : 'memory';

  try {
    await replaceAllData({
      releases: store.releases,
      changelog: null,
      lastSync,
    });
  } catch (e) {
    console.error('mergeConfluenceReleases: persist failed:', e.message);
    throw e;
  }

  return { added, updated, skipped, total: store.releases.length };
}

function normalizeChangelog(c) {
  return {
    id: c.id,
    change_date: c.change_date || c.date,
    partner: c.partner,
    product: c.product,
    from_stage: c.from_stage ?? c.from ?? null,
    to_stage: c.to_stage ?? c.to,
    author: c.author ?? null,
    note: c.note ?? null,
  };
}

function R() {
  return store.releases;
}

export function getAllReleases() {
  return [...R()].sort((a, b) => cmpStr(a.partner, b.partner) || cmpStr(a.product, b.product));
}

export function getReleasesByPartner(partner) {
  return R().filter(r => r.partner === partner).sort((a, b) => cmpStr(a.product, b.product));
}

export function getRelease(partner, product) {
  return R().find(r => r.partner === partner && r.product === product) || null;
}

export function getReleasesByStage(stage) {
  return R()
    .filter(r => r.stage === stage && r.stage !== 'N/A')
    .sort((a, b) => cmpStr(a.partner, b.partner));
}

export function getReleasesByProduct(product) {
  return R()
    .filter(r => r.product === product && r.stage !== 'N/A')
    .sort((a, b) => cmpStr(a.partner, b.partner));
}

/** Jira GSP rows with no Monday item (legacy API; UI uses gap view). */
export function getUnmanagedJiraReleases() {
  return R()
    .filter((r) => flag(r.is_unmanaged_jira))
    .sort((a, b) => cmpStr(a.partner, b.partner));
}

export function getChangelog(limit = 50) {
  return [...store.changelog]
    .sort((a, b) => cmpStr(b.change_date, a.change_date))
    .slice(0, limit);
}

export function getChangelogByPartner(partner) {
  return store.changelog
    .filter(c => c.partner === partner)
    .sort((a, b) => cmpStr(b.change_date, a.change_date));
}

export function getSummary() {
  const rel = R();
  const active = rel.filter(r => r.stage !== 'N/A');

  const byStage = {};
  active.forEach(r => {
    byStage[r.stage] = (byStage[r.stage] || 0) + 1;
  });

  const bySource = {};
  for (const r of rel) {
    const s = (r.source || 'unknown').toLowerCase() || 'unknown';
    bySource[s] = (bySource[s] || 0) + 1;
  }
  const unmanagedJira = rel.filter(r => flag(r.is_unmanaged_jira)).length;
  const mondayRows = rel.filter(r => (r.source || '').toLowerCase() === 'monday');
  const mondayWithJiraKey = mondayRows.filter(
    r => r.jira_number != null && String(r.jira_number).trim() !== ''
  ).length;

  const meta = store.lastIngestMeta;
  const pullSnapshot =
    meta && (meta.mondayPriorities != null || meta.jiraGsp != null || meta.trackerRows != null)
      ? {
          source: meta.source ?? null,
          fetchedAt: meta.fetchedAt ?? null,
          mondayGspPriorityItems: meta.mondayPriorities ?? null,
          mondayTrackerRowsIndexed: meta.trackerRows ?? null,
          jiraGspIssuesPulled: meta.jiraGsp ?? null,
          /** GSP Jira issues that matched a Monday row (same ingest); requires current row counts. */
          jiraIssuesLinkedToMondayEstimate:
            meta.jiraGsp != null && Number.isFinite(Number(meta.jiraGsp))
              ? Math.max(0, Number(meta.jiraGsp) - unmanagedJira)
              : null,
        }
      : null;

  return {
    total: active.length,
    byStage,
    /** Counts of cached release rows by `source` (monday / jira / confluence / blended / …). */
    releaseRowsBySource: bySource,
    /** Rows from GSP Jira with no Monday priority link (Monday-first pipeline only). */
    unmanagedJiraRows: unmanagedJira,
    /** Monday-derived rows that list a Jira key (enriched in Step 5 when issue exists). */
    mondayRowsWithJiraKey,
    /**
     * From last `POST /api/ingest` meta (set by `scripts/sync-local.js`).
     * Raw API pull sizes before merge into release rows.
     */
    lastPullSnapshot: pullSnapshot,
  };
}

export function getPartners() {
  return [...new Set(R().map(r => r.partner).filter((p) => p != null && str(p) !== ''))].sort((a, b) =>
    cmpStr(a, b)
  );
}
