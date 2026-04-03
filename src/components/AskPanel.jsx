/**
 * AskPanel.jsx — Natural Language Query Interface
 * Calls POST /api/query → tier-routed result (Tier 1–4)
 */
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, AlertTriangle, User, Bot, RotateCcw, ExternalLink } from 'lucide-react';
import { api } from '../api.js';
import { buildJiraLinks, jiraTextForLinkParsing, resolveMondayUrl } from '../utils/toolLinks.js';
import { mondayCardTitle, mondayDescription, glipSummaryLine } from '../utils/releaseDisplay.js';
import JiraMondayLinks from './JiraMondayLinks.jsx';
import GlipNotifyButton from './GlipNotifyButton.jsx';
import StatusBadge from './StatusBadge.jsx';

const SUGGESTIONS = [
  "What is MCM's Nova IVA status?",
  'Which GSP Jira projects are not in Monday?',
  'How many RCX projects does PMO manage with a schedule?',
  'Top 5 AT&T projects',
  'Show launch dates for all projects by row',
  'Is Telus live on RCX?',
];

const SEV_COLORS = {
  Critical: 'bg-red-100 text-red-800 border-red-200',
  High:     'bg-amber-100 text-amber-800 border-amber-200',
};

// ── Result renderers ──────────────────────────────────────────────────────────

