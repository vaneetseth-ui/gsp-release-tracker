import { confluenceAuthHeaders } from './auth.js';

const JIRA_KEY_IN_HTML = /\b([A-Z][A-Z0-9_]*-\d+)\b/g;

/**
 * @param {string} baseUrl e.g. https://your-domain.atlassian.net
 * @param {string} pageId
 */
async function fetchContentOnce(root, prefix, pageId, expand) {
  const url = `${root}${prefix}/content/${pageId}?expand=${encodeURIComponent(expand)}`;
  const res = await fetch(url, { headers: confluenceAuthHeaders() });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Confluence ${pageId} → ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

function pickHtml(json) {
  return json.body?.view?.value || json.body?.storage?.value || '';
}

export async function fetchConfluencePageHtml(baseUrl, pageId) {
  const root = baseUrl.replace(/\/$/, '');
  const prefix = (process.env.CONFLUENCE_API_PREFIX || '/wiki/rest/api').replace(/\/$/, '');

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
