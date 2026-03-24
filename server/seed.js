/**
 * seed.js — Apply SQLite schema and optional rows from server/data.js
 * Run: node server/seed.js
 * Populate releases via sync/ingest or POST /api/ingest when data.js arrays are empty.
 */
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { RELEASES, CHANGELOG } from './data.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'gsp_tracker.db');
const SQL_PATH = join(__dirname, 'schema.sql');

const db = new Database(DB_PATH);

const schema = readFileSync(SQL_PATH, 'utf8');
db.exec(schema);
console.log('✅ Schema applied');

const insertRelease = db.prepare(`
  INSERT OR REPLACE INTO releases
    (partner, product, stage, target_date, actual_date, jira_number, pm, se_lead, csm,
     notes, blocked, red_account, missing_pm, days_overdue, days_in_eap, arr_at_risk, source)
  VALUES
    (@partner, @product, @stage, @target_date, @actual_date, @jira_number, @pm, @se_lead, @csm,
     @notes, @blocked, @red_account, @missing_pm, @days_overdue, @days_in_eap, @arr_at_risk, 'seed')
`);

const insertChange = db.prepare(`
  INSERT INTO changelog (change_date, partner, product, from_stage, to_stage, author, note, source)
  VALUES (@change_date, @partner, @product, @from_stage, @to_stage, @author, @note, 'seed')
`);

const seedAll = db.transaction(() => {
  db.prepare("DELETE FROM releases WHERE source = 'seed'").run();
  db.prepare("DELETE FROM changelog WHERE source = 'seed'").run();

  for (const r of RELEASES) insertRelease.run(r);
  for (const c of CHANGELOG) insertChange.run(c);
});

seedAll();

const rCount = db.prepare('SELECT COUNT(*) as n FROM releases').get().n;
const cCount = db.prepare('SELECT COUNT(*) as n FROM changelog').get().n;
console.log(`✅ Seeded ${RELEASES.length} release row(s) from data.js → ${rCount} total releases, ${cCount} changelog rows`);
console.log(`   DB: ${DB_PATH}`);

db.prepare(
  `INSERT INTO sync_log (source, records_in, records_out, status, message)
   VALUES ('seed', ?, ?, 'ok', ?)`
).run(RELEASES.length, rCount, 'SQLite seed from server/data.js');

db.close();
console.log('✅ Done');
