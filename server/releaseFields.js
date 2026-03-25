/**
 * v1.2 authoritative release record shape (ingest + Postgres + API).
 * Monday-first pipeline; Jira supplements; Confluence fills gaps only.
 */

/** @typedef {Object} ReleaseRecord
 * @property {string} release_key Stable id: `monday:${itemId}` | `jira:${key}` | `legacy:${uuid}`
 * @property {string} partner Canonical GSP partner (Monday or Jira component)
 * @property {string} product Product label for matrix (from track / Jira)
 * @property {string} [product_area] RingEX | RingCX | AI Portfolio | Other
 * @property {string} stage Legacy matrix stage / fallback normalized
 * @property {string|null} pmo_status Monday Status column verbatim (Change 19)
 * @property {string|null} jira_status Jira fields.status.name verbatim
 * @property {string|null} project_title Jira summary (card line 1)
 * @property {string|null} impact_summary Short business impact (from description)
 * @property {string|null} desc_raw Jira description raw
 * @property {string|null} product_track Monday Product Track
 * @property {string|null} market_type Monday Market Type
 * @property {number|null} priority_number Monday priority (Ask ranking)
 * @property {string|null} product_readiness_date Tracker milestone 1
 * @property {string|null} gsp_launch_date Tracker milestone 2
 * @property {string|null} schedule_url Monday link to tracker row
 * @property {string|null} tracker_group Matched tracker group name
 * @property {string|null} monday_comment Monday Comment column
 * @property {string|null} comment_updated_at ISO — stale if > 7d
 * @property {string|null} target_date Legacy single target (back compat)
 * @property {string|null} actual_date
 * @property {string|null} jira_number
 * @property {string|null} pm Product manager display name
 * @property {string|null} se_lead
 * @property {string|null} csm Stored but hidden in UI v1.2
 * @property {string|null} notes Short notes / merged
 * @property {number|null} arr_at_risk
 * @property {string|null} source monday | jira | confluence | blended
 * @property {string|null} monday_url
 * @property {string|null} monday_item_id
 * @property {string|null} data_provenance JSON array of step tags
 * @property {number} is_unmanaged_jira Jira GSP with no Monday item
 * @property {number} include_in_matrix 0 = exceptions-only row
 * @property {string|null} legacy_planning_date Col D fallback
 * @property {string|null} legacy_golive_date Col E fallback
 * @property {number} legacy_sourced 1 if any date from legacy sheet
 * @property {string|null} salesforce_account_id Phase 2 stub
 * @property {number|null} bug_report_count Phase 2 stub
 * @property {string|null} bug_reports_url Phase 2 stub
 */

export const RELEASE_EXTRA_COLUMNS = [
  'release_key',
  'pmo_status',
  'jira_status',
  'project_title',
  'impact_summary',
  'desc_raw',
  'product_track',
  'market_type',
  'priority_number',
  'product_readiness_date',
  'gsp_launch_date',
  'schedule_url',
  'tracker_group',
  'monday_comment',
  'comment_updated_at',
  'data_provenance',
  'is_unmanaged_jira',
  'include_in_matrix',
  'legacy_planning_date',
  'legacy_golive_date',
  'legacy_sourced',
  'salesforce_account_id',
  'bug_report_count',
  'bug_reports_url',
];

/** Fields Confluence merge must not overwrite when existing row is Monday-primary */
export const MONDAY_CANONICAL_FIELDS = new Set([
  'partner',
  'pmo_status',
  'product_track',
  'market_type',
  'priority_number',
  'product_readiness_date',
  'gsp_launch_date',
  'schedule_url',
  'tracker_group',
  'monday_comment',
  'comment_updated_at',
  'monday_url',
  'monday_item_id',
  'se_lead',
  'pm',
  'release_key',
]);
