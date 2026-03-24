#!/usr/bin/env node
/**
 * Run Confluence wiki ingest against the local process (no HTTP).
 * Load env from the shell (CONFLUENCE_BASE_URL, CONFLUENCE_PAT, optional CONFLUENCE_EMAIL).
 *
 *   cd dashboard && CONFLUENCE_BASE_URL=... CONFLUENCE_EMAIL=... CONFLUENCE_PAT=... node scripts/confluence-ingest-local.mjs
 */
import * as db from '../server/db.js';
import { runConfluenceIngestBuild } from '../server/confluence/ingest.js';

await db.initDataStore();

const { rows, pageErrors } = await runConfluenceIngestBuild();

console.log(JSON.stringify({ pageErrors, parsedRowCount: rows.length }, null, 2));

if (pageErrors.length) {
  console.warn(`\n⚠ ${pageErrors.length} page(s) failed or had empty HTML (see pageErrors above).`);
}

const result = await db.mergeConfluenceReleases(rows);
console.log('\nMerge result:', JSON.stringify(result, null, 2));
