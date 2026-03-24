/**
 * Jira REST API helpers — custom field shapes vary (option, user, multi-select, text).
 * Used by sync-local.js for P1 reliable partner / product / SE / CSM mapping.
 */

/** @returns {string[]} non-empty custom field ids from env */
export function collectFieldIdsFromEnv() {
  const keys = [
    'JIRA_FIELD_PARTNER',
    'JIRA_FIELD_PRODUCT',
    'JIRA_FIELD_SE',
    'JIRA_FIELD_CSM',
    'JIRA_FIELD_ARR',
    'JIRA_FIELD_STAGE',
    'JIRA_FIELD_MONDAY_URL',
    'JIRA_FIELD_MONDAY_ITEM_ID',
  ];
  const ids = keys
    .map(k => process.env[k])
    .filter(v => v && String(v).trim());
  return [...new Set(ids)];
}

const BASE_FIELDS = [
  'summary',
  'status',
  'assignee',
  'duedate',
  'resolutiondate',
  'created',
  'updated',
  'labels',
  'components',
  'description',
];

/**
 * Comma-separated `fields` param for GET /rest/api/2/search — includes any custom ids from env.
 */
export function buildJiraSearchFields() {
  const extra = collectFieldIdsFromEnv();
  return [...BASE_FIELDS, ...extra].join(',');
}

/**
 * Normalize a Jira field value to a display string (or null).
 */
export function extractCustomFieldValue(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    return String(raw);
  }
  if (Array.isArray(raw)) {
    const parts = raw.map(extractCustomFieldValue).filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  }
  if (typeof raw === 'object') {
    if (raw.displayName != null) return String(raw.displayName);
    if (raw.name != null) return String(raw.name);
    if (raw.value != null) return String(raw.value);
  }
  return null;
}
