/**
 * MatrixView — release grid (v1.2: matrix-eligible rows only, no exception cell chrome)
 */
import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { STAGES } from '../data/stages.js';
import {
  OTHER_MATRIX_BUCKET,
  matrixPartnerBucket,
  matrixPartnerSegment,
} from '../data/matrixPartners.js';
import { getMatrixPmDisplay, PARTNER_PM_LEGEND } from '../data/partnerPmMatrix.js';
import { useData } from '../context/DataContext.jsx';
import { matrixCellTooltip } from '../utils/releaseDisplay.js';
import JiraMondayLinks from './JiraMondayLinks.jsx';
import StatusBadge from './StatusBadge.jsx';
import { cn } from '../lib/utils.js';

const AREA_HEADER_TINT = [
  'bg-violet-50/90 text-violet-900',
  'bg-sky-50/90 text-sky-900',
  'bg-teal-50/90 text-teal-900',
];

function Cell({ release, onClick, tdClass = '', title: titleProp }) {
  if (!release) {
    return (
      <td className={`px-1 py-2.5 text-center align-middle ${tdClass}`}>
        <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
      </td>
    );
  }

  const stage = release.stage || 'N/A';
  const s = STAGES[stage] || STAGES['N/A'];
  const isNA = stage === 'N/A';
  const label = release.pmo_status || s.label;

  return (
    <td
      className={`px-1 py-2.5 text-center align-middle transition-colors ${
        isNA ? '' : 'cursor-pointer hover:bg-sky-50/70 dark:hover:bg-sky-950/40'
      } ${tdClass}`}
      onClick={() => !isNA && onClick(release)}
      title={titleProp ?? matrixCellTooltip(release)}
    >
      <div className="inline-flex flex-col items-center gap-0.5">
        <StatusBadge
          status={label.length > 18 ? `${label.slice(0, 16)}…` : label}
          className={cn('leading-tight', isNA && 'opacity-45')}
        />
        {release.legacy_sourced ? (
          <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300">Legacy</span>
        ) : null}
        {(release.mondayUrl || (release.jiraLinks && release.jiraLinks.length > 0)) && (
          <div
            className="mt-1 max-w-[7rem] mx-auto"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            <JiraMondayLinks jiraLinks={release.jiraLinks || []} mondayUrl={release.mondayUrl} compact />
          </div>
        )}
      </div>
    </td>
  );
}

function SummaryBar({ summary }) {
  const stageOrder = ['GA', 'Beta', 'EAP', 'Dev', 'Planned', 'OnHold'];
  return (
    <div className="flex flex-wrap gap-2 items-center px-5 py-4 border-b border-slate-200">
      <div className="mr-2">
        <span className="text-[11px] font-semibold text-bud-purple dark:text-bud-teal uppercase tracking-[0.24em]">
          Matrix Overview
        </span>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-1">Partner x product portfolio coverage</p>
      </div>
      {stageOrder.map(
        (stage) =>
          (summary.byStage[stage] || 0) > 0 && (
            <StatusBadge key={stage} status={STAGES[stage].label} className="gap-2 px-3 py-1.5 text-xs normal-case tracking-normal">
              <span className="font-mono font-bold opacity-95">{summary.byStage[stage]}</span>
            </StatusBadge>
          )
      )}
      <div className="flex flex-wrap gap-3 ml-auto text-sm text-slate-600 dark:text-slate-300">
        {(summary.withSchedule || 0) > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-semibold ring-1 ring-emerald-200/80">
            <Calendar size={14} strokeWidth={2.5} />
            {summary.withSchedule} with schedule
          </span>
        )}
      </div>
    </div>
  );
}

