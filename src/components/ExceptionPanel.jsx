/**
 * ExceptionPanel — v1.2 data-quality gaps + unmanaged Jira.
 */
import React, { useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, ClipboardList, ExternalLink, Filter } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import ProductAreaBadge from './ProductAreaBadge.jsx';
import JiraMondayLinks from './JiraMondayLinks.jsx';
import StatusBadge from './StatusBadge.jsx';
import { cn } from '../lib/utils.js';

const SEV_STYLE = {
  Critical: {
    card: 'border-l-red-500 bg-red-50/30',
    chip: 'bg-red-50 text-red-700 ring-red-200',
  },
  High: {
    card: 'border-l-orange-500 bg-orange-50/25',
    chip: 'bg-orange-50 text-orange-700 ring-orange-200',
  },
  Medium: {
    card: 'border-l-violet-500 bg-violet-50/20',
    chip: 'bg-violet-50 text-violet-700 ring-violet-200',
  },
  Low: {
    card: 'border-l-cyan-500 bg-cyan-50/20',
    chip: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  },
};

function topSeverity(gaps) {
  if (gaps.some((g) => g.severity === 'Critical')) return 'Critical';
  if (gaps.some((g) => g.severity === 'High')) return 'High';
  if (gaps.some((g) => g.severity === 'Medium')) return 'Medium';
  return 'Low';
}

function severityButtonClass(active, severity) {
  if (active) return 'bg-bud-navy text-white shadow-sm';
  if (severity === 'all') return 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50';
  return cn('bg-white ring-1 hover:bg-white', SEV_STYLE[severity].chip);
}

function GapCard({ entry, onSelectPartner }) {
  const { release, gaps } = entry;
  const topSev = topSeverity(gaps);
  const tone = SEV_STYLE[topSev];
  const jiraLinks = release.jiraLinks || [];
  const showRawJira = !jiraLinks.length && release.jira;

  return (
    <div className={cn('space-y-3 rounded-2xl border border-slate-200 border-l-[4px] bg-white p-4 shadow-sm', tone.card)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            className="text-left text-base font-bold text-slate-900 transition-colors hover:text-bud-teal"
            onClick={() => onSelectPartner(release.partner)}
          >
            {release.partner}
          </button>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{release.product}</span>
            <ProductAreaBadge area={release.productArea || release.product_area} />
            <StatusBadge status={release.pmo_status || release.stage} />
            {release.isUnmanagedJira ? <StatusBadge status="Warning">Unmanaged Jira</StatusBadge> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={topSev} />
          <JiraMondayLinks jiraLinks={jiraLinks} mondayUrl={release.mondayUrl} compact />
          {release.mondayUrl ? (
            <a
              href={release.mondayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Monday
              <ExternalLink size={11} strokeWidth={2} />
            </a>
          ) : null}
          {showRawJira ? <span className="font-mono text-xs text-slate-600">{release.jira}</span> : null}
        </div>
      </div>

      <ul className="space-y-2 text-sm">
        {gaps.map((gap) => (
          <li key={gap.field} className="flex items-start gap-2">
            <StatusBadge status={gap.severity} className="shrink-0" />
            <span className="text-slate-700">
              <span className="font-semibold">{gap.label}:</span> {gap.message}
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
    return gapEntries.filter((entry) => entry.gaps.some((gap) => gap.severity === severityFilter));
  }, [gapEntries, severityFilter]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const entry of filtered) {
      const key = entry.release.partner;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(entry);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-200 px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-bud-orange">Quality Control</p>
        <h2 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-display font-bold tracking-tight text-slate-900">
          <ClipboardList size={20} className="shrink-0 text-bud-orange" strokeWidth={2.25} />
          Data gaps
          <span className="ml-auto text-sm font-bold text-slate-500 tabular-nums">
            {gapEntries.length} row{gapEntries.length === 1 ? '' : 's'}
          </span>
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
          Missing data, ownership gaps, and Jira items with no Monday parent. Grouped by partner so teams can work through fixes faster.
        </p>
        {!loading && dataStatus !== 'live' && (
          <p className="mt-2 max-w-2xl rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900 ring-2 ring-amber-300/80">
            {dataStatus === 'error'
              ? `Could not load releases: ${loadError || 'unknown error'}.`
              : 'No release records loaded — gaps appear after data is synced.'}
          </p>
        )}
      </div>

      <div className="scrollbar-thin flex gap-1.5 overflow-x-auto px-4 py-3 sm:px-5">
        {['all', 'Critical', 'High', 'Medium', 'Low'].map((severity) => (
          <button
            key={severity}
            type="button"
            className={cn('flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-all whitespace-nowrap', severityButtonClass(severityFilter === severity, severity))}
            onClick={() => setSeverityFilter(severity)}
          >
            {severity === 'all' ? <Filter size={14} strokeWidth={2} /> : null}
            {severity === 'all' ? 'All' : severity}
          </button>
        ))}
      </div>

      <div className="scrollbar-thin flex-1 min-h-0 space-y-4 overflow-y-auto px-4 py-2 sm:px-5">
        {grouped.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <AlertCircle size={36} className="mx-auto mb-2 opacity-40" strokeWidth={1.75} />
            <p className="text-base font-medium">No gaps in this filter</p>
          </div>
        ) : (
          grouped.map(([partner, entries]) => {
            const criticalCount = entries.filter((entry) => topSeverity(entry.gaps) === 'Critical').length;
            return (
              <details key={partner} open className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-soft">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-950">{partner}</p>
                    <p className="mt-1 text-sm text-slate-500">{entries.length} issue{entries.length === 1 ? '' : 's'} in this partner group</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {criticalCount > 0 ? (
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200">
                        {criticalCount} critical
                      </span>
                    ) : null}
                    <ChevronDown size={16} className="text-slate-400" />
                  </div>
                </summary>
                <div className="space-y-3 p-4">
                  {entries.map((entry) => (
                    <GapCard
                      key={entry.release.release_key || `${entry.release.partner}-${entry.release.product}-${entry.release.jira_number}`}
                      entry={entry}
                      onSelectPartner={onSelectPartner}
                    />
                  ))}
                </div>
              </details>
            );
          })
        )}
      </div>
    </div>
  );
}
