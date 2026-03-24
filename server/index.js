/**
 * server/index.js — GSP Release Tracker API Server
 * Serves both the React build (static) and REST API endpoints
 *
 * Endpoints:
 *   GET  /api/health            — health check + last sync time
 *   GET  /api/summary           — portfolio stats
 *   GET  /api/releases          — all releases (?partner=X &product=Y &stage=Z)
 *   GET  /api/exceptions        — all exceptions (?type=blocked|red|nopm|eap)
 *   GET  /api/changelog         — recent changes (?limit=N &partner=X)
 *   POST /api/query             — natural language query → tier-routed result
 *   POST /api/ingest            — push releases from local Jira sync (optional Bearer INGEST_TOKEN)
 */
import express   from 'express';
import cors      from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as db from './db.js';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const PORT       = process.env.PORT || 3001;
const app        = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Serve React build in production ──────────────────────────────────────────
const DIST = join(__dirname, '..', 'dist');
app.use(express.static(DIST));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  try {
    const summary = db.getSummary();
    const lastSync = db.getLastSync();
    res.json({
      status: 'ok',
      dataSource: db.getDataSource(),
      lastSync,
      last_sync: lastSync,
      syncedAt: lastSync,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (e) {
    res.status(503).json({ status: 'error', message: e.message });
  }
});

app.post('/api/ingest', async (req, res) => {
  const token = process.env.INGEST_TOKEN;
  if (token) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${token}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  try {
    const result = await db.applyIngest(req.body || {});
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Summary ───────────────────────────────────────────────────────────────────
app.get('/api/summary', (_req, res) => {
  res.json(db.getSummary());
});

// ── Partners list ─────────────────────────────────────────────────────────────
app.get('/api/partners', (_req, res) => {
  res.json(db.getPartners());
});

// ── Releases — filtered ───────────────────────────────────────────────────────
app.get('/api/releases', (req, res) => {
  const { partner, product, stage } = req.query;
  try {
    let data;
    if (partner && product) data = [db.getRelease(partner, product)].filter(Boolean);
    else if (partner)       data = db.getReleasesByPartner(partner);
    else if (product)       data = db.getReleasesByProduct(product);
    else if (stage)         data = db.getReleasesByStage(stage);
    else                    data = db.getAllReleases();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Exceptions ────────────────────────────────────────────────────────────────
app.get('/api/exceptions', (req, res) => {
  const { type } = req.query;
  try {
    let data;
    switch (type) {
      case 'blocked': data = db.getBlocked();      break;
      case 'red':     data = db.getRedAccounts();  break;
      case 'nopm':    data = db.getMissingPM();    break;
      case 'eap':     data = db.getOverdueEAP();   break;
      default:        data = db.getExceptions();
    }
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Changelog ─────────────────────────────────────────────────────────────────
app.get('/api/changelog', (req, res) => {
  const limit   = parseInt(req.query.limit)   || 50;
  const partner = req.query.partner           || null;
  try {
    const data = partner ? db.getChangelogByPartner(partner) : db.getChangelog(limit);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Natural language query (mirrors frontend queryEngine logic) ───────────────
app.post('/api/query', (req, res) => {
  const { q: rawInput } = req.body;
  if (!rawInput?.trim()) return res.status(400).json({ error: 'Query required' });

  try {
    const q = rawInput.toLowerCase().trim();

    // Resolve partner / product / stage mentions
    const partners  = db.getPartners();
    const PRODUCTS  = ['Nova IVA', 'RingCX', 'AIR', 'MVP', 'ACO'];
    const STAGES    = ['GA','Beta','EAP','Dev','Planned','Blocked'];

    let matchedPartner = partners.find(p => q.includes(p.toLowerCase()));
    if (!matchedPartner) {
      matchedPartner = partners.find(p =>
        p.toLowerCase().split(/[\s&@']+/).filter(w=>w.length>2).some(w => q.includes(w))
      );
    }

    const PALIAS = { 'nova iva':'Nova IVA', 'nova':'Nova IVA', 'iva':'Nova IVA',
                     'ringcx':'RingCX', 'ring cx':'RingCX', 'mvp':'MVP', 'aco':'ACO', 'air':'AIR' };
    let matchedProduct = PRODUCTS.find(p => q.includes(p.toLowerCase()));
    if (!matchedProduct) {
      for (const [alias, prod] of Object.entries(PALIAS)) {
        if (q.includes(alias)) { matchedProduct = prod; break; }
      }
    }

    const matchedStage = STAGES.find(s => q.includes(s.toLowerCase()));

    const T4 = ['what should i','priorit','escalat','what needs','brief me','vp brief','leadership'].some(k=>q.includes(k));
    const T3 = ['block','exception','red account','no pm','missing pm','unassign','overdue','behind','at risk','stuck','eap too long'].some(k=>q.includes(k));
    const T2 = ['which partner','all partner','list partner','show all','how many','who is in','partners on','partners for'].some(k=>q.includes(k));

    let result;

    if (T4) {
      const items = [
        ...db.getBlocked().map(r=>({ sev:'Critical', partner:r.partner, product:r.product, reason:`Blocked ${r.days_overdue}d`, action:'Escalate to Eng VP — SLA breached' })),
        ...db.getRedAccounts().map(r=>({ sev:'Critical', partner:r.partner, product:r.product, reason:`Red Acct $${((r.arr_at_risk||0)/1000).toFixed(0)}K ARR`, action:'CSM + Sales VP alignment call' })),
        ...db.getOverdueEAP().map(r=>({ sev:'High', partner:r.partner, product:r.product, reason:`${r.days_in_eap}d in EAP (>90d)`, action:'PM to drive Beta readiness review' })),
        ...db.getMissingPM().map(r=>({ sev:'High', partner:r.partner, product:r.product, reason:'No PM assigned', action:'PMO assign owner within 48h' })),
      ];
      result = { tier:4, intent:'escalation_brief', items, sources:['Jira','PostgreSQL','SFDC','Monday'] };
    } else if (T3) {
      if (q.includes('block'))                                               result = { tier:3, intent:'blocked',    rows: db.getBlocked(),      sources:['Jira','Monday'] };
      else if (q.includes('red account') || q.includes('arr'))              result = { tier:3, intent:'red',        rows: db.getRedAccounts(),  sources:['SFDC','PostgreSQL'] };
      else if (q.includes('no pm') || q.includes('missing pm'))             result = { tier:3, intent:'nopm',       rows: db.getMissingPM(),    sources:['Monday','Jira'] };
      else if (q.includes('overdue') || q.includes('behind') || q.includes('stuck')) result = { tier:3, intent:'eap', rows: db.getOverdueEAP(), sources:['Jira'] };
      else                                                                   result = { tier:3, intent:'exceptions', rows: db.getExceptions(),   sources:['All'] };
    } else if (T2 || (matchedProduct && !matchedPartner) || (matchedStage && !matchedPartner)) {
      let rows;
      if      (matchedProduct && matchedStage) rows = db.getReleasesByProduct(matchedProduct).filter(r=>r.stage===matchedStage);
      else if (matchedProduct)                 rows = db.getReleasesByProduct(matchedProduct);
      else if (matchedStage)                   rows = db.getReleasesByStage(matchedStage);
      else                                     rows = db.getAllReleases().filter(r=>r.stage!=='N/A');
      result = { tier:2, intent:'cross_scan', rows, matchedProduct, matchedStage, sources:['Jira','Monday','Confluence'] };
    } else if (matchedPartner && matchedProduct) {
      const record = db.getRelease(matchedPartner, matchedProduct);
      result = { tier:1, intent:'direct_lookup', record, matchedPartner, matchedProduct, sources:['Jira','Monday'] };
    } else if (matchedPartner) {
      const rows = db.getReleasesByPartner(matchedPartner);
      result = { tier:1, intent:'partner_summary', rows, matchedPartner, sources:['Jira','Monday','Confluence'] };
    } else {
      result = { tier:0, intent:'unknown', message: "Couldn't parse query — try a partner name, product, or keyword like 'blocked' or 'escalate'." };
    }

    res.json({ query: rawInput, ...result, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── SPA fallback (serve index.html for any non-API route) ────────────────────
app.get('*', (_req, res) => {
  res.sendFile(join(DIST, 'index.html'));
});

async function start() {
  await db.initDataStore();
  app.listen(PORT, () => {
    console.log(`\n🚀  GSP Release Tracker API`);
    console.log(`   http://localhost:${PORT}/api/health`);
    console.log(`   http://localhost:${PORT}          (React dashboard)\n`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
