/**
 * PartnerView — Slide-in side panel for partner deep-dive
 * Shows all releases for a partner + key contacts + exceptions
 */
import React from 'react';
import { X, User, Briefcase, HeartHandshake, AlertCircle, DollarSign, UserX, AlertTriangle, Calendar, CheckCircle2 } from 'lucide-react';
import { STAGES } from '../data/stages.js';
import { OTHER_MATRIX_BUCKET } from '../data/matrixPartners.js';
import { useData } from '../context/DataContext.jsx';
import ProductAreaBadge from './ProductAreaBadge.jsx';
import JiraMondayLinks from './JiraMondayLinks.jsx';

function ContactBadge({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
      <Icon size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" strokeWidth={2} />
      <span className="text-slate-500 dark:text-slate-400 font-medium">{label}:</span>
      <span className="font-semibold text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  );
}

function StageChip({ stage }) {
  const s = STAGES[stage] || STAGES['N/A'];
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold ${s.badge}`}>
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
      className={`rounded-2xl p-4 space-y-3 transition-all ring-2 shadow-sm ${
        release.blocked
          ? 'bg-white dark:bg-slate-900 ring-red-300 dark:ring-red-700 border-l-[4px] border-l-red-500 dark:border-l-red-400'
          : hasAlert
            ? 'bg-white dark:bg-slate-900 ring-amber-300/90 dark:ring-amber-600/60 border-l-[4px] border-l-amber-500 dark:border-l-amber-400'
            : 'bg-white dark:bg-slate-900 ring-slate-200/60 dark:ring-slate-600 border-l-[4px] border-l-transparent'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-bold text-base text-slate-800 dark:text-slate-100">{release.product}</span>
              {release.partner && (
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                  {release.partner}
                </span>
              )}
            </div>
            <ProductAreaBadge area={release.productArea || release.product_area} />
            {release.source === 'confluence' && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200/90 dark:bg-indigo-950/60 dark:text-indigo-100 dark:ring-indigo-700/50">
                Confluence
              </span>
            )}
          </div>
          {(hasToolLinks || showRawJira) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <JiraMondayLinks jiraLinks={jl} mondayUrl={release.mondayUrl} compact />
              {showRawJira && (
                <span className="text-sm text-slate-600 dark:text-slate-300 font-mono">{release.jira}</span>
              )}
            </div>
          )}
        </div>
        <StageChip stage={release.stage} />
      </div>

      {/* Alert flags */}
      {hasAlert && (
        <div className="flex flex-wrap gap-2">
          {release.blocked && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-bold bg-red-100 text-red-800 ring-2 ring-red-300/80 dark:bg-red-950/60 dark:text-red-100 dark:ring-red-600/50">
              <AlertCircle size={14} strokeWidth={2.5} /> Blocked{' '}
              {release.daysOverdue ? `${release.daysOverdue}d` : ''}
            </span>
          )}
          {release.redAccount && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-bold bg-red-100 text-red-800 ring-2 ring-red-300/80 dark:bg-red-950/60 dark:text-red-100 dark:ring-red-600/50">
              <DollarSign size={14} strokeWidth={2.5} /> Red Account · $
              {(release.arrAtRisk / 1000).toFixed(0)}K ARR at risk
            </span>
          )}
          {release.missingPM && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-bold bg-amber-100 text-amber-900 ring-2 ring-amber-300/80 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-600/45">
              <UserX size={14} strokeWidth={2.5} /> PM unassigned
            </span>
          )}
          {release.daysInEAP > 90 && !release.blocked && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-bold bg-amber-100 text-amber-900 ring-2 ring-amber-300/80 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-600/45">
              <AlertTriangle size={14} strokeWidth={2.5} /> {release.daysInEAP}d in EAP
            </span>
          )}
        </div>
      )}

      {/* Dates */}
      <div className="flex gap-4 text-sm">
        {release.target_date && (
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Calendar size={14} strokeWidth={2} />
            <span>
              Target:{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-100">{release.target_date}</span>
            </span>
          </div>
        )}
        {release.actual_date && (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 size={14} strokeWidth={2} />
            <span>
              Live: <span className="font-bold">{release.actual_date}</span>
            </span>
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
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-2 mt-1">
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
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50/80 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="flex items-start justify-between gap-3 px-5 py-4 flex-shrink-0 border-b border-slate-100 dark:border-slate-700 bg-white/90 dark:bg-slate-900/95 backdrop-blur-sm">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{partner}</h2>
          {partner === OTHER_MATRIX_BUCKET && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-snug">
              Partners outside the 17 strategic matrix rows — listed by product below.
            </p>
          )}
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold leading-relaxed">
            {activeReleases.length} active · {naCount} n/a
            {exceptions.length > 0 && (
              <span className="text-red-600 dark:text-red-400 font-bold ml-1">
                · {exceptions.length} exception{exceptions.length > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          aria-label="Close panel"
        >
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 px-5 py-3 flex-shrink-0 border-b border-slate-100/80 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50">
        {Object.entries(stageCounts).map(([stage, count]) => (
          <span
            key={stage}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${STAGES[stage]?.badge || 'bg-slate-50 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600'}`}
          >
            {stage} <span className="tabular-nums font-bold">{count}</span>
          </span>
        ))}
        {csm && (
          <span className="w-full sm:w-auto sm:ml-auto text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1 sm:pt-0">
            <HeartHandshake size={15} className="text-slate-400 shrink-0" strokeWidth={2} />
            <span className="font-semibold text-slate-700 dark:text-slate-200">{csm}</span>
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-3 min-h-0">
        {matrixProductOrder.flatMap((product) => {
          const productReleases = releases.filter((r) => r.product === product && r.stage !== 'N/A');
          return productReleases.map((release, i) => (
            <ReleaseCard
              key={`${product}-${release.partner}-${release.jira_number || i}`}
              release={release}
            />
          ));
        })}

        {/* N/A products listed compactly */}
        {naCount > 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200/80 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40 px-4 py-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-2 uppercase tracking-wide">
              Not applicable
            </p>
            <div className="flex flex-wrap gap-1.5">
              {matrixProductOrder
                .filter((p) => {
                  const rows = releases.filter((x) => x.product === p);
                  if (!rows.length) return true;
                  return rows.every((r) => r.stage === 'N/A');
                })
                .map((p) => (
                  <span
                    key={p}
                    className="text-xs px-2 py-1 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-lg ring-1 ring-slate-200/60 dark:ring-slate-600"
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
