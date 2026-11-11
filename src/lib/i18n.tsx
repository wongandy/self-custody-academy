import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import en, { type Dictionary } from '@/locales/en';
import th from '@/locales/th';

export type Locale = 'en' | 'th';

export const LOCALES: { code: Locale; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'th', label: 'ไทย', short: 'TH' },
];

const DICTIONARIES: Record<Locale, Dictionary> = { en, th };

const STORAGE_KEY = 'sca-locale';

function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'th';
}

function getInitialLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // localStorage can be unavailable (private browsing); fall through
  }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('th')) {
    return 'th';
  }
  return 'en';
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // preference simply won't persist if storage is blocked
    }
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t: DICTIONARIES[locale] }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within LocaleProvider');
  return ctx;
}

/** Fill `{name}` placeholders in a translated string. Unknown placeholders are left as-is. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

/**
 * Translations mark where an inline icon belongs with `{icon}`. It is swapped
 * for a single private-use character so the typewriter reveals it as one step,
 * and `renderWithIcon` turns it into the real icon once typing reaches it.
 */
export const ICON_MARK = '';

export function withIconMark(text: string): string {
  return text.replace('{icon}', ICON_MARK);
}

export function renderWithIcon(text: string, icon: ReactNode): ReactNode {
  const index = text.indexOf(ICON_MARK);
  if (index === -1) return text;
  // Browsers may break a line before an inline-block, which would strand the
  // icon at the start of the next line. Keep it glued to the word it follows.
  const wordStart = text.slice(0, index).search(/\S+$/);
  const splitAt = wordStart === -1 ? index : wordStart;
  return (
    <>
      {text.slice(0, splitAt)}
      <span style={{ whiteSpace: 'nowrap' }}>
        {text.slice(splitAt, index)}
        {icon}
      </span>
      {text.slice(index + ICON_MARK.length)}
    </>
  );
}
