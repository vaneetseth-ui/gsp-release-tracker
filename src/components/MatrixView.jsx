/**
 * MatrixView — release grid with light, readable layout (soft grid, airy type)
 */
import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, DollarSign, UserX } from 'lucide-react';
import { STAGES } from '../data/stages.js';
import { useData } from '../context/DataContext.jsx';

const AREA_HEADER_TINT = [
  'bg-violet-50/90 text-violet-900',
  'bg-sky-50/90 text-sky-900',
  'bg-teal-50/90 text-teal-900',
  'bg-amber-50/90 text-amber-900',
];

function Cell({ release, onClick, tdClass = '' }) {
  if (!release) {
    return (
      <td className={`px-1 py-2 text-center align-middle ${tdClass}`}>
        <span className="text-slate-300 text-[11px]">—</span>
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

  return (
    <td
      className={`px-1 py-2 text-center align-middle transition-colors ${isNA ? '' : 'cursor-pointer hover:bg-sky-50/60'} ${tdClass}`}
      onClick={() => !isNA && onClick(release)}
      title={release.notes}
    >
      <div className="inline-flex flex-col items-center gap-1">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium leading-none ${s.badge} ${isNA ? 'opacity-45' : ''}`}
        >
          {s.label}
        </span>
        {hasAlert && (
          <span className="flex gap-0.5">
            {release.blocked && <AlertCircle size={9} className="text-red-500" strokeWidth={2} />}
            {release.redAccount && <DollarSign size={9} className="text-red-500" strokeWidth={2} />}
            {release.missingPM && <UserX size={9} className="text-amber-500" strokeWidth={2} />}
            {release.daysInEAP > 90 && !release.blocked && (
              <AlertTriangle size={9} className="text-amber-500" strokeWidth={2} />
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
    <div className="flex flex-wrap gap-2 items-center px-4 sm:px-5 py-3">
      <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mr-1">Portfolio</span>
      {stageOrder.map(
        (stage) =>
          summary.byStage[stage] > 0 && (
            <span
              key={stage}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${STAGES[stage].badge}`}
            >
              {STAGES[stage].label}
              <span className="tabular-nums font-semibold opacity-90">{summary.byStage[stage]}</span>
            </span>
          )
      )}
      <div className="flex flex-wrap gap-3 ml-auto text-[11px] text-slate-600">
        {summary.blocked > 0 && (
          <span className="inline-flex items-center gap-1 text-red-600 font-medium">
            <AlertCircle size={12} strokeWidth={2} />
            {summary.blocked} blocked
          </span>
        )}
        {summary.redAccounts > 0 && (
          <span className="inline-flex items-center gap-1 text-red-600 font-medium">
            <DollarSign size={12} strokeWidth={2} />
            {summary.redAccounts} red acct
          </span>
        )}
        {summary.missingPM > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
            <UserX size={12} strokeWidth={2} />
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
    partners,
    productAreaGroups,
    matrixProductOrder,
    getRelease,
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

      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 pb-2 text-[11px] text-slate-500">
        <span className="font-medium text-slate-400">Legend</span>
        {Object.entries(STAGES).map(
          ([key, s]) =>
            key !== 'N/A' && (
              <span
                key={key}
                className={`inline-flex items-center px-2 py-0.5 rounded-md font-medium ${s.badge} text-[10px]`}
              >
                {s.label}
              </span>
            )
        )}
        <span className="inline-flex items-center gap-2 text-slate-400 ml-1">
          <span className="inline-flex items-center gap-0.5">
            <AlertCircle size={10} className="text-red-500" /> blocked
          </span>
          <span className="inline-flex items-center gap-0.5">
            <DollarSign size={10} className="text-red-500" /> red
          </span>
          <span className="inline-flex items-center gap-0.5">
            <UserX size={10} className="text-amber-500" /> no PM
          </span>
          <span className="inline-flex items-center gap-0.5">
            <AlertTriangle size={10} className="text-amber-500" /> EAP
          </span>
        </span>
        {loading && <span className="text-slate-400 ml-auto">Loading…</span>}
      </div>

      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin px-4 sm:px-5 pb-4">
        {!loading && partners.length === 0 && (
          <div className="rounded-2xl bg-white/90 ring-1 ring-slate-200/60 shadow-soft px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-700">No release data to show</p>
            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              {dataStatus === 'error'
                ? loadError || 'Could not load /api/releases.'
                : 'The API returned no rows. Sync or ingest releases, then refresh.'}
            </p>
          </div>
        )}
        {(loading || partners.length > 0) && (
        <div className="rounded-2xl bg-white/90 ring-1 ring-slate-200/60 shadow-soft overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 z-30 w-[9.5rem] min-w-[9.5rem] bg-white/95 backdrop-blur-sm px-3 py-3 text-left align-bottom border-b border-r border-slate-100"
                >
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    Partner
                  </span>
                </th>
                {productAreaGroups.map((g, gi) => (
                  <th
                    key={g.area}
                    colSpan={g.products.length}
                    className={`px-2 py-2 text-center align-middle border-b border-slate-100 ${AREA_HEADER_TINT[gi % AREA_HEADER_TINT.length]}`}
                  >
                    <span className="text-[10px] font-semibold leading-snug tracking-wide">{g.area}</span>
                  </th>
                ))}
                <th
                  rowSpan={2}
                  className="px-2 py-3 text-center align-bottom border-b border-l border-slate-100 bg-slate-50/50 w-16"
                >
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">SE</span>
                </th>
                <th
                  rowSpan={2}
                  className="px-2 py-3 text-center align-bottom border-b border-slate-100 bg-slate-50/50 w-16"
                >
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">CSM</span>
                </th>
              </tr>
              <tr>
                {productAreaGroups.map((g, gi) =>
                  g.products.map((p, pi) => (
                    <th
                      key={p}
                      className={`px-1.5 py-2 text-center align-middle border-b border-slate-100 max-w-[4.5rem] ${AREA_HEADER_TINT[gi % AREA_HEADER_TINT.length]} ${pi === 0 ? 'border-l border-l-slate-200/60' : ''}`}
                    >
                      <span className="text-[9px] sm:text-[10px] font-medium text-slate-600 leading-tight block hyphens-auto">
                        {p}
                      </span>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {partners.map((partner, idx) => {
                const rowReleases = matrixProductOrder.map((p) => getRelease(partner, p));
                const firstRelease = rowReleases.find((r) => r);
                const seLead = firstRelease?.se_lead;
                const csm = firstRelease?.csm;
                const hasException = rowReleases.some(
                  (r) => r && (r.blocked || r.redAccount || r.missingPM || r.daysInEAP > 90)
                );
                const isHovered = hoveredPartner === partner;
                const rowBg =
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40';

                return (
                  <tr
                    key={partner}
                    className={`${rowBg} ${isHovered ? '!bg-sky-50/50' : ''} transition-colors`}
                    onMouseEnter={() => setHoveredPartner(partner)}
                    onMouseLeave={() => setHoveredPartner(null)}
                  >
                    <td
                      className={`sticky left-0 z-20 px-3 py-2 border-b border-r border-slate-100 cursor-pointer ${rowBg} ${isHovered ? '!bg-sky-50/50' : ''} backdrop-blur-sm`}
                      onClick={() => onSelectPartner(partner)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {hasException && (
                          <span className="w-1 h-8 rounded-full bg-red-400/80 flex-shrink-0" aria-hidden />
                        )}
                        <span className="font-medium text-xs text-slate-800 leading-snug hover:text-rc-blue transition-colors">
                          {partner}
                        </span>
                      </div>
                    </td>

                    {productAreaGroups.map((g, gi) =>
                      g.products.map((p, pi) => {
                        const release = getRelease(partner, p);
                        const band = gi % 2 === 0 ? 'bg-white/30' : 'bg-slate-50/25';
                        const groupEdge = pi === 0 ? 'border-l border-l-slate-200/50' : '';
                        return (
                          <Cell
                            key={p}
                            release={release}
                            onClick={onSelectRelease}
                            tdClass={`border-b border-slate-100 ${band} ${groupEdge}`}
                          />
                        );
                      })
                    )}

                    <td className="border-b border-l border-slate-100 px-1 py-2 text-center bg-slate-50/20">
                      {seLead ? (
                        <span className="text-[10px] font-medium text-slate-600">{seLead.split(' ')[0]}</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    <td className="border-b border-slate-100 px-1 py-2 text-center bg-slate-50/20">
                      {csm ? (
                        <span className="text-[10px] font-medium text-slate-600">{csm.split(' ')[0]}</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
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

      <div className="px-4 sm:px-5 py-2.5 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/50">
        <span>
          {partners.length} partners × {totalCols} products
        </span>
        <span className="text-slate-400">Select a cell or partner for detail</span>
      </div>
    </div>
  );
}
