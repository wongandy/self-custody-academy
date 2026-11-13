import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import App from '@/App';
import { AuthProvider } from '@/lib/auth';
import { LocaleProvider } from '@/lib/i18n';
import en from '@/locales/en';
import { fakeSession } from '@/test/authHarness';
import { initialAuthCallback, resetSupabaseMock, supabaseMock } from '@/test/supabaseMock';

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'));

function renderApp() {
  window.localStorage.setItem('sca-locale', 'en');
  return render(
    <LocaleProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LocaleProvider>,
  );
}

/** supabase-js clears the token with `window.location.hash = ''`, which browsers report as a popstate. */
function clearHashLikeSupabase() {
  window.history.pushState(null, '', `${window.location.pathname}#`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

beforeEach(() => {
  resetSupabaseMock();
  window.scrollTo = vi.fn();
});

describe('arriving from a password-reset email', () => {
  it('stays on "Set a new password" after Supabase clears the token from the URL', async () => {
    window.history.replaceState(null, '', '/#access_token=abc&type=recovery');
    initialAuthCallback.isRecovery = true;
    renderApp();
    expect(screen.getByRole('heading', { name: en.auth.newPasswordTitle })).toBeInTheDocument();

    await act(async () => {
      supabaseMock.emit('PASSWORD_RECOVERY', fakeSession());
      clearHashLikeSupabase();
    });

    expect(screen.getByRole('heading', { name: en.auth.newPasswordTitle })).toBeInTheDocument();
  });
});

describe('browser back / forward', () => {
  it('still switches pages when the path changes', async () => {
    window.history.replaceState(null, '', '/about');
    renderApp();
    await act(async () => {
      window.history.pushState(null, '', '/contact-us');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(window.location.pathname).toBe('/contact-us');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(en.contact.titleEm);
  });
});
