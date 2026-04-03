/**
 * App.jsx — GSP Release Tracker Dashboard Shell
 * Tab navigation: Matrix | Exceptions | Changelog
 * Slide-in PartnerView panel on partner/cell selection
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  AlertCircle,
  BriefcaseBusiness,
  Clock,
  Grid3X3,
  LayoutDashboard,
  MessageSquare,
  RefreshCw,
  CheckCircle,
  Sun,
  Moon,
  Activity,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import MatrixView      from './components/MatrixView.jsx';
import PartnerView     from './components/PartnerView.jsx';
import ExceptionPanel  from './components/ExceptionPanel.jsx';
import ChangelogFeed   from './components/ChangelogFeed.jsx';
import AskPanel        from './components/AskPanel.jsx';
import TimelineFilter  from './components/TimelineFilter.jsx';
import OverviewDashboard from './components/OverviewDashboard.jsx';
import PortfolioView from './components/PortfolioView.jsx';
import BuddAiMark from './components/BuddAiMark.jsx';
import { cn } from './lib/utils.js';
import { useData } from './context/DataContext.jsx';
import { useTheme } from './context/ThemeContext.jsx';

const TABS = [
  { id: 'overview',   label: 'Overview',   icon: LayoutDashboard },
  { id: 'portfolio',  label: 'Portfolio',  icon: BriefcaseBusiness },
  { id: 'matrix',     label: 'Matrix',     icon: Grid3X3 },
  { id: 'exceptions', label: 'Exceptions', icon: AlertCircle },
  { id: 'ask',        label: 'Ask',        icon: MessageSquare },
  { id: 'changelog',  label: 'Changes',    icon: Clock },
];

function StatPill({ icon: Icon, label, value, tone = 'default' }) {
  const toneClass = {
    primary: 'border-cyan-100 bg-cyan-50',
    accent: 'border-violet-100 bg-violet-50',
    success: 'border-emerald-100 bg-emerald-50',
    warning: 'border-orange-100 bg-orange-50',
    default: 'border-slate-100 bg-white',
  }[tone] || 'border-slate-100 bg-white';

  return (
    <div className={cn('rounded-2xl border px-3.5 py-3 shadow-sm', toneClass)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl', tone === 'warning' ? 'bg-orange-500' : tone === 'accent' ? 'bg-violet-500' : tone === 'success' ? 'bg-emerald-500' : 'bg-cyan-500')}>
              <Icon size={14} strokeWidth={2.1} className="text-white" />
            </span>
            {label}
          </div>
        </div>
        <div className="font-mono text-2xl font-semibold leading-none tracking-tight text-slate-950">{value}</div>
      </div>
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
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        primary
          ? 'bg-bud-navy text-white hover:bg-slate-800 shadow-sm'
          : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
      }`}
    >
      {Icon ? <Icon size={16} strokeWidth={2} className="text-bud-teal" /> : null}
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
    <header className="flex-shrink-0 px-3 pt-2 sm:px-4 sm:pt-3">
      <div className="mx-auto max-w-[1180px]">
        <div className="hero-sheen relative overflow-hidden rounded-[30px] border border-slate-800/60 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.8)]">
          <div className="relative grid items-start gap-3 px-5 py-4 sm:px-6 sm:py-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-3">
                    <BuddAiMark compact />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Powered By</p>
                      <p className="font-display text-lg font-bold text-white">PMO <span className="text-bud-teal">BuddAI</span></p>
                    </div>
                  </div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-[1.85rem]">
                    GSP Release Tracker
                  </h1>
                  <p className="mt-1.5 max-w-xl text-sm font-medium leading-relaxed text-slate-300">
                    Monday-first release intelligence for PMO leadership, partner planning, and operational triage.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/6 p-3 text-white transition-colors hover:bg-white/12"
                  aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                >
                  {theme === 'dark' ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <StatPill icon={Activity} label="Active" value={summary.total || 0} tone="primary" />
                <StatPill icon={CalendarDays} label="Scheduled" value={summary.withSchedule || 0} tone="success" />
                <StatPill icon={CheckCircle} label="GA" value={summary.byStage.GA || 0} tone="accent" />
                <StatPill icon={AlertCircle} label="Gaps" value={gapCount} tone={gapCount > 0 ? 'warning' : 'default'} />
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200/80 bg-white p-3.5 text-slate-900 shadow-lg shadow-slate-950/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-bud-teal">
                    Runtime Control
                  </p>
                  <p className="mt-1.5 text-base font-display font-bold text-slate-950">Portfolio sync</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Monday authority
                </span>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Last sync</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {syncStatus.lastSync || 'Waiting for health check'}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
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

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">GA {summary.byStage.GA || 0}</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Beta {summary.byStage.Beta || 0}</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">EAP {summary.byStage.EAP || 0}</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Dev {summary.byStage.Dev || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="mt-2.5 flex flex-wrap gap-2 rounded-[24px] border border-slate-200 bg-white p-2 shadow-soft">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`group flex min-w-[126px] flex-1 items-center justify-center gap-2 rounded-[18px] px-3.5 py-2.5 text-center text-sm font-semibold transition-all sm:flex-none ${
                  isActive
                    ? 'bg-bud-navy text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${isActive ? 'bg-white/10' : 'bg-slate-100'}`}>
                  <Icon size={18} className={isActive ? 'text-bud-teal' : 'text-bud-purple'} strokeWidth={2} />
                </span>
                <span className="flex items-center gap-2">
                  <span>{tab.label}</span>
                  {tab.id === 'exceptions' && gapCount > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${isActive ? 'bg-bud-orange text-white' : 'bg-amber-100 text-amber-900'}`}>
                      {gapCount}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
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
  const [activeTab, setActiveTab] = useState('overview');
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

  useEffect(() => {
    setSelectedPartner(null);
  }, [activeTab]);

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
        <div className="absolute left-[-10%] top-[-18%] h-80 w-80 rounded-full bg-bud-teal/8 blur-3xl" />
        <div className="absolute right-[-8%] top-[8%] h-72 w-72 rounded-full bg-bud-purple/8 blur-3xl" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRefresh={handleRefresh}
          onSyncNow={handleSyncNow}
          syncStatus={syncStatus}
        />

        {!['ask', 'changelog'].includes(activeTab) && <TimelineFilter />}

        <div className="flex flex-1 gap-3 overflow-hidden px-3 pb-3 sm:px-4 sm:pb-4">
          <main className="glass-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-200 shadow-[0_18px_48px_-34px_rgba(15,23,42,0.3)]">
            {activeTab === 'overview' && (
              <OverviewDashboard
                onSelectPartner={handleSelectPartner}
                onNavigate={setActiveTab}
              />
            )}
            {activeTab === 'portfolio' && (
              <PortfolioView
                onSelectPartner={handleSelectPartner}
              />
            )}
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
            className={`glass-panel hidden flex-shrink-0 overflow-hidden rounded-[28px] border border-slate-200 shadow-panel transition-all duration-300 ease-out lg:block ${
              panelOpen ? 'w-[420px]' : 'w-0 border-transparent shadow-none'
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

        {panelOpen && (
          <div className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] lg:hidden">
            <div className="absolute inset-x-3 bottom-3 top-20 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
              <PartnerView
                partner={selectedPartner}
                onClose={() => setSelectedPartner(null)}
              />
            </div>
          </div>
        )}

        <div className="mx-3 mb-3 flex flex-shrink-0 flex-wrap items-center justify-between gap-2 rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-soft sm:mx-4 sm:mb-4">
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
              <span className="font-semibold text-slate-900">
                {releasesLoading
                  ? 'Loading releases…'
                  : dataStatus === 'live'
                    ? 'Live cache ready'
                    : dataStatus === 'error'
                      ? `Load failed${loadError ? `: ${loadError}` : ''}`
                      : 'No release rows from API'}
              </span>
            </span>
            <span className="hidden text-slate-500 sm:inline">
              Monday · Jira · Confluence · Sheets · Postgres
            </span>
          </div>
          {panelOpen && <span className="hidden lg:inline text-slate-500">{selectedPartner}</span>}
        </div>
      </div>
    </div>
  );
}
