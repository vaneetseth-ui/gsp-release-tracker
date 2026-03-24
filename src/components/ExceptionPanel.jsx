/**
 * ExceptionPanel — Tier 3 exception detection view
 * Shows all partners with: blocked items, overdue EAP, red accounts, missing PMs
 */
import React, { useState, useMemo } from 'react';
import { AlertCircle, DollarSign, UserX, AlertTriangle, Clock, Filter } from 'lucide-react';
import { STAGES } from '../data/stages.js';
import { useData } from '../context/DataContext.jsx';
import ProductAreaBadge from './ProductAreaBadge.jsx';
import JiraMondayLinks from './JiraMondayLinks.jsx';

const EXCEPTION_TYPES = {
  blocked: {
    label: 'Blocked',
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    accent: 'border-l-red-500 dark:border-l-red-400',
    badge:
      'bg-red-100 text-red-900 font-bold ring-2 ring-red-300/90 dark:bg-red-950/70 dark:text-red-100 dark:ring-red-600/50',
  },
  redAccount: {
    label: 'Red Account',
    icon: DollarSign,
    color: 'text-red-600 dark:text-red-400',
    accent: 'border-l-red-500 dark:border-l-red-400',
    badge:
      'bg-red-100 text-red-900 font-bold ring-2 ring-red-300/90 dark:bg-red-950/70 dark:text-red-100 dark:ring-red-600/50',
  },
  missingPM: {
    label: 'No PM',
    icon: UserX,
    color: 'text-amber-800 dark:text-amber-300',
    accent: 'border-l-amber-500 dark:border-l-amber-400',
    badge:
      'bg-amber-100 text-amber-950 font-bold ring-2 ring-amber-300/90 dark:bg-amber-950/60 dark:text-amber-100 dark:ring-amber-600/45',
  },
  overdueEAP: {
    label: 'Overdue EAP',
    icon: AlertTriangle,
    color: 'text-amber-800 dark:text-amber-300',
    accent: 'border-l-amber-500 dark:border-l-amber-400',
    badge:
      'bg-amber-100 text-amber-950 font-bold ring-2 ring-amber-300/90 dark:bg-amber-950/60 dark:text-amber-100 dark:ring-amber-600/45',
  },
};

