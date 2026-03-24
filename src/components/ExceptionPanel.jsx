/**
 * ExceptionPanel — exception detection view
 * Shows all partners with: blocked items, overdue EAP, red accounts, missing PMs
 */
import React, { useState } from 'react';
import { AlertCircle, DollarSign, UserX, AlertTriangle, Clock, Filter, ExternalLink } from 'lucide-react';
import { STAGES } from '../data/constants.js';
import { useData } from '../data/DataContext.jsx';

const EXCEPTION_TYPES = {
  blocked:    { label: 'Blocked',       icon: AlertCircle,  color: 'text-red-600',    bg: 'bg-red-50 border-red-200',    badge: 'bg-red-100 text-red-700'    },
  redAccount: { label: 'Red Account',   icon: DollarSign,   color: 'text-red-600',    bg: 'bg-red-50 border-red-200',    badge: 'bg-red-100 text-red-700'    },
  missingPM:  { label: 'No PM',         icon: UserX,        color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200',badge: 'bg-amber-100 text-amber-700' },
  overdueEAP: { label: 'Overdue EAP',   icon: AlertTriangle,color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200',badge: 'bg-amber-100 text-amber-700' },
};

function ExceptionCard({ release, types, onSelectPartner }) {
  return (
    <div className={`rounded-lg border p-3 space-y-2 ${types[0] === 'blocked' || types[0] === 'redAccount' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-start justify-between">
        <div>
          <button
            className="font-semibold text-sm text-blue-700 hover:underline"
            onClick={() => onSelectPartner(release.partner)}
          >
            {release.partner}
          </button>
          <div className="text-xs text-slate-500 mt-0.5">{release.product} · <span className={`font-semibold ${STAGES[release.stage]?.badge}`}>{release.stage}</span></div>
        </div>
        <div className="flex gap-1">
          {types.map(t => {
            const cfg = EXCEPTION_TYPES[t];
            const Icon = cfg.icon;
            return (
              <span key={t} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.badge}`}>
                <Icon size={10} /> {cfg.label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-600 items-center">
        {release.jira && (
          <a href={release.jiraUrl} target="_blank" rel="noopener noreferrer"
             className="font-mono text-blue-600 hover:underline hover:text-blue-800">
            {release.jira}
          </a>
        )}
        {release.source && (() => {
          const isJira = release.source === 'jira';
          const label = isJira ? 'Jira' : 'Monday';
          const colors = isJira ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-violet-50 text-violet-700 border-violet-200';
          return release.sourceUrl ? (
            <a href={release.sourceUrl} target="_blank" rel="noopener noreferrer"
               className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${colors} hover:opacity-80`}>
              {label} <ExternalLink size={8} />
            </a>
          ) : (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold ${colors}`}>{label}</span>
          );
        })()}
        {release.daysOverdue > 0 && (
          <span className="flex items-center gap-1 text-red-600 font-semibold">
            <Clock size={11} /> {release.daysOverdue} days overdue
          </span>
        )}
        {release.daysInEAP > 90 && !release.blocked && (
          <span className="flex items-center gap-1 text-amber-600 font-semibold">
            <Clock size={11} /> {release.daysInEAP} days in EAP
          </span>
        )}
        {release.arrAtRisk > 0 && (
          <span className="flex items-center gap-1 text-red-600 font-semibold">
            <DollarSign size={11} /> ${(release.arrAtRisk / 1000).toFixed(0)}K ARR at risk
          </span>
        )}
        {release.target_date && (
          <span className="text-slate-500">Target: {release.target_date}</span>
        )}
        {release.seRegion && (
          <span className="text-slate-500">Region: <span className="font-medium text-slate-700">{release.seRegion}</span></span>
        )}
      </div>

      <div className="flex gap-4 text-xs text-slate-500">
        {release.pm         && <span>PM: <span className="font-medium text-slate-700">{release.pm}</span></span>}
        {!release.pm        && <span className="text-amber-600 font-medium flex items-center gap-0.5"><UserX size={10} /> PM unassigned</span>}
        {release.se_lead    && <span>SE: <span className="font-medium text-slate-700">{release.se_lead}</span></span>}
        {release.csm        && <span>CSM: <span className="font-medium text-slate-700">{release.csm}</span></span>}
        {release.reporter   && <span>Reporter: <span className="font-medium text-slate-700">{release.reporter}</span></span>}
      </div>

      {release.notes && (
        <p className="text-xs text-slate-600 border-t border-slate-200/60 pt-2 leading-relaxed">
          {release.notes}
        </p>
      )}
    </div>
  );
}

export default function ExceptionPanel({ onSelectPartner }) {
  const [filter, setFilter] = useState('all');
  const { releases } = useData();

  const exceptions = releases.reduce((acc, r) => {
    const types = [];
    if (r.blocked)                           types.push('blocked');
    if (r.redAccount)                        types.push('redAccount');
    if (r.missingPM)                         types.push('missingPM');
    if (r.daysInEAP > 90 && !r.blocked)     types.push('overdueEAP');
    if (types.length > 0) acc.push({ release: r, types });
    return acc;
  }, []);

  const filtered = filter === 'all'
    ? exceptions
    : exceptions.filter(e => e.types.includes(filter));

  const counts = exceptions.reduce((acc, e) => {
    e.types.forEach(t => { acc[t] = (acc[t] || 0) + 1; });
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <AlertCircle size={16} className="text-red-500" />
          Exceptions &amp; Escalations
          <span className="ml-auto text-xs font-normal text-slate-500">{exceptions.length} total</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Partners requiring immediate attention — sourced from Jira + Monday.com</p>
      </div>

      <div className="flex gap-1 px-4 py-2 bg-slate-50 border-b border-slate-200 overflow-x-auto flex-shrink-0">
        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
          onClick={() => setFilter('all')}
        >
          <Filter size={11} /> All ({exceptions.length})
        </button>
        {Object.entries(EXCEPTION_TYPES).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = counts[key] || 0;
          if (count === 0) return null;
          return (
            <button
              key={key}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${filter === key ? 'bg-slate-800 text-white' : `bg-white ${cfg.color} border border-slate-200 hover:bg-slate-100`}`}
              onClick={() => setFilter(key)}
            >
              <Icon size={11} /> {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <AlertCircle size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No exceptions in this category</p>
          </div>
        ) : (
          filtered.map(({ release, types }) => (
            <ExceptionCard
              key={`${release.partner}-${release.product}-${release.jira}`}
              release={release}
              types={types}
              onSelectPartner={onSelectPartner}
            />
          ))
        )}
      </div>

      <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex-shrink-0">
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          {Object.entries(EXCEPTION_TYPES).map(([key, cfg]) => {
            const count = counts[key] || 0;
            if (count === 0) return null;
            const Icon = cfg.icon;
            return (
              <span key={key} className={`flex items-center gap-1 font-semibold ${cfg.color}`}>
                <Icon size={11} /> {count} {cfg.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
