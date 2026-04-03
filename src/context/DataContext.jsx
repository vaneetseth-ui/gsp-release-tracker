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
  PRODUCT_BUCKET_GROUPS,
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

const MS_PER_DAY = 86400000;

function isCommentStale(commentUpdatedAt) {
  if (!commentUpdatedAt) return false;
  const t = new Date(commentUpdatedAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t > 7 * MS_PER_DAY;
}

function parseTrackerDetails(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * API rows are snake_case; UI expects camelCase for flags + jira alias.
 */
export function normalizeReleaseRow(r) {
  const product = r.product;
  const product_area = normalizeProductArea(r.product_area, product, r.product_track);
  const arrAtRisk = r.arr_at_risk != null ? Number(r.arr_at_risk) : r.arrAtRisk ?? null;
  const jiraRaw = r.jira_number ?? r.jira_key ?? r.jira ?? null;
  const jiraLinks = buildJiraLinks(jiraTextForLinkParsing(r));
  const mondayUrl = resolveMondayUrl(r);
  const jira_number = r.jira_number ?? r.jira_key ?? jiraLinks[0]?.key ?? null;
  const includeInMatrix = r.include_in_matrix !== 0 && r.include_in_matrix !== false;
  const isUnmanagedJira = flag(r.is_unmanaged_jira);
  const legacySourced = flag(r.legacy_sourced);
  const priorityNumber = r.priority_number != null ? Number(r.priority_number) : null;
  const trackerDetails = parseTrackerDetails(r.tracker_details_json);

  return {
    ...r,
    product,
    product_area,
    productArea: product_area,
    product_track: r.product_track ?? null,
    jira: jiraRaw,
    jira_number,
    jiraLinks,
    mondayUrl,
    source: r.source ?? null,
    arrAtRisk,
    release_key: r.release_key ?? null,
    pmo_status: r.pmo_status ?? null,
    jira_status: r.jira_status ?? null,
    project_title: r.project_title ?? null,
    impact_summary: r.impact_summary ?? null,
    desc_raw: r.desc_raw ?? null,
    market_type: r.market_type ?? null,
    priority_number: priorityNumber,
    product_readiness_date: r.product_readiness_date ?? null,
    gsp_launch_date: r.gsp_launch_date ?? null,
    schedule_url: r.schedule_url ?? null,
    tracker_group: r.tracker_group ?? null,
    tracker_project_title: r.tracker_project_title ?? null,
    product_readiness_dri: r.product_readiness_dri ?? null,
    product_readiness_status: r.product_readiness_status ?? null,
    product_readiness_start_date: r.product_readiness_start_date ?? null,
    product_readiness_end_date: r.product_readiness_end_date ?? null,
    product_readiness_comment: r.product_readiness_comment ?? null,
    gsp_launch_dri: r.gsp_launch_dri ?? null,
    gsp_launch_status: r.gsp_launch_status ?? null,
    gsp_launch_start_date: r.gsp_launch_start_date ?? null,
    gsp_launch_end_date: r.gsp_launch_end_date ?? null,
    gsp_launch_comment: r.gsp_launch_comment ?? null,
    tracker_details_json: r.tracker_details_json ?? null,
    trackerDetails,
    monday_comment: r.monday_comment ?? null,
    comment_updated_at: r.comment_updated_at ?? null,
    commentStale: isCommentStale(r.comment_updated_at),
    data_provenance: r.data_provenance ?? null,
    includeInMatrix: includeInMatrix,
    isUnmanagedJira,
    legacy_sourced: legacySourced,
    legacy_planning_date: r.legacy_planning_date ?? null,
    legacy_golive_date: r.legacy_golive_date ?? null,
    salesforce_account_id: r.salesforce_account_id ?? null,
    bug_report_count: r.bug_report_count != null ? Number(r.bug_report_count) : null,
    bug_reports_url: r.bug_reports_url ?? null,
  };
}

function getReleaseDateForFilter(r) {
  const raw =
    r.last_updated || r.gsp_launch_date || r.target_date || r.actual_date || r.product_readiness_date || null;
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
  const pmoCounts = {};
  active.forEach((r) => {
    const ps = r.pmo_status || r.stage || 'Unknown';
    pmoCounts[ps] = (pmoCounts[ps] || 0) + 1;
  });
  return {
    total: active.length,
    byStage: counts,
    byPmoStatus: pmoCounts,
    withSchedule: active.filter((r) => r.gsp_launch_date || r.product_readiness_date).length,
  };
}

function gapField(release, field, severity, label, present) {
  if (present) return null;
  return { field, severity, label, message: `${label} — needs PMO/Jira update` };
}

/**
 * Data-quality gaps (v1.2 Exceptions tab). Unmanaged Jira rows listed separately.
 */
export function computeGapsForRelease(r) {
  const gaps = [];

  if (r.isUnmanagedJira) {
    gaps.push({
      field: 'monday_item',
      severity: 'High',
      label: 'Not in Monday',
      message: 'Jira GSP ticket has no matching Monday item — add to GSP Priorities or ignore',
    });
    return gaps;
  }

  const push = (field, severity, label, ok) => {
    const x = gapField(r, field, severity, label, ok);
    if (x) gaps.push(x);
  };
  push('partner', 'Critical', 'Partner', !!(r.partner && String(r.partner).trim()));
  push(
    'status',
    'Critical',
    'PMO status',
    !!((r.pmo_status && String(r.pmo_status).trim()) || (r.stage && String(r.stage).trim()))
  );
  push('product_track', 'High', 'Product Track', !!(r.product_track && String(r.product_track).trim()));
  push('se_lead', 'Medium', 'SE Lead', !!(r.se_lead && String(r.se_lead).trim()));
  push('pm', 'Medium', 'Product Manager', !!(r.pm && String(r.pm).trim()));
  const hasSchedule = !!(r.product_readiness_date || r.gsp_launch_date || r.target_date);
  push('schedule', 'Medium', 'Schedule / milestone dates', hasSchedule);
  push('jira_number', 'Low', 'Jira Number', !!(r.jira_number && String(r.jira_number).trim()));
  push('market_type', 'Low', 'Market Type', !!(r.market_type && String(r.market_type).trim()));

  return gaps;
}

function computeAllGaps(releases) {
  const out = [];
  for (const r of releases) {
    const gaps = computeGapsForRelease(r);
    if (gaps.length) out.push({ release: r, gaps });
  }
  out.sort((a, b) => {
    const rank = (g) =>
      g.gaps.some((x) => x.severity === 'Critical') ? 0 : g.gaps.some((x) => x.severity === 'High') ? 1 : 2;
    return rank(a) - rank(b) || String(a.release.partner).localeCompare(String(b.release.partner));
  });
  return out;
}

export function DataProvider({ children }) {
  const [allReleases, setAllReleases] = useState([]);
  const [dateRange, setDateRangeState] = useState({ from: null, to: null });
  /** v1.3 Ch.25 — multi-year OR filter (custom From/To clears this via effect below). */
  const [selectedYears, setSelectedYears] = useState([]);
  const [loading, setLoading] = useState(true);
  /** 'live' = API returned rows; 'empty' = OK but no rows; 'error' = fetch/parse failed */
  const [dataStatus, setDataStatus] = useState('empty');
  const [loadError, setLoadError] = useState(null);

  const setDateRange = useCallback((update) => {
    setDateRangeState((prev) => (typeof update === 'function' ? update(prev) : { ...prev, ...update }));
  }, []);

  useEffect(() => {
    if (dateRange.from || dateRange.to) {
      setSelectedYears([]);
    }
  }, [dateRange.from, dateRange.to]);

  const toggleYear = useCallback((year) => {
    setDateRangeState({ from: null, to: null });
    setSelectedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return [...next].sort().reverse();
    });
  }, []);

  const clearTimelineFilter = useCallback(() => {
    setSelectedYears([]);
    setDateRangeState({ from: null, to: null });
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
    const hasCustom = !!(from || to);
    if (hasCustom) {
      return allReleases.filter((r) => {
        const d = getReleaseDateForFilter(r);
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }
    if (selectedYears.length > 0) {
      const yset = new Set(selectedYears);
      return allReleases.filter((r) => {
        const d = getReleaseDateForFilter(r);
        if (!d) return false;
        return yset.has(d.slice(0, 4));
      });
    }
    return allReleases;
  }, [allReleases, dateRange, selectedYears]);

  const matrixReleases = useMemo(
    () => releases.filter((r) => r.includeInMatrix && !r.isUnmanagedJira),
    [releases]
  );

  const isFiltered = !!(dateRange.from || dateRange.to) || selectedYears.length > 0;

  const partners = useMemo(() => partnersFromReleases(matrixReleases), [matrixReleases]);

  const matrixPartners = useMemo(() => buildMatrixPartnerRows(matrixReleases), [matrixReleases]);

  const getRelease = useCallback(
    (partner, product) =>
      matrixReleases.find((r) => r.partner === partner && r.product === product) || null,
    [matrixReleases]
  );

  const getMatrixRelease = useCallback(
    (rowKey, product) => {
      if (rowKey === OTHER_MATRIX_BUCKET) {
        const candidates = matrixReleases.filter(
          (r) => r.product === product && matrixPartnerBucket(r.partner) == null
        );
        return pickRepresentativeRelease(candidates);
      }
      const candidates = matrixReleases.filter(
        (r) => r.product === product && matrixPartnerBucket(r.partner) === rowKey
      );
      return pickRepresentativeRelease(candidates);
    },
    [matrixReleases]
  );

  const getPartnerReleases = useCallback((partner) => {
    if (partner === OTHER_MATRIX_BUCKET) {
      return matrixReleases.filter((r) => matrixPartnerBucket(r.partner) == null);
    }
    return matrixReleases.filter((r) => matrixPartnerBucket(r.partner) === partner);
  }, [matrixReleases]);

  const getSummary = useCallback(() => computeSummary(matrixReleases), [matrixReleases]);

  const getExceptions = useCallback(() => computeAllGaps(releases), [releases]);

  const value = useMemo(
    () => ({
      releases,
      matrixReleases,
      allReleases,
      dateRange,
      setDateRange,
      selectedYears,
      toggleYear,
      clearTimelineFilter,
      isFiltered,
      partners,
      matrixPartners,
      productAreaGroups: PRODUCT_BUCKET_GROUPS,
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
      computeGapsForRelease,
    }),
    [
      releases,
      matrixReleases,
      allReleases,
      dateRange,
      setDateRange,
      selectedYears,
      toggleYear,
      clearTimelineFilter,
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
      computeGapsForRelease,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
