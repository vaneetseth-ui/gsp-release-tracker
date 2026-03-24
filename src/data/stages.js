/**
 * Release stage labels and badge styles (UI configuration).
 */
export const STAGES = {
  GA: {
    label: 'GA',
    color: 'bg-emerald-500',
    text: 'text-white',
    badge:
      'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/90 dark:bg-emerald-950/60 dark:text-emerald-100 dark:ring-emerald-700/50',
    order: 1,
  },
  Beta: {
    label: 'Beta',
    color: 'bg-blue-500',
    text: 'text-white',
    badge:
      'bg-sky-50 text-sky-900 ring-1 ring-sky-200/90 dark:bg-sky-950/50 dark:text-sky-100 dark:ring-sky-700/50',
    order: 2,
  },
  EAP: {
    label: 'EAP',
    color: 'bg-amber-400',
    text: 'text-gray-900',
    badge:
      'bg-amber-50 text-amber-950 ring-1 ring-amber-200/90 dark:bg-amber-950/45 dark:text-amber-100 dark:ring-amber-600/40',
    order: 3,
  },
  Dev: {
    label: 'Dev',
    color: 'bg-orange-400',
    text: 'text-white',
    badge:
      'bg-orange-50 text-orange-950 ring-1 ring-orange-200/80 dark:bg-orange-950/40 dark:text-orange-100 dark:ring-orange-700/40',
    order: 4,
  },
  Planned: {
    label: 'Planned',
    color: 'bg-slate-400',
    text: 'text-white',
    badge:
      'bg-slate-100 text-slate-800 ring-1 ring-slate-300/80 dark:bg-slate-800/80 dark:text-slate-100 dark:ring-slate-600/60',
    order: 5,
  },
  Blocked: {
    label: 'Blocked',
    color: 'bg-red-500',
    text: 'text-white',
    badge:
      'bg-red-100 text-red-900 font-bold ring-2 ring-red-300/90 dark:bg-red-950/70 dark:text-red-100 dark:ring-red-500/60',
    order: 6,
  },
  'N/A': {
    label: 'N/A',
    color: 'bg-gray-200',
    text: 'text-gray-400',
    badge:
      'bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:ring-slate-600/40',
    order: 7,
  },
};
