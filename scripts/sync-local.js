#!/usr/bin/env node
/**
 * sync-local.js — Jira + Monday.com → Heroku ingest
 *
 * Runs locally (inside corporate network) via cron (run-sync.sh).
 * Fetches from both sources, merges (Jira wins on conflicts),
 * and pushes to the Heroku dashboard via POST /api/ingest.
 *
 * Env vars (set in run-sync.sh or .env):
 *   JIRA_PAT          Jira personal access token
 *   JIRA_URL           defaults to https://jira.ringcentral.com
 *   HEROKU_URL         defaults to Heroku app URL
 *   MONDAY_API_KEY     Monday.com API token (optional)
 *
 * Canonical schema v2 fields are included alongside server-expected
 * field names so the server's db.js works AND canonical form is preserved.
 * Conflict resolution: Jira > Monday (Monday fills gaps only).
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── Load .env (fallback only — run-sync.sh exports take precedence) ──────────

function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env');
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch {}
}
loadEnv();

// ── Config ───────────────────────────────────────────────────────────────────

const JIRA_URL   = process.env.JIRA_URL   || 'https://jira.ringcentral.com';
const JIRA_PAT   = process.env.JIRA_PAT;
const HEROKU_URL = process.env.HEROKU_URL || 'https://gsp-release-tracker-ffa0c1ec9485.herokuapp.com';
const MONDAY_KEY = process.env.MONDAY_API_KEY;

// ── Reference data ───────────────────────────────────────────────────────────

const KNOWN_PARTNERS = {
  'AT&T':          ['AT&T', "AT&T O@H", 'ATT'],
  'Avaya ACO':     ['Avaya', 'Avaya ACO'],
  'BT':            ['BT'],
  'Charter - ENT': ['Charter', 'Charter ENT', 'Charter - ENT'],
  'Charter - SMB': ['Charter SMB', 'Charter - SMB'],
  'DT':            ['DT', 'Deutsche Telekom'],
  'DT - Unify':    ['DT Unify', 'DT-Unify', 'DT - Unify'],
  'Ecotel':        ['Ecotel'],
  'Frontier':      ['Frontier'],
  'MCM':           ['MCM'],
  'RISE Amer':     ['RISE Amer', 'RISE Americas'],
  "RISE Int'n":    ["RISE Int'n", "RISE Int'l", 'RISE International'],
  'Telus':         ['Telus', 'TELUS'],
  'Unify':         ['Unify'],
  'Verizon':       ['Verizon'],
  'Versatel':      ['Versatel'],
  'Vodafone':      ['Vodafone'],
};

const KNOWN_PRODUCTS = ['Nova IVA', 'RingCX', 'AIR', 'MVP', 'ACO', 'RingEX'];

const STATUS_TO_STAGE = {
  'to do': 'Planned', 'open': 'Planned', 'backlog': 'Planned', 'planned': 'Planned',
  'in progress': 'Dev', 'in development': 'Dev', 'dev': 'Dev', 'development': 'Dev',
  'in review': 'EAP', 'eap': 'EAP', 'early access': 'EAP', 'early adopter': 'EAP',
  'in beta': 'Beta', 'beta': 'Beta', 'beta testing': 'Beta',
  'done': 'GA', 'closed': 'GA', 'released': 'GA', 'ga': 'GA', 'generally available': 'GA', 'live': 'GA',
  'blocked': 'Blocked', 'impediment': 'Blocked', 'on hold': 'Blocked',
};

const MON_STAGE = {
  'Planned': 'Planned', 'In Progress': 'Dev', 'Beta': 'Beta',
  'EAP': 'EAP', 'Ready for GA': 'GA', 'GA': 'GA', 'Live': 'GA', 'Done': 'GA',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeStage(raw = '') {
  return STATUS_TO_STAGE[raw.toLowerCase().trim()] || 'Planned';
}

/**
 * Match text to a canonical partner name.
 * Exact match first, then longest-substring match to avoid "DT" stealing "DT - Unify".
 */
