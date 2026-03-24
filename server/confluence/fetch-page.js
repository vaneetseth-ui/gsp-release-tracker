import { confluenceAuthHeaders } from './auth.js';

const JIRA_KEY_IN_HTML = /\b([A-Z][A-Z0-9_]*-\d+)\b/g;

/**
 * REST root path before `/content/{id}`.
 * - Cloud: https://tenant.atlassian.net/wiki/rest/api
 * - Server/DC (browse URL …/spaces/KEY/pages/{numericId}/…): usually https://host/rest/api
 * - Some installs: /confluence/rest/api — set CONFLUENCE_API_PREFIX
 */
export function resolveConfluenceApiPrefix(baseUrl) {
  const fromEnv = process.env.CONFLUENCE_API_PREFIX;
  if (fromEnv != null && String(fromEnv).trim() !== '') {
    return String(fromEnv).replace(/\/$/, '');
  }
  const u = (baseUrl || '').toLowerCase();
  if (u.includes('atlassian.net')) return '/wiki/rest/api';
  return '/rest/api';
}

/**
 * @param {string} baseUrl e.g. https://your-domain.atlassian.net
 * @param {string} pageId
 */
async function fetchContentOnce(root, prefix, pageId, expand) {
  const url = `${root}${prefix}/content/${pageId}?expand=${encodeURIComponent(expand)}`;
  const res = await fetch(url, { headers: confluenceAuthHeaders() });
  const text = await res.text();
  const trimmed = text.trim();

  if (!res.ok) {
    throw new Error(`Confluence ${pageId} → ${res.status}: ${trimmed.slice(0, 200)}`);
  }

  // Login pages, SSO interstitials, and some mis-routed URLs return 200 + HTML — not JSON.
  if (trimmed.startsWith('<')) {
    throw new Error(
      `Confluence ${pageId} → HTTP 200 but body is HTML (not REST JSON). ` +
        `Usually: wrong CONFLUENCE_API_PREFIX for your deployment (Cloud uses /wiki/rest/api; ` +
        `Server/DC often /confluence/rest/api or /rest/api), missing CONFLUENCE_EMAIL for Basic auth ` +
        `(Cloud API tokens need email:token, not Bearer alone), corporate SSO/VPN, or invalid PAT. URL tried: ${url}`
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Confluence ${pageId} → response is not JSON (first 120 chars): ${trimmed.slice(0, 120)}`
    );
  }
}

function pickHtml(json) {
  return json.body?.view?.value || json.body?.storage?.value || '';
}

export async function fetchConfluencePageHtml(baseUrl, pageId) {
  const root = baseUrl.replace(/\/$/, '');
  const prefix = resolveConfluenceApiPrefix(baseUrl);

  const expandPrimary = 'body.view,body.storage,version,space,title';
  let json = await fetchContentOnce(root, prefix, pageId, expandPrimary);
  let title = json.title || `Page ${pageId}`;
  let html = pickHtml(json);

  if (!html?.trim()) {
    try {
      json = await fetchContentOnce(root, prefix, pageId, 'body.storage,version,space,title');
      title = json.title || title;
      html = pickHtml(json);
    } catch {
      /* keep empty */
    }
  }

  return {
    pageId,
    title,
    spaceKey: json.space?.key || null,
    html,
    version: json.version?.number ?? null,
  };
}

export function extractJiraKeysFromHtmlFragment(html) {
  if (!html) return [];
  const keys = [];
  const seen = new Set();
  let m;
  const re = new RegExp(JIRA_KEY_IN_HTML.source, 'gi');
  while ((m = re.exec(html)) !== null) {
    const k = m[1].toUpperCase();
    if (seen.has(k)) continue;
    seen.add(k);
    keys.push(k);
  }
  return keys;
}
