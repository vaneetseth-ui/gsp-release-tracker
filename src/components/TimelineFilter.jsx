/**
 * TimelineFilter — global year / date range (filters matrix, partner, exceptions).
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

export default function TimelineFilter() {
  const { allReleases, releases, dateRange, setDateRange, isFiltered } = useData();

  const years = useMemo(() => {
    const set = new Set();
    for (const r of allReleases) {
      const y = yearFromRelease(r);
      if (y && /^\d{4}$/.test(y)) set.add(y);
    }
    return [...set].sort().reverse();
  }, [allReleases]);

  const activeYear = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return null;
    const m = dateRange.from.match(/^(\d{4})-01-01$/);
    if (m && dateRange.to === `${m[1]}-12-31`) return m[1];
    return null;
  }, [dateRange]);

  const selectYear = (year) => {
    if (activeYear === year) {
      setDateRange({ from: null, to: null });
    } else {
      setDateRange({ from: `${year}-01-01`, to: `${year}-12-31` });
    }
  };

  const clear = () => setDateRange({ from: null, to: null });

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 py-2.5 border-b border-slate-100/90 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm flex-shrink-0">
      <Calendar size={16} className="text-slate-400 dark:text-slate-500 shrink-0" strokeWidth={2} />

      <button
        type="button"
        onClick={clear}
        className={`px-3 py-2 rounded-full text-sm font-semibold transition-all ${
          !isFiltered
            ? 'bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white shadow-sm'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200/80 dark:ring-slate-600 hover:ring-slate-300'
        }`}
      >
        All
      </button>

      {years.map((y) => (
        <button
          key={y}
          type="button"
          onClick={() => selectYear(y)}
          className={`px-3 py-2 rounded-full text-sm font-semibold transition-all ${
            activeYear === y
              ? 'bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200/80 dark:ring-slate-600 hover:ring-slate-300'
          }`}
        >
          {y}
        </button>
      ))}

      <span className="hidden sm:block w-px h-5 bg-slate-200 dark:bg-slate-600 mx-0.5" aria-hidden />

      <div className="flex flex-wrap items-center gap-2 text-sm w-full sm:w-auto">
        <span className="text-slate-500 dark:text-slate-400 font-semibold">From</span>
        <input
          type="date"
          value={dateRange.from || ''}
          onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value || null }))}
          className="px-2 py-2 rounded-xl text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 ring-1 ring-slate-200/80 dark:ring-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-600 min-w-0 flex-1 sm:flex-none sm:w-[140px]"
        />
        <span className="text-slate-500 dark:text-slate-400 font-semibold">To</span>
        <input
          type="date"
          value={dateRange.to || ''}
          onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value || null }))}
          className="px-2 py-2 rounded-xl text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 ring-1 ring-slate-200/80 dark:ring-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-600 min-w-0 flex-1 sm:flex-none sm:w-[140px]"
        />
      </div>

      {isFiltered && (
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-full text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Clear filter"
        >
          <X size={14} strokeWidth={2} /> Clear
        </button>
      )}

      <span className="w-full sm:w-auto sm:ml-auto text-sm text-slate-500 dark:text-slate-400 text-right sm:text-left">
        {isFiltered ? (
          <>
            <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{releases.length}</span>
            <span> of </span>
            <span className="tabular-nums">{allReleases.length}</span>
            <span> releases</span>
          </>
        ) : (
          <span className="tabular-nums">{allReleases.length} releases</span>
        )}
      </span>
    </div>
  );
}
