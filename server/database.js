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
  await pool.query(
    'ALTER TABLE releases ADD COLUMN IF NOT EXISTS product_area TEXT'
  );
  await pool.query(
    'ALTER TABLE releases ADD COLUMN IF NOT EXISTS source TEXT'
  );
  await pool.query(
    'ALTER TABLE releases ADD COLUMN IF NOT EXISTS monday_url TEXT'
  );
  await pool.query(
    'ALTER TABLE releases ADD COLUMN IF NOT EXISTS monday_item_id TEXT'
  );
}

function rowToRelease(row) {
  return {
    id: row.id,
    partner: row.partner,
    product: row.product,
    product_area: row.product_area ?? null,
    stage: row.stage,
    target_date: row.target_date,
    actual_date: row.actual_date,
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
    pool.query(
      'SELECT id, partner, product, product_area, stage, target_date, actual_date, jira_number, pm, se_lead, csm, notes, blocked, red_account, missing_pm, days_overdue, days_in_eap, arr_at_risk, source, monday_url, monday_item_id FROM releases ORDER BY partner, product'
    ),
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

export async function replaceAllData({ releases, changelog, lastSync }) {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM releases');

    const insertRel = `
      INSERT INTO releases (
        partner, product, product_area, stage, target_date, actual_date, jira_number, pm, se_lead, csm, notes,
        blocked, red_account, missing_pm, days_overdue, days_in_eap, arr_at_risk, source, monday_url, monday_item_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
    `;
    for (const r of releases) {
      await client.query(insertRel, [
        r.partner,
        r.product,
        r.product_area ?? null,
        r.stage ?? 'Dev',
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
      ]);
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