function normalizePartner(text) {
  if (!text) return null;
  const t = text.trim();
  const tLower = t.toLowerCase();

  for (const [canonical, aliases] of Object.entries(KNOWN_PARTNERS)) {
    for (const alias of aliases) {
      if (tLower === alias.toLowerCase()) return canonical;
    }
  }

  const flat = Object.entries(KNOWN_PARTNERS)
    .flatMap(([canonical, aliases]) => aliases.map(a => [a, canonical]))
    .sort((a, b) => b[0].length - a[0].length);
  for (const [alias, canonical] of flat) {
    if (tLower.includes(alias.toLowerCase())) return canonical;
  }
  return t;
}

function parseProduct(text = '', labels = [], components = []) {
  for (const c of components) {
    for (const p of KNOWN_PRODUCTS) {
      if ((c.name || '').toLowerCase().includes(p.toLowerCase())) return p;
    }
  }
  for (const l of labels) {
    for (const p of KNOWN_PRODUCTS) {
      if (l.toLowerCase().includes(p.toLowerCase())) return p;
    }
  }
  for (const p of KNOWN_PRODUCTS) {
    if (text.toLowerCase().includes(p.toLowerCase())) return p;
  }
  return null;
}

function col(item, colTitle) {
  const c = (item.column_values || []).find(
    x => (x.column?.title || '').toLowerCase() === colTitle.toLowerCase()
  );
  return c?.text || null;
}

