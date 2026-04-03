const STORAGE_KEY = 'gsp-summary-history-v1';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function loadSummaryHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordSummarySnapshot(snapshot) {
  if (typeof window === 'undefined') return [];

  const history = loadSummaryHistory();
  const date = todayKey();
  const next = history.filter((entry) => entry.date !== date);
  next.push({ date, ...snapshot });
  next.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const trimmed = next.slice(-8);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    return trimmed;
  }

  return trimmed;
}

export function previousSummarySnapshot(history) {
  const date = todayKey();
  const prior = [...history].reverse().find((entry) => entry.date !== date);
  return prior || null;
}

export function metricSeries(history, key, currentValue) {
  const points = history.slice(-7).map((entry) => Number(entry[key]) || 0);
  if (!history.length || history[history.length - 1]?.date !== todayKey()) {
    points.push(Number(currentValue) || 0);
  }
  return points.slice(-7);
}

export function metricTrend(currentValue, previousValue) {
  if (previousValue == null || Number.isNaN(Number(previousValue))) {
    return { direction: 'flat', delta: 0, percent: null };
  }

  const delta = Number(currentValue || 0) - Number(previousValue || 0);
  if (delta === 0) {
    return { direction: 'flat', delta: 0, percent: 0 };
  }

  const denominator = Number(previousValue || 0);
  const percent = denominator === 0 ? null : Math.round((delta / denominator) * 100);
  return {
    direction: delta > 0 ? 'up' : 'down',
    delta,
    percent,
  };
}
