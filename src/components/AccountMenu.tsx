import { useEffect, useRef, useState } from 'react';
import { LogOut, Map as MapIcon, Play } from 'lucide-react';
import { fmt, useI18n } from '@/lib/i18n';
import { LESSONS, firstUnfinished, lessonPath } from '@/lib/lessons';
import { inAppClick } from '@/lib/links';

type Props = {
  email: string;
  /** Lessons the learner has finished, or null while their progress hasn't loaded. */
  completedLessons: number[] | null;
  /** The lesson on screen right now, so "Continue" isn't offered for it. */
  currentLesson?: number | null;
  onOpenRoadmap: () => void;
  onContinueLesson: (lesson: number) => void;
  onSignOut: () => void;
};

/**
 * Round account button in the header. Its menu gets a signed-in learner back to
 * their lessons from any page; signing out sits last so it can't happen by accident.
 */
function AccountMenu({ email, completedLessons, currentLesson = null, onOpenRoadmap, onContinueLesson, onSignOut }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = email.trim().charAt(0).toUpperCase() || '?';
  // Let a long email wrap after the @ so the domain stays whole.
  const at = email.indexOf('@');

  const next = completedLessons ? firstUnfinished(new Set(completedLessons)) : null;
  const nextLesson = next !== null && next !== currentLesson ? LESSONS.find((lesson) => lesson.number === next) : undefined;

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    // Turning a phone or browser Back leaves nothing for an open menu to point at.
    window.addEventListener('resize', close);
    window.addEventListener('popstate', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('popstate', close);
    };
  }, [open]);

  const choose = (go: () => void) =>
    inAppClick(() => {
      setOpen(false);
      go();
    });

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        className="account-toggle"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t.header.account}: ${email}`}
        title={email}
      >
        <span className="account-initial" aria-hidden="true">{initial}</span>
        <span className="account-dot" aria-hidden="true" />
      </button>
      {open && (
        <div className="locale-menu account-dropdown" role="menu" aria-label={t.header.account}>
          <div className="account-who">
            <span className="account-who-label">{t.header.signedInAs}</span>
            <span className="account-who-email">
              {at > 0 ? (
                <>
                  {email.slice(0, at + 1)}
                  <wbr />
                  {email.slice(at + 1)}
                </>
              ) : (
                email
              )}
            </span>
          </div>

          {nextLesson && (
            <a
              className="account-item account-continue"
              href={lessonPath(nextLesson)}
              role="menuitem"
              onClick={choose(() => onContinueLesson(nextLesson.number))}
            >
              <Play size={15} strokeWidth={2.4} />
              <span className="account-item-text">
                <span className="account-item-label">{fmt(t.header.continueLesson, { n: nextLesson.number })}</span>
                <span className="account-item-sub">{t.roadmap.titles[nextLesson.number - 1]}</span>
              </span>
            </a>
          )}
          <a className="account-item" href="/roadmap" role="menuitem" onClick={choose(onOpenRoadmap)}>
            <MapIcon size={15} strokeWidth={2.2} />
            <span className="account-item-label">{t.header.myRoadmap}</span>
          </a>

          <div className="account-divider" role="separator" />
          <button
            className="account-item account-signout"
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            <LogOut size={15} strokeWidth={2.2} />
            <span className="account-item-label">{t.header.signOut}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default AccountMenu;