function daysBetween(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

// ── Jira fetch WITH PAGINATION ───────────────────────────────────────────────

async function fetchJira() {
  if (!JIRA_PAT) {
    console.log('⚠️  JIRA_PAT not set — skipping Jira');
    return [];
  }
  console.log('▶ Querying Jira...');
  const allIssues = [];

  for (const proj of ['GSP', 'PTR']) {
    const jql = `project = ${proj} AND resolution = Unresolved ORDER BY priority DESC, updated DESC`;
    let startAt  = 0;
    let projCount = 0;

    while (true) {
      const url = new URL(`${JIRA_URL}/rest/api/2/search`);
      url.searchParams.set('jql',        jql);
      url.searchParams.set('startAt',    startAt);
      url.searchParams.set('maxResults', 100);
      url.searchParams.set('fields', [
        'summary', 'status', 'assignee', 'duedate', 'resolutiondate',
        'created', 'updated', 'labels', 'components', 'description',
        'issuetype', 'priority', 'reporter', 'resolution', 'fixVersions',
        'customfield_21059',  // Product Manager
        'customfield_21998',  // Target Delivery Quarter
        'customfield_21952',  // Requested Delivery Quarter
        'customfield_22459',  // SE Region
        'customfield_26853',  // Brand
      ].join(','));

      process.stdout.write(`  ${proj}: fetching ${startAt}–${startAt + 100}…\r`);

      try {
        const res = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${JIRA_PAT}`,
            'Accept':        'application/json',
          },
        });

        if (!res.ok) {
          const text = await res.text();
          console.error(`\n  ✗ ${proj} API ${res.status}: ${text.slice(0, 200)}`);
          break;
        }

        const data   = await res.json();
        const issues = data.issues || [];
        allIssues.push(...issues);
        projCount += issues.length;
        startAt   += issues.length;

        if (startAt >= data.total || issues.length === 0) break;
      } catch (e) {
        console.error(`\n  ✗ ${proj}: ${e.message}`);
        break;
      }
    }

    console.log(`  ✓ ${projCount} ${proj} issues                    `);
  }

  // De-duplicate by Jira key
  const seen = new Set();
  const unique = allIssues.filter(i => {
    if (seen.has(i.key)) return false;
    seen.add(i.key);
    return true;
  });

  // Transform each issue to the dashboard schema
  const releases = unique.map((issue, idx) => {
    const f          = issue.fields;
    const summary    = f.summary    || '';
    const labels     = f.labels     || [];
    const components = f.components || [];

    // Parse partner + product (try pipe-delimited first, then keyword matching)
    const parts = summary.split('|').map(s => s.trim());
    let partner, product, feature;

    if (parts.length >= 2) {
      partner = normalizePartner(parts[0]);
      product = parseProduct(parts[1], labels, components) || parts[1] || 'Unknown';
      feature = parts.length >= 3 ? parts[2] : null;
    } else {
      partner = normalizePartner(summary);
      product = parseProduct(summary, labels, components) || 'Unknown';
      feature = null;
    }

    const stage      = normalizeStage(f.status?.name || '');
    const pmCustom   = f.customfield_21059?.displayName || null;
    const assignee   = f.assignee?.displayName || null;
    const pm         = pmCustom || assignee;
    const blocked    = (stage === 'Blocked' || labels.some(l => /blocked|impediment|on.hold/i.test(l))) ? 1 : 0;
    const red_account = labels.some(l => /red.account|red.acct|at.risk/i.test(l)) ? 1 : 0;
    const missing_pm = !pm ? 1 : 0;
    const target_date = f.duedate || null;
    const actual_date = f.resolutiondate ? f.resolutiondate.split('T')[0] : null;
    const days_in_eap = stage === 'EAP' ? daysBetween(f.created) : null;
    const days_overdue = (blocked && target_date && new Date(target_date) < new Date())
      ? daysBetween(target_date) : null;

    let arr_at_risk = null;
    const arrLabel = labels.find(l => /\$[\d.]+[KkMm]/.test(l));
    if (arrLabel) {
      const m = arrLabel.match(/\$([\d.]+)([KkMm])/);
      if (m) arr_at_risk = parseFloat(m[1]) * (m[2].toLowerCase() === 'm' ? 1000000 : 1000);
    }

    const brandRaw = f.customfield_26853;
    const brand = Array.isArray(brandRaw)
      ? brandRaw.map(b => b?.name || b?.value || '').filter(Boolean).join(', ')
      : (brandRaw?.name || brandRaw?.value || null);
    const fixVersions = (f.fixVersions || []).map(v => v.name).filter(Boolean).join(', ') || null;

    return {
      jira_key:     issue.key,
      partner,
      product,
      stage,
      target_date,
      actual_date,
      jira_number:  issue.key,
      pm,
      se_lead:      null,
      csm:          null,
      notes:        summary.slice(0, 200),
      blocked,
      red_account,
      missing_pm,
      days_overdue,
      days_in_eap,
      arr_at_risk,
      issue_type:         f.issuetype?.name || null,
      priority:           f.priority?.name || null,
      reporter:           f.reporter?.displayName || null,
      resolution:         f.resolution?.name || 'Unresolved',
      fix_version:        fixVersions,
      requested_quarter:  f.customfield_21952?.value || null,
      target_quarter:     f.customfield_21998?.value || null,
      se_region:          f.customfield_22459?.value || null,
      brand,
      assignee,
      source:           'jira',
      source_url:       `${JIRA_URL}/browse/${issue.key}`,
      last_updated:     f.updated,
      // extras
      record_id:        crypto.randomUUID(),
      gsp_partner:      partner,
      feature,
      release_stage:    stage,
      product_manager:  pm,
      confidence:       'high',
    };
  });

  console.log(`  ✓ ${releases.length} total Jira releases (de-duped from ${allIssues.length})`);
  return releases;
}

// ── Monday.com fetch (correct items_page response path) ──────────────────────

async function fetchMonday() {
  if (!MONDAY_KEY) {
    console.log('⚠️  MONDAY_API_KEY not set — skipping Monday');
    return [];
  }
  console.log('▶ Querying Monday.com (5 boards)...');

  const BOARDS = {
    '18396988914': 'AI Board',
    '18402603951': 'GSP Core',
    '18396681774': 'GSP Priorities',
    '18399812494': 'Tracker 1',
    '18399616718': 'Tracker 2',
  };

  const allItems = [];

  for (const [boardId, name] of Object.entries(BOARDS)) {
    try {
      const query = `query{boards(ids:[${boardId}]){items_page(limit:100){cursor items{id name column_values{id text value column{title}}}}}}`;
      const res = await fetch('https://api.monday.com/v2', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${MONDAY_KEY}`,
          'API-Version':   '2024-10',
        },
        body: JSON.stringify({ query }),
      });

      const json = await res.json();

      if (json.errors) {
        console.warn(`  ⚠️  ${name}: ${json.errors[0]?.message || JSON.stringify(json.errors)}`);
        continue;
      }

      // FIX: items_page nests items under .items_page.items, NOT .items
      const items = json.data?.boards?.[0]?.items_page?.items || [];
      console.log(`  ✓ ${items.length} from ${name}`);
      allItems.push(...items.map(i => ({ ...i, board_id: boardId })));
    } catch (e) {
      console.warn(`  ⚠️  ${name}: ${e.message}`);
    }
  }

  const releases = allItems.map(item => {
    const partnerRaw = col(item, 'Partner') || item.name;
    const partner = normalizePartner(partnerRaw);
    if (!partner) return null;

    const statusRaw = col(item, 'Status') || '';
    const stage     = MON_STAGE[statusRaw] || normalizeStage(statusRaw);
    const product   = col(item, 'Product') || col(item, 'Product Track') || null;
    const pm        = col(item, 'Product Manager') || col(item, 'PM') || null;
    const jiraNum   = col(item, 'Jira Number') || col(item, 'Jira') || null;

    return {
      jira_key:     jiraNum,
      partner,
      product,
      stage,
      target_date:  col(item, 'Schedule') || col(item, 'Target Date') || null,
      actual_date:  null,
      jira_number:  jiraNum,
      pm,
      se_lead:      col(item, 'SE Lead') || null,
      csm:          col(item, 'CSM') || null,
      notes:        col(item, 'Comment') || col(item, 'Notes') || null,
      blocked:      stage === 'Blocked' ? 1 : 0,
      red_account:  0,
      missing_pm:   pm ? 0 : 1,
      days_overdue: null,
      days_in_eap:  null,
      arr_at_risk:  null,
      issue_type:         col(item, 'Type') || null,
      priority:           col(item, 'Priority') || null,
      reporter:           null,
      resolution:         null,
      fix_version:        null,
      requested_quarter:  col(item, 'Requested Quarter') || col(item, 'Requested Delivery Quarter') || null,
      target_quarter:     col(item, 'Target Quarter') || col(item, 'Target Delivery Quarter') || null,
      se_region:          col(item, 'SE Region') || col(item, 'Region') || null,
      brand:              col(item, 'Brand') || null,
      assignee:           pm,
      source:           'monday',
      source_url:       `https://ringcentral.monday.com/boards/${item.board_id}/pulses/${item.id}`,
      last_updated:     new Date().toISOString(),
      record_id:        crypto.randomUUID(),
      gsp_partner:      partner,
      feature:          col(item, 'Feature') || null,
      release_stage:    stage,
      product_manager:  pm,
      market_type:      col(item, 'Market Type') || null,
      product_track:    col(item, 'Product Track') || null,
      confidence:       'high',
    };
  }).filter(Boolean);

  console.log(`  ✓ ${releases.length} Monday releases`);
  return releases;
}

