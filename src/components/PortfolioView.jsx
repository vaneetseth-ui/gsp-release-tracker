import React, { useMemo, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import JiraMondayLinks from './JiraMondayLinks.jsx';
import ProductAreaBadge from './ProductAreaBadge.jsx';
import StatusBadge from './StatusBadge.jsx';
import { cn } from '../lib/utils.js';
import { mondayDescriptionPreview } from '../utils/releaseDisplay.js';

const VIEWS = [
  { id: 'all', label: 'All active' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'missing-dates', label: 'No dates' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'stale', label: 'Stale notes' },
];

function formatDate(value) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function scheduleDate(release) {
  return release.gsp_launch_date || release.product_readiness_date || release.target_date || null;
}

function scheduleSortValue(release) {
  return scheduleDate(release) || '9999-12-31';
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
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Launch</p>
          <p className="mt-1 font-mono text-sm font-medium text-slate-900">{formatDate(release.gsp_launch_date)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Readiness</p>
          <p className="mt-1 font-mono text-sm font-medium text-slate-900">{formatDate(release.product_readiness_date)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">PM</p>
          <p className="mt-1 font-medium text-slate-900">{release.pm || 'Unassigned'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">SE Lead</p>
          <p className="mt-1 font-medium text-slate-900">{release.se_lead || 'Unassigned'}</p>
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
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => {
        const dateCompare = scheduleSortValue(a).localeCompare(scheduleSortValue(b));
        if (dateCompare !== 0) return dateCompare;
        return `${a.partner}-${a.product}`.localeCompare(`${b.partner}-${b.product}`);
      });
  }, [activeReleases, activeView, computeGapsForRelease, search]);

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
                  className={cn(
                    'rounded-full px-3 py-2 text-sm font-semibold transition-all',
                    active
                      ? 'bg-bud-navy text-white shadow-sm'
                      : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                  )}
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
                <MobileCard
                  key={release.release_key || `${release.partner}-${release.product}`}
                  release={release}
                  onSelectPartner={onSelectPartner}
                />
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-soft lg:block">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Partner</th>
                      <th className="px-4 py-3 text-left font-semibold">Product</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Launch</th>
                      <th className="px-4 py-3 text-left font-semibold">Readiness</th>
                      <th className="px-4 py-3 text-left font-semibold">Owners</th>
                      <th className="px-4 py-3 text-left font-semibold">Track</th>
                      <th className="px-4 py-3 text-left font-semibold">Links</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((release) => (
                      <tr key={release.release_key || `${release.partner}-${release.product}`} className="border-t border-slate-100 align-top">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => onSelectPartner(release.partner)}
                            className="font-semibold text-slate-950 transition-colors hover:text-bud-teal"
                          >
                            {release.partner}
                          </button>
                          {release.market_type ? (
                            <p className="mt-1 text-xs text-slate-500">{release.market_type}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{release.product}</p>
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
                          {release.commentStale ? (
                            <p className="mt-2 text-xs font-semibold text-violet-700">Stale note</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-slate-900">{formatDate(release.gsp_launch_date)}</td>
                        <td className="px-4 py-3 font-mono font-medium text-slate-900">{formatDate(release.product_readiness_date)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{release.pm || 'Unassigned PM'}</p>
                          <p className="mt-1 text-xs text-slate-500">{release.se_lead || 'Unassigned SE lead'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{release.product_track || 'Unassigned'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <JiraMondayLinks jiraLinks={release.jiraLinks || []} mondayUrl={release.mondayUrl} compact />
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
