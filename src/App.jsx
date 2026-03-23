/**
 * App.jsx — GSP Release Tracker Dashboard Shell
 * Tab navigation: Matrix | Exceptions | Changelog
 * Slide-in PartnerView panel on partner/cell selection
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Grid3X3, AlertCircle, Clock, MessageSquare, ChevronRight, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { api } from './api.js';
import MatrixView      from './components/MatrixView.jsx';
import PartnerView     from './components/PartnerView.jsx';
import ExceptionPanel  from './components/ExceptionPanel.jsx';
import ChangelogFeed   from './components/ChangelogFeed.jsx';
import AskPanel        from './components/AskPanel.jsx';
import { getSummary }  from './data/mockData.js';

const TABS = [
  { id: 'matrix',     label: 'Release Matrix', icon: Grid3X3,       desc: '17 partners × 5 products' },
  { id: 'exceptions', label: 'Exceptions',      icon: AlertCircle,   desc: 'Blocked · Red accounts · No PM' },
  { id: 'changelog',  label: 'Changelog',       icon: Clock,         desc: 'Recent status changes' },
  { id: 'ask',        label: 'Ask',             icon: MessageSquare, desc: 'Natural language queries' },
];

function Header({ activeTab, onTabChange, onRefresh, syncState }) {
  const summary = getSummary();

  return (
    <header className="bg-rc-navy text-white flex-shrink-0 shadow-lg">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* RC logo placeholder */}
          <div className="w-7 h-7 rounded-md bg-rc-orange flex items-center justify-center text-white text-xs font-black">RC</div>
          <div>
            <h1 className="text-sm font-bold tracking-wide">GSP Release Tracker</h1>
            <p className="text-xs text-blue-200">PMO BuddAI · 17 Global Strategic Partners</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick stats */}
          <div className="hidden sm:flex gap-4 text-xs text-blue-200">
            <span><span className="text-white font-bold">{summary.byStage.GA}</span> GA</span>
            <span><span className="text-white font-bold">{summary.byStage.Beta}</span> Beta</span>
            <span><span className="text-white font-bold">{summary.byStage.EAP}</span> EAP</span>
            {summary.blocked > 0 && (
              <span className="text-red-300"><span className="text-red-200 font-bold">{summary.blocked}</span> Blocked</span>
            )}
          </div>

          <button
            onClick={onRefresh}
            disabled={syncState === 'syncing'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors text-xs font-medium"
          >
            {syncState === 'syncing' && <RefreshCw size={13} className="animate-spin" />}
            {syncState === 'success' && <CheckCircle2 size={13} className="text-emerald-300" />}
            {syncState === 'error'   && <XCircle size={13} className="text-red-300" />}
            {(!syncState || syncState === 'idle') && <RefreshCw size={13} />}
            <span className="hidden sm:inline">
              {syncState === 'syncing' ? 'Syncing…' : syncState === 'success' ? 'Synced!' : syncState === 'error' ? 'Failed' : 'Sync Jira'}
            </span>
          </button>
        </div>
      </div>

      {/* Tab bar */}
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
              {tab.id === 'exceptions' && getSummary().blocked > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white leading-none">
                  {getSummary().blocked}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('matrix');
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncState, setSyncState] = useState('idle'); // idle | syncing | success | error

  const handleSelectPartner = useCallback((partner) => {
    setSelectedPartner(partner);
  }, []);

  const handleSelectRelease = useCallback((release) => {
    setSelectedPartner(release.partner);
  }, []);

  const handleRefresh = useCallback(async () => {
    setSyncState('syncing');
    try {
      await api.sync();
      setSyncState('success');
      setRefreshKey(k => k + 1);
      setTimeout(() => setSyncState('idle'), 3000);
    } catch (e) {
      console.error('Sync failed:', e.message);
      setSyncState('error');
      setTimeout(() => setSyncState('idle'), 4000);
    }
  }, []);

  const panelOpen = !!selectedPartner;

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={handleRefresh}
        syncState={syncState}
      />

      {/* Main content area + optional side panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main pane */}
        <main className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${panelOpen ? 'lg:mr-0' : ''}`}>
          {activeTab === 'matrix' && (
            <MatrixView
              key={refreshKey}
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

      {/* Status bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-1.5 bg-white border-t border-slate-200 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Mock data mode
          </span>
          <span>Sources: Jira · Monday.com · Confluence · Sheets · PostgreSQL</span>
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
