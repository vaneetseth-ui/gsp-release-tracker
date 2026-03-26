#!/usr/bin/env node
/**
 * Remove Jira-only release rows and strip Jira enrichment columns from Monday rows.
 * Requires DATABASE_URL. Use with care; run monday-data-status.mjs before/after.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/db-purge-jira.mjs
 *   DATABASE_URL=... node scripts/db-purge-jira.mjs --dry-run
 */
import 'dotenv/config';
import pg from 'pg';

const dryRun = process.argv.includes('--dry-run');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    const toDelete = await client.query(`
      SELECT id FROM releases
      WHERE is_unmanaged_jira = 1
         OR source = 'jira'
         OR release_key LIKE 'jira-only:%'
    `);
    console.log(`Rows to DELETE (Jira-only / unmanaged): ${toDelete.rowCount}`);

    const toUpdate = await client.query(`
      SELECT id FROM releases
      WHERE is_unmanaged_jira = 0
        AND (source = 'monday' OR release_key LIKE 'monday:%' OR monday_url IS NOT NULL)
        AND (
          jira_status IS NOT NULL OR project_title IS NOT NULL OR impact_summary IS NOT NULL
          OR desc_raw IS NOT NULL OR jira_number IS NOT NULL
        )
    `);
    console.log(`Monday rows to UPDATE (strip Jira columns): ${toUpdate.rowCount}`);

    if (dryRun) {
      console.log('\nDry run — no changes applied. Remove --dry-run to execute.');
      return;
    }

    await client.query('BEGIN');

    const del = await client.query(`
      DELETE FROM releases
      WHERE is_unmanaged_jira = 1
         OR source = 'jira'
         OR release_key LIKE 'jira-only:%'
    `);
    console.log(`\nDeleted ${del.rowCount} Jira-only row(s).`);

    const upd = await client.query(`
      UPDATE releases SET
        jira_status = NULL,
        project_title = NULL,
        impact_summary = NULL,
        desc_raw = NULL,
        jira_number = NULL,
        notes = NULL
      WHERE is_unmanaged_jira = 0
        AND (source = 'monday' OR release_key LIKE 'monday:%' OR monday_url IS NOT NULL)
    `);
    console.log(`Cleared Jira fields on ${upd.rowCount} Monday row(s).`);

    await client.query('COMMIT');
    console.log('\nDone. Run: node scripts/monday-data-status.mjs');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
