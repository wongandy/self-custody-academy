const STORAGE_KEY = 'sca_local_lessons';
// Older builds stored a single count ("lessons 1..N done").
const LEGACY_KEY = 'sca_local_progress';

export const TOTAL_LESSONS = 6;

/** Keep only whole lesson numbers 1..TOTAL_LESSONS, deduped and sorted. */
export function normalizeLessons(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<number>();
  for (const value of input) {
    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isInteger(n) && n >= 1 && n <= TOTAL_LESSONS) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

export function mergeLessons(a: number[], b: number[]): number[] {
  return normalizeLessons([...a, ...b]);
}

export function getLocalLessons(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) return normalizeLessons(JSON.parse(raw));

    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === null) return [];
    const count = Math.min(Math.max(parseInt(legacy, 10) || 0, 0), TOTAL_LESSONS);
    return Array.from({ length: count }, (_, i) => i + 1);
  } catch {
    return [];
  }
}

export function setLocalLessons(lessons: number[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeLessons(lessons)));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // ignore storage failures (private mode, quota, etc.)
  }
}

export function clearLocalProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // ignore
  }
}
