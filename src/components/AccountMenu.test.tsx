import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountMenu from '@/components/AccountMenu';
import { LocaleProvider, type Locale } from '@/lib/i18n';
import en from '@/locales/en';
import th from '@/locales/th';

const EMAIL = 'learner@example.com';

function renderMenu({
  completedLessons = [1, 2, 3] as number[] | null,
  currentLesson = null as number | null,
  locale = 'en' as Locale,
} = {}) {
  window.localStorage.setItem('sca-locale', locale);
  const props = {
    onOpenRoadmap: vi.fn(),
    onContinueLesson: vi.fn(),
    onSignOut: vi.fn(),
  };
  const user = userEvent.setup();
  render(
    <LocaleProvider>
      <div data-testid="outside">outside</div>
      <AccountMenu email={EMAIL} completedLessons={completedLessons} currentLesson={currentLesson} {...props} />
    </LocaleProvider>,
  );
  const toggle = () => screen.getByRole('button', { name: `${en.header.account}: ${EMAIL}` });
  const open = () => user.click(toggle());
  return { ...props, user, toggle, open };
}

const menu = () => screen.queryByRole('menu');

describe('AccountMenu', () => {
  it('starts closed and names the account on its button', () => {
    const { toggle } = renderMenu();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(toggle()).toHaveAttribute('aria-haspopup', 'menu');
    expect(toggle()).toHaveTextContent('L');
    expect(menu()).not.toBeInTheDocument();
  });

  it('opens to the email, Continue, My roadmap and Sign out, in that order, with no progress row', async () => {
    const { open, toggle } = renderMenu();
    await open();
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(menu()).toHaveTextContent(EMAIL);
    expect(menu()).not.toHaveTextContent('lessons complete');
    const items = screen.getAllByRole('menuitem');
    expect(items.map((el) => el.textContent)).toEqual([
      `Continue Lesson 4${en.roadmap.titles[3]}`,
      en.header.myRoadmap,
      en.header.signOut,
    ]);
  });

  it('links to the roadmap and the next lesson by their real URLs', async () => {
    const { open } = renderMenu({ completedLessons: [1, 2] });
    await open();
    expect(screen.getByRole('menuitem', { name: /Continue Lesson 3/ })).toHaveAttribute('href', '/lessons/receive-bitcoin');
    expect(screen.getByRole('menuitem', { name: en.header.myRoadmap })).toHaveAttribute('href', '/roadmap');
  });

  it('offers Lesson 1 to a learner who has not finished any', async () => {
    const { open } = renderMenu({ completedLessons: [] });
    await open();
    expect(screen.getByRole('menuitem', { name: /Continue Lesson 1/ })).toHaveAttribute('href', '/lessons/set-up-hardware-wallet');
  });

  it('finds the first gap, not the highest lesson', async () => {
    const { open } = renderMenu({ completedLessons: [1, 3, 4] });
    await open();
    expect(screen.getByRole('menuitem', { name: /Continue Lesson 2/ })).toBeInTheDocument();
  });

  it('drops Continue once every lesson is done', async () => {
    const { open } = renderMenu({ completedLessons: [1, 2, 3, 4, 5, 6] });
    await open();
    expect(menu()).not.toHaveTextContent(en.roadmap.pathComplete);
    expect(screen.queryByRole('menuitem', { name: /Continue/ })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: en.header.myRoadmap })).toBeInTheDocument();
  });

  it('hides Continue until progress has loaded', async () => {
    const { open } = renderMenu({ completedLessons: null });
    await open();
    expect(screen.queryByRole('menuitem', { name: /Continue/ })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: en.header.myRoadmap })).toBeInTheDocument();
  });

  it('does not offer to continue the lesson already on screen', async () => {
    const { open } = renderMenu({ completedLessons: [1, 2, 3], currentLesson: 4 });
    await open();
    expect(screen.queryByRole('menuitem', { name: /Continue/ })).not.toBeInTheDocument();
  });

  it('opening the menu never signs out', async () => {
    const { open, toggle, user, onSignOut } = renderMenu();
    await open();
    await user.click(toggle());
    await open();
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it.each([
    ['My roadmap', () => screen.getByRole('menuitem', { name: en.header.myRoadmap }), 'onOpenRoadmap', []],
    ['Continue', () => screen.getByRole('menuitem', { name: /Continue Lesson 4/ }), 'onContinueLesson', [4]],
    ['Sign out', () => screen.getByRole('menuitem', { name: en.header.signOut }), 'onSignOut', []],
  ] as const)('%s calls its handler once and closes the menu', async (_name, item, handler, args) => {
    const view = renderMenu();
    await view.open();
    await view.user.click(item());
    expect(view[handler]).toHaveBeenCalledTimes(1);
    expect(view[handler]).toHaveBeenCalledWith(...args);
    expect(menu()).not.toBeInTheDocument();
  });

  it('leaves modified clicks to the browser so the link can open in a new tab', async () => {
    const { open, onOpenRoadmap } = renderMenu();
    await open();
    // React has had its turn by the time the click reaches window; stop jsdom from navigating.
    let leftToBrowser = false;
    const stopNavigation = (e: MouseEvent) => {
      leftToBrowser = !e.defaultPrevented;
      e.preventDefault();
    };
    window.addEventListener('click', stopNavigation);
    fireEvent.click(screen.getByRole('menuitem', { name: en.header.myRoadmap }), { ctrlKey: true });
    window.removeEventListener('click', stopNavigation);
    expect(leftToBrowser).toBe(true);
    expect(onOpenRoadmap).not.toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    const { open, user } = renderMenu();
    await open();
    await user.keyboard('{Escape}');
    expect(menu()).not.toBeInTheDocument();
  });

  it('closes on a tap outside but not on a tap inside', async () => {
    const { open } = renderMenu();
    await open();
    fireEvent.pointerDown(screen.getByText(EMAIL));
    expect(menu()).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByTestId('outside'));
    expect(menu()).not.toBeInTheDocument();
  });

  it('closes when the window resizes (a phone turning)', async () => {
    const { open } = renderMenu();
    await open();
    fireEvent(window, new Event('resize'));
    expect(menu()).not.toBeInTheDocument();
  });

  it('closes on browser Back', async () => {
    const { open } = renderMenu();
    await open();
    fireEvent(window, new PopStateEvent('popstate'));
    expect(menu()).not.toBeInTheDocument();
  });

  it('speaks Thai', async () => {
    window.localStorage.setItem('sca-locale', 'th');
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <AccountMenu email={EMAIL} completedLessons={[1]} onOpenRoadmap={vi.fn()} onContinueLesson={vi.fn()} onSignOut={vi.fn()} />
      </LocaleProvider>,
    );
    await user.click(screen.getByRole('button', { name: `${th.header.account}: ${EMAIL}` }));
    expect(screen.getByRole('menuitem', { name: th.header.myRoadmap })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: new RegExp(th.header.continueLesson.replace('{n}', '2')) })).toBeInTheDocument();
  });
});
