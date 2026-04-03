/**
 * TimelineFilter — global year / date range (filters matrix, partner, exceptions).
 * v1.3 Ch.25: multiple years can be selected (OR); custom From/To overrides year bubbles.
 */
import React, { useMemo } from 'react';
import { Calendar, X } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';

function yearFromRelease(r) {
  const d =
    r.last_updated || r.gsp_launch_date || r.product_readiness_date || r.target_date || r.actual_date;
  if (!d) return null;
  return String(d).slice(0, 4);
}

function isoDate(value) {
  return value.toISOString().slice(0, 10);
}

function quarterRange() {
  const now = new Date();
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const start = new Date(now.getFullYear(), quarterStartMonth, 1);
  const end = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
  return { from: isoDate(start), to: isoDate(end) };
}

function nextDaysRange(days) {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + days);
  return { from: isoDate(start), to: isoDate(end) };
}

export default function TimelineFilter() {
  const {
    allReleases,
    releases,
    dateRange,
    setDateRange,
    selectedYears,
    toggleYear,
    clearTimelineFilter,
    isFiltered,
  } = useData();

  const years = useMemo(() => {
    const set = new Set();
    for (const r of allReleases) {
      const y = yearFromRelease(r);
      if (y && /^\d{4}$/.test(y)) set.add(y);
    }
    return [...set].sort().reverse();
  }, [allReleases]);

  const hasCustomRange = !!(dateRange.from || dateRange.to);
  const presets = [
    { id: 'qtr', label: 'This quarter', range: quarterRange() },
    { id: '90d', label: 'Next 90 days', range: nextDaysRange(90) },
  ];

  return (
    <div className="mx-3 mt-2 sm:mx-4">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-2 rounded-[20px] border border-slate-200 bg-white px-4 py-2.5 shadow-soft">
        <Calendar size={16} className="text-bud-purple dark:text-bud-teal shrink-0" strokeWidth={2} />

        <button
          type="button"
          onClick={clearTimelineFilter}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
            !isFiltered
              ? 'bg-bud-navy text-white shadow-sm'
              : 'bg-slate-50 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 hover:ring-bud-teal/40'
          }`}
        >
          All
        </button>

        {years.map((y) => {
          const active = !hasCustomRange && selectedYears.includes(y);
          return (
            <button
              key={y}
              type="button"
              onClick={() => toggleYear(y)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                active
                  ? 'bg-bud-navy text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 hover:ring-bud-teal/40'
              }`}
            >
              {y}
            </button>
          );
        })}

        <span className="hidden sm:block w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" aria-hidden />

        <div className="flex flex-wrap items-center gap-2">
          {presets.map((preset) => {
            const active = dateRange.from === preset.range.from && dateRange.to === preset.range.to;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDateRange(preset.range)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-all ${
                  active
                    ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
                    : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:ring-bud-teal/40'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm w-full sm:w-auto">
          <span className="text-slate-500 dark:text-slate-400 font-semibold">From</span>
          <input
            type="date"
            value={dateRange.from || ''}
            onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value || null }))}
            className="px-3 py-1.5 rounded-xl text-sm text-slate-800 dark:text-slate-100 bg-white ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-bud-teal/40 min-w-0 flex-1 sm:flex-none sm:w-[148px]"
          />
          <span className="text-slate-500 dark:text-slate-400 font-semibold">To</span>
          <input
            type="date"
            value={dateRange.to || ''}
            onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value || null }))}
            className="px-3 py-1.5 rounded-xl text-sm text-slate-800 dark:text-slate-100 bg-white ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-bud-teal/40 min-w-0 flex-1 sm:flex-none sm:w-[148px]"
          />
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={clearTimelineFilter}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-full text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors"
            title="Clear filter"
          >
            <X size={14} strokeWidth={2} /> Clear
          </button>
        )}

        <span className="w-full text-right text-sm text-slate-500 dark:text-slate-400 sm:ml-auto sm:w-auto sm:text-left">
          {isFiltered ? (
            <>
              <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{releases.length}</span>
              <span> of </span>
              <span className="tabular-nums">{allReleases.length}</span>
              <span> releases</span>
              {selectedYears.length > 1 && !hasCustomRange && (
                <span className="hidden sm:inline"> · {selectedYears.length} years</span>
              )}
            </>
          ) : (
            <span className="tabular-nums">{allReleases.length} releases</span>
          )}
        </span>
      </div>
    </div>
  );
}
