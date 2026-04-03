import React from 'react';
import { cn } from '../lib/utils.js';

const STATUS_STYLES = {
  Healthy: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Warning: 'bg-amber-50 text-amber-700 border-amber-100',
  Critical: 'bg-rose-50 text-rose-700 border-rose-100',
  High: 'bg-amber-50 text-amber-700 border-amber-100',
  Medium: 'bg-sky-50 text-sky-700 border-sky-100',
  Low: 'bg-slate-50 text-slate-700 border-slate-100',
  GA: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Beta: 'bg-sky-50 text-sky-700 border-sky-100',
  EAP: 'bg-amber-50 text-amber-700 border-amber-100',
  Dev: 'bg-orange-50 text-orange-700 border-orange-100',
  Planned: 'bg-slate-50 text-slate-700 border-slate-100',
  Blocked: 'bg-rose-50 text-rose-700 border-rose-100',
  'On hold': 'bg-amber-50 text-amber-700 border-amber-100',
  'OnHold': 'bg-amber-50 text-amber-700 border-amber-100',
  Done: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'In Progress': 'bg-sky-50 text-sky-700 border-sky-100',
  'Feature PM': 'bg-violet-50 text-violet-700 border-violet-100',
  'GSP SE': 'bg-cyan-50 text-cyan-700 border-cyan-100',
};

export default function StatusBadge({ status, className, children }) {
  const currentStyle = STATUS_STYLES[status] || 'bg-slate-50 text-slate-700 border-slate-100';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]',
        currentStyle,
        className
      )}
    >
      {status}
      {children}
    </span>
  );
}
