import React, { useMemo, useState } from 'react';
import { ArrowUpDown, ExternalLink, Search } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import JiraMondayLinks from './JiraMondayLinks.jsx';
import ProductAreaBadge from './ProductAreaBadge.jsx';
import StatusBadge from './StatusBadge.jsx';
import { cn } from '../lib/utils.js';
import { mondayDescriptionPreview } from '../utils/releaseDisplay.js';

const VIEWS = [
  { id: 'all', label: 'All active', tone: 'default' },
  { id: 'scheduled', label: 'Scheduled', tone: 'success' },
  { id: 'missing-dates', label: 'No dates', tone: 'default' },
  { id: 'attention', label: 'Needs attention', tone: 'critical' },
  { id: 'stale', label: 'Stale notes', tone: 'warning' },
];

const SORTS = {
  partner: { label: 'Partner' },
  product: { label: 'Product' },
  status: { label: 'Status' },
  launch: { label: 'Launch' },
  readiness: { label: 'Readiness' },
  owners: { label: 'Owners' },
  track: { label: 'Track' },
};

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function scheduleDate(release) {
  return release.gsp_launch_date || release.product_readiness_date || release.target_date || null;
}

function formatTimelineRange(start, end) {
  if (!start && !end) return '—';
  if (start && end) return `${formatDate(start)} - ${formatDate(end)}`;
  return formatDate(end || start);
}

function MilestonePill({ label, date, status, dri }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200/70">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        {status ? <StatusBadge status={status} className="text-[10px] normal-case tracking-normal" /> : null}
      </div>
      <p className={cn('mt-1 font-mono text-xs font-semibold', date ? 'text-slate-900' : 'soft-dash')}>{formatDate(date)}</p>
      {dri ? <p className="mt-1 text-xs text-slate-500">{dri}</p> : null}
    </div>
  );
}

function filterChipClass(active, tone) {
  if (active) return 'bg-bud-navy text-white shadow-sm';
  if (tone === 'critical') return 'bg-white text-red-700 ring-1 ring-red-200 hover:bg-red-50';
  if (tone === 'warning') return 'bg-white text-amber-700 ring-1 ring-amber-200 hover:bg-amber-50';
  if (tone === 'success') return 'bg-white text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50';
  return 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50';
}

