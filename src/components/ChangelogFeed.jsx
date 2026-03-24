/**
 * ChangelogFeed — Recent status changes feed
 * Shows who changed what, when, and why
 */
import React, { useState } from 'react';
import { Clock, ArrowRight, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { STAGES } from '../data/constants.js';
import { useData } from '../data/DataContext.jsx';

const STAGE_ORDER = { GA: 1, Beta: 2, EAP: 3, Dev: 4, Planned: 5, Blocked: 6, 'N/A': 7 };

function ChangeDirection({ from, to }) {
  const fromOrder = STAGE_ORDER[from] || 9;
  const toOrder   = STAGE_ORDER[to] || 9;

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
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${s.badge}`}>
      {s.label}
    </span>
  );
}

function ChangeItem({ item, onSelectPartner }) {
  const isBlock   = item.to === 'Blocked';
  const isUpgrade = (STAGE_ORDER[item.to] || 9) < (STAGE_ORDER[item.from] || 9);

  return (
    <div className={`rounded-lg border p-3 space-y-1.5 ${isBlock ? 'border-red-200 bg-red-50' : isUpgrade ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          className="font-semibold text-sm text-blue-700 hover:underline"
          onClick={() => onSelectPartner(item.partner)}
        >
          {item.partner}
        </button>
        <span className="text-xs text-slate-500">·</span>
        <span className="text-xs font-medium text-slate-700">{item.product}</span>
        <div className="flex items-center gap-1.5 ml-1">
          <StageBadge stage={item.from} />
          <ChangeDirection from={item.from} to={item.to} />
          <StageBadge stage={item.to} />
        </div>
        <span className="ml-auto text-xs text-slate-400 flex items-center gap-1">
          <Clock size={11} />
          {item.date}
        </span>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">{item.note}</p>

      <div className="text-xs text-slate-400">
        Updated by <span className="font-medium text-slate-600">{item.author}</span>
      </div>
    </div>
  );
}

export default function ChangelogFeed({ onSelectPartner }) {
  const [search, setSearch] = useState('');
  const { changelog } = useData();

  const filtered = changelog.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (item.partner || '').toLowerCase().includes(q) ||
      (item.product || '').toLowerCase().includes(q) ||
      (item.author || '').toLowerCase().includes(q) ||
      (item.note || '').toLowerCase().includes(q)
    );
  });

  const upgrades = changelog.filter(c => (STAGE_ORDER[c.to] || 9) < (STAGE_ORDER[c.from] || 9) && c.to !== 'Blocked');
  const downgrades = changelog.filter(c => c.to === 'Blocked' || (STAGE_ORDER[c.to] || 9) > (STAGE_ORDER[c.from] || 9));

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Clock size={16} className="text-blue-500" />
          Changelog
          <span className="ml-auto text-xs font-normal text-slate-500">{changelog.length} changes</span>
        </h2>
        {changelog.length > 0 && (
          <div className="flex gap-3 mt-1 text-xs">
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <TrendingUp size={11} /> {upgrades.length} promotions
            </span>
            <span className="flex items-center gap-1 text-red-600 font-semibold">
              <TrendingDown size={11} /> {downgrades.length} blocks/regressions
            </span>
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex-shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search partner, product, author…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder-slate-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Search size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{changelog.length === 0 ? 'No changelog data yet — changes will appear after the next sync cycle' : `No changes match "${search}"`}</p>
          </div>
        ) : (
          filtered.map((item, idx) => (
            <ChangeItem
              key={idx}
              item={item}
              onSelectPartner={onSelectPartner}
            />
          ))
        )}
      </div>

      <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 text-xs text-slate-400 flex-shrink-0">
        Showing {filtered.length} of {changelog.length} changes · Live Jira + Monday.com sync
      </div>
    </div>
  );
}
