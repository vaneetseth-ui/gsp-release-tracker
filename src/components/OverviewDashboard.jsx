import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Clock3,
  FolderKanban,
  MessagesSquare,
  Radar,
  Users,
} from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import StatusBadge from './StatusBadge.jsx';
import { cn } from '../lib/utils.js';

function formatDate(value) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function milestoneDate(release) {
  return release.gsp_launch_date || release.product_readiness_date || release.target_date || null;
}

function milestoneLabel(release) {
  if (release.gsp_launch_date) return 'Launch';
  if (release.product_readiness_date) return 'Readiness';
  if (release.target_date) return 'Target';
  return 'Schedule';
}

function severityRank(gap) {
  if (gap.severity === 'Critical') return 3;
  if (gap.severity === 'High') return 2;
  if (gap.severity === 'Medium') return 1;
  return 0;
}

function MetricCard({ icon: Icon, label, value, detail, tone = 'default' }) {
  const toneMap = {
    primary: 'bg-cyan-50 border-cyan-100',
    success: 'bg-emerald-50 border-emerald-100',
    warning: 'bg-amber-50 border-amber-100',
    accent: 'bg-violet-50 border-violet-100',
    default: 'bg-white border-slate-200',
  };
  const iconTone = {
    primary: 'bg-cyan-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    accent: 'bg-violet-500',
    default: 'bg-slate-900',
  };

  return (
    <div className={cn('rounded-[24px] border bg-white p-6 shadow-sm', toneMap[tone] || toneMap.default)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-sm', iconTone[tone] || iconTone.default)}>
          <Icon size={20} strokeWidth={2.1} />
        </div>
        <span className="rounded-lg bg-white/70 px-2 py-1 font-mono text-xs font-medium text-slate-500 ring-1 ring-slate-200/80">
          live
        </span>
      </div>
      <h3 className="text-sm font-medium text-slate-500">{label}</h3>
      <p className="mt-1 font-mono text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

function SectionHeader({ icon: Icon, eyebrow, title, detail, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-bud-teal">{eyebrow}</p>
        <h2 className="mt-1 flex items-center gap-2 text-xl font-display font-bold tracking-tight text-slate-950">
          <Icon size={18} strokeWidth={2.2} className="text-bud-purple" />
          {title}
        </h2>
        {detail ? <p className="mt-1 text-sm text-slate-500">{detail}</p> : null}
      </div>
      {action}
    </div>
  );
}

function AttentionItem({ item, onSelectPartner }) {
  return (
    <button
      type="button"
      onClick={() => onSelectPartner(item.release.partner)}
      className="w-full rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-950">
            {item.release.partner} · {item.release.product}
          </p>
          <p className="mt-1 text-sm text-slate-600">{item.reason}</p>
        </div>
        <StatusBadge status={item.rank >= 3 ? 'Critical' : item.rank >= 2 ? 'High' : 'Low'} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <StatusBadge status={item.release.pmo_status || item.release.stage} className="text-[10px]" />
        <span>{item.release.pm || 'No PM'}</span>
        <span>{item.release.se_lead || 'No SE lead'}</span>
      </div>
    </button>
  );
}

export default function OverviewDashboard({ onSelectPartner, onNavigate }) {
  const { matrixReleases, getSummary, getExceptions } = useData();
  const summary = getSummary();
  const exceptions = getExceptions();

  const activeReleases = useMemo(
    () => matrixReleases.filter((release) => release.stage !== 'N/A'),
    [matrixReleases]
  );

  const upcoming = useMemo(() => {
    const rows = activeReleases
      .filter((release) => milestoneDate(release))
      .sort((a, b) => String(milestoneDate(a)).localeCompare(String(milestoneDate(b))));
    return rows.slice(0, 8);
  }, [activeReleases]);

  const attentionQueue = useMemo(() => {
    const items = [];

    for (const entry of exceptions.slice(0, 20)) {
      const highest = entry.gaps.reduce((max, gap) => Math.max(max, severityRank(gap)), 0);
      items.push({
        release: entry.release,
        rank: highest,
        reason: entry.gaps.slice(0, 2).map((gap) => gap.label).join(' · '),
      });
    }

    for (const release of activeReleases) {
      if (release.commentStale) {
        items.push({
          release,
          rank: 1,
          reason: 'Monday comment is stale and needs refresh',
        });
      } else if (!milestoneDate(release)) {
        items.push({
          release,
          rank: 1,
          reason: 'Missing readiness or launch date',
        });
      }
    }

    const deduped = new Map();
    for (const item of items) {
      const key = item.release.release_key || `${item.release.partner}-${item.release.product}`;
      const existing = deduped.get(key);
      if (!existing || item.rank > existing.rank) deduped.set(key, item);
    }

    return [...deduped.values()]
      .sort((a, b) => b.rank - a.rank || a.release.partner.localeCompare(b.release.partner))
      .slice(0, 6);
  }, [activeReleases, exceptions]);

  const partnerHealth = useMemo(() => {
    const grouped = new Map();

    for (const release of activeReleases) {
      const key = release.partner;
      if (!grouped.has(key)) {
        grouped.set(key, {
          partner: key,
          active: 0,
          scheduled: 0,
          critical: 0,
          stale: 0,
        });
      }
      const item = grouped.get(key);
      item.active += 1;
      if (milestoneDate(release)) item.scheduled += 1;
      if (release.commentStale) item.stale += 1;
    }

    for (const entry of exceptions) {
      const item = grouped.get(entry.release.partner);
      if (!item) continue;
      if (entry.gaps.some((gap) => gap.severity === 'Critical' || gap.severity === 'High')) {
        item.critical += 1;
      }
    }

    return [...grouped.values()]
      .sort((a, b) => b.active - a.active || b.critical - a.critical || a.partner.localeCompare(b.partner))
      .slice(0, 10);
  }, [activeReleases, exceptions]);

  const staleCount = activeReleases.filter((release) => release.commentStale).length;
  const partnerCount = new Set(activeReleases.map((release) => release.partner)).size;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Radar}
          label="Active Releases"
          value={summary.total || 0}
          detail="Tracked partner-product releases in scope"
          tone="primary"
        />
        <MetricCard
          icon={CalendarClock}
          label="Scheduled"
          value={summary.withSchedule || 0}
          detail="Rows with launch or readiness dates"
          tone="success"
        />
        <MetricCard
          icon={Users}
          label="Partners"
          value={partnerCount}
          detail="Partners currently represented in the matrix"
          tone="accent"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Needs Attention"
          value={exceptions.length}
          detail="Rows with material data or ownership gaps"
          tone="warning"
        />
      </div>

      <div className="mt-4 grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft">
          <SectionHeader
            icon={CalendarClock}
            eyebrow="Executive View"
            title="Launch Radar"
            detail="The next scheduled milestones that leadership will care about first."
            action={
              <button
                type="button"
                onClick={() => onNavigate('portfolio')}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
              >
                Open portfolio
                <ArrowRight size={14} strokeWidth={2.2} />
              </button>
            }
          />
          <div className="grid gap-3 p-4">
            {upcoming.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No scheduled milestones are available in the current filtered view.
              </div>
            ) : (
              upcoming.map((release) => (
                <button
                  key={release.release_key || `${release.partner}-${release.product}`}
                  type="button"
                  onClick={() => onSelectPartner(release.partner)}
                  className="grid gap-2 rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-left transition-colors hover:bg-slate-100 sm:grid-cols-[minmax(0,1fr)_160px]"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {release.partner} · {release.product}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {milestoneLabel(release)} milestone for {release.pm || 'unassigned PM'}.
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {milestoneLabel(release)}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(milestoneDate(release))}</p>
                    <p className="mt-1 text-xs text-slate-500">{release.se_lead || 'No SE lead'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft">
          <SectionHeader
            icon={AlertTriangle}
            eyebrow="Executive View"
            title="Attention Queue"
            detail="Rows that need an owner update, date, or narrative refresh."
            action={
              <button
                type="button"
                onClick={() => onNavigate('exceptions')}
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-200"
              >
                Review gaps
                <ArrowRight size={14} strokeWidth={2.2} />
              </button>
            }
          />
          <div className="space-y-3 p-4">
            {attentionQueue.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No immediate attention items in the current view.
              </div>
            ) : (
              attentionQueue.map((item) => (
                <AttentionItem
                  key={item.release.release_key || `${item.release.partner}-${item.release.product}`}
                  item={item}
                  onSelectPartner={onSelectPartner}
                />
              ))
            )}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft">
          <SectionHeader
            icon={Users}
            eyebrow="Operating Health"
            title="Partner Coverage"
            detail="Coverage, schedule completeness, and current attention load by partner."
          />
          <div className="overflow-x-auto px-4 py-4">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-2 font-semibold">Partner</th>
                  <th className="px-3 py-2 font-semibold">Active</th>
                  <th className="px-3 py-2 font-semibold">Scheduled</th>
                  <th className="px-3 py-2 font-semibold">High Gaps</th>
                  <th className="px-3 py-2 font-semibold">Stale Notes</th>
                </tr>
              </thead>
              <tbody>
                {partnerHealth.map((row) => (
                  <tr key={row.partner} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => onSelectPartner(row.partner)}
                        className="font-semibold text-slate-900 transition-colors hover:text-bud-teal"
                      >
                        {row.partner}
                      </button>
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-700">{row.active}</td>
                    <td className="px-3 py-3 font-medium text-slate-700">{row.scheduled}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${row.critical > 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>
                        {row.critical}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${row.stale > 0 ? 'bg-violet-100 text-violet-900' : 'bg-slate-100 text-slate-700'}`}>
                        {row.stale}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft">
          <SectionHeader
            icon={FolderKanban}
            eyebrow="Operations"
            title="Command Center"
            detail="Fast paths to the screens teams actually work from."
          />
          <div className="grid gap-3 p-4">
            <button
              type="button"
              onClick={() => onNavigate('portfolio')}
              className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition-colors hover:bg-slate-100"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <FolderKanban size={16} strokeWidth={2.2} className="text-bud-teal" />
                Portfolio view
              </div>
              <p className="mt-1 text-sm text-slate-600">Scan ownership, dates, and status in a clean working table.</p>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('ask')}
              className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition-colors hover:bg-slate-100"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <MessagesSquare size={16} strokeWidth={2.2} className="text-bud-purple" />
                PMO Bud AI Copilot
              </div>
              <p className="mt-1 text-sm text-slate-600">Ask direct questions on the current cache without scanning the full grid.</p>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('changelog')}
              className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition-colors hover:bg-slate-100"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Clock3 size={16} strokeWidth={2.2} className="text-bud-orange" />
                Change feed
              </div>
              <p className="mt-1 text-sm text-slate-600">Review the change narrative when status history is available.</p>
            </button>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <ClipboardList size={16} strokeWidth={2.2} className="text-bud-teal" />
                Current watchouts
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>{staleCount} rows have stale Monday notes.</li>
                <li>{summary.byStage.Dev || 0} rows are still in development stage.</li>
                <li>{exceptions.length} rows need data cleanup or owner action.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