function Tier1Result({ result }) {
  if (result.intent === 'direct_lookup' || result.intent === 'product_status') {
    const r = result.record;
    if (!r) {
      return (
        <p className="text-slate-600 text-sm bg-amber-50/80 ring-1 ring-amber-100 rounded-xl px-4 py-3">
          {result.message || 'Not on record — no matching row in cache. Try the Exceptions tab for data gaps.'}
        </p>
      );
    }
    const jiraLinks = buildJiraLinks(jiraTextForLinkParsing(r));
    const mondayUrl = resolveMondayUrl(r);
    const showRawJira = !jiraLinks.length && (r.jira_number || r.jira);
    const pmo = r.pmo_status || r.stage;
    const headline = mondayCardTitle(r);
    const notes = mondayDescription(r);
    return (
      <div className="rounded-2xl ring-1 ring-slate-200/60 bg-white overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-100">
          <div>
            <p className="font-bold text-slate-900">{headline}</p>
            {result.confidence && (
              <p className="text-[10px] text-slate-400 mt-1">Confidence: {result.confidence} (cache)</p>
            )}
          </div>
          <StatusBadge status={pmo} />
        </div>
        {notes ? (
          <p className="px-4 py-2 text-sm text-slate-600 border-b border-slate-100 whitespace-pre-wrap">{notes}</p>
        ) : null}
        <div className="grid grid-cols-2 gap-3 p-4 text-sm">
          {r.product_readiness_date && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Product Readiness</p>
              <p className="font-mono font-medium">{r.product_readiness_date}</p>
            </div>
          )}
          {r.gsp_launch_date && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">GSP Launch</p>
              <p className="font-mono font-medium">{r.gsp_launch_date}</p>
            </div>
          )}
          {!r.product_readiness_date && !r.gsp_launch_date && (
            <div className="col-span-2 text-xs text-slate-500">Milestone dates: not scheduled (on record)</div>
          )}
          {r.target_date && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Target Date</p>
              <p className="font-mono font-medium">{r.target_date}</p>
            </div>
          )}
          {r.actual_date && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Actual Date</p>
              <p className="font-mono font-medium">{r.actual_date}</p>
            </div>
          )}
          {r.pm && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">PM</p>
              <p className="font-medium">{r.pm}</p>
            </div>
          )}
          {r.se_lead && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">SE Lead</p>
              <p className="font-medium">{r.se_lead}</p>
            </div>
          )}
          {r.jira_status && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Jira Status</p>
              <div><StatusBadge status={r.jira_status} className="normal-case tracking-normal" /></div>
            </div>
          )}
          {r.market_type && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Market Type</p>
              <p className="font-medium">{r.market_type}</p>
            </div>
          )}
          {r.product_track && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Product Track</p>
              <p className="font-medium">{r.product_track}</p>
            </div>
          )}
          {r.schedule_url && /^https?:\/\//i.test(r.schedule_url) && (
            <div className="col-span-2">
              <p className="text-xs text-slate-400 mb-0.5">Schedule</p>
              <a
                href={r.schedule_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-bud-teal hover:underline"
              >
                Open linked schedule
                <ExternalLink size={13} strokeWidth={2} />
              </a>
            </div>
          )}
          {(jiraLinks.length > 0 || mondayUrl || showRawJira) && (
            <div className="col-span-2">
              <p className="text-xs text-slate-400 mb-0.5">Jira / Monday</p>
              <div className="flex flex-wrap items-center gap-2">
                <JiraMondayLinks jiraLinks={jiraLinks} mondayUrl={mondayUrl} />
                {showRawJira && (
                  <span className="font-medium font-mono text-slate-600 text-sm">{r.jira_number || r.jira}</span>
                )}
              </div>
            </div>
          )}
          {r.project_title && (
            <div className="col-span-2">
              <p className="text-xs text-slate-400 mb-0.5">Jira Title</p>
              <p className="text-sm text-slate-700">{r.project_title}</p>
            </div>
          )}
          {r.impact_summary && (
            <div className="col-span-2">
              <p className="text-xs text-slate-400 mb-0.5">Impact Summary</p>
              <p className="text-sm text-slate-700">{r.impact_summary}</p>
            </div>
          )}
        </div>
        <div className="px-4 pb-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
          <GlipNotifyButton
            variant="ask"
            context={{
              question: result.query,
              answer_summary: glipSummaryLine(r),
              partner: r.partner,
              project_title: headline,
              pmo_status: r.pmo_status,
              jira_number: r.jira_number,
              priority_number: r.priority_number,
            }}
          />
        </div>
      </div>
    );
  }

  // partner_summary
  const rows = result.rows || [];
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{result.matchedPartner} — All Products</p>
      <div className="rounded-2xl ring-1 ring-slate-200/60 bg-white overflow-hidden shadow-sm divide-y divide-slate-100">
        {rows.filter(r => r.stage !== 'N/A').map((r, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50">
            <span className="font-medium text-slate-800">{r.product}</span>
            <StatusBadge status={r.pmo_status || r.stage} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Tier2Result({ result }) {
  const rows = (result.rows || []).filter(r => r.stage !== 'N/A');
  const label = result.matchedProduct
    ? `${result.matchedProduct}${result.matchedStage ? ` · ${result.matchedStage}` : ''}`
    : result.matchedStage || result.intent || 'All Active';
  const msgMultiline = result.message && /\n/.test(result.message);
  return (
    <div className="space-y-2">
      {result.message && (
        <p className={`text-sm text-slate-600 dark:text-slate-300 ${msgMultiline ? 'whitespace-pre-wrap font-sans' : ''}`}>
          {result.message}
        </p>
      )}
      {result.confidence && (
        <p className="text-[10px] text-slate-400">Confidence: {result.confidence} · postgres cache</p>
      )}
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{rows.length} results — {label}</p>
      <div className="rounded-2xl ring-1 ring-slate-200/60 bg-white overflow-hidden shadow-sm divide-y divide-slate-100 max-h-80 overflow-y-auto">
        {rows.map((r, i) => (
          <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-4 py-2.5 text-sm hover:bg-slate-50">
            <div className="min-w-0">
              <span className="font-medium text-slate-800">{mondayCardTitle(r)}</span>
              {result.intent === 'top_partner_priority' || result.intent === 'top_priority' ? (
                <span className="ml-2 text-xs text-slate-500 tabular-nums">Priority #{r.priority_number ?? '—'}</span>
              ) : null}
              {!result.matchedProduct && result.intent !== 'top_partner_priority' && (
                <span className="ml-2 text-xs text-slate-400">{r.product}</span>
              )}
              {(result.intent === 'top_partner_priority' || result.intent === 'top_priority') && mondayDescription(r) ? (
                <p className="text-xs text-slate-500 mt-2 whitespace-pre-wrap">{mondayDescription(r)}</p>
              ) : null}
            </div>
            {result.intent === 'date_list' ? (
              <span className="font-mono text-xs text-slate-500 truncate max-w-[40%]">
                {r.gsp_launch_date || r.product_readiness_date || 'not scheduled'}
              </span>
            ) : null}
            <StatusBadge status={r.pmo_status || r.stage} className="shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Tier3Result({ result }) {
  const rows = result.rows || [];
  const label =
    {
      jira_not_monday: 'Jira not in Monday',
    }[result.intent] || 'Rows';
  return (
    <div className="space-y-2">
      {result.message && <p className="text-sm text-slate-600">{result.message}</p>}
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{rows.length} {label}</p>
      <div className="rounded-2xl ring-1 ring-slate-200/60 bg-white overflow-hidden shadow-sm divide-y divide-slate-100 max-h-80 overflow-y-auto">
        {rows.map((r, i) => {
          const jl = buildJiraLinks(jiraTextForLinkParsing(r));
          const mUrl = resolveMondayUrl(r);
          const rawJira = !jl.length && (r.jira_number || r.jira);
          return (
            <div key={i} className="px-4 py-3 hover:bg-slate-50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-slate-800 text-sm">{r.partner} · {r.product}</span>
                <StatusBadge status={r.pmo_status || r.stage} />
              </div>
              {r.is_unmanaged_jira ? (
                <p className="text-xs text-amber-700">Not in Monday — unmanaged Jira</p>
              ) : null}
              {(jl.length > 0 || mUrl || rawJira) && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <JiraMondayLinks jiraLinks={jl} mondayUrl={mUrl} compact />
                  {rawJira && <span className="text-xs font-mono text-slate-600">{r.jira_number || r.jira}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tier4Result({ result }) {
  const items = result.items || [];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-500" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Escalation Brief — {items.length} action items</p>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {items.map((item, i) => (
          <div key={i} className={`rounded-lg border px-4 py-3 ${SEV_COLORS[item.sev] || 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm">{item.partner} · {item.product}</span>
              <span className="text-xs font-bold opacity-75">{item.sev}</span>
            </div>
            <p className="text-xs opacity-80 mb-1">{item.reason}</p>
            <p className="text-xs font-semibold">→ {item.action}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultCard({ result }) {
  const tierLabel = ['Unknown', 'Lookup', 'List / scan', 'Gaps / unmanaged', 'Escalation Brief'][result.tier] || '';
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${['bg-slate-300','bg-blue-400','bg-purple-400','bg-amber-400','bg-red-400'][result.tier]}`} />
          {tierLabel}
          {result.askType != null && <span className="text-slate-300">· Q{result.askType}</span>}
        </span>
        {result.sources && (
          <span>Sources: {result.sources.join(' · ')}</span>
        )}
      </div>

      {result.tier === 0 && (
        <p className="text-slate-600 text-sm bg-slate-50 rounded-lg px-4 py-3">{result.message}</p>
      )}
      {result.tier === 1 && <Tier1Result result={result} />}
      {result.tier === 2 && <Tier2Result result={result} />}
      {result.tier === 3 && <Tier3Result result={result} />}
      {result.tier === 4 && <Tier4Result result={result} />}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Message({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end gap-2 items-start">
        <div className="max-w-[75%] bg-bud-navy text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm shadow-lg shadow-slate-950/15">
          {msg.text}
        </div>
        <div className="w-7 h-7 rounded-full bg-bud-orange flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
          <User size={13} className="text-white" />
        </div>
      </div>
    );
  }
  if (msg.role === 'error') {
    return (
      <div className="flex gap-2 items-start">
        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot size={13} className="text-slate-500" />
        </div>
        <div className="max-w-[85%] bg-red-50 border border-red-200 text-red-700 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm">
          {msg.text}
        </div>
      </div>
    );
  }
  // assistant
  return (
    <div className="flex gap-2 items-start">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-bud-teal to-bud-purple flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
        <Bot size={13} className="text-bud-navy" />
      </div>
      <div className="max-w-[90%] space-y-1">
        <ResultCard result={msg.result} />
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function AskPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef(null);
  const inputRef                = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSubmit(text) {
    const q = (text || input).trim();
    if (!q || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);

    try {
      const result = await api.query(q);
      setMessages(prev => [...prev, { role: 'assistant', result }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'error', text: `API error: ${e.message}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-transparent text-base">

      <div className="flex items-center justify-between px-5 sm:px-6 py-5 flex-shrink-0 border-b border-slate-100/80 dark:border-slate-800/80">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-bud-teal">
            PMO Bud AI Copilot
          </p>
          <h2 className="mt-1 text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
            <Sparkles size={18} className="text-bud-teal shrink-0" strokeWidth={2} />
            Ask
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold max-w-xl">
            Natural language queries across the tracker, tuned for partner status checks, portfolio scans, and leadership briefings.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors ring-1 ring-slate-200/80 dark:ring-slate-700"
          >
            <RotateCcw size={14} strokeWidth={2} />
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 space-y-4 scrollbar-thin">

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-8 py-10">
            <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white px-6 py-8 text-center shadow-soft max-w-2xl">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-bud-teal to-bud-purple" />
              <div className="w-16 h-16 rounded-[22px] bg-bud-navy ring-1 ring-slate-200 flex items-center justify-center mx-auto mb-5 shadow-sm">
                <Sparkles size={24} className="text-bud-teal" strokeWidth={1.6} />
              </div>
              <p className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
                Ask anything about releases
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-lg mx-auto">
                Pull a fast answer on partner status, blockers, schedule coverage, or unmanaged Jira items without leaving the tracker.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSubmit(s)}
                  className="text-left px-4 py-3 rounded-2xl bg-white ring-1 ring-slate-200 hover:ring-bud-teal/40 hover:bg-cyan-50/30 transition-all text-xs text-slate-700 leading-snug font-medium shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}

        {loading && (
          <div className="flex gap-2 items-center">
            <div className="w-8 h-8 rounded-full bg-slate-100 ring-1 ring-slate-200/80 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-slate-500" strokeWidth={1.75} />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 ring-1 ring-slate-200/70 shadow-sm">
              <Loader2 size={15} className="text-slate-400 animate-spin" strokeWidth={1.75} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 px-5 sm:px-6 py-4 bg-white border-t border-slate-200">
        <div className="flex gap-2 items-end bg-slate-50 rounded-[22px] px-4 py-2.5 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-bud-teal/35 focus-within:bg-white transition-all">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about a partner, product, exceptions, or say 'brief me on escalations'…"
            className="flex-1 bg-transparent text-sm sm:text-base text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none outline-none leading-5 py-1 max-h-28 overflow-y-auto"
            style={{ minHeight: '1.25rem' }}
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-10 h-10 rounded-2xl bg-bud-navy hover:bg-bud-purple disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white flex items-center justify-center transition-colors mb-0.5 shadow-sm shadow-slate-950/20"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
