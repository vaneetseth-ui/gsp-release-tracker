/**
 * PartnerView — v1.2 blended descriptive cards (Monday + Jira), SE/PM only, Glip notify
 */
import React from 'react';
import { X, User, Briefcase, Calendar, CheckCircle2 } from 'lucide-react';
import { STAGES } from '../data/stages.js';
import { OTHER_MATRIX_BUCKET } from '../data/matrixPartners.js';
import { useData } from '../context/DataContext.jsx';
import ProductAreaBadge from './ProductAreaBadge.jsx';
import JiraMondayLinks from './JiraMondayLinks.jsx';
import GlipNotifyButton from './GlipNotifyButton.jsx';

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
  const title = release.project_title || release.notes || release.product;
  const pmo = release.pmo_status || release.stage;
  const stageStyle = STAGES[release.stage] || STAGES.Planned;
  const showJiraStatus = release.jira_status && release.jira_status !== pmo;
  const gaps = computeGapsForRelease(release).filter((g) => g.severity === 'Critical' || g.severity === 'High');

  return (
    <div className="rounded-2xl p-4 space-y-3 transition-all ring-1 ring-slate-200/70 dark:ring-slate-600 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">{title}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <ProductAreaBadge area={release.productArea || release.product_area} />
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
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${stageStyle.badge}`}
            >
              {pmo}
            </span>
            {showJiraStatus && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Jira: <span className="font-semibold text-slate-700 dark:text-slate-200">{release.jira_status}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {release.impact_summary && (
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{release.impact_summary}</p>
      )}

      <div className="flex flex-wrap gap-4 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
          <Calendar size={14} strokeWidth={2} />
          <span>
            Readiness:{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {release.product_readiness_date || 'not scheduled'}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
          <Calendar size={14} strokeWidth={2} />
          <span>
            GSP launch:{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {release.gsp_launch_date || 'not scheduled'}
            </span>
          </span>
        </div>
        {release.actual_date && (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 size={14} strokeWidth={2} />
            <span>
              Live: <span className="font-bold">{release.actual_date}</span>
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

      {release.monday_comment && (
        <div
          className={`text-sm text-slate-700 dark:text-slate-200 border-t border-slate-100 dark:border-slate-700 pt-3 ${
            release.commentStale ? 'bg-amber-50/80 dark:bg-amber-950/30 rounded-lg px-3 py-2 ring-1 ring-amber-200/80' : ''
          }`}
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Comment</span>
          <p className="mt-1 whitespace-pre-wrap">{release.monday_comment}</p>
          {release.commentStale && (
            <p className="text-xs text-amber-800 dark:text-amber-200 font-semibold mt-1">Stale (&gt; 1 week since update)</p>
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
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50/80 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="flex items-start justify-between gap-3 px-5 py-4 flex-shrink-0 border-b border-slate-100 dark:border-slate-700 bg-white/90 dark:bg-slate-900/95 backdrop-blur-sm">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{partner}</h2>
          {partner === OTHER_MATRIX_BUCKET && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-snug">
              Partners outside the strategic matrix rows — listed by product below.
            </p>
          )}
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold leading-relaxed">
            {activeReleases.length} active · {naCount} n/a
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
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${STAGES[stage]?.badge || 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200'}`}
          >
            {stage} <span className="tabular-nums font-bold">{count}</span>
          </span>
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
