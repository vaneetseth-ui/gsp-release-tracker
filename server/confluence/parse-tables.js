import * as cheerio from 'cheerio';
import { KNOWN_PRODUCTS_SORTED, productAreaForProduct } from '../../src/data/constants.js';

const KNOWN_PARTNERS = [
  'AT&T O@H',
  'AT&T',
  'Avaya ACO',
  'Avaya',
  'Charter ENT',
  'Charter SMB',
  'Deutsche Telekom',
  'DT-Unify',
  'DT',
  'Ecotel',
  'Frontier',
  'KDDI',
  'MCM',
  'NTT',
  'Orange',
  'Rogers',
  'RISE Amer',
  "RISE Int'l",
  'SoftBank',
  'Swisscom',
  'Telus',
  'TELUS',
  'Telefonica',
  'Unify',
  'Versatel',
  'Verizon',
  'Vodafone',
];
const KNOWN_PARTNERS_SORTED = [...new Set(KNOWN_PARTNERS)].sort((a, b) => b.length - a.length);

const HEADER_SYNONYMS = {
  partner: ['partner', 'customer', 'account', 'operator', 'telco', 'csp', 'strategic partner', 'company', 'org'],
  product: ['product', 'application', 'app', 'offering', 'pillar', 'sku', 'line'],
  stage: ['stage', 'status', 'phase', 'state', 'release status', 'lifecycle'],
  target_date: ['target', 'target date', 'ga date', 'release date', 'planned', 'eta', 'forecast', 'qtr', 'quarter'],
  actual_date: ['actual', 'ga actual', 'released', 'completed', 'ship date'],
  jira: ['jira', 'ticket', 'issue', 'key', 'ptr', 'gsp'],
  pm: ['pm', 'product manager', 'owner', 'dri'],
  notes: ['notes', 'comments', 'detail', 'summary', 'description'],
};

function extractJiraKeysFromHtmlFragment(html) {
  if (!html) return [];
  const keys = [];
  const seen = new Set();
  const re = /\b([A-Z][A-Z0-9_]*-\d+)\b/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const k = m[1].toUpperCase();
    if (seen.has(k)) continue;
    seen.add(k);
    keys.push(k);
  }
  return keys;
}

