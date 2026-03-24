import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { RELEASES as SEED_RELEASES, STAGES } from '../data/mockData.js';
import {
  MATRIX_PRODUCT_ORDER,
  PRODUCT_AREA_GROUPS,
  normalizeProductArea,
} from '../data/constants.js';

const DataContext = createContext(null);

function flag(v) {
  return v === 1 || v === true || v === '1';
}

/**
 * API rows are snake_case; UI expects camelCase for flags + jira alias.
 */
export function normalizeReleaseRow(r) {
  const product = r.product;
  const product_area = normalizeProductArea(r.product_area, product);
  const blocked = flag(r.blocked);
  const redAccount = flag(r.red_account ?? r.redAccount);
  const missingPM = flag(r.missing_pm ?? r.missingPM);
  const daysInEAP = r.days_in_eap ?? r.daysInEAP ?? null;
  const daysOverdue = r.days_overdue ?? r.daysOverdue ?? null;
  const arrAtRisk = r.arr_at_risk != null ? Number(r.arr_at_risk) : r.arrAtRisk ?? null;

  return {
    ...r,
    product,
    product_area,
    productArea: product_area,
    jira: r.jira ?? r.jira_number ?? null,
    blocked,
    redAccount,
    missingPM,
    daysInEAP,
    daysOverdue,
    arrAtRisk,
  };
}

function partnersFromReleases(releases) {
  return [...new Set(releases.map((r) => r.partner))].sort();
}

function computeSummary(releases) {
  const active = releases.filter((r) => r.stage !== 'N/A');
  const counts = {};
  Object.keys(STAGES).forEach((s) => {
    counts[s] = 0;
  });
  active.forEach((r) => {
    if (counts[r.stage] !== undefined) counts[r.stage]++;
  });
  return {
    total: active.length,
    byStage: counts,
    blocked: active.filter((r) => r.blocked).length,
    redAccounts: active.filter((r) => r.redAccount).length,
    missingPM: active.filter((r) => r.missingPM).length,
    overdue: active.filter((r) => (r.daysOverdue || 0) > 0).length,
  };
}

export function DataProvider({ children }) {
  const [releases, setReleases] = useState(() =>
    SEED_RELEASES.map((r) => normalizeReleaseRow(r))
  );
  const [loading, setLoading] = useState(true);
  const [dataMode, setDataMode] = useState('mock');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/releases');
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setReleases(data.map(normalizeReleaseRow));
        setDataMode('live');
      } else {
        setReleases(SEED_RELEASES.map((r) => normalizeReleaseRow(r)));
        setDataMode('mock');
      }
    } catch {
      setReleases(SEED_RELEASES.map((r) => normalizeReleaseRow(r)));
      setDataMode('mock');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const partners = useMemo(() => partnersFromReleases(releases), [releases]);

  const getRelease = useCallback(
    (partner, product) =>
      releases.find((r) => r.partner === partner && r.product === product) || null,
    [releases]
  );

  const getPartnerReleases = useCallback(
    (partner) => releases.filter((r) => r.partner === partner),
    [releases]
  );

  const getSummary = useCallback(() => computeSummary(releases), [releases]);

  const getExceptions = useCallback(
    () =>
      releases.filter(
        (r) =>
          r.blocked ||
          r.redAccount ||
          r.missingPM ||
          (r.daysInEAP && r.daysInEAP > 90)
      ),
    [releases]
  );

  const value = useMemo(
    () => ({
      releases,
      partners,
      productAreaGroups: PRODUCT_AREA_GROUPS,
      matrixProductOrder: MATRIX_PRODUCT_ORDER,
      loading,
      dataMode,
      refresh: load,
      getRelease,
      getPartnerReleases,
      getSummary,
      getExceptions,
    }),
    [
      releases,
      partners,
      loading,
      dataMode,
      load,
      getRelease,
      getPartnerReleases,
      getSummary,
      getExceptions,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
