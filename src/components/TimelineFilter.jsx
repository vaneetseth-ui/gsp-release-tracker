/**
 * TimelineFilter — global date range selector.
 * Year presets + custom From/To inputs. Shows filtered vs total count.
 */
import React, { useMemo } from 'react';
import { Calendar, X } from 'lucide-react';
import { useData } from '../data/DataContext.jsx';

export default function TimelineFilter() {
  const { allReleases, releases, dateRange, setDateRange, isFiltered } = useData();

  const years = useMemo(() => {
    const set = new Set();
    for (const r of allReleases) {
      const d = r.last_updated || r.target_date;
      if (d) set.add(d.slice(0, 4));
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
    <div className="flex items-center gap-3 px-4 py-1.5 bg-white border-b border-slate-200 flex-shrink-0">
      <Calendar size={13} className="text-slate-400 flex-shrink-0" />

      <button
        onClick={clear}
        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
          !isFiltered
            ? 'bg-slate-800 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        All
      </button>

      {years.map(y => (
        <button
          key={y}
          onClick={() => selectYear(y)}
          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
            activeYear === y
              ? 'bg-slate-800 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {y}
        </button>
      ))}

      <span className="w-px h-4 bg-slate-200 mx-1" />

      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-slate-400">From</span>
        <input
          type="date"
          value={dateRange.from || ''}
          onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value || null }))}
          className="px-1.5 py-0.5 rounded border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 w-[120px]"
        />
        <span className="text-slate-400">To</span>
        <input
          type="date"
          value={dateRange.to || ''}
          onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value || null }))}
          className="px-1.5 py-0.5 rounded border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 w-[120px]"
        />
      </div>

      {isFiltered && (
        <button
          onClick={clear}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-slate-500 hover:bg-slate-100 transition-colors"
          title="Clear filter"
        >
          <X size={11} /> Clear
        </button>
      )}

      <span className="ml-auto text-xs text-slate-400 flex-shrink-0">
        {isFiltered
          ? <><span className="font-semibold text-slate-600">{releases.length}</span> of {allReleases.length} releases</>
          : <>{allReleases.length} releases</>
        }
      </span>
    </div>
  );
}
