/**
 * ExceptionPanel — v1.2 data-quality gaps + unmanaged Jira (not old exception flags).
 */
import React, { useMemo, useState } from 'react';
import { AlertCircle, ClipboardList, Filter } from 'lucide-react';
import { STAGES } from '../data/stages.js';
import { useData } from '../context/DataContext.jsx';
import ProductAreaBadge from './ProductAreaBadge.jsx';
import JiraMondayLinks from './JiraMondayLinks.jsx';

const SEV_STYLE = {
  Critical: 'border-l-red-500 bg-red-50/30 dark:bg-red-950/20',
  High: 'border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/15',
  Medium: 'border-l-sky-500 bg-sky-50/20 dark:bg-sky-950/15',
  Low: 'border-l-slate-300 bg-slate-50/40 dark:bg-slate-800/30',
};

function GapCard({ entry, onSelectPartner }) {
  const { release, gaps } = entry;
  const jl = release.jiraLinks || [];
  const showRawJira = !jl.length && release.jira;
  const topSev = gaps.some((g) => g.severity === 'Critical')
    ? 'Critical'
    : gaps.some((g) => g.severity === 'High')
      ? 'High'
      : gaps.some((g) => g.severity === 'Medium')
        ? 'Medium'
        : 'Low';

  return (
    <div
      className={`rounded-2xl bg-white dark:bg-slate-900/90 p-4 space-y-3 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-600/50 border-l-[4px] ${SEV_STYLE[topSev]}`}
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
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-800 dark:text-slate-200">{release.product}</span>
            <ProductAreaBadge area={release.productArea || release.product_area} />
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${STAGES[release.stage]?.badge || STAGES.Planned.badge}`}
            >
              {release.pmo_status || release.stage}
            </span>
            {release.isUnmanagedJira && (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                Unmanaged Jira
              </span>
            )}
          </div>
        </div>
        <JiraMondayLinks jiraLinks={jl} mondayUrl={release.mondayUrl} compact />
        {showRawJira && <span className="font-mono text-xs text-slate-600">{release.jira}</span>}
      </div>

      <ul className="space-y-1.5 text-sm">
        {gaps.map((g) => (
          <li key={g.field} className="flex gap-2 items-start">
            <span
              className={`shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                g.severity === 'Critical'
                  ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                  : g.severity === 'High'
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {g.severity}
            </span>
            <span className="text-slate-700 dark:text-slate-200">
              <span className="font-semibold">{g.label}:</span> {g.message}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ExceptionPanel({ onSelectPartner }) {
  const [severityFilter, setSeverityFilter] = useState('all');
  const { getExceptions, releases, loading, dataStatus, loadError } = useData();

  const gapEntries = useMemo(() => getExceptions(), [getExceptions, releases]);

  const filtered = useMemo(() => {
    if (severityFilter === 'all') return gapEntries;
    return gapEntries.filter((e) => e.gaps.some((g) => g.severity === severityFilter));
  }, [gapEntries, severityFilter]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-5 py-5 flex-shrink-0 border-b border-slate-100/80 dark:border-slate-800/80">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-bud-orange">Quality Control</p>
        <h2 className="mt-1 text-xl font-display font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2 tracking-tight">
          <ClipboardList size={20} className="text-bud-orange shrink-0" strokeWidth={2.25} />
          Data gaps
          <span className="ml-auto text-sm font-bold text-slate-500 dark:text-slate-400 tabular-nums">
            {gapEntries.length} row{gapEntries.length === 1 ? '' : 's'}
          </span>
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
          What is missing or incomplete, and who should fix it. Includes Jira GSP items with no Monday item.
        </p>
        {!loading && dataStatus !== 'live' && (
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 bg-amber-100 dark:bg-amber-950/50 ring-2 ring-amber-300/80 dark:ring-amber-700/50 rounded-lg px-3 py-2 mt-2 max-w-2xl">
            {dataStatus === 'error'
              ? `Could not load releases: ${loadError || 'unknown error'}.`
              : 'No release records loaded — gaps appear after data is synced.'}
          </p>
        )}
      </div>

      <div className="flex gap-1.5 px-4 sm:px-5 py-3 overflow-x-auto flex-shrink-0 scrollbar-thin">
        {['all', 'Critical', 'High', 'Medium', 'Low'].map((sev) => (
          <button
            key={sev}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
              severityFilter === sev
                ? 'bg-bud-navy text-white shadow-sm'
                : 'bg-white/90 dark:bg-slate-900 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200/80 dark:ring-slate-700'
            }`}
            onClick={() => setSeverityFilter(sev)}
          >
            {sev === 'all' && <Filter size={14} strokeWidth={2} />}
            {sev === 'all' ? 'All' : sev}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-4 sm:px-5 py-2 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <AlertCircle size={36} className="mx-auto mb-2 opacity-40" strokeWidth={1.75} />
            <p className="text-base font-medium">No gaps in this filter</p>
          </div>
        ) : (
          filtered.map((entry) => (
            <GapCard
              key={entry.release.release_key || `${entry.release.partner}-${entry.release.product}-${entry.release.jira_number}`}
              entry={entry}
              onSelectPartner={onSelectPartner}
            />
          ))
        )}
      </div>
    </div>
  );
}
