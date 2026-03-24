/**
 * UI constants — stage display metadata and product list.
 * These are display-layer only; actual data comes from the API.
 */

export const PRODUCTS = ['Nova IVA', 'RingCX', 'AIR', 'MVP', 'ACO'];

export const STAGES = {
  GA:       { label: 'GA',       color: 'bg-emerald-500', text: 'text-white',    badge: 'bg-emerald-100 text-emerald-800', order: 1 },
  Beta:     { label: 'Beta',     color: 'bg-blue-500',    text: 'text-white',    badge: 'bg-blue-100 text-blue-800',       order: 2 },
  EAP:      { label: 'EAP',      color: 'bg-amber-400',   text: 'text-gray-900', badge: 'bg-amber-100 text-amber-800',     order: 3 },
  Dev:      { label: 'Dev',      color: 'bg-orange-400',  text: 'text-white',    badge: 'bg-orange-100 text-orange-800',   order: 4 },
  Planned:  { label: 'Planned',  color: 'bg-slate-400',   text: 'text-white',    badge: 'bg-slate-100 text-slate-700',     order: 5 },
  Blocked:  { label: 'Blocked',  color: 'bg-red-500',     text: 'text-white',    badge: 'bg-red-100 text-red-800',         order: 6 },
  'N/A':    { label: 'N/A',      color: 'bg-gray-200',    text: 'text-gray-400', badge: 'bg-gray-100 text-gray-400',       order: 7 },
};
