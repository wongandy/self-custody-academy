import { vi } from 'vitest';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

/**
 * Drop-in replacement for '@/lib/supabase' in tests:
 *   vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'));
 */
type Result = { data: Record<string, unknown>; error: unknown };
type Listener = (event: AuthChangeEvent, session: Session | null) => void;

/** A stand-in for the Supabase client, shaped like the parts auth.tsx uses. */
function createSupabaseMock() {
  const listeners: Listener[] = [];
  const auth = {
    getSession: vi.fn(async () => ({ data: { session: null as Session | null }, error: null })),
    onAuthStateChange: vi.fn((cb: Listener) => {
      listeners.push(cb);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(async (): Promise<Result> => ({ data: { user: null }, error: null })),
    signOut: vi.fn(async (): Promise<{ error: unknown }> => ({ error: null })),
  };
  const emit = (event: AuthChangeEvent, session: Session | null) => listeners.forEach((cb) => cb(event, session));
  const reset = () => {
    listeners.length = 0;
    Object.values(auth).forEach((fn) => fn.mockClear());
    auth.getSession.mockImplementation(async () => ({ data: { session: null }, error: null }));
    auth.updateUser.mockImplementation(async () => ({ data: { user: null }, error: null }));
    auth.signOut.mockImplementation(async () => ({ error: null }));
    auth.signUp.mockReset();
    auth.signInWithPassword.mockReset();
    auth.resetPasswordForEmail.mockReset();
  };
  return { supabase: { auth }, emit, reset };
}


export const supabaseMock = createSupabaseMock();
export const supabase = supabaseMock.supabase;

/** Mutable so a test can pretend the page was opened from an email link. Set it before rendering. */
export const initialAuthCallback: { isRecovery: boolean; errorCode: string | null } = {
  isRecovery: false,
  errorCode: null,
};

export function resetSupabaseMock() {
  supabaseMock.reset();
  initialAuthCallback.isRecovery = false;
  initialAuthCallback.errorCode = null;
}
