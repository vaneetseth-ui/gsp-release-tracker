/**
 * AskPanel.jsx — Natural Language Query Interface
 * Calls POST /api/query → tier-routed result (Tier 1–4)
 */
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, AlertTriangle, User, Bot, RotateCcw } from 'lucide-react';
import { api } from '../api.js';
import { buildJiraLinks, jiraTextForLinkParsing, resolveMondayUrl } from '../utils/toolLinks.js';
import JiraMondayLinks from './JiraMondayLinks.jsx';
import GlipNotifyButton from './GlipNotifyButton.jsx';

const SUGGESTIONS = [
  "What is MCM's Nova IVA status?",
  'Which GSP Jira projects are not in Monday?',
  'How many RingCX projects are PMO-managed with schedules?',
  'Top 5 critical AT&T projects?',
  'Show launch dates for all projects by row',
  'Is Talos live on RCX?',
];

const STAGE_COLORS = {
  GA:      'bg-emerald-100 text-emerald-800',
  Beta:    'bg-blue-100 text-blue-800',
  EAP:     'bg-amber-100 text-amber-800',
  Dev:     'bg-purple-100 text-purple-800',
  Planned: 'bg-slate-100 text-slate-600',
  Blocked: 'bg-red-100 text-red-800',
  'N/A':   'bg-slate-50 text-slate-400',
};

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
    const showJiraStatus = r.jira_status && r.jira_status !== pmo;
    return (
      <div className="rounded-2xl ring-1 ring-slate-200/60 bg-white overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-100">
          <div>
            <p className="font-bold text-slate-900">{r.project_title || r.notes || r.product}</p>
            <p className="text-xs text-slate-500">{r.partner} · {r.product}</p>
            {result.confidence && (
              <p className="text-[10px] text-slate-400 mt-1">Confidence: {result.confidence} (cache)</p>
            )}
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STAGE_COLORS[r.stage] || STAGE_COLORS['N/A']}`}>
            {pmo}
          </span>
        </div>
        {r.impact_summary && (
          <p className="px-4 py-2 text-sm text-slate-600 border-b border-slate-100">{r.impact_summary}</p>
        )}
        <div className="grid grid-cols-2 gap-3 p-4 text-sm">
          {r.product_readiness_date && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Product Readiness</p>
              <p className="font-medium">{r.product_readiness_date}</p>
            </div>
          )}
          {r.gsp_launch_date && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">GSP Launch</p>
              <p className="font-medium">{r.gsp_launch_date}</p>
            </div>
          )}
          {!r.product_readiness_date && !r.gsp_launch_date && (
            <div className="col-span-2 text-xs text-slate-500">Milestone dates: not scheduled (on record)</div>
          )}
          {r.target_date && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Target Date</p>
              <p className="font-medium">{r.target_date}</p>
            </div>
          )}
          {r.actual_date && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Actual Date</p>
              <p className="font-medium">{r.actual_date}</p>
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
          {showJiraStatus && (
            <div className="col-span-2">
              <p className="text-xs text-slate-400 mb-0.5">Jira status</p>
              <p className="font-medium">{r.jira_status}</p>
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
        </div>
        <div className="px-4 pb-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
          <GlipNotifyButton
            variant="ask"
            context={{
              question: result.query,
              answer_summary: r.project_title || r.notes,
              partner: r.partner,
              project_title: r.project_title,
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
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STAGE_COLORS[r.stage] || STAGE_COLORS['N/A']}`}>
              {r.pmo_status || r.stage}
            </span>
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
  return (
    <div className="space-y-2">
      {result.message && <p className="text-sm text-slate-600">{result.message}</p>}
      {result.confidence && (
        <p className="text-[10px] text-slate-400">Confidence: {result.confidence} · postgres cache</p>
      )}
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{rows.length} results — {label}</p>
      <div className="rounded-2xl ring-1 ring-slate-200/60 bg-white overflow-hidden shadow-sm divide-y divide-slate-100 max-h-80 overflow-y-auto">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 gap-2">
            <div className="min-w-0">
              <span className="font-medium text-slate-800">{r.partner}</span>
              {!result.matchedProduct && <span className="ml-2 text-xs text-slate-400">{r.product}</span>}
            </div>
            {result.intent === 'date_list' && (
              <span className="text-xs text-slate-500 truncate max-w-[40%]">
                {r.gsp_launch_date || r.product_readiness_date || 'not scheduled'}
              </span>
            )}
            <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${STAGE_COLORS[r.stage] || STAGE_COLORS['N/A']}`}>
              {r.pmo_status || r.stage}
            </span>
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
      blocked: 'Blocked',
      red: 'Red Accounts',
      nopm: 'No PM Assigned',
      eap: 'Overdue EAP (>90d)',
      exceptions: 'All Exceptions',
      jira_not_monday: 'Jira not in Monday',
    }[result.intent] || 'Exceptions';
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
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STAGE_COLORS[r.stage] || STAGE_COLORS['N/A']}`}>
                  {r.pmo_status || r.stage}
                </span>
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
        <div className="max-w-[75%] bg-rc-navy text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
          {msg.text}
        </div>
        <div className="w-7 h-7 rounded-full bg-rc-orange flex items-center justify-center flex-shrink-0 mt-0.5">
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
      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot size={13} className="text-white" />
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

      <div className="flex items-center justify-between px-5 sm:px-6 py-4 flex-shrink-0 border-b border-slate-100/80 dark:border-slate-700/80">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
            <Sparkles size={18} className="text-rc-orange shrink-0" strokeWidth={2} />
            Ask
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold">
            Natural language queries across the tracker
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors ring-1 ring-slate-200/80 dark:ring-slate-600"
          >
            <RotateCcw size={14} strokeWidth={2} />
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 space-y-4 scrollbar-thin">

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-8 py-10">
            <div className="text-center max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 ring-1 ring-slate-200/60 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Sparkles size={22} className="text-rc-blue" strokeWidth={1.5} />
              </div>
              <p className="text-base font-semibold text-slate-800 tracking-tight">Ask anything about releases</p>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Partner status, exceptions, escalations, or portfolio scans.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSubmit(s)}
                  className="text-left px-4 py-3 rounded-2xl bg-white/90 ring-1 ring-slate-200/70 hover:ring-sky-200 hover:bg-sky-50/40 transition-all text-xs text-slate-600 leading-snug font-medium"
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
      <div className="flex-shrink-0 px-5 sm:px-6 py-4 bg-white/80 dark:bg-slate-900/85 backdrop-blur-sm border-t border-slate-100 dark:border-slate-700">
        <div className="flex gap-2 items-end bg-slate-50/80 dark:bg-slate-800/80 rounded-2xl px-4 py-2.5 ring-1 ring-slate-200/70 dark:ring-slate-600 focus-within:ring-2 focus-within:ring-sky-200/80 dark:focus-within:ring-sky-600 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all">
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
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-rc-blue dark:hover:bg-rc-blue dark:hover:text-white disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white flex items-center justify-center transition-colors mb-0.5 shadow-sm"
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
