/**
 * App.jsx — GSP Release Tracker Dashboard Shell
 * Tab navigation: Matrix | Exceptions | Changelog
 * Slide-in PartnerView panel on partner/cell selection
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Grid3X3, AlertCircle, Clock, MessageSquare, ChevronRight, RefreshCw, CheckCircle, WifiOff } from 'lucide-react';
import MatrixView      from './components/MatrixView.jsx';
import PartnerView     from './components/PartnerView.jsx';
import ExceptionPanel  from './components/ExceptionPanel.jsx';
import ChangelogFeed   from './components/ChangelogFeed.jsx';
import AskPanel        from './components/AskPanel.jsx';
import TimelineFilter  from './components/TimelineFilter.jsx';
import { DataProvider, useData } from './data/DataContext.jsx';

const TABS = [
  { id: 'matrix',     label: 'Release Matrix', icon: Grid3X3,       desc: '17 partners × 5 products' },
  { id: 'exceptions', label: 'Exceptions',      icon: AlertCircle,   desc: 'Blocked · Red accounts · No PM' },
  { id: 'changelog',  label: 'Changelog',       icon: Clock,         desc: 'Recent status changes' },
  { id: 'ask',        label: 'Ask',             icon: MessageSquare, desc: 'Natural language queries' },
];

function Header({ activeTab, onTabChange, onRefresh, syncStatus }) {
  const { summary } = useData();

  return (
    <header className="bg-rc-navy text-white flex-shrink-0 shadow-lg">
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-rc-orange flex items-center justify-center text-white text-xs font-black">RC</div>
          <div>
            <h1 className="text-sm font-bold tracking-wide">GSP Release Tracker</h1>
            <p className="text-xs text-blue-200">PMO BuddAI · Global Strategic Partners</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex gap-4 text-xs text-blue-200">
            <span><span className="text-white font-bold">{summary.byStage?.GA || 0}</span> GA</span>
            <span><span className="text-white font-bold">{summary.byStage?.Beta || 0}</span> Beta</span>
            <span><span className="text-white font-bold">{summary.byStage?.EAP || 0}</span> EAP</span>
            {summary.blocked > 0 && (
              <span className="text-red-300"><span className="text-red-200 font-bold">{summary.blocked}</span> Blocked</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {syncStatus.lastSync && (
              <span className="hidden md:flex items-center gap-1 text-xs text-blue-200">
                <CheckCircle size={11} className="text-green-400" />
                {syncStatus.lastSync}
              </span>
            )}
            <button
              onClick={onRefresh}
              title="Data syncs automatically every hour. Click to refresh dashboard."
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs font-medium disabled:opacity-50"
              disabled={syncStatus.checking}
            >
              <RefreshCw size={13} className={syncStatus.checking ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{syncStatus.checking ? 'Checking…' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex px-4 gap-1 pt-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                isActive
                  ? 'bg-slate-100 text-slate-900 shadow-sm'
                  : 'text-blue-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon size={14} />
              {tab.label}
              {tab.id === 'exceptions' && summary.blocked > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white leading-none">
                  {summary.blocked}
                </span>
              )}
            </button>
          );
        })}
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

function AppShell() {
  const [activeTab, setActiveTab] = useState('matrix');
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [syncStatus, setSyncStatus] = useState({ checking: false, lastSync: null });
  const { loading, summary } = useData();

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(data => {
        const t = data.lastSyncAt || data.lastSync || data.last_sync || data.syncedAt;
        setSyncStatus({ checking: false, lastSync: formatSyncTime(t) });
      })
      .catch(() => setSyncStatus({ checking: false, lastSync: null }));
  }, []);

  const handleSelectPartner = useCallback((partner) => {
    setSelectedPartner(partner);
  }, []);

  const handleSelectRelease = useCallback((release) => {
    setSelectedPartner(release.partner);
  }, []);

  const handleRefresh = useCallback(() => {
    setSyncStatus(s => ({ ...s, checking: true }));
    window.location.reload();
  }, []);

  const panelOpen = !!selectedPartner;

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={handleRefresh}
        syncStatus={syncStatus}
      />

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw size={32} className="mx-auto mb-3 text-blue-400 animate-spin" />
            <p className="text-sm text-slate-500">Loading live data…</p>
          </div>
        </div>
      ) : (
        <>
        <TimelineFilter />
        <div className="flex flex-1 overflow-hidden">
          <main className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${panelOpen ? 'lg:mr-0' : ''}`}>
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

          <div
            className={`
              flex-shrink-0 overflow-hidden bg-white border-l border-slate-200 shadow-xl
              transition-all duration-300 ease-in-out
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
        </>
      )}

      <div className="flex-shrink-0 flex items-center justify-between px-4 py-1.5 bg-white border-t border-slate-200 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {summary.mode === 'postgres' ? 'Live (Postgres)' : summary.mode === 'live' ? 'Live (memory)' : 'Mock data'}
          </span>
          <span>Sources: Jira · Monday · PostgreSQL</span>
          <span>{summary.total || 0} releases</span>
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

export default function App() {
  return (
    <DataProvider refreshKey={0}>
      <AppShell />
    </DataProvider>
  );
}
