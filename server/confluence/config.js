/**
 * Confluence wiki pages to ingest.
 * Page ID = numeric segment in browse URLs: …/spaces/{space}/pages/{id}/Page+Title
 * Example: https://wiki.ringcentral.com/spaces/AWT/pages/923989634/… → id 923989634
 *
 * REST call: {CONFLUENCE_BASE_URL}{CONFLUENCE_API_PREFIX}/content/{id}
 * Default prefix is `/rest/api` for non-atlassian.net hosts; Cloud uses `/wiki/rest/api`.
 */
export const CONFLUENCE_PAGES = [
  { id: '923989634', label: 'Engineering AI Transformation home' },
  { id: '1021974952', label: 'GSP NPI Release Tracking' },
  { id: '411507173', label: 'Application Releases' },
  { id: '1022297678', label: 'mThor 2026' },
  { id: '359651025', label: 'Jupiter root' },
  { id: '1022297681', label: 'Jupiter 2026' },
  { id: '486530659', label: 'Partners Product Home' },
];
