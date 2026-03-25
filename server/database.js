/**
 * database.js — optional PostgreSQL persistence (Heroku Postgres / DATABASE_URL)
 */
import pg from 'pg';

const { Pool } = pg;

let pool = null;

export function getPool() {
  return pool;
}

export async function initDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return { enabled: false };
  }
  pool = new Pool({
    connectionString: url,
    ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 5,
  });
  await ensureSchema();
  return { enabled: true };
}

const ADD_COLUMNS_SQL = [
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS product_area TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS source TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS monday_url TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS monday_item_id TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS release_key TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS pmo_status TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS jira_status TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS project_title TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS impact_summary TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS desc_raw TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS product_track TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS market_type TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS priority_number INTEGER',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS product_readiness_date TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS gsp_launch_date TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS schedule_url TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS tracker_group TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS monday_comment TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS comment_updated_at TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS data_provenance TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS is_unmanaged_jira INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS include_in_matrix INTEGER NOT NULL DEFAULT 1',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS legacy_planning_date TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS legacy_golive_date TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS legacy_sourced INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS salesforce_account_id TEXT',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS bug_report_count INTEGER',
  'ALTER TABLE releases ADD COLUMN IF NOT EXISTS bug_reports_url TEXT',
];

async function ensureSchema() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS releases (
      id SERIAL PRIMARY KEY,
      partner TEXT NOT NULL,
      product TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'Planned',
      target_date TEXT,
      actual_date TEXT,
      jira_number TEXT,
      pm TEXT,
      se_lead TEXT,
      csm TEXT,
      notes TEXT,
      blocked INTEGER NOT NULL DEFAULT 0,
      red_account INTEGER NOT NULL DEFAULT 0,
      missing_pm INTEGER NOT NULL DEFAULT 0,
      days_overdue INTEGER,
      days_in_eap INTEGER,
      arr_at_risk BIGINT,
      UNIQUE(partner, product)
    );
    CREATE TABLE IF NOT EXISTS changelog (
      id SERIAL PRIMARY KEY,
      change_date TEXT NOT NULL,
      partner TEXT NOT NULL,
      product TEXT NOT NULL,
      from_stage TEXT,
      to_stage TEXT NOT NULL,
      author TEXT,
      note TEXT
    );
    CREATE TABLE IF NOT EXISTS ingest_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  for (const sql of ADD_COLUMNS_SQL) {
    await pool.query(sql);
  }
  await migrateReleaseKeyAndUnique();
}

