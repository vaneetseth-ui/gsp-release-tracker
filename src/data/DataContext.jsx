/**
 * DataContext — fetches live data from /api/* and provides it to all components.
 * Replaces all mockData imports for actual release/summary/changelog data.
 */
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const DataContext = createContext(null);

const JIRA_BASE = 'https://jira.ringcentral.com/browse';

function normalizeRelease(r) {
  const jira = r.jira_number || r.jira_key || r.jira || null;
  return {
    ...r,
    jira,
    jiraUrl:     jira ? `${JIRA_BASE}/${jira}` : null,
    blocked:     !!(r.blocked),
    redAccount:  !!(r.red_account || r.redAccount),
    missingPM:   !!(r.missing_pm  || r.missingPM),
    daysOverdue: r.days_overdue ?? r.daysOverdue ?? null,
    daysInEAP:   r.days_in_eap  ?? r.daysInEAP  ?? null,
    arrAtRisk:   r.arr_at_risk  ?? r.arrAtRisk   ?? null,
  };
}

function normalizeChangelog(c) {
  return {
    ...c,
    date:   c.date   || c.change_date || null,
    from:   c.from   || c.from_stage  || null,
    to:     c.to     || c.to_stage    || null,
    note:   c.note   || c.notes       || '',
    author: c.author || c.changed_by  || 'System',
  };
}

export function DataProvider({ children, refreshKey }) {
  const [releases, setReleases]   = useState([]);
  const [summary, setSummary]     = useState({ total: 0, byStage: {}, blocked: 0, redAccounts: 0, missingPM: 0 });
  const [changelog, setChangelog] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetch('/api/releases').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/summary').then(r  => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/changelog').then(r => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([rels, sum, cl]) => {
        setReleases((rels || []).map(normalizeRelease));
        if (sum) setSummary(sum);
        setChangelog((cl || []).map(normalizeChangelog));
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [refreshKey]);

  const partners = useMemo(
    () => [...new Set(releases.map(r => r.partner).filter(Boolean))].sort(),
    [releases]
  );

  const getRelease = (partner, product) =>
    releases.find(r => r.partner === partner && r.product === product) || null;

  const getPartnerReleases = (partner) =>
    releases.filter(r => r.partner === partner);

  const value = useMemo(() => ({
    releases, summary, changelog, partners,
    getRelease, getPartnerReleases,
    loading, error,
  }), [releases, summary, changelog, partners, loading, error]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
