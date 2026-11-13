/**
 * Local-timezone-safe date and shared settings helpers.
 * Prevents UTC rollover bugs after 21:00 BRT (UTC-3).
 */

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalMonthString(date: Date = new Date()): string {
  return getLocalDateString(date).substring(0, 7);
}

export function getDaysAgoDateString(daysAgo: number, baseDate: Date = new Date()): string {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  d.setDate(d.getDate() - daysAgo);
  return getLocalDateString(d);
}

export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Difference in calendar days between YYYY-MM-DD and local today.
 * Positive means targetDate is in the future; negative means overdue.
 */
export function daysFromToday(targetDateStr: string): number {
  const [y, m, d] = targetDateStr.split('-').map(Number);
  if (!y || !m || !d) return 0;
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export const EFFICIENCY_THRESHOLD_KEY = 'gls_min_efficiency_threshold';

export function getSavedEfficiencyThreshold(fallback = 10.0): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(EFFICIENCY_THRESHOLD_KEY);
    if (!raw) return fallback;
    const parsed = parseFloat(raw);
    return !isNaN(parsed) && parsed > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveEfficiencyThreshold(val: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EFFICIENCY_THRESHOLD_KEY, String(val));
  } catch {
    // ignore storage errors
  }
}
