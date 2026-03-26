#!/usr/bin/env node
/**
 * Report Monday vs Jira row counts and health (Postgres releases table).
 * Usage: DATABASE_URL=... node scripts/monday-data-status.mjs
 */
import 'dotenv/config';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Load .env or export DATABASE_URL (Heroku: heroku config:get DATABASE_URL).');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    const total = await client.query('SELECT COUNT(*)::int AS n FROM releases');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('  GSP Release Tracker — releases table (Postgres)');
    console.log('══════════════════════════════════════════════════════════════\n');
    console.log('Total rows:', total.rows[0].n);

    const bySource = await client.query(`
      SELECT COALESCE(NULLIF(TRIM(source), ''), '(empty)') AS source, COUNT(*)::int AS n
      FROM releases GROUP BY 1 ORDER BY n DESC
    `);
    console.log('\nBy source:');
    bySource.rows.forEach((r) => console.log(`  ${r.source}: ${r.n}`));

    const um = await client.query(`
      SELECT COUNT(*)::int AS n FROM releases WHERE is_unmanaged_jira = 1
    `);
    console.log('\nJira-only (unmanaged) rows:', um.rows[0].n);

    const mondayAnchored = await client.query(`
      SELECT COUNT(*)::int AS n FROM releases
      WHERE monday_url IS NOT NULL OR release_key LIKE 'monday:%' OR source = 'monday'
    `);
    console.log('Rows anchored to Monday (url / key / source):', mondayAnchored.rows[0].n);

    const mondayHealth = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE monday_comment IS NOT NULL AND TRIM(monday_comment) <> '')::int AS with_comment,
        COUNT(*) FILTER (WHERE monday_url IS NOT NULL AND TRIM(monday_url) <> '')::int AS with_monday_url,
        COUNT(*) FILTER (WHERE schedule_url IS NOT NULL AND TRIM(schedule_url) <> '')::int AS with_schedule_url,
        COUNT(*) FILTER (WHERE priority_number IS NOT NULL)::int AS with_priority_number
      FROM releases
      WHERE is_unmanaged_jira = 0 AND (source = 'monday' OR release_key LIKE 'monday:%' OR monday_url IS NOT NULL)
    `);
    const h = mondayHealth.rows[0];
    console.log('\nMonday-backed rows (excl. unmanaged Jira) — field coverage:');
    console.log('  With Monday comment:', h.with_comment);
    console.log('  With monday_url:', h.with_monday_url);
    console.log('  With schedule_url:', h.with_schedule_url);
    console.log('  With priority_number:', h.with_priority_number);

    const jiraEnrichment = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE jira_status IS NOT NULL)::int AS has_jira_status,
        COUNT(*) FILTER (WHERE project_title IS NOT NULL)::int AS has_project_title,
        COUNT(*) FILTER (WHERE jira_number IS NOT NULL)::int AS has_jira_number
      FROM releases
      WHERE is_unmanaged_jira = 0
    `);
    const j = jiraEnrichment.rows[0];
    console.log('\nJira enrichment still present on non-unmanaged rows:');
    console.log('  jira_status:', j.has_jira_status, '  project_title:', j.has_project_title, '  jira_number:', j.has_jira_number);

    const sample = await client.query(`
      SELECT partner, product, source, release_key,
        LEFT(COALESCE(monday_comment,''), 40) AS comment_preview
      FROM releases
      WHERE source = 'monday' OR release_key LIKE 'monday:%'
      ORDER BY partner, product
      LIMIT 8
    `);
    console.log('\nSample Monday rows (up to 8):');
    sample.rows.forEach((r) => {
      console.log(`  ${r.partner} | ${r.product} | ${r.source || '—'} | ${r.comment_preview || '—'}`);
    });
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
