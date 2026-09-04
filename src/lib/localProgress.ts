const STORAGE_KEY = 'sca_local_progress';

export function getLocalProgress(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return 0;
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), 4);
  } catch {
    return 0;
  }
}

export function setLocalProgress(completed: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(completed));
  } catch {
    // ignore storage failures (private mode, quota, etc.)
  }
}

export function clearLocalProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
