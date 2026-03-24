/**
 * MatrixView — release grid with light, readable layout (soft grid, airy type)
 */
import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, DollarSign, UserX } from 'lucide-react';
import { STAGES } from '../data/stages.js';
import {
  OTHER_MATRIX_BUCKET,
  matrixPartnerBucket,
  matrixPartnerSegment,
} from '../data/matrixPartners.js';
import { useData } from '../context/DataContext.jsx';

const AREA_HEADER_TINT = [
  'bg-violet-50/90 text-violet-900',
  'bg-sky-50/90 text-sky-900',
  'bg-teal-50/90 text-teal-900',
  'bg-amber-50/90 text-amber-900',
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
  const hasAlert =
    release.blocked ||
    release.redAccount ||
    release.missingPM ||
    (release.daysInEAP && release.daysInEAP > 90);
  const isBlocked = !!release.blocked;
  const isCritical = isBlocked || !!release.redAccount;

  return (
    <td
      className={`px-1 py-2.5 text-center align-middle transition-colors ${
        isCritical
          ? 'ring-2 ring-inset ring-red-400/90 dark:ring-red-500/70 bg-red-50/90 dark:bg-red-950/35'
          : hasAlert
            ? 'ring-2 ring-inset ring-amber-400/75 dark:ring-amber-500/50 bg-amber-50/70 dark:bg-amber-950/25'
            : ''
      } ${isNA ? '' : 'cursor-pointer hover:bg-sky-50/70 dark:hover:bg-sky-950/40'} ${tdClass}`}
      onClick={() => !isNA && onClick(release)}
      title={titleProp ?? release.notes ?? ''}
    >
      <div className="inline-flex flex-col items-center gap-1">
        <span
          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold leading-tight ${s.badge} ${isNA ? 'opacity-45' : ''} ${isCritical ? 'font-extrabold shadow-sm' : ''}`}
        >
          {s.label}
        </span>
        {hasAlert && (
          <span className="flex gap-0.5">
            {release.blocked && (
              <AlertCircle size={12} className="text-red-600 dark:text-red-400" strokeWidth={2.5} />
            )}
            {release.redAccount && (
              <DollarSign size={12} className="text-red-600 dark:text-red-400" strokeWidth={2.5} />
            )}
            {release.missingPM && (
              <UserX size={12} className="text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
            )}
            {release.daysInEAP > 90 && !release.blocked && (
              <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
            )}
          </span>
        )}
      </div>
    </td>
  );
}

function SummaryBar({ summary }) {
  const stageOrder = ['GA', 'Beta', 'EAP', 'Dev', 'Planned', 'Blocked'];
  return (
    <div className="flex flex-wrap gap-2 items-center px-4 sm:px-5 py-3.5">
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mr-1">
        Portfolio
      </span>
      {stageOrder.map(
        (stage) =>
          summary.byStage[stage] > 0 && (
            <span
              key={stage}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${STAGES[stage].badge}`}
            >
              {STAGES[stage].label}
              <span className="tabular-nums font-bold opacity-95">{summary.byStage[stage]}</span>
            </span>
          )
      )}
      <div className="flex flex-wrap gap-3 ml-auto text-sm text-slate-600 dark:text-slate-300">
        {summary.blocked > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-200 font-bold ring-1 ring-red-300/80 dark:ring-red-600/50">
            <AlertCircle size={14} strokeWidth={2.5} />
            {summary.blocked} blocked
          </span>
        )}
        {summary.redAccounts > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-200 font-bold ring-1 ring-red-300/80 dark:ring-red-600/50">
            <DollarSign size={14} strokeWidth={2.5} />
            {summary.redAccounts} red acct
          </span>
        )}
        {summary.missingPM > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-100 font-bold ring-1 ring-amber-300/80 dark:ring-amber-600/40">
            <UserX size={14} strokeWidth={2.5} />
            {summary.missingPM} no PM
          </span>
        )}
      </div>
    </div>
  );
}

