import { CONFLUENCE_PAGES } from './config.js';
import { fetchConfluencePageHtml } from './fetch-page.js';
import { parseConfluenceTables } from './parse-tables.js';

/**
 * Fetch configured Confluence pages and parse wiki tables into release-shaped rows (source: confluence).
 * Continues on per-page failures; see `pageErrors` in the result.
 */
export async function runConfluenceIngestBuild(options = {}) {
  const baseUrl =
    process.env.CONFLUENCE_BASE_URL ||
    process.env.ATLASSIAN_SITE_URL ||
    process.env.CONFLUENCE_URL ||
    '';
  if (!baseUrl.trim()) {
    throw new Error(
      'Set CONFLUENCE_BASE_URL to your site root, e.g. https://your-domain.atlassian.net'
    );
  }

  const pages = options.pages || CONFLUENCE_PAGES;
  const byKey = new Map();
  /** @type {{ id: string, label?: string, error: string }[]} */
  const pageErrors = [];

  for (const { id, label } of pages) {
    try {
      const { title, html, pageId } = await fetchConfluencePageHtml(baseUrl, id);
      const pageLabel = label || title;
      if (!html?.trim()) {
        pageErrors.push({
          id: String(id),
          label,
          error: 'Empty body (no view/storage HTML); check permissions or expand format',
        });
        continue;
      }
      const rows = parseConfluenceTables(html, { pageLabel, pageId: String(pageId) });

      for (const row of rows) {
        const k = `${row.partner}|||${row.product}`;
        if (!byKey.has(k)) {
          byKey.set(k, { ...row });
        } else {
          const prev = byKey.get(k);
          prev.notes = [prev.notes, row.notes].filter(Boolean).join('\n---\n');
          if (!prev.jira_number && row.jira_number) prev.jira_number = row.jira_number;
          if ((!prev.target_date || prev.target_date === '') && row.target_date) prev.target_date = row.target_date;
        }
      }
    } catch (e) {
      pageErrors.push({
        id: String(id),
        label,
        error: e?.message || String(e),
      });
    }
  }

  return { rows: [...byKey.values()], pageErrors };
}

/** @returns {Promise<object[]>} */
export async function buildConfluenceReleaseRows(options = {}) {
  const { rows } = await runConfluenceIngestBuild(options);
  return rows;
}

export { CONFLUENCE_PAGES } from './config.js';
