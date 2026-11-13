import { useState } from 'react';
import { vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session } from '@supabase/supabase-js';
import AuthScreen from '@/components/AuthScreen';
import { AuthProvider, useAuth } from '@/lib/auth';
import { LocaleProvider, type Locale } from '@/lib/i18n';

/** Shape of a Supabase AuthError as auth.tsx reads it. */
export function authError(code: string | undefined, status = 400) {
  return { name: 'AuthApiError', message: code ?? 'error', code, status };
}

export function fakeSession(metadata: Record<string, unknown> = {}): Session {
  return {
    access_token: 'token',
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'user-1',
      email: 'learner@example.com',
      app_metadata: {},
      user_metadata: metadata,
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00Z',
    },
  } as Session;
}

/** Mirrors how App.tsx mounts AuthScreen: mode state lives outside, recovery swaps the key. */
function Harness({ initialMode, onSuccess, onSkip }: { initialMode: 'login' | 'register'; onSuccess: () => void; onSkip: () => void }) {
  const { isRecovering } = useAuth();
  const [mode, setMode] = useState(initialMode);
  return (
    <AuthScreen
      key={isRecovering ? 'recovery' : 'auth'}
      mode={isRecovering ? 'recovery' : mode}
      onBack={() => {}}
      onSuccess={onSuccess}
      onSwitchMode={setMode}
      onSkip={onSkip}
    />
  );
}

export function renderAuth({ mode = 'login', locale = 'en' }: { mode?: 'login' | 'register'; locale?: Locale } = {}) {
  window.localStorage.setItem('sca-locale', locale);
  const onSuccess = vi.fn();
  const onSkip = vi.fn();
  const user = userEvent.setup();
  const view = render(
    <LocaleProvider>
      <AuthProvider>
        <Harness initialMode={mode} onSuccess={onSuccess} onSkip={onSkip} />
      </AuthProvider>
    </LocaleProvider>,
  );
  return { ...view, user, onSuccess, onSkip };
}