export default function MatrixView({ onSelectPartner, onSelectRelease }) {
  const [hoveredPartner, setHoveredPartner] = useState(null);
  const {
    matrixReleases,
    matrixPartners,
    productAreaGroups,
    matrixProductOrder,
    getMatrixRelease,
    getSummary,
    loading,
    dataStatus,
    loadError,
  } = useData();
  const summary = getSummary();
  const totalCols = matrixProductOrder.length;

  return (
    <div className="flex flex-col h-full min-h-0">
      <SummaryBar summary={summary} />

      <div className="flex flex-wrap items-center gap-2 px-5 py-3 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-100">
        <span className="font-bold text-slate-500 dark:text-slate-400">Legend</span>
        {Object.entries(STAGES).map(
          ([key, s]) =>
            key !== 'N/A' && (
              <StatusBadge key={key} status={s.label} className="text-xs" />
            )
        )}
        <span className="text-slate-400 dark:text-slate-500 ml-2 text-xs">
          Cell shows PMO status (truncated) · see card for full text
        </span>
        {loading && <span className="text-slate-400 dark:text-slate-500 ml-auto font-medium">Loading…</span>}
      </div>

      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin px-5 pb-5">
        {!loading && matrixReleases.length === 0 && (
          <div className="rounded-2xl bg-white/90 dark:bg-slate-900/90 ring-1 ring-slate-200/60 dark:ring-slate-700 shadow-soft px-6 py-14 text-center">
            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">No release data to show</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              {dataStatus === 'error'
                ? loadError || 'Could not load /api/releases.'
                : 'The API returned no matrix rows. Run Monday-first sync, then refresh.'}
            </p>
          </div>
        )}
        {loading && matrixReleases.length === 0 && (
          <div className="rounded-2xl bg-white/90 dark:bg-slate-900/90 ring-1 ring-slate-200/60 dark:ring-slate-700 shadow-soft px-6 py-14 text-center">
            <p className="text-base font-semibold text-slate-600 dark:text-slate-300">Loading release data…</p>
          </div>
        )}
        {matrixReleases.length > 0 && (
          <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-soft">
            <table className="w-full text-[0.95rem] sm:text-base border-collapse">
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-30 w-[11rem] min-w-[11rem] bg-white px-3 py-3 text-left align-bottom border-b border-r border-slate-200"
                  >
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Partner
                    </span>
                  </th>
                  {productAreaGroups.map((g, gi) => (
                    <th
                      key={g.area || g.bucket}
                      colSpan={g.products.length}
                      className={`px-2 py-2 text-center align-middle border-b border-slate-200 ${AREA_HEADER_TINT[gi % AREA_HEADER_TINT.length]}`}
                    >
                      <span className="text-[10px] font-semibold leading-snug tracking-wide">
                        {g.bucket || g.area}
                      </span>
                    </th>
                  ))}
                  <th
                    rowSpan={2}
                    className="px-1.5 py-3 text-center align-bottom border-b border-l border-slate-200 bg-slate-50 min-w-[6.75rem] max-w-[7.5rem]"
                  >
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      PM
                    </span>
                  </th>
                  <th
                    rowSpan={2}
                    className="px-2 py-3 text-center align-bottom border-b border-slate-200 bg-slate-50 w-16"
                  >
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      SE
                    </span>
                  </th>
                </tr>
                <tr>
                  {productAreaGroups.map((g, gi) =>
                    g.products.map((p, pi) => (
                      <th
                        key={p}
                        className={`px-1.5 py-2 text-center align-middle border-b border-slate-200 max-w-[4.5rem] ${AREA_HEADER_TINT[gi % AREA_HEADER_TINT.length]} ${pi === 0 ? 'border-l border-l-slate-200' : ''}`}
                      >
                        <span className="text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight block hyphens-auto">
                          {p}
                        </span>
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {matrixPartners.map((rowKey, idx) => {
                  const rowReleases = matrixProductOrder.map((p) => getMatrixRelease(rowKey, p));
                  const firstRelease = rowReleases.find((r) => r);
                  const seLead = firstRelease?.se_lead;
                  const { label: pmLabel, fromMapping: pmFromMapping } = getMatrixPmDisplay(
                    rowKey,
                    firstRelease
                  );
                  const isHovered = hoveredPartner === rowKey;
                  const rowBg =
                    idx % 2 === 0 ? 'bg-white dark:bg-slate-900/40' : 'bg-slate-50/40 dark:bg-slate-800/30';
                  const segment = matrixPartnerSegment(rowKey);
                  const isOtherRow = rowKey === OTHER_MATRIX_BUCKET;

                  return (
                    <tr
                      key={rowKey}
                      className={`${rowBg} ${isHovered ? '!bg-sky-50/50 dark:!bg-sky-950/40' : ''} transition-colors`}
                      onMouseEnter={() => setHoveredPartner(rowKey)}
                      onMouseLeave={() => setHoveredPartner(null)}
                    >
                      <td
                        className={`sticky left-0 z-20 px-3 py-2.5 border-b border-r border-slate-100 dark:border-slate-700 cursor-pointer ${rowBg} ${isHovered ? '!bg-sky-50/50 dark:!bg-sky-950/40' : ''} backdrop-blur-sm`}
                        onClick={() => onSelectPartner(rowKey)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="min-w-0">
                            <span
                              className={`font-semibold text-sm text-slate-800 dark:text-slate-100 leading-snug hover:text-rc-blue dark:hover:text-sky-400 transition-colors block ${isOtherRow ? 'italic text-slate-600 dark:text-slate-400' : ''}`}
                            >
                              {rowKey}
                            </span>
                            {segment && (
                              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight block mt-0.5">
                                {segment}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {productAreaGroups.map((g, gi) =>
                        g.products.map((p, pi) => {
                          const release = getMatrixRelease(rowKey, p);
                          let cellTitle;
                          if (release) {
                            const base = matrixCellTooltip(release);
                            if (isOtherRow) {
                              const n = matrixReleases.filter(
                                (r) => r.product === p && matrixPartnerBucket(r.partner) == null
                              ).length;
                              cellTitle =
                                n > 1
                                  ? matrixCellTooltip(release, `Representative of ${n} GSP rows (by priority).`)
                                  : base;
                            } else {
                              const n = matrixReleases.filter(
                                (r) => r.product === p && matrixPartnerBucket(r.partner) === rowKey
                              ).length;
                              cellTitle =
                                n > 1
                                  ? matrixCellTooltip(release, `${n} rows (showing highest priority).`)
                                  : base;
                            }
                          }
                          const band =
                            gi % 2 === 0
                              ? 'bg-white/30 dark:bg-slate-900/20'
                              : 'bg-slate-50/25 dark:bg-slate-800/20';
                          const groupEdge = pi === 0 ? 'border-l border-l-slate-200/50 dark:border-l-slate-600/50' : '';
                          return (
                            <Cell
                              key={p}
                              release={release}
                              onClick={onSelectRelease}
                              title={cellTitle}
                              tdClass={`border-b border-slate-100 ${band} ${groupEdge}`}
                            />
                          );
                        })
                      )}

                      <td
                        className="border-b border-l border-slate-100 dark:border-slate-700 px-1 py-2 text-center align-middle bg-slate-50/20 dark:bg-slate-800/30 min-w-[6.75rem] max-w-[7.5rem]"
                        title={
                          pmLabel
                            ? pmFromMapping
                              ? `${pmLabel} (Partner PM mapping)`
                              : pmLabel
                            : undefined
                        }
                      >
                        {pmLabel ? (
                          <span
                            className={`text-[9px] sm:text-[10px] font-semibold text-slate-700 dark:text-slate-200 leading-tight block hyphens-auto ${
                              pmFromMapping ? 'text-sky-900 dark:text-sky-200' : ''
                            }`}
                          >
                            {pmFromMapping
                              ? pmLabel
                              : pmLabel.split(' ')[0]}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
                        )}
                      </td>

                      <td className="border-b border-slate-100 dark:border-slate-700 px-1 py-2 text-center bg-slate-50/20 dark:bg-slate-800/30">
                        {seLead ? (
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {seLead.split(' ')[0]}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="px-4 sm:px-5 py-3 border-t border-slate-200/50 dark:border-slate-700/60 bg-slate-50/40 dark:bg-slate-900/30">
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
          Partner PM mapping
        </p>
        <ul className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 leading-snug space-y-1 list-none m-0 p-0">
          {PARTNER_PM_LEGEND.map((row) => (
            <li key={row.pm}>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{row.pm}</span>
              <span className="text-slate-400 dark:text-slate-500"> ({row.count})</span>
              <span className="text-slate-500 dark:text-slate-400"> — {row.partners}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-4 sm:px-5 py-2.5 text-sm text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/50 dark:border-slate-700/60">
        <span className="font-medium">
          {matrixPartners.length} matrix rows × {totalCols} products
        </span>
        <span>Select a cell or partner for detail</span>
      </div>
    </div>
  );
}