function initials(name) {
  if (!name) return '—';
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function avatarTone(name) {
  const tones = [
    'bg-cyan-100 text-cyan-700',
    'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
  ];
  let hash = 0;
  for (const ch of String(name || '')) hash += ch.charCodeAt(0);
  return tones[hash % tones.length];
}

function OwnerChip({ name, fallback }) {
  if (!name) {
    return <span className="text-sm text-slate-400">{fallback}</span>;
  }

  return (
    <div className="flex max-w-[180px] items-center gap-2">
      <span className={cn('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold', avatarTone(name))}>
        {initials(name)}
      </span>
      <span className="truncate text-sm font-medium text-slate-900">{name}</span>
    </div>
  );
}

function matchesView(viewId, release, computeGapsForRelease) {
  const gaps = computeGapsForRelease(release);
  if (viewId === 'scheduled') return !!scheduleDate(release);
  if (viewId === 'missing-dates') return !scheduleDate(release);
  if (viewId === 'attention') {
    return gaps.some((gap) => gap.severity === 'Critical' || gap.severity === 'High') || release.commentStale;
  }
  if (viewId === 'stale') return release.commentStale;
  return true;
}

function sortValue(release, key) {
  if (key === 'partner') return release.partner || '';
  if (key === 'product') return release.product || '';
  if (key === 'status') return release.pmo_status || release.stage || '';
  if (key === 'launch') return release.gsp_launch_date || '9999-12-31';
  if (key === 'readiness') return release.product_readiness_date || '9999-12-31';
  if (key === 'owners') return `${release.pm || ''} ${release.se_lead || ''}`.trim();
  if (key === 'track') return release.product_track || '';
  return scheduleDate(release) || '9999-12-31';
}

function compareRelease(a, b, sortKey, sortDir) {
  const left = sortValue(a, sortKey);
  const right = sortValue(b, sortKey);
  const compare = String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
  if (compare !== 0) return sortDir === 'asc' ? compare : -compare;
  return `${a.partner}-${a.product}`.localeCompare(`${b.partner}-${b.product}`);
}

function SortHeader({ label, sortKey, activeSort, sortDir, onToggle }) {
  const active = activeSort === sortKey;
  return (
    <button
      type="button"
      onClick={() => onToggle(sortKey)}
      className={cn(
        'inline-flex items-center gap-1 font-semibold transition-colors',
        active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
      )}
    >
      {label}
      <ArrowUpDown size={13} strokeWidth={2} className={active ? 'text-bud-teal' : 'text-slate-400'} />
      {active ? <span className="text-[10px] uppercase tracking-[0.14em] text-bud-teal">{sortDir}</span> : null}
    </button>
  );
}

function MobileCard({ release, onSelectPartner }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => onSelectPartner(release.partner)}
            className="font-semibold text-slate-950 transition-colors hover:text-bud-teal"
          >
            {release.partner}
          </button>
          <p className="mt-1 text-sm font-medium text-slate-700">{release.product}</p>
          {release.tracker_project_title ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{release.tracker_project_title}</p>
          ) : null}
        </div>
        <StatusBadge status={release.pmo_status || release.stage} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ProductAreaBadge area={release.productArea || release.product_area} />
        {release.market_type ? (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{release.market_type}</span>
        ) : null}
        {release.product_track ? (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{release.product_track}</span>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <MilestonePill label="Launch" date={release.gsp_launch_date} status={release.gsp_launch_status} dri={release.gsp_launch_dri} />
        <MilestonePill label="Readiness" date={release.product_readiness_date} status={release.product_readiness_status} dri={release.product_readiness_dri} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">PM</p>
          <p className="mt-1 font-medium text-slate-900">{release.pm || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">SE Lead</p>
          <p className="mt-1 font-medium text-slate-900">{release.se_lead || '—'}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <JiraMondayLinks jiraLinks={release.jiraLinks || []} mondayUrl={release.mondayUrl} compact />
        {release.schedule_url && /^https?:\/\//i.test(release.schedule_url) ? (
          <a
            href={release.schedule_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-bud-teal hover:underline"
          >
            Schedule
            <ExternalLink size={11} strokeWidth={2} />
          </a>
        ) : null}
      </div>

      {mondayDescriptionPreview(release, 120) ? (
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{mondayDescriptionPreview(release, 120)}</p>
      ) : null}
    </div>
  );
}

export default function PortfolioView({ onSelectPartner }) {
  const [search, setSearch] = useState('');
  const [activeView, setActiveView] = useState('all');
  const [sortKey, setSortKey] = useState('launch');
  const [sortDir, setSortDir] = useState('asc');
  const { releases, computeGapsForRelease } = useData();

  const activeReleases = useMemo(
    () => releases.filter((release) => release.stage !== 'N/A' && !release.isUnmanagedJira),
    [releases]
  );

  const counts = useMemo(() => {
    const result = {};
    for (const view of VIEWS) {
      result[view.id] = activeReleases.filter((release) => matchesView(view.id, release, computeGapsForRelease)).length;
    }
    return result;
  }, [activeReleases, computeGapsForRelease]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activeReleases
      .filter((release) => matchesView(activeView, release, computeGapsForRelease))
      .filter((release) => {
        if (!query) return true;
        return [
          release.partner,
          release.product,
          release.pm,
          release.se_lead,
          release.market_type,
          release.product_track,
          release.jira_number,
          release.monday_comment,
          release.pmo_status,
          release.tracker_project_title,
          release.product_readiness_status,
          release.gsp_launch_status,
          release.product_readiness_dri,
          release.gsp_launch_dri,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => compareRelease(a, b, sortKey, sortDir));
  }, [activeReleases, activeView, computeGapsForRelease, search, sortDir, sortKey]);

  function handleSort(nextSortKey) {
    if (nextSortKey === sortKey) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(nextSortKey);
    setSortDir(nextSortKey === 'launch' || nextSortKey === 'readiness' ? 'asc' : 'asc');
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-200 px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-bud-teal">Portfolio View</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-display font-bold tracking-tight text-slate-950">Release Portfolio</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-sm font-semibold text-slate-700">
            {filtered.length} shown
          </span>
        </div>
        <p className="mt-1.5 max-w-3xl text-sm text-slate-500">
          A working portfolio table for partner releases, ownership, and schedule coverage.
        </p>
      </div>

      <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={16} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search partner, product, PM, SE lead, track, Jira…"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition-shadow focus:border-bud-teal focus:ring-4 focus:ring-cyan-100"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {VIEWS.map((view) => {
              const active = view.id === activeView;
              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setActiveView(view.id)}
                  className={cn('rounded-full px-3 py-2 text-sm font-semibold transition-all', filterChipClass(active, view.tone))}
                >
                  {view.label}
                  <span className={cn('ml-2 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold', active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700')}>
                    {counts[view.id] || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        {filtered.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
            No releases match this view and search combination.
          </div>
        ) : (
          <>
            <div className="grid gap-3 lg:hidden">
              {filtered.map((release) => (
                <MobileCard key={release.release_key || `${release.partner}-${release.product}`} release={release} onSelectPartner={onSelectPartner} />
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-soft lg:block">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--color-chrome)] text-white">
                    <tr>
                      {Object.entries(SORTS).map(([key, item]) => (
                        <th key={key} className="px-4 py-3 text-left">
                          <SortHeader label={item.label} sortKey={key} activeSort={sortKey} sortDir={sortDir} onToggle={handleSort} />
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left font-semibold text-white">Links</th>
                    </tr>
                  </thead>
                  <tbody className="surface-zebra">
                    {filtered.map((release) => (
                      <tr key={release.release_key || `${release.partner}-${release.product}`} className="border-t border-slate-100 align-top transition-colors">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => onSelectPartner(release.partner)}
                            className="font-semibold text-slate-950 transition-colors hover:text-bud-teal"
                          >
                            {release.partner}
                          </button>
                          {release.market_type ? <p className="mt-1 text-xs text-slate-500">{release.market_type}</p> : null}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{release.product}</p>
                          {release.tracker_project_title ? (
                            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">{release.tracker_project_title}</p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <ProductAreaBadge area={release.productArea || release.product_area} />
                          </div>
                          {mondayDescriptionPreview(release, 90) ? (
                            <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-500">
                              {mondayDescriptionPreview(release, 90)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={release.pmo_status || release.stage} />
                          {release.jira_status ? (
                            <div className="mt-2">
                              <StatusBadge status={release.jira_status} className="normal-case tracking-normal" />
                            </div>
                          ) : null}
                          {release.commentStale ? <p className="mt-2 text-xs font-semibold text-violet-700">Stale note</p> : null}
                        </td>
                        <td className="px-4 py-3">
                          <p className={cn('font-mono font-medium', release.gsp_launch_date ? 'text-slate-900' : 'soft-dash')}>{formatDate(release.gsp_launch_date)}</p>
                          {release.gsp_launch_status ? (
                            <div className="mt-2">
                              <StatusBadge status={release.gsp_launch_status} className="text-[10px] normal-case tracking-normal" />
                            </div>
                          ) : null}
                          {release.gsp_launch_dri ? <p className="mt-2 text-xs text-slate-500">{release.gsp_launch_dri}</p> : null}
                        </td>
                        <td className="px-4 py-3">
                          <p className={cn('font-mono font-medium', release.product_readiness_date ? 'text-slate-900' : 'soft-dash')}>{formatDate(release.product_readiness_date)}</p>
                          {release.product_readiness_status ? (
                            <div className="mt-2">
                              <StatusBadge status={release.product_readiness_status} className="text-[10px] normal-case tracking-normal" />
                            </div>
                          ) : null}
                          {release.product_readiness_dri ? <p className="mt-2 text-xs text-slate-500">{release.product_readiness_dri}</p> : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-2">
                            <OwnerChip name={release.pm} fallback="No PM" />
                            <OwnerChip name={release.se_lead} fallback="No SE lead" />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{release.product_track || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <JiraMondayLinks jiraLinks={release.jiraLinks || []} mondayUrl={release.mondayUrl} compact />
                          {release.jira_number && !release.jiraLinks?.length ? (
                            <p className="mt-2 font-mono text-xs text-slate-500">{release.jira_number}</p>
                          ) : null}
                          {release.schedule_url && /^https?:\/\//i.test(release.schedule_url) ? (
                            <a
                              href={release.schedule_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-bud-teal hover:underline"
                            >
                              Schedule
                              <ExternalLink size={11} strokeWidth={2} />
                            </a>
                          ) : null}
                          {release.project_title ? (
                            <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-500">
                              {release.project_title}
                            </p>
                          ) : null}
                          {(release.product_readiness_start_date || release.gsp_launch_start_date) ? (
                            <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-500">
                              PR: {formatTimelineRange(release.product_readiness_start_date, release.product_readiness_end_date)} · Launch:{' '}
                              {formatTimelineRange(release.gsp_launch_start_date, release.gsp_launch_end_date)}
                            </p>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
