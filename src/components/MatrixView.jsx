/**
 * MatrixView — color-coded release grid (hero view)
 * Rows = partners (from live API), Columns = products
 * Click a cell → open PartnerView panel
 */
import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, DollarSign, UserX } from 'lucide-react';
import { PRODUCTS, STAGES } from '../data/constants.js';
import { useData } from '../data/DataContext.jsx';

function Cell({ release, onClick }) {
  if (!release) {
    return (
      <td className="border border-slate-200 p-1 text-center w-24">
        <span className="text-slate-300 text-xs">—</span>
      </td>
    );
  }

  const stage = release.stage || 'N/A';
  const s = STAGES[stage] || STAGES['N/A'];
  const isNA = stage === 'N/A';
  const hasAlert = release.blocked || release.redAccount || release.missingPM ||
    (release.daysInEAP && release.daysInEAP > 90);

  return (
    <td
      className={`border border-slate-200 p-1 text-center w-24 transition-all ${isNA ? 'bg-slate-50' : 'cursor-pointer hover:ring-2 hover:ring-inset hover:ring-blue-400 hover:brightness-95'}`}
      onClick={() => !isNA && onClick(release)}
      title={release.notes}
    >
      <div className="relative inline-flex flex-col items-center gap-0.5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${s.badge} ${isNA ? 'opacity-40' : ''}`}>
          {s.label}
        </span>
        {hasAlert && (
          <span className="flex gap-0.5 mt-0.5">
            {release.blocked      && <AlertCircle  size={10} className="text-red-500" />}
            {release.redAccount   && <DollarSign   size={10} className="text-red-500" />}
            {release.missingPM    && <UserX         size={10} className="text-amber-500" />}
            {(release.daysInEAP > 90 && !release.blocked) && <AlertTriangle size={10} className="text-amber-500" />}
          </span>
        )}
      </div>
    </td>
  );
}

function SummaryBar({ summary }) {
  const stageOrder = ['GA', 'Beta', 'EAP', 'Dev', 'Planned', 'Blocked'];
  return (
    <div className="flex flex-wrap gap-2 items-center px-4 py-2 bg-white border-b border-slate-200">
      <span className="text-xs text-slate-500 font-medium mr-1">Portfolio:</span>
      {stageOrder.map(stage => (
        (summary.byStage?.[stage] || 0) > 0 && (
          <span key={stage} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STAGES[stage].badge}`}>
            {STAGES[stage].label}
            <span className="font-bold">{summary.byStage[stage]}</span>
          </span>
        )
      ))}
      <div className="flex gap-3 ml-auto text-xs text-slate-600">
        {summary.blocked > 0    && <span className="flex items-center gap-1 text-red-600 font-semibold"><AlertCircle size={12}/>{summary.blocked} blocked</span>}
        {summary.redAccounts > 0 && <span className="flex items-center gap-1 text-red-600 font-semibold"><DollarSign size={12}/>{summary.redAccounts} red acct</span>}
        {summary.missingPM > 0  && <span className="flex items-center gap-1 text-amber-600 font-semibold"><UserX size={12}/>{summary.missingPM} no PM</span>}
      </div>
    </div>
  );
}

export default function MatrixView({ onSelectPartner, onSelectRelease }) {
  const [hoveredPartner, setHoveredPartner] = useState(null);
  const { summary, partners, getRelease } = useData();

  return (
    <div className="flex flex-col h-full">
      <SummaryBar summary={summary} />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200">
        <span className="text-xs text-slate-500 font-medium">Legend:</span>
        {Object.entries(STAGES).map(([key, s]) => (
          key !== 'N/A' && (
            <span key={key} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${s.badge}`}>
              {s.label}
            </span>
          )
        ))}
        <span className="inline-flex items-center gap-1 text-xs text-slate-500 ml-2">
          <AlertCircle size={11} className="text-red-500" /> Blocked
          <DollarSign size={11} className="text-red-500 ml-1" /> Red Acct
          <UserX size={11} className="text-amber-500 ml-1" /> No PM
          <AlertTriangle size={11} className="text-amber-500 ml-1" /> Overdue EAP
        </span>
      </div>

      {/* Matrix table */}
      <div className="flex-1 overflow-auto scrollbar-thin px-4 py-3">
        <table className="border-collapse text-sm w-full">
          <thead>
            <tr className="bg-slate-800 text-white sticky top-0 z-10">
              <th className="border border-slate-600 px-3 py-2 text-left text-xs font-semibold w-36 min-w-36">
                Partner
              </th>
              {PRODUCTS.map(p => (
                <th key={p} className="border border-slate-600 px-2 py-2 text-center text-xs font-semibold w-24">
                  {p}
                </th>
              ))}
              <th className="border border-slate-600 px-2 py-2 text-center text-xs font-semibold w-20">
                SE Lead
              </th>
              <th className="border border-slate-600 px-2 py-2 text-center text-xs font-semibold w-20">
                CSM
              </th>
            </tr>
          </thead>
          <tbody>
            {partners.map((partner, idx) => {
              const releases = PRODUCTS.map(p => getRelease(partner, p));
              const firstRelease = releases.find(r => r);
              const seLead = firstRelease?.se_lead;
              const csm = firstRelease?.csm;
              const hasException = releases.some(r =>
                r && (r.blocked || r.redAccount || r.missingPM || (r.daysInEAP > 90))
              );
              const isHovered = hoveredPartner === partner;

              return (
                <tr
                  key={partner}
                  className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} ${isHovered ? 'bg-blue-50' : ''}`}
                  onMouseEnter={() => setHoveredPartner(partner)}
                  onMouseLeave={() => setHoveredPartner(null)}
                >
                  <td
                    className="border border-slate-200 px-3 py-1.5 cursor-pointer hover:text-blue-700 hover:underline"
                    onClick={() => onSelectPartner(partner)}
                  >
                    <div className="flex items-center gap-1.5">
                      {hasException && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                      <span className="font-medium text-xs">{partner}</span>
                    </div>
                  </td>

                  {releases.map((release, pi) => (
                    <Cell
                      key={PRODUCTS[pi]}
                      release={release}
                      onClick={onSelectRelease}
                    />
                  ))}

                  <td className="border border-slate-200 px-2 py-1.5 text-center">
                    {seLead ? (
                      <span className="text-xs text-slate-600">{seLead.split(' ')[0]}</span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>

                  <td className="border border-slate-200 px-2 py-1.5 text-center">
                    {csm ? (
                      <span className="text-xs text-slate-600">{csm.split(' ')[0]}</span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 text-xs text-slate-400 flex items-center justify-between">
        <span>{partners.length} partners × {PRODUCTS.length} products</span>
        <span>Click any cell or partner name for details</span>
      </div>
    </div>
  );
}
