/**
 * App.jsx — GSP Release Tracker Dashboard Shell
 * Tab navigation: Matrix | Exceptions | Changelog
 * Slide-in PartnerView panel on partner/cell selection
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  Grid3X3,
  AlertCircle,
  Clock,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  Sun,
  Moon,
  Activity,
  CalendarRange,
  Sparkles,
} from 'lucide-react';
import MatrixView      from './components/MatrixView.jsx';
import PartnerView     from './components/PartnerView.jsx';
import ExceptionPanel  from './components/ExceptionPanel.jsx';
import ChangelogFeed   from './components/ChangelogFeed.jsx';
import AskPanel        from './components/AskPanel.jsx';
import TimelineFilter  from './components/TimelineFilter.jsx';
import { useData } from './context/DataContext.jsx';
import { useTheme } from './context/ThemeContext.jsx';
import buddAiMark from './assets/pmo-bud-hexagon-brain.png';

const TABS = [
  { id: 'ask',        label: 'Ask',             icon: MessageSquare, desc: 'Natural language on cached data' },
  { id: 'matrix',     label: 'Release Matrix', icon: Grid3X3,       desc: 'Partners × products by bucket' },
  { id: 'exceptions', label: 'Exceptions',      icon: AlertCircle,   desc: 'Data-quality gaps' },
  { id: 'changelog',  label: 'Changelog',       icon: Clock,         desc: 'Recent status changes' },
];

function StatCard({ icon: Icon, label, value, tone = 'default' }) {
  const toneClass =
    {
      primary: 'border-bud-teal/30 bg-white/10 text-white',
      accent: 'border-bud-purple/30 bg-white/8 text-white',
      success: 'border-bud-green/30 bg-white/8 text-white',
      warning: 'border-bud-orange/30 bg-white/8 text-white',
      default: 'border-white/12 bg-white/8 text-white',
    }[tone] || 'border-white/12 bg-white/8 text-white';

  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-lg shadow-slate-950/10 ${toneClass}`}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
        <Icon size={14} strokeWidth={2} className="text-bud-teal" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-display font-bold tracking-tight">{value}</div>
    </div>
  );
}

function ActionButton({ children, onClick, disabled, title, primary = false, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        primary
          ? 'bg-bud-teal text-bud-navy hover:bg-[#67e7ff] shadow-lg shadow-cyan-950/20'
          : 'bg-white/8 text-white ring-1 ring-white/12 hover:bg-white/14'
      }`}
    >
      {Icon ? <Icon size={16} strokeWidth={2} className={primary ? 'text-bud-navy' : 'text-bud-teal'} /> : null}
      {children}
    </button>
  );
}

function Header({ activeTab, onTabChange, onRefresh, onSyncNow, syncStatus }) {
  const { getSummary, getExceptions } = useData();
  const { theme, toggleTheme } = useTheme();
  const summary = getSummary();
  const gapCount = getExceptions().length;

  return (
    <header className="flex-shrink-0 px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="hero-sheen relative overflow-hidden rounded-[30px] border border-white/10 shadow-[0_30px_90px_-42px_rgba(10,14,39,0.75)]">
        <div className="pointer-events-none absolute -right-8 top-0 hidden h-full w-[22rem] items-center justify-center xl:flex">
          <img src={buddAiMark} alt="" className="h-72 w-72 object-contain opacity-20 saturate-125" />
        </div>

        <div className="relative grid gap-5 px-5 py-5 sm:px-7 sm:py-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-[22px] border border-white/10 bg-white/6 p-2 shadow-lg shadow-slate-950/25">
                <img
                  src={buddAiMark}
                  alt="PMO Bud AI"
                  className="h-14 w-14 rounded-2xl object-cover sm:h-16 sm:w-16"
                />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-bud-teal/90">
                  PMO Bud AI Workspace
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  GSP Release Tracker
                </h1>
                <p className="mt-1 max-w-2xl text-sm font-medium text-slate-300 sm:text-base">
                  Monday-first command center for strategic partner delivery, release readiness, and operational visibility.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatCard icon={Activity} label="Active Releases" value={summary.total || 0} tone="primary" />
              <StatCard icon={CalendarRange} label="Schedules Linked" value={summary.withSchedule || 0} tone="success" />
              <StatCard icon={CheckCircle} label="GA Live" value={summary.byStage.GA || 0} tone="accent" />
              <StatCard icon={AlertCircle} label="Data Gaps" value={gapCount} tone={gapCount > 0 ? 'warning' : 'default'} />
            </div>
          </div>

          <div className="glass-panel rounded-[26px] border border-white/10 p-4 text-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-bud-teal/90">
                  Runtime Control
                </p>
                <p className="mt-2 text-lg font-display font-bold">Live portfolio status</p>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/8 p-3 text-white transition-colors hover:bg-white/14"
                aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              >
                {theme === 'dark' ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Source of truth</p>
                <p className="mt-2 text-base font-semibold text-white">Monday production sync</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Last sync</p>
                <p className="mt-2 text-base font-semibold text-white">
                  {syncStatus.lastSync || 'Waiting for health check'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <ActionButton
                primary
                icon={Sparkles}
                onClick={onSyncNow}
                disabled={syncStatus.checking}
                title="Start Monday-first sync on the server"
              >
                {syncStatus.checking ? 'Syncing…' : 'Sync Monday'}
              </ActionButton>
              <ActionButton
                icon={RefreshCw}
                onClick={onRefresh}
                disabled={syncStatus.checking}
                title="Reload cached releases from the API"
              >
                Refresh cache
              </ActionButton>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5">GA {summary.byStage.GA || 0}</span>
              <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5">Beta {summary.byStage.Beta || 0}</span>
              <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5">EAP {summary.byStage.EAP || 0}</span>
              <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5">Dev {summary.byStage.Dev || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="mt-3 flex gap-2 overflow-x-auto rounded-[24px] border border-white/10 bg-white/45 p-2 shadow-soft backdrop-blur-xl dark:bg-slate-950/40">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`group flex min-w-[180px] flex-1 items-center gap-3 rounded-[20px] px-4 py-3 text-left transition-all ${
                isActive
                  ? 'bg-bud-navy text-white shadow-lg shadow-slate-950/20'
                  : 'text-slate-600 hover:bg-white/75 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900/70 dark:hover:text-white'
              }`}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isActive ? 'bg-white/10' : 'bg-slate-900/5 dark:bg-white/5'}`}>
                <Icon size={18} className={isActive ? 'text-bud-teal' : 'text-bud-purple'} strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-bold">
                  {tab.label}
                  {tab.id === 'exceptions' && gapCount > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${isActive ? 'bg-bud-orange text-white' : 'bg-amber-100 text-amber-900'}`}>
                      {gapCount}
                    </span>
                  )}
                </span>
                <span className={`mt-0.5 block text-xs ${isActive ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                  {tab.desc}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}

function formatSyncTime(isoString) {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1)   return 'Synced just now';
    if (diffMins < 60)  return `Synced ${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24)   return `Synced ${diffHrs}h ago`;
    return `Synced ${d.toLocaleDateString()}`;
  } catch { return null; }
}

export default function App() {
  const { refresh: refreshReleases, dataStatus, loadError, loading: releasesLoading } = useData();
  const [activeTab, setActiveTab] = useState('ask');
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [syncStatus, setSyncStatus] = useState({ checking: false, lastSync: null });

  const fetchHealth = useCallback(() => {
    return fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        const t = data.lastSync || data.last_sync || data.syncedAt;
        setSyncStatus((s) => ({ ...s, lastSync: formatSyncTime(t) }));
      })
      .catch(() => setSyncStatus((s) => ({ ...s, lastSync: null })));
  }, []);

  useEffect(() => {
    fetchHealth().then(() => setSyncStatus((s) => ({ ...s, checking: false })));
  }, [fetchHealth]);

  const handleSelectPartner = useCallback((partner) => {
    setSelectedPartner(partner);
  }, []);

  const handleSelectRelease = useCallback((release) => {
    setSelectedPartner(release.partner);
  }, []);

  const handleSyncNow = useCallback(async () => {
    setSyncStatus((s) => ({ ...s, checking: true }));
    try {
      const r = await fetch('/api/sync/trigger', { method: 'POST' });
      const text = await r.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = {};
      }
      if (r.status === 202) {
        for (let i = 0; i < 6; i++) {
          await new Promise((res) => setTimeout(res, 5000));
          await fetchHealth();
        }
        await refreshReleases();
      } else if (r.status === 501) {
        console.info('Sync now:', body.error || text);
      } else if (!r.ok && r.status !== 401) {
        console.warn('sync/trigger:', r.status, text);
      }
    } catch (e) {
      console.warn('sync/trigger failed:', e?.message || e);
    } finally {
      setSyncStatus((s) => ({ ...s, checking: false }));
    }
  }, [fetchHealth, refreshReleases]);

  const handleRefresh = useCallback(async () => {
    setSyncStatus((s) => ({ ...s, checking: true }));
    try {
      try {
        const syncRes = await fetch('/api/sync/all', { method: 'POST' });
        if (!syncRes.ok && syncRes.status !== 401) {
          console.warn('sync/all:', syncRes.status, await syncRes.text());
        }
      } catch (e) {
        console.warn('sync/all failed:', e?.message || e);
      }
      await refreshReleases();
      await fetchHealth();
    } finally {
      setSyncStatus((s) => ({ ...s, checking: false }));
    }
  }, [refreshReleases, fetchHealth]);

  const panelOpen = !!selectedPartner;

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-transparent text-base">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-18%] h-80 w-80 rounded-full bg-bud-teal/12 blur-3xl" />
        <div className="absolute right-[-8%] top-[8%] h-72 w-72 rounded-full bg-bud-purple/18 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[20%] h-72 w-72 rounded-full bg-bud-green/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRefresh={handleRefresh}
          onSyncNow={handleSyncNow}
          syncStatus={syncStatus}
        />

        <TimelineFilter />

        <div className="flex flex-1 gap-3 overflow-hidden px-3 pb-3 sm:px-4 sm:pb-4">
          <main className="glass-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/20 shadow-[0_18px_65px_-30px_rgba(15,23,42,0.45)]">
            {activeTab === 'ask' && <AskPanel />}
            {activeTab === 'matrix' && (
              <MatrixView
                onSelectPartner={handleSelectPartner}
                onSelectRelease={handleSelectRelease}
              />
            )}
            {activeTab === 'exceptions' && (
              <ExceptionPanel onSelectPartner={handleSelectPartner} />
            )}
            {activeTab === 'changelog' && (
              <ChangelogFeed onSelectPartner={handleSelectPartner} />
            )}
          </main>

          <div
            className={`glass-panel flex-shrink-0 overflow-hidden rounded-[28px] border shadow-panel transition-all duration-300 ease-out ${
              panelOpen
                ? 'w-full border-white/20 sm:w-96 md:w-[420px]'
                : 'w-0 border-transparent shadow-none'
            }`}
          >
            {panelOpen && (
              <PartnerView
                partner={selectedPartner}
                onClose={() => setSelectedPartner(null)}
              />
            )}
          </div>
        </div>

        <div className="mx-3 mb-3 flex flex-shrink-0 flex-wrap items-center justify-between gap-2 rounded-[22px] border border-white/15 bg-slate-950/75 px-4 py-3 text-sm text-slate-300 shadow-lg shadow-slate-950/25 backdrop-blur-xl sm:mx-4 sm:mb-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  releasesLoading
                    ? 'bg-slate-400 animate-pulse'
                    : dataStatus === 'live'
                      ? 'bg-bud-green ring-4 ring-emerald-400/15'
                      : dataStatus === 'error'
                        ? 'bg-red-500 ring-4 ring-red-400/20'
                        : 'bg-bud-orange ring-4 ring-orange-400/15'
                }`}
              />
              <span className="font-semibold text-white">
                {releasesLoading
                  ? 'Loading releases…'
                  : dataStatus === 'live'
                    ? 'Live cache ready'
                    : dataStatus === 'error'
                      ? `Load failed${loadError ? `: ${loadError}` : ''}`
                      : 'No release rows from API'}
              </span>
            </span>
            <span className="hidden text-slate-400 sm:inline">
              Monday · Jira · Confluence · Sheets · Postgres
            </span>
          </div>
          <span className="text-slate-300">
            {panelOpen && (
              <span className="flex items-center gap-1">
                <ChevronRight size={12} />
                {selectedPartner}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
