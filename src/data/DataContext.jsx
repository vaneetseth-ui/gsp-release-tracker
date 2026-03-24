/**
 * DataContext — fetches live data from /api/* and provides it to all components.
 * Includes global date-range filtering that all views respect transparently.
 */
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const DataContext = createContext(null);

const JIRA_BASE = 'https://jira.ringcentral.com/browse';

function splitJiraKeys(raw) {
  if (!raw) return [];
  return raw.split(/[,;]\s*/).map(k => k.trim()).filter(Boolean);
}

function normalizeRelease(r) {
  const jira = r.jira_number || r.jira_key || r.jira || null;
  const jiraKeys = splitJiraKeys(jira).map(key => ({
    key,
    url: `${JIRA_BASE}/${key}`,
  }));
  return {
    ...r,
    jira,
    jiraKeys,
    jiraUrl:          jiraKeys.length === 1 ? jiraKeys[0].url : null,
    blocked:          !!(r.blocked),
    redAccount:       !!(r.red_account || r.redAccount),
    missingPM:        !!(r.missing_pm  || r.missingPM),
    daysOverdue:      r.days_overdue ?? r.daysOverdue ?? null,
    daysInEAP:        r.days_in_eap  ?? r.daysInEAP  ?? null,
    arrAtRisk:        r.arr_at_risk  ?? r.arrAtRisk   ?? null,
    issueType:        r.issue_type   ?? r.issueType   ?? null,
    priority:         r.priority     ?? null,
    reporter:         r.reporter     ?? null,
    resolution:       r.resolution   ?? null,
    fixVersion:       r.fix_version  ?? r.fixVersion  ?? null,
    requestedQuarter: r.requested_quarter ?? r.requestedQuarter ?? null,
    targetQuarter:    r.target_quarter    ?? r.targetQuarter    ?? null,
    seRegion:         r.se_region    ?? r.seRegion     ?? null,
    brand:            r.brand        ?? null,
    assignee:         r.assignee     ?? null,
    source:           r.source       ?? null,
    sourceUrl:        r.source_url   ?? r.sourceUrl   ?? null,
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

function getReleaseDate(r) {
  return r.last_updated || r.target_date || null;
}

function computeSummary(data) {
  const active = data.filter(r => r.stage !== 'N/A');
  const byStage = {};
  active.forEach(r => { byStage[r.stage] = (byStage[r.stage] || 0) + 1; });
  return {
    total:       active.length,
    byStage,
    blocked:     data.filter(r => r.blocked).length,
    redAccounts: data.filter(r => r.redAccount).length,
    missingPM:   data.filter(r => r.missingPM).length,
  };
}

export function DataProvider({ children, refreshKey }) {
  const [allReleases, setAllReleases] = useState([]);
  const [serverSummary, setServerSummary] = useState({ total: 0, byStage: {}, blocked: 0, redAccounts: 0, missingPM: 0 });
  const [changelog, setChangelog]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [dateRange, setDateRange]     = useState({ from: null, to: null });

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetch('/api/releases').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/summary').then(r  => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/changelog').then(r => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([rels, sum, cl]) => {
        setAllReleases((rels || []).map(normalizeRelease));
        if (sum) setServerSummary(sum);
        setChangelog((cl || []).map(normalizeChangelog));
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [refreshKey]);

  const releases = useMemo(() => {
    const { from, to } = dateRange;
    if (!from && !to) return allReleases;

    return allReleases.filter(r => {
      const d = getReleaseDate(r);
      if (!d) return false;
      const dateStr = d.slice(0, 10);
      if (from && dateStr < from) return false;
      if (to   && dateStr > to)   return false;
      return true;
    });
  }, [allReleases, dateRange]);

  const isFiltered = !!(dateRange.from || dateRange.to);

  const summary = useMemo(() => {
    if (!isFiltered) return serverSummary;
    return { ...serverSummary, ...computeSummary(releases) };
  }, [isFiltered, serverSummary, releases]);

  const partners = useMemo(
    () => [...new Set(releases.map(r => r.partner).filter(Boolean))].sort(),
    [releases]
  );

  const getRelease = useCallback((partner, product) =>
    releases.find(r => r.partner === partner && r.product === product) || null,
    [releases]
  );

  const getPartnerReleases = useCallback((partner) =>
    releases.filter(r => r.partner === partner),
    [releases]
  );

  const value = useMemo(() => ({
    releases, allReleases, summary, changelog, partners,
    getRelease, getPartnerReleases,
    dateRange, setDateRange, isFiltered,
    loading, error,
  }), [releases, allReleases, summary, changelog, partners,
       getRelease, getPartnerReleases,
       dateRange, isFiltered, loading, error]);

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
