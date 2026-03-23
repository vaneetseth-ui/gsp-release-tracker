-- GSP Release Tracker — SQLite Schema
-- Lightweight DB (Output Channel L3b)
-- Populated by pipeline/ingest/*.py via sync_gsp_tracker.py

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── Core release records ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS releases (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  partner          TEXT    NOT NULL,
  product          TEXT    NOT NULL,
  stage            TEXT    NOT NULL DEFAULT 'Planned',
  target_date      TEXT,
  actual_date      TEXT,
  jira_number      TEXT,
  pm               TEXT,
  se_lead          TEXT,
  csm              TEXT,
  market_type      TEXT,
  product_track    TEXT,
  notes            TEXT,
  -- Exception flags (denormalised for fast reads)
  blocked          INTEGER NOT NULL DEFAULT 0,
  red_account      INTEGER NOT NULL DEFAULT 0,
  missing_pm       INTEGER NOT NULL DEFAULT 0,
  days_overdue     INTEGER,
  days_in_eap      INTEGER,
  arr_at_risk      INTEGER,
  -- Provenance
  source           TEXT    DEFAULT 'mock',
  confidence       TEXT    DEFAULT 'high',
  last_updated     TEXT    DEFAULT (datetime('now')),
  UNIQUE(partner, product)
);

-- ── Changelog ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS changelog (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  change_date TEXT    NOT NULL,
  partner     TEXT    NOT NULL,
  product     TEXT    NOT NULL,
  from_stage  TEXT,
  to_stage    TEXT    NOT NULL,
  author      TEXT,
  note        TEXT,
  source      TEXT    DEFAULT 'manual',
  created_at  TEXT    DEFAULT (datetime('now'))
);

-- ── Partners registry ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partners (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  region      TEXT,
  market_type TEXT,
  csm         TEXT,
  se_lead     TEXT,
  active      INTEGER NOT NULL DEFAULT 1
);

-- ── Sync log (audit trail from pipeline) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at      TEXT    DEFAULT (datetime('now')),
  source      TEXT,
  records_in  INTEGER DEFAULT 0,
  records_out INTEGER DEFAULT 0,
  conflicts   INTEGER DEFAULT 0,
  status      TEXT    DEFAULT 'ok',
  message     TEXT
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_releases_partner  ON releases(partner);
CREATE INDEX IF NOT EXISTS idx_releases_product  ON releases(product);
CREATE INDEX IF NOT EXISTS idx_releases_stage    ON releases(stage);
CREATE INDEX IF NOT EXISTS idx_releases_blocked  ON releases(blocked) WHERE blocked = 1;
CREATE INDEX IF NOT EXISTS idx_changelog_partner ON changelog(partner);
CREATE INDEX IF NOT EXISTS idx_changelog_date    ON changelog(change_date DESC);
