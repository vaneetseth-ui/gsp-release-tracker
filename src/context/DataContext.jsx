import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { STAGES } from '../data/stages.js';
import {
  MATRIX_PRODUCT_ORDER,
  PRODUCT_AREA_GROUPS,
  normalizeProductArea,
} from '../data/constants.js';
import {
  OTHER_MATRIX_BUCKET,
  STRATEGIC_PARTNER_ORDER,
  matrixPartnerBucket,
  pickRepresentativeRelease,
} from '../data/matrixPartners.js';
import { buildJiraLinks, jiraTextForLinkParsing, resolveMondayUrl } from '../utils/toolLinks.js';

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
  const jiraRaw = r.jira_number ?? r.jira_key ?? r.jira ?? null;
  const jiraLinks = buildJiraLinks(jiraTextForLinkParsing(r));
  const mondayUrl = resolveMondayUrl(r);
  const jira_number = r.jira_number ?? r.jira_key ?? jiraLinks[0]?.key ?? null;

  return {
    ...r,
    product,
    product_area,
    productArea: product_area,
    jira: jiraRaw,
    jira_number,
    jiraLinks,
    mondayUrl,
    source: r.source ?? null,
    blocked,
    redAccount,
    missingPM,
    daysInEAP,
    daysOverdue,
    arrAtRisk,
  };
}

function getReleaseDateForFilter(r) {
  const raw = r.last_updated || r.target_date || r.actual_date || null;
  if (!raw) return null;
  return String(raw).slice(0, 10);
}

function partnersFromReleases(releases) {
  return [...new Set(releases.map((r) => r.partner))].sort();
}

function buildMatrixPartnerRows(releases) {
  const hasOther = releases.some((r) => matrixPartnerBucket(r.partner) == null);
  const rows = [...STRATEGIC_PARTNER_ORDER];
  if (hasOther) rows.push(OTHER_MATRIX_BUCKET);
  return rows;
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
  const [allReleases, setAllReleases] = useState([]);
  const [dateRange, setDateRangeState] = useState({ from: null, to: null });
  const [loading, setLoading] = useState(true);
  /** 'live' = API returned rows; 'empty' = OK but no rows; 'error' = fetch/parse failed */
  const [dataStatus, setDataStatus] = useState('empty');
  const [loadError, setLoadError] = useState(null);

  const setDateRange = useCallback((update) => {
    setDateRangeState((prev) => (typeof update === 'function' ? update(prev) : { ...prev, ...update }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/releases');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Invalid releases response');
      if (data.length > 0) {
        setAllReleases(data.map(normalizeReleaseRow));
        setDataStatus('live');
      } else {
        setAllReleases([]);
        setDataStatus('empty');
      }
    } catch (e) {
      setAllReleases([]);
      setLoadError(e?.message || 'Failed to load releases');
      setDataStatus('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const releases = useMemo(() => {
    const { from, to } = dateRange;
    if (!from && !to) return allReleases;
    return allReleases.filter((r) => {
      const d = getReleaseDateForFilter(r);
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [allReleases, dateRange]);

  const isFiltered = !!(dateRange.from || dateRange.to);

  const partners = useMemo(() => partnersFromReleases(releases), [releases]);

  /** Matrix rows: 17 strategic partners in fixed order, then Other GSPs if any unmapped partner exists */
  const matrixPartners = useMemo(() => buildMatrixPartnerRows(releases), [releases]);

  const getRelease = useCallback(
    (partner, product) =>
      releases.find((r) => r.partner === partner && r.product === product) || null,
    [releases]
  );

  /** Cell release for matrix row (strategic bucket or Other aggregate). */
  const getMatrixRelease = useCallback(
    (rowKey, product) => {
      if (rowKey === OTHER_MATRIX_BUCKET) {
        const candidates = releases.filter(
          (r) => r.product === product && matrixPartnerBucket(r.partner) == null
        );
        return pickRepresentativeRelease(candidates);
      }
      const candidates = releases.filter(
        (r) => r.product === product && matrixPartnerBucket(r.partner) === rowKey
      );
      return pickRepresentativeRelease(candidates);
    },
    [releases]
  );

  const getPartnerReleases = useCallback((partner) => {
    if (partner === OTHER_MATRIX_BUCKET) {
      return releases.filter((r) => matrixPartnerBucket(r.partner) == null);
    }
    return releases.filter((r) => matrixPartnerBucket(r.partner) === partner);
  }, [releases]);

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
      allReleases,
      dateRange,
      setDateRange,
      isFiltered,
      partners,
      matrixPartners,
      productAreaGroups: PRODUCT_AREA_GROUPS,
      matrixProductOrder: MATRIX_PRODUCT_ORDER,
      loading,
      dataStatus,
      loadError,
      refresh: load,
      getRelease,
      getMatrixRelease,
      getPartnerReleases,
      getSummary,
      getExceptions,
    }),
    [
      releases,
      allReleases,
      dateRange,
      setDateRange,
      isFiltered,
      partners,
      matrixPartners,
      loading,
      dataStatus,
      loadError,
      load,
      getRelease,
      getMatrixRelease,
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
