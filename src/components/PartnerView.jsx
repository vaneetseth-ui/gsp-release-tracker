/**
 * PartnerView — Slide-in side panel for partner deep-dive
 * Shows all releases for a partner + key contacts + exceptions
 */
import React from 'react';
import { X, ExternalLink, User, Briefcase, HeartHandshake, AlertCircle, DollarSign, UserX, AlertTriangle, Calendar, CheckCircle2, Tag, MapPin, Flag } from 'lucide-react';
import { PRODUCTS, STAGES } from '../data/constants.js';
import { useData } from '../data/DataContext.jsx';

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
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${s.badge}`}>
      {s.label}
    </span>
  );
}

function SourceBadge({ source, sourceUrl }) {
  if (!source) return null;
  const isJira = source === 'jira';
  const label = isJira ? 'Jira' : 'Monday';
  const colors = isJira ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-violet-50 text-violet-700 border-violet-200';
  if (sourceUrl) {
    return (
      <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
         className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${colors} hover:opacity-80`}>
        {label} <ExternalLink size={8} />
      </a>
    );
  }
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold ${colors}`}>{label}</span>;
}

function MetaRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="text-xs text-slate-500">
      <span className="text-slate-400">{label}:</span>{' '}
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}

function ReleaseCard({ release }) {
  const isNA = release.stage === 'N/A';
  if (isNA) return null;

  const hasAlert = release.blocked || release.redAccount || release.missingPM ||
    (release.daysInEAP && release.daysInEAP > 90);

  return (
    <div className={`rounded-lg border p-3 space-y-2 transition-all ${release.blocked ? 'border-red-300 bg-red-50' : hasAlert ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-800">{release.product}</span>
            {release.issueType && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                <Tag size={8} /> {release.issueType}
              </span>
            )}
            {release.priority && release.priority !== 'Normal' && (
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${release.priority === 'Critical' || release.priority === 'Blocker' ? 'bg-red-100 text-red-700' : release.priority === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                <Flag size={8} /> {release.priority}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {(release.jiraKeys || []).map(j => (
              <a key={j.key} href={j.url} target="_blank" rel="noopener noreferrer"
                 className="text-xs text-blue-600 font-mono hover:underline hover:text-blue-800">
                {j.key}
              </a>
            ))}
            <SourceBadge source={release.source} sourceUrl={release.sourceUrl} />
          </div>
        </div>
        <StageChip stage={release.stage} />
      </div>

      {hasAlert && (
        <div className="flex flex-wrap gap-1.5">
          {release.blocked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
              <AlertCircle size={10} /> Blocked {release.daysOverdue ? `${release.daysOverdue}d` : ''}
            </span>
          )}
          {release.redAccount && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
              <DollarSign size={10} /> Red Account {release.arrAtRisk ? `· $${(release.arrAtRisk / 1000).toFixed(0)}K ARR` : ''}
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

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
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
        {release.seRegion && (
          <div className="flex items-center gap-1 text-slate-500">
            <MapPin size={11} />
            <span className="font-medium text-slate-700">{release.seRegion}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1">
        <ContactBadge icon={Briefcase}      label="PM"       value={release.pm} />
        <ContactBadge icon={User}           label="SE"       value={release.se_lead} />
        <ContactBadge icon={HeartHandshake} label="CSM"      value={release.csm} />
        <ContactBadge icon={User}           label="Reporter" value={release.reporter} />
      </div>

      <div className="grid grid-cols-2 gap-1 text-xs text-slate-500">
        <MetaRow label="Requested Q" value={release.requestedQuarter} />
        <MetaRow label="Target Q"    value={release.targetQuarter} />
        <MetaRow label="Fix Ver"     value={release.fixVersion} />
        <MetaRow label="Brand"       value={release.brand} />
        <MetaRow label="Resolution"  value={release.resolution !== 'Unresolved' ? release.resolution : null} />
      </div>

      {release.notes && (
        <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2 mt-1">
          {release.notes}
        </p>
      )}
    </div>
  );
}

export default function PartnerView({ partner, onClose }) {
  if (!partner) return null;
  const { getPartnerReleases } = useData();

  const releases = getPartnerReleases(partner);
  const activeReleases = releases.filter(r => r.stage !== 'N/A');
  const naCount = releases.filter(r => r.stage === 'N/A').length;

  const rep = activeReleases.find(r => r.csm) || releases[0];
  const csm = rep?.csm;

  const stageCounts = {};
  activeReleases.forEach(r => {
    stageCounts[r.stage] = (stageCounts[r.stage] || 0) + 1;
  });

  const exceptions = activeReleases.filter(r =>
    r.blocked || r.redAccount || r.missingPM || (r.daysInEAP > 90)
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex items-center justify-between px-4 py-3 bg-rc-navy text-white flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold">{partner}</h2>
          <p className="text-xs text-blue-200">
            {activeReleases.length} active release{activeReleases.length !== 1 ? 's' : ''}
            {exceptions.length > 0 && <span className="text-red-300 ml-2">· {exceptions.length} exception{exceptions.length > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          aria-label="Close panel"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 px-4 py-2.5 bg-white border-b border-slate-200 flex-shrink-0">
        {Object.entries(stageCounts).map(([stage, count]) => (
          <span key={stage} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STAGES[stage]?.badge || 'bg-gray-100 text-gray-600'}`}>
            {stage} <span className="font-bold">{count}</span>
          </span>
        ))}
        {csm && (
          <span className="ml-auto text-xs text-slate-500 flex items-center gap-1">
            <HeartHandshake size={12} className="text-slate-400" />
            CSM: <span className="font-medium text-slate-700">{csm}</span>
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-2.5">
        {activeReleases.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm">No active releases for {partner}</p>
          </div>
        ) : (
          activeReleases.map((release, idx) => (
            <ReleaseCard key={`${release.product}-${release.jira}-${idx}`} release={release} />
          ))
        )}
      </div>
    </div>
  );
}