function ExceptionCard({ release, types, onSelectPartner }) {
  const accent = EXCEPTION_TYPES[types[0]]?.accent || 'border-l-slate-200';
  const jl = release.jiraLinks || [];
  const hasToolLinks = jl.length > 0 || !!release.mondayUrl;
  const showRawJira = !jl.length && release.jira;
  return (
    <div
      className={`rounded-2xl bg-white dark:bg-slate-900/90 p-4 space-y-3 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-600/50 border-l-[4px] ${accent}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            className="font-bold text-base text-slate-900 dark:text-white hover:text-rc-blue dark:hover:text-sky-400 text-left transition-colors"
            onClick={() => onSelectPartner(release.partner)}
          >
            {release.partner}
          </button>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 flex flex-wrap items-center gap-1.5 leading-relaxed">
            <span className="font-semibold text-slate-800 dark:text-slate-200">{release.product}</span>
            <ProductAreaBadge area={release.productArea || release.product_area} />
            {release.source === 'confluence' && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200/90 dark:bg-indigo-950/60 dark:text-indigo-100 dark:ring-indigo-700/50">
                Confluence
              </span>
            )}
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${STAGES[release.stage]?.badge}`}
            >
              {release.stage}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {types.map((t) => {
            const cfg = EXCEPTION_TYPES[t];
            const Icon = cfg.icon;
            return (
              <span
                key={t}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs ${cfg.badge}`}
              >
                <Icon size={13} strokeWidth={2.5} /> {cfg.label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
        {(hasToolLinks || showRawJira) && (
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <JiraMondayLinks jiraLinks={jl} mondayUrl={release.mondayUrl} compact />
            {showRawJira && <span className="font-mono text-slate-600">{release.jira}</span>}
          </span>
        )}
        {release.daysOverdue > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-200 font-bold">
            <Clock size={13} strokeWidth={2.5} /> {release.daysOverdue} days overdue
          </span>
        )}
        {release.daysInEAP > 90 && !release.blocked && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-100 font-bold">
            <Clock size={13} strokeWidth={2.5} /> {release.daysInEAP} days in EAP
          </span>
        )}
        {release.arrAtRisk > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-200 font-bold">
            <DollarSign size={13} strokeWidth={2.5} /> ${(release.arrAtRisk / 1000).toFixed(0)}K ARR at risk
          </span>
        )}
        {release.target_date && (
          <span className="text-slate-500">Target: {release.target_date}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
        {release.pm && (
          <span>
            PM: <span className="font-semibold text-slate-800 dark:text-slate-100">{release.pm}</span>
          </span>
        )}
        {!release.pm && (
          <span className="text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1">
            <UserX size={14} strokeWidth={2.5} /> PM unassigned
          </span>
        )}
        {release.se_lead && (
          <span>
            SE: <span className="font-semibold text-slate-800 dark:text-slate-100">{release.se_lead}</span>
          </span>
        )}
        {release.csm && (
          <span>
            CSM: <span className="font-semibold text-slate-800 dark:text-slate-100">{release.csm}</span>
          </span>
        )}
      </div>

      {release.notes && (
        <p className="text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700 pt-3 leading-relaxed">
          {release.notes}
        </p>
      )}
    </div>
  );
}

export default function ExceptionPanel({ onSelectPartner }) {
  const [filter, setFilter] = useState('all');
  const { getExceptions, loading, dataStatus, loadError } = useData();

  const exceptions = useMemo(
    () =>
      getExceptions().reduce((acc, r) => {
        const types = [];
        if (r.blocked) types.push('blocked');
        if (r.redAccount) types.push('redAccount');
        if (r.missingPM) types.push('missingPM');
        if (r.daysInEAP > 90 && !r.blocked) types.push('overdueEAP');
        if (types.length > 0) acc.push({ release: r, types });
        return acc;
      }, []),
    [getExceptions]
  );

  const filtered = filter === 'all'
    ? exceptions
    : exceptions.filter(e => e.types.includes(filter));

  // Counts per type
  const counts = exceptions.reduce((acc, e) => {
    e.types.forEach(t => { acc[t] = (acc[t] || 0) + 1; });
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-5 py-4 flex-shrink-0 border-b border-slate-100/80 dark:border-slate-700/80">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2 tracking-tight">
          <AlertCircle size={20} className="text-red-500 dark:text-red-400 shrink-0" strokeWidth={2.25} />
          Exceptions
          <span className="ml-auto text-sm font-bold text-slate-500 dark:text-slate-400 tabular-nums">
            {exceptions.length} open
          </span>
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
          Items that need attention across the portfolio.
        </p>
        {!loading && dataStatus !== 'live' && (
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 bg-amber-100 dark:bg-amber-950/50 ring-2 ring-amber-300/80 dark:ring-amber-700/50 rounded-lg px-3 py-2 mt-2 max-w-2xl">
            {dataStatus === 'error'
              ? `Could not load releases: ${loadError || 'unknown error'}.`
              : 'No release records loaded — exceptions appear after data is synced.'}
          </p>
        )}
      </div>

      <div className="flex gap-1.5 px-4 sm:px-5 py-3 overflow-x-auto flex-shrink-0 scrollbar-thin">
        <button
          type="button"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
            filter === 'all'
              ? 'bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200/80 dark:ring-slate-600 hover:ring-slate-300'
          }`}
          onClick={() => setFilter('all')}
        >
          <Filter size={14} strokeWidth={2} /> All ({exceptions.length})
        </button>
        {Object.entries(EXCEPTION_TYPES).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = counts[key] || 0;
          if (count === 0) return null;
          return (
            <button
              key={key}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                filter === key
                  ? 'bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white shadow-sm ring-2 ring-slate-400/30'
                  : `bg-white dark:bg-slate-800 ${cfg.color} ring-1 ring-slate-200/80 dark:ring-slate-600 hover:ring-slate-300`
              }`}
              onClick={() => setFilter(key)}
            >
              <Icon size={12} strokeWidth={1.75} /> {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-4 sm:px-5 py-2 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <AlertCircle size={36} className="mx-auto mb-2 opacity-40" strokeWidth={1.75} />
            <p className="text-base font-medium">No exceptions in this category</p>
          </div>
        ) : (
          filtered.map(({ release, types }) => (
            <ExceptionCard
              key={`${release.partner}-${release.product}`}
              release={release}
              types={types}
              onSelectPartner={onSelectPartner}
            />
          ))
        )}
      </div>

      <div className="px-4 sm:px-5 py-2.5 bg-white/60 dark:bg-slate-900/70 backdrop-blur-sm border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
        <div className="flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400">
          {Object.entries(EXCEPTION_TYPES).map(([key, cfg]) => {
            const count = counts[key] || 0;
            if (count === 0) return null;
            const Icon = cfg.icon;
            return (
              <span key={key} className={`flex items-center gap-1 font-bold ${cfg.color}`}>
                <Icon size={14} strokeWidth={2.5} /> {count} {cfg.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
