/**
 * ChangelogFeed — Recent status changes from /api/changelog
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Clock, ArrowRight, Search, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { STAGES } from '../data/stages.js';

const STAGE_ORDER = { GA: 1, Beta: 2, EAP: 3, Dev: 4, Planned: 5, Blocked: 6, 'N/A': 7 };

function normalizeItem(c) {
  return {
    date: c.change_date || c.date || '',
    partner: c.partner,
    product: c.product,
    from: c.from_stage ?? c.from ?? 'N/A',
    to: c.to_stage ?? c.to ?? 'N/A',
    author: c.author || '',
    note: c.note || '',
  };
}

function ChangeDirection({ from, to }) {
  const fromOrder = STAGE_ORDER[from] || 9;
  const toOrder = STAGE_ORDER[to] || 9;

  if (to === 'Blocked') {
    return <TrendingDown size={14} className="text-red-500 flex-shrink-0" />;
  } else if (toOrder < fromOrder) {
    return <TrendingUp size={14} className="text-emerald-500 flex-shrink-0" />;
  } else if (toOrder > fromOrder) {
    return <TrendingDown size={14} className="text-amber-500 flex-shrink-0" />;
  }
  return <Minus size={14} className="text-slate-400 flex-shrink-0" />;
}

function StageBadge({ stage }) {
  const s = STAGES[stage] || STAGES['N/A'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${s.badge}`}>
      {s.label}
    </span>
  );
}

function ChangeItem({ item, onSelectPartner }) {
  const isBlock = item.to === 'Blocked';
  const isUpgrade = (STAGE_ORDER[item.to] || 9) < (STAGE_ORDER[item.from] || 9);

  return (
    <div
      className={`rounded-2xl p-4 space-y-2 shadow-sm ring-1 ring-slate-200/50 ${
        isBlock
          ? 'bg-white border-l-[3px] border-l-red-400'
          : isUpgrade
            ? 'bg-white border-l-[3px] border-l-emerald-400'
            : 'bg-white border-l-[3px] border-l-slate-200'
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1">
        <button
          type="button"
          className="font-semibold text-sm text-slate-900 hover:text-rc-blue text-left w-fit transition-colors"
          onClick={() => onSelectPartner(item.partner)}
        >
          {item.partner}
        </button>
        <span className="hidden sm:inline text-slate-300">·</span>
        <span className="text-xs font-medium text-slate-600">{item.product}</span>
        <div className="flex items-center gap-1.5 flex-wrap sm:ml-1">
          <StageBadge stage={item.from} />
          <ChangeDirection from={item.from} to={item.to} />
          <StageBadge stage={item.to} />
        </div>
        <span className="sm:ml-auto text-[11px] text-slate-400 flex items-center gap-1">
          <Clock size={11} strokeWidth={1.75} />
          {item.date}
        </span>
      </div>

      <p className="text-[13px] text-slate-600 leading-relaxed">{item.note}</p>

      <div className="text-[11px] text-slate-400">
        <span className="text-slate-500">Updated by</span>{' '}
        <span className="font-medium text-slate-700">{item.author}</span>
      </div>
    </div>
  );
}

export default function ChangelogFeed({ onSelectPartner }) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch('/api/changelog?limit=200')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data)) throw new Error('Invalid changelog response');
        setItems(data.map(normalizeItem));
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Failed to load changelog');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.partner.toLowerCase().includes(q) ||
        item.product.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q) ||
        item.note.toLowerCase().includes(q)
    );
  }, [items, search]);

  const upgrades = useMemo(
    () =>
      items.filter((c) => (STAGE_ORDER[c.to] || 9) < (STAGE_ORDER[c.from] || 9) && c.to !== 'Blocked'),
    [items]
  );
  const downgrades = useMemo(
    () =>
      items.filter((c) => c.to === 'Blocked' || (STAGE_ORDER[c.to] || 9) > (STAGE_ORDER[c.from] || 9)),
    [items]
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-5 py-4 flex-shrink-0 border-b border-slate-100/80">
        <h2 className="text-base font-semibold text-slate-900 flex flex-wrap items-center gap-2 tracking-tight">
          <Clock size={17} className="text-sky-500 shrink-0" strokeWidth={1.75} />
          Changelog
          <span className="ml-auto text-xs font-medium text-slate-400 tabular-nums">
            {loading ? '…' : `${items.length} entries`}
          </span>
        </h2>
        <div className="flex flex-wrap gap-3 mt-2 text-[11px]">
          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
            <TrendingUp size={12} strokeWidth={1.75} /> {upgrades.length} promotions
          </span>
          <span className="inline-flex items-center gap-1 text-red-600 font-medium">
            <TrendingDown size={12} strokeWidth={1.75} /> {downgrades.length} blocks / regressions
          </span>
        </div>
      </div>

      <div className="px-4 sm:px-5 py-3 flex-shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search partner, product, author…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={loading || !!error}
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-white ring-1 ring-slate-200/80 focus:outline-none focus:ring-2 focus:ring-sky-200/80 placeholder:text-slate-400 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-4 sm:px-5 py-2 space-y-3">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <Loader2 size={28} className="animate-spin opacity-50" />
            <p className="text-sm">Loading changelog…</p>
          </div>
        )}
        {error && !loading && (
          <div className="text-center py-12 text-slate-500 text-sm px-4">
            Could not load changelog: {error}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Search size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {items.length === 0 ? 'No changelog entries yet.' : `No changes match "${search}"`}
            </p>
          </div>
        )}
        {!loading &&
          !error &&
          filtered.map((item, idx) => (
            <ChangeItem key={idx} item={item} onSelectPartner={onSelectPartner} />
          ))}
      </div>

      <div className="px-4 sm:px-5 py-2.5 bg-white/60 backdrop-blur-sm border-t border-slate-100 text-[11px] text-slate-400 flex-shrink-0">
        {!loading && !error && (
          <span>
            {filtered.length} of {items.length} shown
          </span>
        )}
      </div>
    </div>
  );
}