// ── Merge: Jira wins, Monday fills gaps ──────────────────────────────────────

function merge(jira, monday) {
  const map = new Map();

  for (const r of jira) {
    map.set(`${r.partner}|${r.product}|${r.feature || ''}`, r);
  }

  for (const r of monday) {
    const key = `${r.partner}|${r.product}|${r.feature || ''}`;
    if (map.has(key)) {
      const e = map.get(key);
      map.set(key, {
        ...e,
        se_lead:           e.se_lead           || r.se_lead,
        csm:               e.csm               || r.csm,
        pm:                e.pm                || r.pm,
        product_manager:   e.product_manager   || r.product_manager,
        market_type:       e.market_type       || r.market_type,
        product_track:     e.product_track     || r.product_track,
        jira_number:       e.jira_number       || r.jira_number,
        jira_key:          e.jira_key          || r.jira_key,
        issue_type:        e.issue_type        || r.issue_type,
        priority:          e.priority          || r.priority,
        reporter:          e.reporter          || r.reporter,
        resolution:        e.resolution        || r.resolution,
        fix_version:       e.fix_version       || r.fix_version,
        requested_quarter: e.requested_quarter || r.requested_quarter,
        target_quarter:    e.target_quarter    || r.target_quarter,
        se_region:         e.se_region         || r.se_region,
        brand:             e.brand             || r.brand,
        assignee:          e.assignee          || r.assignee,
      });
    } else {
      map.set(key, r);
    }
  }

  return [...map.values()];
}

