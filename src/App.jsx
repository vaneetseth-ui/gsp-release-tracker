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
} from 'lucide-react';
import MatrixView      from './components/MatrixView.jsx';
import PartnerView     from './components/PartnerView.jsx';
import ExceptionPanel  from './components/ExceptionPanel.jsx';
import ChangelogFeed   from './components/ChangelogFeed.jsx';
import AskPanel        from './components/AskPanel.jsx';
import TimelineFilter  from './components/TimelineFilter.jsx';
import { useData } from './context/DataContext.jsx';
import { useTheme } from './context/ThemeContext.jsx';

const TABS = [
  { id: 'matrix',     label: 'Release Matrix', icon: Grid3X3,       desc: 'Partners × products by area' },
  { id: 'exceptions', label: 'Exceptions',      icon: AlertCircle,   desc: 'Blocked · Red accounts · No PM' },
  { id: 'changelog',  label: 'Changelog',       icon: Clock,         desc: 'Recent status changes' },
  { id: 'ask',        label: 'Ask',             icon: MessageSquare, desc: 'Natural language queries' },
];

function Header({ activeTab, onTabChange, onRefresh, syncStatus }) {
  const { getSummary } = useData();
  const { theme, toggleTheme } = useTheme();
  const summary = getSummary();

  return (
    <header className="flex-shrink-0 border-b border-slate-200/70 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/85 backdrop-blur-md shadow-soft">
      <div className="flex flex-col gap-3 px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rc-blue to-rc-navy flex items-center justify-center text-white text-sm font-bold shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-700/50">
              RC
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight truncate">
                GSP Release Tracker
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium truncate">
                Portfolio view · strategic partners
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <span className="tabular-nums">
                <span className="font-bold text-slate-800 dark:text-slate-100">{summary.byStage.GA}</span> GA
              </span>
              <span className="w-px h-3 bg-slate-200 dark:bg-slate-600" aria-hidden />
              <span className="tabular-nums">
                <span className="font-bold text-slate-800 dark:text-slate-100">{summary.byStage.Beta}</span> Beta
              </span>
              <span className="w-px h-3 bg-slate-200 dark:bg-slate-600" aria-hidden />
              <span className="tabular-nums">
                <span className="font-bold text-slate-800 dark:text-slate-100">{summary.byStage.EAP}</span> EAP
              </span>
              {summary.blocked > 0 && (
                <>
                  <span className="w-px h-3 bg-slate-200 dark:bg-slate-600" aria-hidden />
                  <span className="text-red-600 dark:text-red-400 tabular-nums font-bold">
                    <span className="font-extrabold">{summary.blocked}</span> blocked
                  </span>
                </>
              )}
            </div>

            {syncStatus.lastSync && (
              <span className="hidden lg:inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                {syncStatus.lastSync}
              </span>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex items-center justify-center rounded-full p-2.5 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 ring-1 ring-slate-200/80 dark:ring-slate-600 hover:bg-white dark:hover:bg-slate-700 transition-colors"
              aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
            </button>
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh data from the server"
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 ring-1 ring-slate-200/80 dark:ring-slate-600 hover:bg-white dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              disabled={syncStatus.checking}
            >
              <RefreshCw size={15} className={syncStatus.checking ? 'animate-spin' : ''} />
              {syncStatus.checking ? 'Updating…' : 'Refresh'}
            </button>
          </div>
        </div>

        <nav className="flex gap-1 p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 ring-1 ring-slate-200/50 dark:ring-slate-700/60 overflow-x-auto scrollbar-thin">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm sm:text-[0.95rem] font-semibold rounded-xl whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-600'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                }`}
              >
                <Icon size={17} className="opacity-80 shrink-0" strokeWidth={2} />
                {tab.label}
                {tab.id === 'exceptions' && summary.blocked > 0 && (
                  <span className="min-w-[1.35rem] h-6 px-1 flex items-center justify-center rounded-full text-xs font-bold bg-red-100 text-red-800 ring-2 ring-red-300/80 dark:bg-red-950 dark:text-red-200 dark:ring-red-500/50">
                    {summary.blocked}
                  </span>
                )}
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
  const [activeTab, setActiveTab] = useState('matrix');
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
    <div className="flex flex-col h-screen overflow-hidden bg-transparent text-base">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={handleRefresh}
        syncStatus={syncStatus}
      />

      <TimelineFilter />

      {/* Main content area + optional side panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main pane */}
        <main
          className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 min-w-0 ${panelOpen ? 'lg:mr-0' : ''}`}
        >
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
          {activeTab === 'ask' && (
            <AskPanel />
          )}
        </main>

        {/* Partner side panel */}
        <div
          className={`
            flex-shrink-0 overflow-hidden bg-surface-card dark:bg-slate-900 shadow-panel
            transition-all duration-300 ease-out
            ${panelOpen ? 'w-full sm:w-96 md:w-[420px]' : 'w-0'}
          `}
        >
          {panelOpen && (
            <PartnerView
              partner={selectedPartner}
              onClose={() => setSelectedPartner(null)}
            />
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-white/60 dark:bg-slate-900/80 backdrop-blur-sm border-t border-slate-200/60 dark:border-slate-700/70 text-sm text-slate-500 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                releasesLoading
                  ? 'bg-slate-400 animate-pulse'
                  : dataStatus === 'live'
                    ? 'bg-emerald-400'
                    : dataStatus === 'error'
                      ? 'bg-red-500 ring-2 ring-red-300 dark:ring-red-700'
                      : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {releasesLoading
                ? 'Loading releases…'
                : dataStatus === 'live'
                  ? 'Releases loaded'
                  : dataStatus === 'error'
                    ? `Load failed${loadError ? `: ${loadError}` : ''}`
                    : 'No release rows from API'}
            </span>
          </span>
          <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">
            Jira · Monday · Confluence · Sheets · Postgres
          </span>
        </div>
        <span>
          {panelOpen && (
            <span className="flex items-center gap-1">
              <ChevronRight size={12} />
              {selectedPartner}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
