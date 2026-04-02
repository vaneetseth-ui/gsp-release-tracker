#!/usr/bin/env node
import { runMondayFirstSync } from '../server/sync_monday.js';

const HEROKU_URL = process.env.HEROKU_URL || 'https://gsp-release-tracker-ffa0c1ec9485.herokuapp.com';
const INGEST_TOKEN = process.env.INGEST_TOKEN || '';

async function wakeupHeroku() {
  const url = `${HEROKU_URL}/api/health`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    console.log('▶ Waking dashboard (GET /api/health)…');
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) console.warn(`  Health HTTP ${res.status} — continuing`);
    else console.log('  ✓ Ready');
  } catch (e) {
    clearTimeout(timeout);
    console.warn(`  Wake-up: ${e.message} — continuing`);
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  GSP Release Tracker — Monday-first sync v1.0   ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const bundle = await runMondayFirstSync({ env: process.env, logger: console });

  console.log('\n── Data pull breakup ─────────────────────────────────');
  console.log(`  Monday · GSP Priorities:     ${bundle.stats.mondayPriorities} items`);
  console.log(`  Monday · Tracker rows:       ${bundle.stats.trackerRowsIndexed} indexed`);
  console.log(`  Jira · GSP unresolved:       ${bundle.stats.jiraIssuesPulled} issues`);
  console.log(`  Jira · linked to Monday row: ${bundle.stats.jiraLinkedToMonday}`);
  console.log(`  Jira · extra release rows:   ${bundle.stats.unmanagedJiraRows}`);
  console.log(`  Total rows for /api/ingest:  ${bundle.stats.totalReleases}`);
  console.log('─────────────────────────────────────────────────────');

  await wakeupHeroku();
  console.log(`\n▶ POST ${HEROKU_URL}/api/ingest`);

  const headers = { 'Content-Type': 'application/json' };
  if (INGEST_TOKEN) headers.Authorization = `Bearer ${INGEST_TOKEN}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  let ingestRes;
  try {
    ingestRes = await fetch(`${HEROKU_URL}/api/ingest`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ releases: bundle.releases, meta: bundle.meta }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
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
