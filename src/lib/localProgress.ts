import { LESSONS } from '@/lib/lessons';

// Lesson numbers follow the roadmap order. The order changed once: before it,
// lessons 2–5 were Withdraw, Recover, Connect, Receive; now they are Connect,
// Receive, Recover, Withdraw. Progress saved under the old numbering lives in
// the old keys and is converted the first time it's read.
const STORAGE_KEY = 'sca_local_lessons_v2';
// Saved before the lessons were reordered: a list of old lesson numbers.
const OLD_ORDER_KEY = 'sca_local_lessons';
// Older builds still stored a single count ("old lessons 1..N done").
const LEGACY_KEY = 'sca_local_progress';

export const TOTAL_LESSONS = LESSONS.length;
// Legacy saves come from the six-lesson era, so their conversion stays capped at six.
const LEGACY_LESSON_COUNT = 6;

/** Old lesson number → new lesson number. Mirrored by the reorder_lessons SQL migration. */
const OLD_TO_NEW: Record<number, number> = { 1: 1, 2: 5, 3: 4, 4: 2, 5: 3, 6: 6 };

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

/** Lessons saved in the old order, already renumbered; null when there are none. */
function readOldOrderLessons(): number[] | null {
  const raw = localStorage.getItem(OLD_ORDER_KEY);
  let old: number[] | null = null;
  if (raw !== null) {
    try {
      old = normalizeLessons(JSON.parse(raw));
    } catch {
      old = [];
    }
  } else {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === null) return null;
    const count = Math.min(Math.max(parseInt(legacy, 10) || 0, 0), LEGACY_LESSON_COUNT);
    old = Array.from({ length: count }, (_, i) => i + 1);
  }
  return normalizeLessons(old.map((n) => OLD_TO_NEW[n]));
}

export function getLocalLessons(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) return normalizeLessons(JSON.parse(raw));

    const migrated = readOldOrderLessons();
    if (migrated === null) return [];
    setLocalLessons(migrated);
    return migrated;
  } catch {
    return [];
  }
}

export function setLocalLessons(lessons: number[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeLessons(lessons)));
    localStorage.removeItem(OLD_ORDER_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // ignore storage failures (private mode, quota, etc.)
  }
}

export function clearLocalProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(OLD_ORDER_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // ignore
  }
}
