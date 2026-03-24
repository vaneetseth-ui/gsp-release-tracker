/**
 * App.jsx — GSP Release Tracker Dashboard Shell
 * Tab navigation: Matrix | Exceptions | Changelog
 * Slide-in PartnerView panel on partner/cell selection
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Grid3X3, AlertCircle, Clock, MessageSquare, ChevronRight, RefreshCw, CheckCircle } from 'lucide-react';
import MatrixView      from './components/MatrixView.jsx';
import PartnerView     from './components/PartnerView.jsx';
import ExceptionPanel  from './components/ExceptionPanel.jsx';
import ChangelogFeed   from './components/ChangelogFeed.jsx';
import AskPanel        from './components/AskPanel.jsx';
import { useData }     from './context/DataContext.jsx';

const TABS = [
  { id: 'matrix',     label: 'Release Matrix', icon: Grid3X3,       desc: 'Partners × products by area' },
  { id: 'exceptions', label: 'Exceptions',      icon: AlertCircle,   desc: 'Blocked · Red accounts · No PM' },
  { id: 'changelog',  label: 'Changelog',       icon: Clock,         desc: 'Recent status changes' },
  { id: 'ask',        label: 'Ask',             icon: MessageSquare, desc: 'Natural language queries' },
];

function Header({ activeTab, onTabChange, onRefresh, syncStatus }) {
  const { getSummary } = useData();
  const summary = getSummary();

  return (
    <header className="flex-shrink-0 border-b border-slate-200/70 bg-white/75 backdrop-blur-md shadow-soft">
      <div className="flex flex-col gap-3 px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rc-blue to-rc-navy flex items-center justify-center text-white text-xs font-bold shadow-sm ring-1 ring-slate-900/5">
              RC
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-slate-900 tracking-tight truncate">
                GSP Release Tracker
              </h1>
              <p className="text-xs text-slate-500 font-medium truncate">
                Portfolio view · strategic partners
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
              <span className="tabular-nums">
                <span className="font-semibold text-slate-800">{summary.byStage.GA}</span> GA
              </span>
              <span className="w-px h-3 bg-slate-200" aria-hidden />
              <span className="tabular-nums">
                <span className="font-semibold text-slate-800">{summary.byStage.Beta}</span> Beta
              </span>
              <span className="w-px h-3 bg-slate-200" aria-hidden />
              <span className="tabular-nums">
                <span className="font-semibold text-slate-800">{summary.byStage.EAP}</span> EAP
              </span>
              {summary.blocked > 0 && (
                <>
                  <span className="w-px h-3 bg-slate-200" aria-hidden />
                  <span className="text-red-600 tabular-nums">
                    <span className="font-semibold">{summary.blocked}</span> blocked
                  </span>
                </>
              )}
            </div>

            {syncStatus.lastSync && (
              <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-slate-500">
                <CheckCircle size={12} className="text-emerald-500 shrink-0" />
                {syncStatus.lastSync}
              </span>
            )}
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh data from the server"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 ring-1 ring-slate-200/80 hover:bg-white hover:ring-slate-300 transition-colors disabled:opacity-50"
              disabled={syncStatus.checking}
            >
              <RefreshCw size={13} className={syncStatus.checking ? 'animate-spin' : ''} />
              {syncStatus.checking ? 'Updating…' : 'Refresh'}
            </button>
          </div>
        </div>

        <nav className="flex gap-1 p-1 rounded-2xl bg-slate-100/80 ring-1 ring-slate-200/50 overflow-x-auto scrollbar-thin">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-xl whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon size={15} className="opacity-70 shrink-0" strokeWidth={1.75} />
                {tab.label}
                {tab.id === 'exceptions' && summary.blocked > 0 && (
                  <span className="min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full text-[10px] font-semibold bg-red-50 text-red-700 ring-1 ring-red-100">
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
  const { refresh: refreshReleases, dataMode } = useData();
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
      await refreshReleases();
      await fetchHealth();
    } finally {
      setSyncStatus((s) => ({ ...s, checking: false }));
    }
  }, [refreshReleases, fetchHealth]);

  const panelOpen = !!selectedPartner;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-transparent">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={handleRefresh}
        syncStatus={syncStatus}
      />

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
            flex-shrink-0 overflow-hidden bg-surface-card shadow-panel
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
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm border-t border-slate-200/60 text-[11px] text-slate-500">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${dataMode === 'live' ? 'bg-emerald-400' : 'bg-amber-400'}`}
            />
            <span className="font-medium text-slate-600">
              {dataMode === 'live' ? 'Live data' : 'Demo data'}
            </span>
          </span>
          <span className="text-slate-400 hidden sm:inline">Jira · Monday · Confluence · Sheets · Postgres</span>
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
