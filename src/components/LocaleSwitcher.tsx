import { useEffect, useRef, useState } from 'react';
import { Check, Languages } from 'lucide-react';
import { LOCALES, useI18n } from '@/lib/i18n';

function LocaleSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = LOCALES.find((option) => option.code === locale) ?? LOCALES[0];

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
    <div className="locale-switcher" ref={rootRef}>
      <button
        className="locale-toggle"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t.header.language}: ${current.label}`}
        title={t.header.language}
      >
        <Languages size={15} strokeWidth={2.1} />
        <span className="locale-toggle-code">{current.short}</span>
      </button>
      {open && (
        <div className="locale-menu" role="menu" aria-label={t.header.language}>
          {LOCALES.map((option) => {
            const active = option.code === locale;
            return (
              <button
                key={option.code}
                className={`locale-option${active ? ' active' : ''}`}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                lang={option.code}
                onClick={() => {
                  setLocale(option.code);
                  setOpen(false);
                }}
              >
                <span className="locale-option-code">{option.short}</span>
                <span className="locale-option-label">{option.label}</span>
                {active && <Check size={14} strokeWidth={2.6} className="locale-option-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LocaleSwitcher;