export default function MatrixView({ onSelectPartner, onSelectRelease }) {
  const [hoveredPartner, setHoveredPartner] = useState(null);
  const {
    releases,
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

      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 pb-2 text-sm text-slate-500 dark:text-slate-400">
        <span className="font-bold text-slate-500 dark:text-slate-400">Legend</span>
        {Object.entries(STAGES).map(
          ([key, s]) =>
            key !== 'N/A' && (
              <span
                key={key}
                className={`inline-flex items-center px-2 py-1 rounded-md font-semibold ${s.badge} text-xs`}
              >
                {s.label}
              </span>
            )
        )}
        <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 ml-1">
          <span className="inline-flex items-center gap-0.5 font-semibold">
            <AlertCircle size={12} className="text-red-600 dark:text-red-400" strokeWidth={2.5} /> blocked
          </span>
          <span className="inline-flex items-center gap-0.5 font-semibold">
            <DollarSign size={12} className="text-red-600 dark:text-red-400" strokeWidth={2.5} /> red
          </span>
          <span className="inline-flex items-center gap-0.5 font-semibold">
            <UserX size={12} className="text-amber-600 dark:text-amber-400" strokeWidth={2.5} /> no PM
          </span>
          <span className="inline-flex items-center gap-0.5 font-semibold">
            <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400" strokeWidth={2.5} /> EAP
          </span>
        </span>
        {loading && <span className="text-slate-400 dark:text-slate-500 ml-auto font-medium">Loading…</span>}
      </div>

      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin px-4 sm:px-5 pb-4">
        {!loading && releases.length === 0 && (
          <div className="rounded-2xl bg-white/90 dark:bg-slate-900/90 ring-1 ring-slate-200/60 dark:ring-slate-700 shadow-soft px-6 py-14 text-center">
            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">No release data to show</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              {dataStatus === 'error'
                ? loadError || 'Could not load /api/releases.'
                : 'The API returned no rows. Sync or ingest releases, then refresh.'}
            </p>
          </div>
        )}
        {loading && releases.length === 0 && (
          <div className="rounded-2xl bg-white/90 dark:bg-slate-900/90 ring-1 ring-slate-200/60 dark:ring-slate-700 shadow-soft px-6 py-14 text-center">
            <p className="text-base font-semibold text-slate-600 dark:text-slate-300">Loading release data…</p>
          </div>
        )}
        {releases.length > 0 && (
        <div className="rounded-2xl bg-white/90 dark:bg-slate-900/85 ring-1 ring-slate-200/60 dark:ring-slate-700/80 shadow-soft overflow-hidden">
          <table className="w-full text-[0.95rem] sm:text-base border-collapse">
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 z-30 w-[11rem] min-w-[11rem] bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-3 py-3 text-left align-bottom border-b border-r border-slate-100 dark:border-slate-700"
                >
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Partner
                  </span>
                </th>
                {productAreaGroups.map((g, gi) => (
                  <th
                    key={g.area}
                    colSpan={g.products.length}
                    className={`px-2 py-2 text-center align-middle border-b border-slate-100 dark:border-slate-700 ${AREA_HEADER_TINT[gi % AREA_HEADER_TINT.length]} dark:opacity-95 dark:ring-1 dark:ring-slate-600/30`}
                  >
                    <span className="text-[10px] font-semibold leading-snug tracking-wide">{g.area}</span>
                  </th>
                ))}
                <th
                  rowSpan={2}
                  className="px-2 py-3 text-center align-bottom border-b border-l border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 w-16"
                >
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    SE
                  </span>
                </th>
                <th
                  rowSpan={2}
                  className="px-2 py-3 text-center align-bottom border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 w-16"
                >
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    CSM
                  </span>
                </th>
              </tr>
              <tr>
                {productAreaGroups.map((g, gi) =>
                  g.products.map((p, pi) => (
                    <th
                      key={p}
                      className={`px-1.5 py-2 text-center align-middle border-b border-slate-100 dark:border-slate-700 max-w-[4.5rem] ${AREA_HEADER_TINT[gi % AREA_HEADER_TINT.length]} dark:opacity-95 ${pi === 0 ? 'border-l border-l-slate-200/60 dark:border-l-slate-600' : ''}`}
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
                const csm = firstRelease?.csm;
                const hasException = rowReleases.some(
                  (r) => r && (r.blocked || r.redAccount || r.missingPM || r.daysInEAP > 90)
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
                        {hasException && (
                          <span
                            className="w-1.5 h-9 rounded-full bg-red-500 dark:bg-red-500 flex-shrink-0 ring-2 ring-red-200/80 dark:ring-red-800"
                            aria-hidden
                          />
                        )}
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
                          const base = release.notes || '';
                          if (isOtherRow) {
                            const n = releases.filter(
                              (r) =>
                                r.product === p && matrixPartnerBucket(r.partner) == null
                            ).length;
                            cellTitle =
                              n > 1
                                ? `${base ? `${base}\n` : ''}Representative of ${n} GSP rows (highest-severity first).`
                                : base;
                          } else {
                            const n = releases.filter(
                              (r) =>
                                r.product === p && matrixPartnerBucket(r.partner) === rowKey
                            ).length;
                            cellTitle =
                              n > 1
                                ? `${base ? `${base}\n` : ''}${n} rows mapped to this partner (showing highest-severity).`
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

                    <td className="border-b border-l border-slate-100 dark:border-slate-700 px-1 py-2 text-center bg-slate-50/20 dark:bg-slate-800/30">
                      {seLead ? (
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {seLead.split(' ')[0]}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
                      )}
                    </td>

                    <td className="border-b border-slate-100 dark:border-slate-700 px-1 py-2 text-center bg-slate-50/20 dark:bg-slate-800/30">
                      {csm ? (
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {csm.split(' ')[0]}
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

      <div className="px-4 sm:px-5 py-2.5 text-sm text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/50 dark:border-slate-700/60">
        <span className="font-medium">
          {matrixPartners.length} matrix rows × {totalCols} products
        </span>
        <span>Select a cell or partner for detail</span>
      </div>
    </div>
  );
}
