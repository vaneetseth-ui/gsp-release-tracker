/**
 * PartnerView — v1.4 Monday-native cards (Jira enrichment stored but not shown as title/body)
 */
import React from 'react';
import { X, User, Briefcase, Calendar, CheckCircle2, ExternalLink, Link2 } from 'lucide-react';
import { OTHER_MATRIX_BUCKET } from '../data/matrixPartners.js';
import { useData } from '../context/DataContext.jsx';
import { mondayCardTitle, mondayDescription } from '../utils/releaseDisplay.js';
import ProductAreaBadge from './ProductAreaBadge.jsx';
import JiraMondayLinks from './JiraMondayLinks.jsx';
import GlipNotifyButton from './GlipNotifyButton.jsx';
import StatusBadge from './StatusBadge.jsx';

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

function ReleaseCard({ release, computeGapsForRelease }) {
  const isNA = release.stage === 'N/A';
  if (isNA) return null;

  const jl = release.jiraLinks || [];
  const hasToolLinks = jl.length > 0 || !!release.mondayUrl;
  const showRawJira = !jl.length && release.jira;
  const title = mondayCardTitle(release);
  const description = mondayDescription(release);
  const pmo = release.pmo_status || release.stage;
  const gaps = computeGapsForRelease(release).filter((g) => g.severity === 'Critical' || g.severity === 'High');
  const hasScheduleLink = release.schedule_url && /^https?:\/\//i.test(release.schedule_url);

  return (
    <div className="rounded-[24px] p-4 space-y-3 transition-all ring-1 ring-slate-200 bg-white shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">{title}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <ProductAreaBadge area={release.productArea || release.product_area} />
            {release.market_type ? (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">{release.market_type}</span>
            ) : null}
            {release.product_track ? (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">{release.product_track}</span>
            ) : null}
            {release.legacy_sourced ? (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-100">
                Legacy source
              </span>
            ) : null}
            {release.source === 'confluence' && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200/90 dark:bg-indigo-950/60 dark:text-indigo-100">
                Confluence
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={pmo} />
          </div>
        </div>
      </div>

      {description ? (
        <div
          className={`text-sm text-slate-700 dark:text-slate-200 leading-relaxed ${
            release.commentStale ? 'bg-amber-50/80 dark:bg-amber-950/30 rounded-lg px-3 py-2 ring-1 ring-amber-200/80' : ''
          }`}
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Monday notes</span>
          <p className="mt-1 whitespace-pre-wrap">{description}</p>
          {release.commentStale && (
            <p className="text-xs text-amber-800 dark:text-amber-200 font-semibold mt-1">Stale (&gt; 1 week since update)</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">No Monday notes on this item.</p>
      )}

      <div className="flex flex-wrap gap-4 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
          <Calendar size={14} strokeWidth={2} />
          <span>
            Readiness:{' '}
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
              {release.product_readiness_date || 'not scheduled'}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
          <Calendar size={14} strokeWidth={2} />
          <span>
            GSP launch:{' '}
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
              {release.gsp_launch_date || 'not scheduled'}
            </span>
          </span>
        </div>
        {hasScheduleLink && (
          <a
            href={release.schedule_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-slate-600 transition-colors hover:text-bud-teal"
          >
            <Link2 size={14} strokeWidth={2} />
            <span className="font-semibold">Schedule</span>
            <ExternalLink size={12} strokeWidth={2} />
          </a>
        )}
        {release.actual_date && (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 size={14} strokeWidth={2} />
            <span>
              Live: <span className="font-mono font-bold">{release.actual_date}</span>
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1">
        <ContactBadge icon={Briefcase} label="PM" value={release.pm} />
        <ContactBadge icon={User} label="SE Lead" value={release.se_lead} />
      </div>

      {(hasToolLinks || showRawJira) && (
        <div className="flex flex-wrap items-center gap-2">
          <JiraMondayLinks jiraLinks={jl} mondayUrl={release.mondayUrl} compact />
          {showRawJira && (
            <span className="text-sm text-slate-600 dark:text-slate-300 font-mono">{release.jira}</span>
          )}
        </div>
      )}

      {gaps.length > 0 && (
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-bold text-slate-500">Data gaps: </span>
          {gaps.map((g) => g.label).join(', ')}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
        <GlipNotifyButton
          variant="card"
          context={{
            partner: release.partner,
            project_title: title,
            pmo_status: release.pmo_status,
            jira_number: release.jira_number,
            priority_number: release.priority_number,
          }}
        />
      </div>
    </div>
  );
}

export default function PartnerView({ partner, onClose }) {
  const { getPartnerReleases, matrixProductOrder, computeGapsForRelease } = useData();
  if (!partner) return null;

  const releases = getPartnerReleases(partner);
  const activeReleases = releases.filter((r) => r.stage !== 'N/A');
  const naCount = releases.filter((r) => r.stage === 'N/A').length;

  const stageCounts = {};
  activeReleases.forEach((r) => {
    const k = r.pmo_status || r.stage;
    stageCounts[k] = (stageCounts[k] || 0) + 1;
  });

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-start justify-between gap-3 px-5 py-5 flex-shrink-0 border-b border-slate-200 bg-slate-50">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-bud-teal">Partner Focus</p>
          <h2 className="mt-1 text-2xl font-display font-bold text-slate-950 tracking-tight">{partner}</h2>
          {partner === OTHER_MATRIX_BUCKET && (
            <p className="text-xs text-slate-500 mt-1 font-medium leading-snug">
              Partners outside the strategic matrix rows — listed by product below.
            </p>
          )}
          <p className="text-sm text-slate-600 mt-2 font-semibold leading-relaxed">
            {activeReleases.length} active · {naCount} n/a
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-2xl text-slate-500 hover:text-slate-900 hover:bg-white transition-colors shrink-0"
          aria-label="Close panel"
        >
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 px-5 py-3 flex-shrink-0 border-b border-slate-200 bg-white">
        {Object.entries(stageCounts).map(([stage, count]) => (
          <StatusBadge key={stage} status={stage} className="gap-2 text-xs normal-case tracking-normal">
            <span className="font-mono font-bold">{count}</span>
          </StatusBadge>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-3 min-h-0">
        {matrixProductOrder.flatMap((product) => {
          const productReleases = releases.filter((r) => r.product === product && r.stage !== 'N/A');
          return productReleases.map((release, i) => (
            <ReleaseCard
              key={`${product}-${release.release_key || release.jira_number || i}`}
              release={release}
              computeGapsForRelease={computeGapsForRelease}
            />
          ));
        })}

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
