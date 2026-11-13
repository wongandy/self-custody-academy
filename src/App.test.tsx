import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { AuthProvider } from '@/lib/auth';
import { LocaleProvider } from '@/lib/i18n';
import en from '@/locales/en';
import { fakeSession } from '@/test/authHarness';
import { getLocalLessons, setLocalLessons } from '@/lib/localProgress';
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

describe('copying guest progress to the account', () => {
  /** Signed in, with guest lessons in the browser; sign in again to land on the roadmap. */
  async function openRoadmapSignedIn() {
    window.history.replaceState(null, '', '/');
    setLocalLessons([1, 2]);
    supabaseMock.supabase.auth.getSession.mockResolvedValue({ data: { session: fakeSession({ locale: 'en' }) }, error: null });
    supabaseMock.supabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    const user = userEvent.setup();
    renderApp();
    await user.click(await screen.findByRole('button', { name: en.home.haveAccount }));
    await user.type(screen.getByPlaceholderText(en.auth.emailPlaceholder), 'learner@example.com');
    await user.type(screen.getByPlaceholderText(en.auth.passwordPlaceholder), 'hunter22');
    await user.click(screen.getByRole('button', { name: en.auth.signIn }));
  }

  it('saves guest lessons to the account, then clears the browser copy', async () => {
    supabaseMock.db.maybeSingle.mockResolvedValue({ data: { completed_lessons: [3] }, error: null });
    await openRoadmapSignedIn();
    await waitFor(() => expect(supabaseMock.db.upsert).toHaveBeenCalled());
    expect(supabaseMock.db.upsert.mock.calls[0][0]).toMatchObject({ user_id: 'user-1', completed_lessons: [1, 2, 3] });
    await waitFor(() => expect(getLocalLessons()).toEqual([]));
  });

  it('keeps the browser copy and shows an error when saving fails', async () => {
    supabaseMock.db.maybeSingle.mockResolvedValue({ data: null, error: null });
    supabaseMock.db.upsert.mockResolvedValue({ error: { message: 'network down' } });
    await openRoadmapSignedIn();
    expect(await screen.findByText(en.roadmap.error)).toBeInTheDocument();
    expect(getLocalLessons()).toEqual([1, 2]);
  });

  it('keeps the browser copy when loading saved progress fails', async () => {
    supabaseMock.db.maybeSingle.mockResolvedValue({ data: null, error: { message: 'column does not exist' } });
    await openRoadmapSignedIn();
    expect(await screen.findByText(en.roadmap.error)).toBeInTheDocument();
    expect(supabaseMock.db.upsert).not.toHaveBeenCalled();
    expect(getLocalLessons()).toEqual([1, 2]);
  });
});
