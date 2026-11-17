import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

describe('pages with their own URL', () => {
  const lessonCard = (title: string) => screen.findByRole('link', { name: new RegExp(`: ${title}`) });

  it('gives the intro page its URL', async () => {
    window.history.replaceState(null, '', '/');
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('link', { name: en.home.getStarted }));
    expect(window.location.pathname).toBe('/get-started');
    expect(screen.getByRole('button', { name: en.header.backHome })).toBeInTheDocument();
  });

  it('opens the journey page from its URL', () => {
    window.history.replaceState(null, '', '/choose-your-journey');
    renderApp();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(en.pathSelector.title);
  });

  it('opens the roadmap, and each lesson at its own URL', async () => {
    window.history.replaceState(null, '', '/roadmap');
    const user = userEvent.setup();
    renderApp();
    await user.click(await lessonCard(en.roadmap.titles[2]));
    expect(window.location.pathname).toBe('/lessons/receive-bitcoin');
    expect(screen.getByRole('button', { name: en.header.backRoadmap })).toBeInTheDocument();
  });

  it('opens a lesson straight from its URL', () => {
    window.history.replaceState(null, '', '/lessons/send-bitcoin');
    renderApp();
    expect(window.location.pathname).toBe('/lessons/send-bitcoin');
    expect(screen.getByRole('button', { name: en.header.backRoadmap })).toBeInTheDocument();
  });

  it('sends an unknown lesson URL home', () => {
    window.history.replaceState(null, '', '/lessons/nope');
    renderApp();
    expect(window.location.pathname).toBe('/');
    expect(screen.getByRole('link', { name: en.home.getStarted })).toBeInTheDocument();
  });

  async function pressBackInLesson() {
    window.history.replaceState(null, '', '/roadmap');
    const user = userEvent.setup();
    renderApp();
    await user.click(await lessonCard(en.roadmap.titles[2]));
    await act(async () => {
      window.history.pushState(null, '', '/roadmap');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByRole('alertdialog')).toHaveTextContent(en.header.leaveLesson.title);
    return user;
  }

  it('asks before Back leaves a lesson; Stay keeps the lesson and its URL', async () => {
    const user = await pressBackInLesson();
    await user.click(screen.getByRole('button', { name: en.header.leaveLesson.stay }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/lessons/receive-bitcoin');
    expect(screen.getByRole('button', { name: en.header.backRoadmap })).toBeInTheDocument();
  });

  it('asks before Back leaves a lesson; Leave goes to the roadmap', async () => {
    const user = await pressBackInLesson();
    await user.click(screen.getByRole('button', { name: en.header.leaveLesson.leave }));
    expect(window.location.pathname).toBe('/roadmap');
    expect(await lessonCard(en.roadmap.titles[0])).toBeInTheDocument();
  });
});

describe('search engine tags', () => {
  const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href');

  it('opens every sitemap URL as its own page', () => {
    const xml = readFileSync(resolve(__dirname, '../public/sitemap.xml'), 'utf8');
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(10);
    for (const url of urls) {
      const path = new URL(url).pathname;
      window.history.replaceState(null, '', path);
      const { unmount } = renderApp();
      expect(window.location.pathname).toBe(path);
      expect(canonical()).toBe(url);
      unmount();
    }
  });

  it("gives a lesson its own title, description and canonical URL", () => {
    window.history.replaceState(null, '', '/lessons/receive-bitcoin');
    renderApp();
    expect(document.title).toBe(`Lesson 3: ${en.roadmap.titles[2]} · Self-Custody Academy`);
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(en.roadmap.descriptions[2]);
    expect(canonical()).toBe('https://selfcustody.academy/lessons/receive-bitcoin');
  });

  it('keeps the temporary playground out of search results', () => {
    window.history.replaceState(null, '', '/test');
    renderApp();
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');
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

describe('account menu', () => {
  const accountButton = () => screen.findByRole('button', { name: `${en.header.account}: learner@example.com` });

  /** Signed in already (a saved session), with `lessons` saved to the account. */
  function renderSignedIn(path: string, lessons: number[] = [1, 2, 3]) {
    window.history.replaceState(null, '', path);
    supabaseMock.supabase.auth.getSession.mockResolvedValue({ data: { session: fakeSession({ locale: 'en' }) }, error: null });
    supabaseMock.db.maybeSingle.mockResolvedValue({ data: { completed_lessons: lessons }, error: null });
    const user = userEvent.setup();
    renderApp();
    return user;
  }

  it('is not shown to guests', async () => {
    window.history.replaceState(null, '', '/about');
    renderApp();
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('button', { name: new RegExp(`^${en.header.account}:`) })).not.toBeInTheDocument();
  });

  it('takes a signed-in learner from any page to their roadmap', async () => {
    const user = renderSignedIn('/about');
    await user.click(await accountButton());
    await user.click(screen.getByRole('menuitem', { name: en.header.myRoadmap }));
    expect(window.location.pathname).toBe('/roadmap');
    expect(await screen.findByText('3 of 6 lessons complete')).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('loads saved progress on Home so it can offer the next lesson', async () => {
    const user = renderSignedIn('/');
    await user.click(await accountButton());
    const next = await screen.findByRole('menuitem', { name: /Continue Lesson 4/ });
    await user.click(next);
    expect(window.location.pathname).toBe('/lessons/recover-hardware-wallet');
    expect(screen.getByRole('button', { name: en.header.backRoadmap })).toBeInTheDocument();
  });

  it('loads progress only once while moving between pages', async () => {
    const user = renderSignedIn('/');
    await user.click(await accountButton());
    await screen.findByRole('menuitem', { name: /Continue Lesson 4/ });
    await user.click(screen.getByRole('link', { name: en.home.footerAbout }));
    await user.click(screen.getByRole('link', { name: en.home.footerContact }));
    expect(window.location.pathname).toBe('/contact-us');
    expect(supabaseMock.db.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('only signs out from the Sign out item', async () => {
    const user = renderSignedIn('/about');
    await user.click(await accountButton());
    expect(supabaseMock.supabase.auth.signOut).not.toHaveBeenCalled();
    await user.click(screen.getByRole('menuitem', { name: en.header.signOut }));
    await waitFor(() => expect(supabaseMock.supabase.auth.signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });

  it('asks before leaving a lesson for the roadmap; Stay keeps the lesson', async () => {
    const user = renderSignedIn('/lessons/receive-bitcoin');
    await user.click(await accountButton());
    await user.click(screen.getByRole('menuitem', { name: en.header.myRoadmap }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(en.header.leaveLesson.title);
    await user.click(screen.getByRole('button', { name: en.header.leaveLesson.stay }));
    expect(window.location.pathname).toBe('/lessons/receive-bitcoin');
  });

  it('asks before leaving a lesson for another one; Leave opens the chosen lesson', async () => {
    const user = renderSignedIn('/lessons/send-bitcoin');
    await user.click(await accountButton());
    await user.click(await screen.findByRole('menuitem', { name: /Continue Lesson 4/ }));
    await user.click(screen.getByRole('button', { name: en.header.leaveLesson.leave }));
    expect(window.location.pathname).toBe('/lessons/recover-hardware-wallet');
  });

  it('after a menu trip, the back arrow still leaves for the roadmap', async () => {
    const user = renderSignedIn('/lessons/send-bitcoin');
    await user.click(await accountButton());
    await user.click(await screen.findByRole('menuitem', { name: /Continue Lesson 4/ }));
    await user.click(screen.getByRole('button', { name: en.header.leaveLesson.stay }));
    await user.click(screen.getByRole('button', { name: en.header.backRoadmap }));
    await user.click(screen.getByRole('button', { name: en.header.leaveLesson.leave }));
    expect(window.location.pathname).toBe('/roadmap');
  });

  it('browser Back after the menu returns to the page before', async () => {
    const user = renderSignedIn('/about');
    await user.click(await accountButton());
    await user.click(screen.getByRole('menuitem', { name: en.header.myRoadmap }));
    await act(async () => {
      window.history.back();
      await new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }));
    });
    expect(window.location.pathname).toBe('/about');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(en.about.titleEm);
  });
});
