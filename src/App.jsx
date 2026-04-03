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
  Sun,
  Moon,
  Sparkles,
  Search,
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

function ActionButton({ children, onClick, disabled, title, primary = false, dark = false, icon: Icon }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed';
  const variant = dark
    ? primary
      ? 'bg-bud-teal text-white hover:bg-cyan-500 shadow-sm'
      : 'bg-white/10 text-white hover:bg-white/20'
    : primary
      ? 'bg-bud-navy text-white hover:bg-slate-800 shadow-sm'
      : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50';
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`${base} ${variant}`}
    >
      {Icon ? <Icon size={16} strokeWidth={2} className={dark ? 'text-white/80' : 'text-bud-teal'} /> : null}
      {children}
    </button>
  );
}

function LeftRail({ activeTab, onTabChange, gapCount }) {
  return (
    <aside className="hidden w-[220px] flex-shrink-0 lg:flex">
      <div className="flex w-full flex-col rounded-[28px] bg-bud-navy p-4 shadow-[0_18px_48px_-12px_rgba(10,14,39,0.5)]">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <BuddAiMark compact dark />
          <div className="min-w-0">
            <p className="font-display text-xl font-bold tracking-tight text-white">GSP Tracker</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">PMO command center</p>
          </div>
        </div>

        <nav className="mt-4 flex flex-col gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition-all',
                  isActive
                    ? 'bg-white/12 text-white ring-1 ring-white/10'
                    : 'text-white/60 hover:bg-white/8 hover:text-white'
                )}
              >
                <span className="flex items-center gap-3">
                  <span className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-xl',
                    isActive ? 'bg-bud-teal/20' : 'bg-white/8'
                  )}>
                    <Icon size={16} strokeWidth={2} className={isActive ? 'text-bud-teal' : 'text-white/55'} />
                  </span>
                  <span>{tab.label}</span>
                </span>
                {tab.id === 'exceptions' ? (
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-bold',
                    isActive ? 'bg-bud-orange text-white' : 'bg-orange-500/25 text-orange-300'
                  )}>
                    {gapCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

function MobileTabBar({ activeTab, onTabChange, gapCount }) {
  return (
    <nav className="mx-3 mt-2 flex gap-1.5 overflow-x-auto rounded-[20px] bg-bud-navy p-1.5 shadow-[0_8px_24px_-8px_rgba(10,14,39,0.4)] sm:mx-4 lg:hidden">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex min-w-[100px] items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition-all',
              isActive ? 'bg-white/12 text-white ring-1 ring-white/10' : 'text-white/55 hover:bg-white/8 hover:text-white'
            )}
          >
            <Icon size={16} strokeWidth={2} className={isActive ? 'text-bud-teal' : 'text-white/50'} />
            <span>{tab.label}</span>
            {tab.id === 'exceptions' && gapCount > 0 ? (
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold', isActive ? 'bg-bud-orange text-white' : 'bg-orange-500/30 text-orange-300')}>
                {gapCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

function TopToolbar({
  activeTab,
  onRefresh,
  onSyncNow,
  syncStatus,
  query,
  setQuery,
  onQuickJump,
  quickJumpOptions,
}) {
  const { theme, toggleTheme } = useTheme();
  const activeTabLabel = TABS.find((tab) => tab.id === activeTab)?.label || 'Overview';

  return (
    <header className="px-3 pt-2 sm:px-4 sm:pt-3">
      <div className="mx-auto flex max-w-[1380px] flex-wrap items-center gap-3 rounded-[24px] bg-bud-navy px-4 py-3 shadow-[0_18px_48px_-12px_rgba(10,14,39,0.45)]">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Workspace</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">{activeTabLabel}</h1>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/65">
              Monday-first operations
            </span>
          </div>
        </div>

        <form onSubmit={onQuickJump} className="order-3 w-full min-w-0 lg:order-none lg:w-[420px]">
          <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-white/10">
            <Search size={16} className="text-white/45" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              list="toolbar-quick-jump"
              placeholder="Jump to partner, Jira key, or release"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            />
            <button type="submit" className="rounded-xl bg-bud-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors">
              Go
            </button>
          </div>
          <datalist id="toolbar-quick-jump">
            {quickJumpOptions.map((option) => (
              <option key={option.value} value={option.value} />
            ))}
          </datalist>
        </form>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="rounded-2xl bg-white/10 px-3 py-2 text-right ring-1 ring-white/8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Last sync</p>
            <p className="mt-0.5 text-sm font-semibold text-white">
              {syncStatus.lastSync || 'Waiting'}
            </p>
          </div>
          <ActionButton
            primary
            dark
            icon={Sparkles}
            onClick={onSyncNow}
            disabled={syncStatus.checking}
            title="Start Monday-first sync on the server"
          >
            {syncStatus.checking ? 'Syncing…' : 'Sync'}
          </ActionButton>
          <ActionButton
            dark
            icon={RefreshCw}
            onClick={onRefresh}
            disabled={syncStatus.checking}
            title="Reload cached releases from the API"
          >
            Refresh
          </ActionButton>
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex items-center justify-center rounded-xl bg-white/10 p-2 text-white/75 transition-colors hover:bg-white/20"
            aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
          </button>
        </div>
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
  const { refresh: refreshReleases, dataStatus, loadError, loading: releasesLoading, allReleases, getSummary, getExceptions } = useData();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [syncStatus, setSyncStatus] = useState({ checking: false, lastSync: null });
  const [quickJumpQuery, setQuickJumpQuery] = useState('');
  const summary = getSummary();
  const gapCount = getExceptions().length;

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
  const quickJumpOptions = React.useMemo(() => {
    const seen = new Set();
    const options = [];
    for (const release of allReleases) {
      const value = [release.partner, release.product, release.jira_number].filter(Boolean).join(' · ');
      if (!value || seen.has(value)) continue;
      seen.add(value);
      options.push({ value, partner: release.partner });
      if (options.length >= 12) break;
    }
    return options;
  }, [allReleases]);

  const handleQuickJump = useCallback((event) => {
    event.preventDefault();
    const query = quickJumpQuery.trim().toLowerCase();
    if (!query) return;

    const exact = quickJumpOptions.find((option) => option.value.toLowerCase() === query);
    const match = exact
      ? allReleases.find((release) => release.partner === exact.partner)
      : allReleases.find((release) =>
          [
            release.partner,
            release.product,
            release.jira_number,
            release.project_title,
            release.tracker_project_title,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        );

    if (!match) return;
    setActiveTab('portfolio');
    setSelectedPartner(match.partner);
    setQuickJumpQuery('');
  }, [allReleases, quickJumpOptions, quickJumpQuery]);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-transparent text-base">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-18%] h-80 w-80 rounded-full bg-bud-teal/8 blur-3xl" />
        <div className="absolute right-[-8%] top-[8%] h-72 w-72 rounded-full bg-bud-purple/8 blur-3xl" />
      </div>

      <div className="relative flex min-h-0 flex-1 gap-3 overflow-hidden px-3 pb-3 sm:px-4 sm:pb-4">
        <LeftRail activeTab={activeTab} onTabChange={setActiveTab} gapCount={gapCount} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <TopToolbar
            activeTab={activeTab}
            onRefresh={handleRefresh}
            onSyncNow={handleSyncNow}
            syncStatus={syncStatus}
            query={quickJumpQuery}
            setQuery={setQuickJumpQuery}
            onQuickJump={handleQuickJump}
            quickJumpOptions={quickJumpOptions}
          />

          <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} gapCount={gapCount} />

          {!['ask', 'changelog'].includes(activeTab) && <TimelineFilter />}

          <div className="flex min-h-0 flex-1 gap-3 overflow-hidden pt-2">
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
              className={`glass-panel hidden flex-shrink-0 overflow-hidden rounded-[28px] border border-slate-200 shadow-panel transition-all duration-300 ease-out xl:block ${
                panelOpen ? 'w-[400px]' : 'w-0 border-transparent shadow-none'
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
            <div className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] xl:hidden">
              <div className="absolute inset-x-3 bottom-3 top-20 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                <PartnerView
                  partner={selectedPartner}
                  onClose={() => setSelectedPartner(null)}
                />
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-shrink-0 flex-wrap items-center justify-between gap-2 rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-soft">
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
            {panelOpen && <span className="hidden xl:inline text-slate-500">{selectedPartner}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
