/**
 * Release stage labels and badge styles (UI configuration).
 */
export const STAGES = {
  GA: {
    label: 'GA',
    color: 'bg-emerald-500',
    text: 'text-white',
    badge: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100/90',
    order: 1,
  },
  Beta: {
    label: 'Beta',
    color: 'bg-blue-500',
    text: 'text-white',
    badge: 'bg-sky-50 text-sky-800 ring-1 ring-sky-100/90',
    order: 2,
  },
  EAP: {
    label: 'EAP',
    color: 'bg-amber-400',
    text: 'text-gray-900',
    badge: 'bg-amber-50 text-amber-900 ring-1 ring-amber-100/90',
    order: 3,
  },
  Dev: {
    label: 'Dev',
    color: 'bg-orange-400',
    text: 'text-white',
    badge: 'bg-orange-50 text-orange-900 ring-1 ring-orange-100/80',
    order: 4,
  },
  Planned: {
    label: 'Planned',
    color: 'bg-slate-400',
    text: 'text-white',
    badge: 'bg-slate-50 text-slate-700 ring-1 ring-slate-200/80',
    order: 5,
  },
  Blocked: {
    label: 'Blocked',
    color: 'bg-red-500',
    text: 'text-white',
    badge: 'bg-red-50 text-red-800 ring-1 ring-red-100/90',
    order: 6,
  },
  'N/A': {
    label: 'N/A',
    color: 'bg-gray-200',
    text: 'text-gray-400',
    badge: 'bg-slate-50 text-slate-400 ring-1 ring-slate-100',
    order: 7,
  },
};