function normalizeHeaderText(s) {
  return String(s || '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function classifyHeader(h) {
  const n = normalizeHeaderText(h);
  if (!n) return null;
  for (const [field, synonyms] of Object.entries(HEADER_SYNONYMS)) {
    if (synonyms.some((syn) => n === syn || n.includes(syn) || syn.includes(n))) {
      return field;
    }
  }
  return null;
}

function normalizeStage(cell) {
  const s = normalizeHeaderText(cell);
  const MAP = {
    done: 'GA',
    closed: 'GA',
    released: 'GA',
    ga: 'GA',
    'generally available': 'GA',
    live: 'GA',
    production: 'GA',
    'in beta': 'Beta',
    beta: 'Beta',
    eap: 'EAP',
    'early access': 'EAP',
    preview: 'EAP',
    'in development': 'Dev',
    dev: 'Dev',
    development: 'Dev',
    'in progress': 'Dev',
    planned: 'Planned',
    planning: 'Planned',
    todo: 'Planned',
    backlog: 'Planned',
    blocked: 'Blocked',
    hold: 'Blocked',
    'n/a': 'N/A',
    na: 'N/A',
    'not applicable': 'N/A',
  };
  if (MAP[s]) return MAP[s];
  for (const [k, v] of Object.entries(MAP)) {
    if (s.includes(k)) return v;
  }
  return 'Dev';
}

export function normalizeConfluencePartner(raw) {
  const t = String(raw || '')
    .replace(/\u00a0/g, ' ')
    .trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  for (const p of KNOWN_PARTNERS_SORTED) {
    if (lower.includes(p.toLowerCase())) return p;
  }
  if (/^\s*att\s*$/i.test(t)) return 'AT&T O@H';
  if (/deutsche\s*telekom/i.test(t)) return 'Deutsche Telekom';
  return t.replace(/\s+/g, ' ').trim();
}

function parseProductCell(text, html) {
  const blob = `${text} ${html || ''}`;
  const lower = blob.toLowerCase();
  for (const prod of KNOWN_PRODUCTS_SORTED) {
    if (lower.includes(prod.toLowerCase())) return prod;
  }
  const trimmed = String(text || '')
    .replace(/\u00a0/g, ' ')
    .trim();
  if (trimmed.length > 0 && trimmed.length < 48) {
    const exact = KNOWN_PRODUCTS_SORTED.find((p) => p.toLowerCase() === trimmed.toLowerCase());
    if (exact) return exact;
  }
  return null;
}

function isoDateGuess(s) {
  const t = String(s || '').trim();
  const m = t.match(/(20\d{2})-(\d{2})-(\d{2})/);
  if (m) return m[0];
  const m2 = t.match(/(\d{1,2})\/(\d{1,2})\/(20\d{2})/);
  if (m2) {
    const mm = m2[1].padStart(2, '0');
    const dd = m2[2].padStart(2, '0');
    return `${m2[3]}-${mm}-${dd}`;
  }
  return null;
}

/**
 * @param {string} html
 * @param {{ pageLabel: string, pageId: string }} meta
 * @returns {object[]}
 */
export function parseConfluenceTables(html, { pageLabel, pageId }) {
  if (!html || !String(html).trim()) return [];

  const $ = cheerio.load(html);
  const out = [];

  $('table').each((_, table) => {
    const $table = $(table);
    const rows = $table.find('tr').toArray();
    if (rows.length < 2) return;

    const headerCells = $(rows[0]).find('th, td').toArray();
    const headerTexts = headerCells.map((el) => $(el).text());

    const colMap = {};
    let mapped = 0;
    headerTexts.forEach((ht, idx) => {
      const field = classifyHeader(ht);
      if (field && colMap[field] === undefined) {
        colMap[field] = idx;
        mapped++;
      }
    });

    const colCount = headerCells.length;
    if (mapped === 0 && colCount >= 3) {
      colMap.partner = 0;
      colMap.product = 1;
      colMap.stage = 2;
      if (colCount >= 4) colMap.target_date = 3;
      if (colCount >= 5) colMap.jira = 4;
    }

    for (let r = 1; r < rows.length; r++) {
      const cells = $(rows[r]).find('td, th').toArray();
      if (cells.length < 2) continue;

      const getText = (field) => {
        const idx = colMap[field];
        if (idx === undefined || idx >= cells.length) return '';
        return $(cells[idx]).text().replace(/\u00a0/g, ' ').trim();
      };
      const getHtml = (field) => {
        const idx = colMap[field];
        if (idx === undefined || idx >= cells.length) return '';
        return $(cells[idx]).html() || '';
      };

      let partnerRaw = getText('partner');
      let productRaw = getText('product');
      const stageRaw = getText('stage');
      const jiraHtml = getHtml('jira');
      const jiraText = getText('jira');
      const rowHtml = $(rows[r]).html() || '';

      if (!partnerRaw && productRaw) {
        const prodGuess = parseProductCell(productRaw, getHtml('product'));
        if (!prodGuess) {
          partnerRaw = productRaw;
          productRaw = '';
        }
      }

      if (!productRaw) {
        for (const field of ['notes', 'target_date', 'stage']) {
          const blob = getText(field) + getHtml(field);
          const prod = parseProductCell(blob, blob);
          if (prod) {
            productRaw = prod;
            break;
          }
        }
      }

      const partner =
        normalizeConfluencePartner(partnerRaw) ||
        normalizeConfluencePartner($(cells[0]).text());

      const product =
        parseProductCell(productRaw, getHtml('product')) ||
        parseProductCell(`${partnerRaw} ${productRaw}`, '') ||
        parseProductCell(rowHtml, rowHtml);

      if (!partner || !product) continue;

      const jiraKeys = extractJiraKeysFromHtmlFragment(`${jiraHtml}${jiraText}${rowHtml}`);
      const jira_number = jiraKeys[0] || null;

      const target_date = isoDateGuess(getText('target_date')) || isoDateGuess(getText('notes'));
      const actual_date = isoDateGuess(getText('actual_date'));

      const noteBits = [`Confluence: ${pageLabel} (page ${pageId})`, getText('notes') && getText('notes').slice(0, 500)].filter(
        Boolean
      );

      out.push({
        partner,
        product,
        product_area: productAreaForProduct(product),
        stage: stageRaw ? normalizeStage(stageRaw) : 'Dev',
        target_date,
        actual_date,
        jira_number,
        pm: getText('pm') || null,
        se_lead: null,
        csm: null,
        notes: noteBits.join('\n'),
        blocked: 0,
        red_account: 0,
        missing_pm: 0,
        days_overdue: null,
        days_in_eap: null,
        arr_at_risk: null,
        source: 'confluence',
      });
    }
  });

  return out;
}
