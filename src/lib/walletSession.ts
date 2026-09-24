import { supabase } from '@/lib/supabase';

let sessionMnemonic: string[] | null = null;

const LOCAL_KEY = 'sca_simulation_mnemonic';

function getLocalMnemonic(): string[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const words = raw.split(' ');
    return words.length === 12 ? words : null;
  } catch {
    return null;
  }
}

function setLocalMnemonic(words: string[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, words.join(' '));
  } catch {
    // ignore storage failures
  }
}

function clearLocalMnemonic(): void {
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    // ignore
  }
}

export function setSessionMnemonic(words: string[]): void {
  sessionMnemonic = words;
}

export function getSessionMnemonic(): string[] | null {
  if (sessionMnemonic) return sessionMnemonic;
  return getLocalMnemonic();
}

export function clearSessionMnemonic(): void {
  sessionMnemonic = null;
  clearLocalMnemonic();
}

/**
 * Persist the mnemonic to the database (logged-in) and/or localStorage (guest).
 * Call this after Mission 1 generates a new wallet.
 */
export async function persistMnemonic(words: string[]): Promise<void> {
  sessionMnemonic = words;
  setLocalMnemonic(words);

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await supabase
      .from('learning_progress')
      .upsert({
        user_id: session.user.id,
        simulation_mnemonic: words.join(' '),
        updated_at: new Date().toISOString(),
      });
  }
}

/**
 * Load the mnemonic from the database if logged in, falling back to localStorage.
 * Use this when Mission 3 starts to ensure we have the phrase even after a refresh.
 */
export async function loadMnemonic(): Promise<string[] | null> {
  if (sessionMnemonic) return sessionMnemonic;

  const local = getLocalMnemonic();
  if (local) {
    sessionMnemonic = local;
    return local;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const { data } = await supabase
      .from('learning_progress')
      .select('simulation_mnemonic')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (data?.simulation_mnemonic) {
      const words = data.simulation_mnemonic.split(' ');
      if (words.length === 12) {
        sessionMnemonic = words;
        setLocalMnemonic(words);
        return words;
      }
    }
  }

  return null;
}

/**
 * Clear the stored mnemonic from the database (logged-in) and localStorage.
 * Call this on sign-out.
 */
export async function clearStoredMnemonic(): Promise<void> {
  sessionMnemonic = null;
  clearLocalMnemonic();

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await supabase
      .from('learning_progress')
      .upsert({
        user_id: session.user.id,
        simulation_mnemonic: null,
        updated_at: new Date().toISOString(),
      });
  }
}
