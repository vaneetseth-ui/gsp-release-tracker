/**
 * AskPanel.jsx — Natural Language Query Interface
 * Calls POST /api/query → tier-routed result (Tier 1–4)
 */
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, AlertTriangle, User, Bot, RotateCcw } from 'lucide-react';
import { api } from '../api.js';

const SUGGESTIONS = [
  "What is MCM's Nova IVA status?",
  'Show me all blocked releases',
  'Which partners are in EAP for RingCX?',
  'Brief me on what needs escalation',
  'List all red accounts',
  'Who has no PM assigned?',
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
  if (result.intent === 'direct_lookup') {
    const r = result.record;
    if (!r) return <p className="text-slate-500 text-sm">No record found for that partner/product combination.</p>;
    return (
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div>
            <p className="font-semibold text-slate-900">{r.partner}</p>
            <p className="text-xs text-slate-500">{r.product}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STAGE_COLORS[r.stage] || STAGE_COLORS['N/A']}`}>
            {r.stage}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 text-sm">
          {r.target_date  && <div><p className="text-xs text-slate-400 mb-0.5">Target Date</p><p className="font-medium">{r.target_date}</p></div>}
          {r.actual_date  && <div><p className="text-xs text-slate-400 mb-0.5">Actual Date</p><p className="font-medium">{r.actual_date}</p></div>}
          {r.pm           && <div><p className="text-xs text-slate-400 mb-0.5">PM</p><p className="font-medium">{r.pm}</p></div>}
          {r.se_lead      && <div><p className="text-xs text-slate-400 mb-0.5">SE Lead</p><p className="font-medium">{r.se_lead}</p></div>}
          {r.jira_number  && <div><p className="text-xs text-slate-400 mb-0.5">Jira</p><p className="font-medium font-mono"><a href={`https://jira.ringcentral.com/browse/${r.jira_number}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline hover:text-blue-900">{r.jira_number}</a></p></div>}
          {r.days_in_eap  && <div><p className="text-xs text-slate-400 mb-0.5">Days in EAP</p><p className={`font-medium ${r.days_in_eap > 90 ? 'text-red-600 font-bold' : ''}`}>{r.days_in_eap}d</p></div>}
          {r.reporter     && <div><p className="text-xs text-slate-400 mb-0.5">Reporter</p><p className="font-medium">{r.reporter}</p></div>}
          {r.se_region    && <div><p className="text-xs text-slate-400 mb-0.5">SE Region</p><p className="font-medium">{r.se_region}</p></div>}
          {r.issue_type   && <div><p className="text-xs text-slate-400 mb-0.5">Type</p><p className="font-medium">{r.issue_type}</p></div>}
          {r.priority     && <div><p className="text-xs text-slate-400 mb-0.5">Priority</p><p className="font-medium">{r.priority}</p></div>}
          {r.requested_quarter && <div><p className="text-xs text-slate-400 mb-0.5">Requested Q</p><p className="font-medium">{r.requested_quarter}</p></div>}
          {r.target_quarter    && <div><p className="text-xs text-slate-400 mb-0.5">Target Q</p><p className="font-medium">{r.target_quarter}</p></div>}
        </div>
        {r.source_url && (
          <div className="px-4 pb-2">
            <a href={r.source_url} target="_blank" rel="noopener noreferrer"
               className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold ${r.source === 'jira' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-violet-50 text-violet-700 border-violet-200'} hover:opacity-80`}>
              Open in {r.source === 'jira' ? 'Jira' : 'Monday'} <span className="text-[10px]">↗</span>
            </a>
          </div>
        )}
        {r.notes && <div className="px-4 pb-4 text-xs text-slate-500 italic border-t border-slate-100 pt-3">{r.notes}</div>}
        {(r.blocked || r.red_account || r.missing_pm) && (
          <div className="px-4 pb-4 flex gap-2 flex-wrap">
            {r.blocked      && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">⛔ Blocked</span>}
            {r.red_account  && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">🔴 Red Account</span>}
            {r.missing_pm   && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">⚠ No PM</span>}
          </div>
        )}
      </div>
    );
  }

  // partner_summary
  const rows = result.rows || [];
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{result.matchedPartner} — All Products</p>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
        {rows.filter(r => r.stage !== 'N/A').map((r, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50">
            <span className="font-medium text-slate-800">{r.product}</span>
            <div className="flex items-center gap-2">
              {r.blocked     && <span className="text-xs text-red-500">⛔</span>}
              {r.red_account && <span className="text-xs text-red-500">🔴</span>}
              {r.missing_pm  && <span className="text-xs text-amber-500">⚠</span>}
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STAGE_COLORS[r.stage] || STAGE_COLORS['N/A']}`}>{r.stage}</span>
            </div>
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
    : result.matchedStage || 'All Active';
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{rows.length} results — {label}</p>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50">
            <div>
              <span className="font-medium text-slate-800">{r.partner}</span>
              {!result.matchedProduct && <span className="ml-2 text-xs text-slate-400">{r.product}</span>}
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STAGE_COLORS[r.stage] || STAGE_COLORS['N/A']}`}>{r.stage}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tier3Result({ result }) {
  const rows = result.rows || [];
  const label = { blocked:'Blocked', red:'Red Accounts', nopm:'No PM Assigned', eap:'Overdue EAP (>90d)', exceptions:'All Exceptions' }[result.intent] || 'Exceptions';
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{rows.length} {label}</p>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto">
        {rows.map((r, i) => (
          <div key={i} className="px-4 py-3 hover:bg-slate-50">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-slate-800 text-sm">{r.partner} · {r.product}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STAGE_COLORS[r.stage] || STAGE_COLORS['N/A']}`}>{r.stage}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {r.blocked     && <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">Blocked {r.days_overdue}d</span>}
              {r.red_account && <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">Red Acct ${((r.arr_at_risk||0)/1000).toFixed(0)}K ARR</span>}
              {r.missing_pm  && <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">No PM</span>}
              {r.days_in_eap > 90 && <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">{r.days_in_eap}d in EAP</span>}
            </div>
          </div>
        ))}
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
  const tierLabel = ['Unknown', 'Direct Lookup', 'Cross-Scan', 'Exception Filter', 'Escalation Brief'][result.tier] || '';
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${['bg-slate-300','bg-blue-400','bg-purple-400','bg-amber-400','bg-red-400'][result.tier]}`} />
          Tier {result.tier} · {tierLabel}
        </span>
        {result.sources && (
          <span>Sources: {result.sources.join(' · ')}</span>
        )}
      </div>

      {result.tier === 0 && (
        <p className="text-slate-500 text-sm bg-slate-50 rounded-lg px-4 py-3">{result.message}</p>
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
    <div className="flex flex-col h-full bg-slate-50">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles size={14} className="text-rc-orange" />
            Ask the Tracker
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">4-tier query engine · Partners · Products · Exceptions · Escalations</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RotateCcw size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-rc-navy flex items-center justify-center mx-auto mb-3">
                <Sparkles size={20} className="text-rc-orange" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Ask anything about your GSP releases</p>
              <p className="text-xs text-slate-400 mt-1">Partner status · Exceptions · Escalation briefs · Cross-portfolio scans</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(s)}
                  className="text-left px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-rc-orange hover:bg-orange-50 transition-colors text-xs text-slate-600 hover:text-slate-900"
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
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
              <Bot size={13} className="text-white" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-2.5">
              <Loader2 size={14} className="text-slate-400 animate-spin" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-slate-200">
        <div className="flex gap-2 items-end bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 focus-within:border-rc-orange focus-within:ring-1 focus-within:ring-rc-orange/30 transition-all">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about a partner, product, exceptions, or say 'brief me on escalations'…"
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 resize-none outline-none leading-5 py-1 max-h-28 overflow-y-auto"
            style={{ minHeight: '1.25rem' }}
            disabled={loading}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-8 h-8 rounded-xl bg-rc-navy hover:bg-rc-orange disabled:bg-slate-200 disabled:text-slate-400 text-white flex items-center justify-center transition-colors mb-0.5"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>
        <p className="text-xs text-slate-400 text-center mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