async function migrateReleaseKeyAndUnique() {
  if (!pool) return;
  try {
    await pool.query(`
      UPDATE releases SET release_key = COALESCE(NULLIF(TRIM(release_key), ''),
        'legacy:' || id::text || ':' || LOWER(TRIM(partner)) || ':' || LOWER(TRIM(product)))
      WHERE release_key IS NULL OR TRIM(release_key) = ''
    `);
  } catch {
    /* ignore */
  }
  try {
    await pool.query(`
      ALTER TABLE releases DROP CONSTRAINT IF EXISTS releases_partner_product_key
    `);
  } catch {
    /* ignore */
  }
  try {
    await pool.query(`
      ALTER TABLE releases DROP CONSTRAINT IF EXISTS releases_partner_product_unique
    `);
  } catch {
    /* ignore */
  }
  try {
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS releases_release_key_uidx ON releases (release_key)
    `);
  } catch {
    /* duplicate keys — leave without unique until data fixed */
  }
}

const SELECT_RELEASES_COLS = [
  'id',
  'release_key',
  'partner',
  'product',
  'product_area',
  'stage',
  'pmo_status',
  'jira_status',
  'project_title',
  'impact_summary',
  'desc_raw',
  'product_track',
  'market_type',
  'priority_number',
  'product_readiness_date',
  'gsp_launch_date',
  'schedule_url',
  'tracker_group',
  'monday_comment',
  'comment_updated_at',
  'target_date',
  'actual_date',
  'jira_number',
  'pm',
  'se_lead',
  'csm',
  'notes',
  'blocked',
  'red_account',
  'missing_pm',
  'days_overdue',
  'days_in_eap',
  'arr_at_risk',
  'source',
  'monday_url',
  'monday_item_id',
  'data_provenance',
  'is_unmanaged_jira',
  'include_in_matrix',
  'legacy_planning_date',
  'legacy_golive_date',
  'legacy_sourced',
  'salesforce_account_id',
  'bug_report_count',
  'bug_reports_url',
].join(', ');

function rowToRelease(row) {
  return {
    id: row.id,
    release_key: row.release_key ?? null,
    partner: row.partner,
    product: row.product,
    product_area: row.product_area ?? null,
    stage: row.stage,
    pmo_status: row.pmo_status ?? null,
    jira_status: row.jira_status ?? null,
    project_title: row.project_title ?? null,
    impact_summary: row.impact_summary ?? null,
    desc_raw: row.desc_raw ?? null,
    product_track: row.product_track ?? null,
    market_type: row.market_type ?? null,
    priority_number: row.priority_number != null ? Number(row.priority_number) : null,
    product_readiness_date: row.product_readiness_date ?? null,
    gsp_launch_date: row.gsp_launch_date ?? null,
    schedule_url: row.schedule_url ?? null,
    tracker_group: row.tracker_group ?? null,
    monday_comment: row.monday_comment ?? null,
    comment_updated_at: row.comment_updated_at ?? null,
    target_date: row.target_date ?? null,
    actual_date: row.actual_date ?? null,
    jira_number: row.jira_number,
    pm: row.pm,
    se_lead: row.se_lead,
    csm: row.csm,
    notes: row.notes,
    blocked: row.blocked,
    red_account: row.red_account,
    missing_pm: row.missing_pm,
    days_overdue: row.days_overdue,
    days_in_eap: row.days_in_eap,
    arr_at_risk: row.arr_at_risk != null ? Number(row.arr_at_risk) : null,
    source: row.source ?? null,
    monday_url: row.monday_url ?? null,
    monday_item_id: row.monday_item_id ?? null,
    data_provenance: row.data_provenance ?? null,
    is_unmanaged_jira: row.is_unmanaged_jira ?? 0,
    include_in_matrix: row.include_in_matrix != null ? row.include_in_matrix : 1,
    legacy_planning_date: row.legacy_planning_date ?? null,
    legacy_golive_date: row.legacy_golive_date ?? null,
    legacy_sourced: row.legacy_sourced ?? 0,
    salesforce_account_id: row.salesforce_account_id ?? null,
    bug_report_count: row.bug_report_count != null ? Number(row.bug_report_count) : null,
    bug_reports_url: row.bug_reports_url ?? null,
  };
}

function rowToChangelog(row) {
  return {
    id: row.id,
    change_date: row.change_date,
    partner: row.partner,
    product: row.product,
    from_stage: row.from_stage,
    to_stage: row.to_stage,
    author: row.author,
    note: row.note,
  };
}

export async function loadFromPostgres() {
  if (!pool) {
    return { releases: [], changelog: [], lastSync: null };
  }
  const [relRes, chRes, metaRes] = await Promise.all([
    pool.query(`SELECT ${SELECT_RELEASES_COLS} FROM releases ORDER BY partner, product`),
    pool.query(
      'SELECT id, change_date, partner, product, from_stage, to_stage, author, note FROM changelog ORDER BY change_date DESC'
    ),
    pool.query("SELECT value FROM ingest_meta WHERE key = 'last_sync'"),
  ]);
  return {
    releases: relRes.rows.map(rowToRelease),
    changelog: chRes.rows.map(rowToChangelog),
    lastSync: metaRes.rows[0]?.value ?? null,
  };
}

function releaseToInsertRow(r) {
  return [
    r.release_key ?? `legacy:${r.partner}|${r.product}`,
    r.partner,
    r.product,
    r.product_area ?? null,
    r.stage ?? 'Dev',
    r.pmo_status ?? null,
    r.jira_status ?? null,
    r.project_title ?? null,
    r.impact_summary ?? null,
    r.desc_raw ?? null,
    r.product_track ?? null,
    r.market_type ?? null,
    r.priority_number ?? null,
    r.product_readiness_date ?? null,
    r.gsp_launch_date ?? null,
    r.schedule_url ?? null,
    r.tracker_group ?? null,
    r.monday_comment ?? null,
    r.comment_updated_at ?? null,
    r.target_date ?? null,
    r.actual_date ?? null,
    r.jira_number ?? r.jira_key ?? null,
    r.pm ?? null,
    r.se_lead ?? null,
    r.csm ?? null,
    r.notes ?? null,
    r.blocked ? 1 : 0,
    r.red_account ? 1 : 0,
    r.missing_pm ? 1 : 0,
    r.days_overdue ?? null,
    r.days_in_eap ?? null,
    r.arr_at_risk ?? null,
    r.source ?? null,
    r.monday_url ?? null,
    r.monday_item_id ?? null,
    r.data_provenance != null ? String(r.data_provenance) : null,
    r.is_unmanaged_jira ? 1 : 0,
    r.include_in_matrix === 0 || r.include_in_matrix === false ? 0 : 1,
    r.legacy_planning_date ?? null,
    r.legacy_golive_date ?? null,
    r.legacy_sourced ? 1 : 0,
    r.salesforce_account_id ?? null,
    r.bug_report_count ?? null,
    r.bug_reports_url ?? null,
  ];
}

export async function replaceAllData({ releases, changelog, lastSync }) {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM releases');

    const insertRel = `
      INSERT INTO releases (
        release_key, partner, product, product_area, stage, pmo_status, jira_status,
        project_title, impact_summary, desc_raw, product_track, market_type, priority_number,
        product_readiness_date, gsp_launch_date, schedule_url, tracker_group,
        monday_comment, comment_updated_at, target_date, actual_date, jira_number,
        pm, se_lead, csm, notes, blocked, red_account, missing_pm, days_overdue, days_in_eap,
        arr_at_risk, source, monday_url, monday_item_id, data_provenance,
        is_unmanaged_jira, include_in_matrix, legacy_planning_date, legacy_golive_date,
        legacy_sourced, salesforce_account_id, bug_report_count, bug_reports_url
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,
        $27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45
      )
    `;
    for (const r of releases) {
      await client.query(insertRel, releaseToInsertRow(r));
    }

    if (changelog !== null) {
      await client.query('DELETE FROM changelog');
      const insertCh = `
        INSERT INTO changelog (change_date, partner, product, from_stage, to_stage, author, note)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `;
      for (const c of changelog) {
        await client.query(insertCh, [
          c.change_date || c.date,
          c.partner,
          c.product,
          c.from_stage ?? c.from ?? null,
          c.to_stage ?? c.to,
          c.author ?? null,
          c.note ?? null,
        ]);
      }
    }

    await client.query(
      `INSERT INTO ingest_meta (key, value) VALUES ('last_sync', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [lastSync]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
