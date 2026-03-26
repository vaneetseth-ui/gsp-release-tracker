#!/usr/bin/env node
/**
 * Offline smoke: runAskQuery with representative rows (no server / DB required).
 * Usage: node scripts/smoke-nl-queries.mjs
 */
import { runAskQuery } from '../server/askEngine.js';

function mockDb(releases, partners) {
  return {
    getAllReleases: () => releases,
    getPartners: () => partners ?? [...new Set(releases.map((r) => r.partner).filter(Boolean))].sort(),
  };
}

const richRows = [
  {
    partner: 'AT&T',
    product: 'RingCX Migration',
    product_track: 'RingCX',
    stage: 'Beta',
    pmo_status: 'On Track',
    priority_number: 1,
    monday_comment: 'Phase 2 midwest',
    schedule_url: 'https://example.com/s1',
    gsp_launch_date: '2026-06-01',
    include_in_matrix: 1,
    is_unmanaged_jira: 0,
  },
  {
    partner: 'AT&T',
    product: 'RingEX Rollout',
    product_track: 'RingEX',
    stage: 'Beta',
    pmo_status: 'At Risk',
    priority_number: 2,
    monday_comment: 'Infra dependency',
    schedule_url: 'https://example.com/s2',
    gsp_launch_date: '2026-08-01',
    include_in_matrix: 1,
    is_unmanaged_jira: 0,
  },
  {
    partner: 'Telus',
    product: 'RingCX',
    product_track: 'RingCX',
    stage: 'Beta',
    pmo_status: 'Working on it',
    priority_number: 3,
    schedule_url: 'https://example.com/s3',
    include_in_matrix: 1,
    is_unmanaged_jira: 0,
  },
];

const queries = [
  'How many RCS projects does PMO manage with a schedule?',
  'Top 5 AT&T projects',
  'Which GSP Jira projects are not in Monday?',
  'asdfgh vague',
];

console.log('GSP v1.4 NL query smoke (offline mock DB)\n');
for (const q of queries) {
  const r = runAskQuery(q, mockDb(richRows, ['AT&T', 'Telus']));
  console.log('─'.repeat(72));
  console.log('Q:', q);
  console.log('tier:', r.tier, 'askType:', r.askType, 'intent:', r.intent);
  if (r.message) console.log('message:\n', r.message);
  if (r.count != null) console.log('count:', r.count);
  if (r.rows?.length) console.log('rows:', r.rows.length, '(sample partner:', r.rows[0]?.partner, ')');
  if (r.record) console.log('record:', r.record.partner, '—', r.record.product);
  console.log();
}
