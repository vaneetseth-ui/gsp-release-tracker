#!/usr/bin/env node
/**
 * Fetch Confluence using local env (CONFLUENCE_BASE_URL, CONFLUENCE_PAT, …),
 * merge into live Heroku releases (GET /api/releases), POST full result to /api/ingest.
 *
 * Use when Heroku does not have Confluence config vars.
 *
 *   GSP_ENV_FILE=~/gsp-tracker/.env node scripts/confluence-local-merge-push.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runConfluenceIngestBuild } from '../server/confluence/ingest.js';
import { mergeConfluenceIntoExisting } from '../server/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDotEnv(filePath) {
  try {
    const text = readFileSync(filePath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
  } catch (e) {
    console.error('Could not read env file:', filePath, e.message);
    process.exit(1);
  }
}

const envFile =
  process.env.GSP_ENV_FILE ||
  resolve(process.env.HOME || '', 'gsp-tracker', '.env');
loadDotEnv(envFile);

// RingCentral wiki tokens often live as Wiki_PAT in .env; server code expects CONFLUENCE_PAT.
if (!process.env.CONFLUENCE_PAT && !process.env.ATLASSIAN_API_TOKEN && process.env.Wiki_PAT) {
  process.env.CONFLUENCE_PAT = process.env.Wiki_PAT;
}
if (
  !process.env.CONFLUENCE_BASE_URL?.trim() &&
  !process.env.ATLASSIAN_SITE_URL?.trim() &&
  !process.env.CONFLUENCE_URL?.trim()
) {
  process.env.CONFLUENCE_BASE_URL = 'https://wiki.ringcentral.com';
}

const HEROKU_URL = (
  process.env.HEROKU_URL || 'https://gsp-release-tracker-ffa0c1ec9485.herokuapp.com'
).replace(/\/$/, '');
const INGEST_TOKEN = process.env.INGEST_TOKEN || '';

async function main() {
  console.log('▶ Fetching Confluence pages (local env)…');
  const { rows, pageErrors } = await runConfluenceIngestBuild();
  if (pageErrors?.length) {
    console.warn('⚠ Page issues:', JSON.stringify(pageErrors, null, 2));
  }
  console.log(`   Parsed ${rows.length} wiki row(s)`);

  console.log('▶ GET live releases from Heroku…');
  const relRes = await fetch(`${HEROKU_URL}/api/releases`);
  if (!relRes.ok) {
    throw new Error(`GET /api/releases ${relRes.status}: ${(await relRes.text()).slice(0, 200)}`);
  }
  const existing = await relRes.json();

  const { releases, added, updated, skipped } = mergeConfluenceIntoExisting(existing, rows);
  console.log(
    `▶ Merge: +${added} new, ~${updated} updated, skipped ${skipped} → ${releases.length} total`
  );

  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (INGEST_TOKEN) headers.Authorization = `Bearer ${INGEST_TOKEN}`;

  await fetch(`${HEROKU_URL}/api/health`).catch(() => {});

  console.log('▶ POST /api/ingest…');
  const ingestRes = await fetch(`${HEROKU_URL}/api/ingest`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      releases,
      meta: {
        fetchedAt: new Date().toISOString(),
        confluenceLocalMerge: true,
        wikiRows: rows.length,
      },
    }),
  });
  const text = await ingestRes.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Ingest not JSON (${ingestRes.status}): ${text.slice(0, 400)}`);
  }
  if (!ingestRes.ok) {
    throw new Error(body.error || text);
  }
  console.log('✅', body);
}

main().catch((e) => {
  console.error('✗', e.message || e);
  process.exit(1);
});