// ── Wake Heroku (eco dynos sleep after 30min) ────────────────────────────────

async function wakeHeroku() {
  try {
    console.log('▶ Waking Heroku...');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000);
    const res = await fetch(`${HEROKU_URL}/api/health`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      console.log('  ✓ Awake — waiting 3s for dyno warmup');
      await new Promise(r => setTimeout(r, 3000));
    } else {
      console.warn(`  Health returned ${res.status}`);
    }
  } catch (e) {
    console.warn(`  Wake-up: ${e.message} — waiting 5s then continuing`);
    await new Promise(r => setTimeout(r, 5000));
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════╗');
console.log('║  GSP Release Tracker — Jira + Monday     ║');
console.log('╚══════════════════════════════════════════╝\n');

console.log(`Jira:    ${JIRA_URL}`);
console.log(`Heroku:  ${HEROKU_URL}`);
console.log(`Monday:  ${MONDAY_KEY ? 'configured' : 'not set'}\n`);

const jira   = await fetchJira();
const monday = await fetchMonday();
const all    = merge(jira, monday);

if (!all.length) {
  console.error('\n❌ No data. Check JIRA_PAT and MONDAY_API_KEY.');
  process.exit(1);
}

// De-duplicate by jira_key where non-null (keep first = Jira wins)
const seenKeys = new Set();
const deduped = [];
for (const r of all) {
  if (r.jira_key) {
    if (seenKeys.has(r.jira_key)) continue;
    seenKeys.add(r.jira_key);
  }
  deduped.push(r);
}
const droppedDupes = all.length - deduped.length;
if (droppedDupes > 0) console.log(`  De-duped: removed ${droppedDupes} duplicate jira_keys`);
const final = deduped;

console.log(`\n▶ Total: ${final.length} releases (${jira.length} Jira + ${monday.length} Monday${droppedDupes ? `, -${droppedDupes} dupes` : ''})`);

const partnerCounts = {};
for (const r of final) partnerCounts[r.partner] = (partnerCounts[r.partner] || 0) + 1;
const top = Object.entries(partnerCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
console.log(`  Partners: ${top.map(([p, n]) => `${p}(${n})`).join(', ')}…\n`);

await wakeHeroku();

const payload = JSON.stringify({
  releases: final,
  meta: {
    totalIssues:  final.length,
    fetchedAt:    new Date().toISOString(),
    source:       'local-sync',
    jiraCount:    jira.length,
    mondayCount:  monday.length,
  },
});
console.log(`▶ Pushing to Heroku (${(payload.length / 1024).toFixed(0)} KB)...`);

let lastError;
for (let attempt = 1; attempt <= 3; attempt++) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 120000);
  try {
    const res = await fetch(`${HEROKU_URL}/api/ingest`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    payload,
      signal:  ctrl.signal,
    });
    clearTimeout(t);

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error(`\n✗ Not JSON (HTTP ${res.status}): ${text.slice(0, 400)}`);
      process.exit(1);
    }

    if (!res.ok) {
      console.error(`\n✗ Ingest failed: ${JSON.stringify(data)}`);
      process.exit(1);
    }

    console.log(`\n✅  ${data.releases || final.length} releases → ${data.mode || 'pushed'}`);
    console.log(`   ${HEROKU_URL}`);
    process.exit(0);
  } catch (e) {
    clearTimeout(t);
    lastError = e;
    if (attempt < 3) {
      const wait = attempt * 5;
      console.log(`  Attempt ${attempt}/3 failed (${e.message}) — retrying in ${wait}s…`);
      await new Promise(r => setTimeout(r, wait * 1000));
    }
  }
}
console.error(`\n✗ Push failed after 3 attempts: ${lastError.message}`);
process.exit(1);
