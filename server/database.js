/**
 * server/database.js — PostgreSQL persistence layer
 *
 * Used when DATABASE_URL env var is set (Heroku Postgres addon sets this automatically).
 * Falls back to in-memory mock data when DATABASE_URL is not set.
 */
import pg from 'pg';
const { Pool } = pg;

let pool = null;

export function isDbAvailable() {
  return !!process.env.DATABASE_URL;
}

export function getPool() {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // required for Heroku Postgres
    });
  }
  return pool;
}

// ── Schema init ───────────────────────────────────────────────────────────────

export async function initDb() {
  if (!isDbAvailable()) return;
  const client = await getPool().connect();
  try {
    // Drop the old UNIQUE constraint on jira_key if it exists
    // (multiple releases can share a jira_key or have null)
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'releases_jira_key_key') THEN
          ALTER TABLE releases DROP CONSTRAINT releases_jira_key_key;
        END IF;
      END $$;
    `).catch(() => {});

    await client.query(`
      CREATE TABLE IF NOT EXISTS releases (
        id           SERIAL PRIMARY KEY,
        jira_key     TEXT,
        partner      TEXT,
        product      TEXT,
        stage        TEXT,
        target_date  TEXT,
        actual_date  TEXT,
        jira_number  TEXT,
        pm           TEXT,
        se_lead      TEXT,
        csm          TEXT,
        notes        TEXT,
        blocked      INTEGER DEFAULT 0,
        red_account  INTEGER DEFAULT 0,
        missing_pm   INTEGER DEFAULT 0,
        days_overdue INTEGER,
        days_in_eap  INTEGER,
        arr_at_risk  NUMERIC,
        synced_at    TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sync_meta (
        id            SERIAL PRIMARY KEY,
        fetched_at    TIMESTAMP,
        total_issues  INTEGER,
        release_count INTEGER,
        source        TEXT,
        created_at    TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('[db] PostgreSQL schema ready');
  } finally {
    client.release();
  }
}

// ── Bulk upsert releases ──────────────────────────────────────────────────────

export async function upsertReleases(releases) {
  if (!releases?.length) return;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    // Clear existing data and re-insert (simpler than row-by-row upsert for bulk)
    await client.query('DELETE FROM releases');

    for (const r of releases) {
      await client.query(`
        INSERT INTO releases
          (jira_key, partner, product, stage, target_date, actual_date, jira_number,
           pm, se_lead, csm, notes, blocked, red_account, missing_pm,
           days_overdue, days_in_eap, arr_at_risk, synced_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())
      `, [
        r.jira_key    || r.jira_number || null,
        r.partner     || null,
        r.product     || null,
        r.stage       || 'Dev',
        r.target_date || null,
        r.actual_date || null,
        r.jira_number || null,
        r.pm          || null,
        r.se_lead     || null,
        r.csm         || null,
        r.notes       || null,
        r.blocked     ? 1 : 0,
        r.red_account ? 1 : 0,
        r.missing_pm  ? 1 : 0,
        r.days_overdue  ?? null,
        r.days_in_eap   ?? null,
        r.arr_at_risk   ?? null,
      ]);
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function saveSyncMeta(meta) {
  await getPool().query(`
    INSERT INTO sync_meta (fetched_at, total_issues, release_count, source)
    VALUES ($1, $2, $3, $4)
  `, [
    meta.fetchedAt   || new Date(),
    meta.totalIssues || 0,
    meta.releaseCount|| 0,
    meta.source      || 'unknown',
  ]);
}

// ── Query helpers ─────────────────────────────────────────────────────────────

export async function dbGetAllReleases() {
  const { rows } = await getPool().query(
    `SELECT * FROM releases ORDER BY partner, product`
  );
  return rows;
}

export async function dbGetLastSyncMeta() {
  const { rows } = await getPool().query(
    `SELECT * FROM sync_meta ORDER BY created_at DESC LIMIT 1`
  );
  return rows[0] || null;
}
