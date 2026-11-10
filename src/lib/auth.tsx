import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { initialAuthCallback, supabase } from '@/lib/supabase';

/**
 * Auth results carry a stable error code (Supabase's `error.code` where available)
 * so the UI can show a translated message instead of Supabase's raw English text.
 */
export type AuthResult = { error: string | null };
export type SignUpResult = AuthResult & { needsConfirmation: boolean };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isReady: boolean;
  /** True after the user arrived via a password-reset email link and has not yet set a new password. */
  isRecovering: boolean;
  /** Error code from an auth link that failed (e.g. expired reset link), shown once then cleared. */
  linkError: string | null;
  clearLinkError: () => void;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toCode(error: AuthError): string {
  return error.code ?? (error.status === 429 ? 'over_request_rate_limit' : 'unknown');
}

function redirectUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isRecovering, setIsRecovering] = useState(initialAuthCallback.isRecovery);
  const [linkError, setLinkError] = useState<string | null>(initialAuthCallback.errorCode);

  useEffect(() => {
    // Supabase leaves the error params in the URL when a link fails; tidy them away.
    if (initialAuthCallback.errorCode) {
      window.history.replaceState(null, '', redirectUrl());
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'PASSWORD_RECOVERY') setIsRecovering(true);
      if (event === 'SIGNED_OUT') setIsRecovering(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl() },
    });
    if (error) return { error: toCode(error), needsConfirmation: false };
    // With email confirmation on, Supabase hides duplicate sign-ups behind a fake
    // user with no identities instead of returning an error.
    if (data.user && data.user.identities?.length === 0) {
      return { error: 'user_already_exists', needsConfirmation: false };
    }
    return { error: null, needsConfirmation: !data.session };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: toCode(error) };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl(),
    });
    if (error) return { error: toCode(error) };
    return { error: null };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: toCode(error) };
    setIsRecovering(false);
    return { error: null };
  }, []);

  const clearLinkError = useCallback(() => setLinkError(null), []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    isReady,
    isRecovering,
    linkError,
    clearLinkError,
    signUp,
    signIn,
    resetPassword,
    updatePassword,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
