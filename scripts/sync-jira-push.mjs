import 'dotenv/config';
import { syncFromJira } from '../server/sync_jira.js';

const APP_URL = (process.env.HEROKU_URL || process.env.APP_URL || '').trim();
const INGEST_TOKEN = (process.env.INGEST_TOKEN || '').trim();

if (!APP_URL) {
  throw new Error('Set HEROKU_URL or APP_URL to the deployed app base URL');
}

const bundle = await syncFromJira();

const res = await fetch(new URL('/api/sync/jira', APP_URL), {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(INGEST_TOKEN ? { Authorization: `Bearer ${INGEST_TOKEN}` } : {}),
  },
  body: JSON.stringify(bundle),
});

const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = { raw: text };
}

if (!res.ok) {
  throw new Error(`Jira push failed (${res.status}): ${body.error || text}`);
}

console.log(JSON.stringify(body, null, 2));
