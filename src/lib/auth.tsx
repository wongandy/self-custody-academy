import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { initialAuthCallback, supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';

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
  /** Leave the "set a new password" screen (e.g. the reset link turned out to be dead) and start over. */
  cancelRecovery: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toCode(error: AuthError): string {
  return error.code ?? (error.status === 429 ? 'over_request_rate_limit' : 'unknown');
}

/**
 * Supabase normally returns errors, but a dropped connection or a non-JSON response
 * from a proxy can make the call throw. Turn that into an error result so the form
 * unlocks and shows a message instead of sitting on "Please wait…".
 */
async function attempt<T>(call: () => Promise<T>, fallback: (code: string) => T): Promise<T> {
  try {
    return await call();
  } catch {
    return fallback('unknown');
  }
}

function redirectUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
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

  const signUp = useCallback((email: string, password: string) => attempt<SignUpResult>(async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // `locale` picks the language of the emails Supabase sends this user.
      options: { emailRedirectTo: redirectUrl(), data: { locale } },
    });
    if (error) return { error: toCode(error), needsConfirmation: false };
    // With email confirmation on, Supabase hides duplicate sign-ups behind a fake
    // user with no identities instead of returning an error.
    if (data.user && data.user.identities?.length === 0) {
      return { error: 'user_already_exists', needsConfirmation: false };
    }
    return { error: null, needsConfirmation: !data.session };
  }, (code) => ({ error: code, needsConfirmation: false })), [locale]);

  const signIn = useCallback((email: string, password: string) => attempt<AuthResult>(async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? toCode(error) : null };
  }, (code) => ({ error: code })), []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback((email: string) => attempt<AuthResult>(async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl(),
    });
    return { error: error ? toCode(error) : null };
  }, (code) => ({ error: code })), []);

  const updatePassword = useCallback((password: string) => attempt<AuthResult>(async () => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: toCode(error) };
    setIsRecovering(false);
    return { error: null };
  }, (code) => ({ error: code })), []);

  // Keep the saved email language in step with the language the user browses in,
  // so accounts made before `locale` existed (or that switch language) get it too.
  const user = session?.user ?? null;
  const savedLocale = user?.user_metadata?.locale;
  useEffect(() => {
    if (!user || savedLocale === locale) return;
    supabase.auth.updateUser({ data: { locale } });
  }, [user?.id, savedLocale, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancelRecovery = useCallback(async () => {
    setIsRecovering(false);
    await supabase.auth.signOut();
  }, []);

  const clearLinkError = useCallback(() => setLinkError(null), []);

  const value: AuthContextValue = {
    session,
    user,
    isReady,
    isRecovering,
    linkError,
    clearLinkError,
    signUp,
    signIn,
    resetPassword,
    updatePassword,
    cancelRecovery,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
