#!/usr/bin/env node
/**
 * Trigger Confluence wiki ingest on a running API (same host as Jira ingest).
 *
 * Requires on the server: CONFLUENCE_BASE_URL, CONFLUENCE_PAT (or CONFLUENCE_EMAIL + token as Basic).
 * Optional: INGEST_TOKEN on server + pass Bearer here.
 *
 * Usage:
 *   HEROKU_URL=https://your-app.herokuapp.com INGEST_TOKEN=xxx node scripts/sync-confluence.js
 *   DASHBOARD_API=http://127.0.0.1:3001 node scripts/sync-confluence.js
 */
const DEFAULT_PROD_API = 'https://gsp-release-tracker-ffa0c1ec9485.herokuapp.com';
const base = (
  process.env.DASHBOARD_API ||
  process.env.HEROKU_URL ||
  DEFAULT_PROD_API
).replace(/\/$/, '');
const token = process.env.INGEST_TOKEN || '';

async function main() {
  await fetch(`${base}/api/health`).catch(() => {});

  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}/api/sync/confluence`, { method: 'POST', headers });
  const body = await res.text();
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    console.error(res.status, body);
    process.exit(1);
  }
  if (!res.ok) {
    console.error('Confluence sync failed:', json.error || json);
    process.exit(1);
  }
  if (json.pageErrors?.length) {
    console.warn('Page warnings/errors:', JSON.stringify(json.pageErrors, null, 2));
  }
  console.log(JSON.stringify(json, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
