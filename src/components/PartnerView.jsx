/**
 * PartnerView — Slide-in side panel for partner deep-dive
 * Shows all releases for a partner + key contacts + exceptions
 */
import React from 'react';
import { X, User, Briefcase, HeartHandshake, AlertCircle, DollarSign, UserX, AlertTriangle, Calendar, CheckCircle2 } from 'lucide-react';
import { STAGES } from '../data/stages.js';
import { useData } from '../context/DataContext.jsx';
import ProductAreaBadge from './ProductAreaBadge.jsx';
import JiraMondayLinks from './JiraMondayLinks.jsx';

function ContactBadge({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-600">
      <Icon size={12} className="text-slate-400 flex-shrink-0" />
      <span className="text-slate-400">{label}:</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}

function StageChip({ stage }) {
  const s = STAGES[stage] || STAGES['N/A'];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${s.badge}`}>
      {s.label}
    </span>
  );
}

function ReleaseCard({ release }) {
  const isNA = release.stage === 'N/A';
  if (isNA) return null;

  const hasAlert = release.blocked || release.redAccount || release.missingPM ||
    (release.daysInEAP && release.daysInEAP > 90);
  const jl = release.jiraLinks || [];
  const hasToolLinks = jl.length > 0 || !!release.mondayUrl;
  const showRawJira = !jl.length && release.jira;

  return (
    <div
      className={`rounded-2xl p-4 space-y-3 transition-all ring-1 shadow-sm ${
        release.blocked
          ? 'bg-white ring-red-100 border-l-[3px] border-l-red-400'
          : hasAlert
            ? 'bg-white ring-amber-100/80 border-l-[3px] border-l-amber-400'
            : 'bg-white ring-slate-200/60 border-l-[3px] border-l-transparent'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-sm text-slate-800">{release.product}</span>
            <ProductAreaBadge area={release.productArea || release.product_area} />
            {release.source === 'confluence' && (
              <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100/90">
                Confluence
              </span>
            )}
          </div>
          {(hasToolLinks || showRawJira) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <JiraMondayLinks jiraLinks={jl} mondayUrl={release.mondayUrl} compact />
              {showRawJira && (
                <span className="text-xs text-slate-600 font-mono">{release.jira}</span>
              )}
            </div>
          )}
        </div>
        <StageChip stage={release.stage} />
      </div>

      {/* Alert flags */}
      {hasAlert && (
        <div className="flex flex-wrap gap-1.5">
          {release.blocked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
              <AlertCircle size={10} /> Blocked {release.daysOverdue ? `${release.daysOverdue}d` : ''}
            </span>
          )}
          {release.redAccount && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
              <DollarSign size={10} /> Red Account · ${(release.arrAtRisk / 1000).toFixed(0)}K ARR at risk
            </span>
          )}
          {release.missingPM && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
              <UserX size={10} /> PM unassigned
            </span>
          )}
          {release.daysInEAP > 90 && !release.blocked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
              <AlertTriangle size={10} /> {release.daysInEAP}d in EAP
            </span>
          )}
        </div>
      )}

      {/* Dates */}
      <div className="flex gap-4 text-xs">
        {release.target_date && (
          <div className="flex items-center gap-1 text-slate-500">
            <Calendar size={11} />
            <span>Target: <span className="font-medium text-slate-700">{release.target_date}</span></span>
          </div>
        )}
        {release.actual_date && (
          <div className="flex items-center gap-1 text-emerald-600">
            <CheckCircle2 size={11} />
            <span>Live: <span className="font-medium">{release.actual_date}</span></span>
          </div>
        )}
      </div>

      {/* Contacts */}
      <div className="grid grid-cols-2 gap-1">
        <ContactBadge icon={Briefcase}      label="PM"  value={release.pm} />
        <ContactBadge icon={User}           label="SE"  value={release.se_lead} />
        <ContactBadge icon={HeartHandshake} label="CSM" value={release.csm} />
      </div>

      {/* Notes */}
      {release.notes && (
        <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2 mt-1">
          {release.notes}
        </p>
      )}
    </div>
  );
}

export default function PartnerView({ partner, onClose }) {
  const { getPartnerReleases, matrixProductOrder } = useData();
  if (!partner) return null;

  const releases = getPartnerReleases(partner);
  const activeReleases = releases.filter(r => r.stage !== 'N/A');
  const naCount = releases.filter(r => r.stage === 'N/A').length;

  // Get representative contact info
  const rep = activeReleases.find(r => r.csm) || releases[0];
  const csm = rep?.csm;

  // Stage summary
  const stageCounts = {};
  activeReleases.forEach(r => {
    stageCounts[r.stage] = (stageCounts[r.stage] || 0) + 1;
  });

  const exceptions = activeReleases.filter(r =>
    r.blocked || r.redAccount || r.missingPM || (r.daysInEAP > 90)
  );

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50/80 to-white">
      <div className="flex items-start justify-between gap-3 px-5 py-4 flex-shrink-0 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">{partner}</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
            {activeReleases.length} active · {naCount} n/a
            {exceptions.length > 0 && (
              <span className="text-red-600 ml-1">
                · {exceptions.length} exception{exceptions.length > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          aria-label="Close panel"
        >
          <X size={18} strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 px-5 py-3 flex-shrink-0 border-b border-slate-100/80 bg-white/50">
        {Object.entries(stageCounts).map(([stage, count]) => (
          <span
            key={stage}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ${STAGES[stage]?.badge || 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'}`}
          >
            {stage} <span className="tabular-nums font-semibold">{count}</span>
          </span>
        ))}
        {csm && (
          <span className="w-full sm:w-auto sm:ml-auto text-xs text-slate-500 flex items-center gap-1.5 pt-1 sm:pt-0">
            <HeartHandshake size={13} className="text-slate-400 shrink-0" strokeWidth={1.75} />
            <span className="font-medium text-slate-700">{csm}</span>
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-3 min-h-0">
        {matrixProductOrder.map((product) => {
          const release = releases.find((r) => r.product === product);
          if (!release || release.stage === 'N/A') return null;
          return <ReleaseCard key={product} release={release} />;
        })}

        {/* N/A products listed compactly */}
        {naCount > 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/50 px-4 py-3">
            <p className="text-[11px] text-slate-400 font-medium mb-2 uppercase tracking-wide">Not applicable</p>
            <div className="flex flex-wrap gap-1.5">
              {matrixProductOrder
                .filter((p) => {
                  const r = releases.find((x) => x.product === p);
                  return !r || r.stage === 'N/A';
                })
                .map((p) => (
                  <span
                    key={p}
                    className="text-[11px] px-2 py-1 bg-white text-slate-400 rounded-lg ring-1 ring-slate-200/60"
                  >
                    {p}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
