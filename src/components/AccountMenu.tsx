import { useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

type Props = {
  email: string;
  onSignOut: () => void;
};

/** Round account button in the header; signing out sits inside its menu so it can't happen by accident. */
function AccountMenu({ email, onSignOut }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = email.trim().charAt(0).toUpperCase() || '?';
  // Let a long email wrap after the @ so the domain stays whole.
  const at = email.indexOf('@');

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

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
          <button
            className="locale-option account-signout"
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            <LogOut size={15} strokeWidth={2.2} />
            <span className="locale-option-label">{t.header.signOut}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default AccountMenu;
