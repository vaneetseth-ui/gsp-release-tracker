/**
 * TimelineFilter — global year / date range (filters matrix, partner, exceptions).
 */
import React, { useMemo } from 'react';
import { Calendar, X } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';

function yearFromRelease(r) {
  const d = r.last_updated || r.target_date || r.actual_date;
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
    <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 py-2.5 border-b border-slate-100/90 bg-white/70 backdrop-blur-sm flex-shrink-0">
      <Calendar size={14} className="text-slate-400 shrink-0" strokeWidth={1.75} />

      <button
        type="button"
        onClick={clear}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          !isFiltered
            ? 'bg-slate-900 text-white shadow-sm'
            : 'bg-white text-slate-600 ring-1 ring-slate-200/80 hover:ring-slate-300'
        }`}
      >
        All
      </button>

      {years.map((y) => (
        <button
          key={y}
          type="button"
          onClick={() => selectYear(y)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeYear === y
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 ring-1 ring-slate-200/80 hover:ring-slate-300'
          }`}
        >
          {y}
        </button>
      ))}

      <span className="hidden sm:block w-px h-5 bg-slate-200 mx-0.5" aria-hidden />

      <div className="flex flex-wrap items-center gap-2 text-xs w-full sm:w-auto">
        <span className="text-slate-400 font-medium">From</span>
        <input
          type="date"
          value={dateRange.from || ''}
          onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value || null }))}
          className="px-2 py-1.5 rounded-xl text-xs text-slate-700 bg-white ring-1 ring-slate-200/80 focus:outline-none focus:ring-2 focus:ring-sky-200/80 min-w-0 flex-1 sm:flex-none sm:w-[128px]"
        />
        <span className="text-slate-400 font-medium">To</span>
        <input
          type="date"
          value={dateRange.to || ''}
          onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value || null }))}
          className="px-2 py-1.5 rounded-xl text-xs text-slate-700 bg-white ring-1 ring-slate-200/80 focus:outline-none focus:ring-2 focus:ring-sky-200/80 min-w-0 flex-1 sm:flex-none sm:w-[128px]"
        />
      </div>

      {isFiltered && (
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
          title="Clear filter"
        >
          <X size={12} strokeWidth={1.75} /> Clear
        </button>
      )}

      <span className="w-full sm:w-auto sm:ml-auto text-[11px] text-slate-400 text-right sm:text-left">
        {isFiltered ? (
          <>
            <span className="font-semibold text-slate-600 tabular-nums">{releases.length}</span>
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
