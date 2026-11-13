import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '@/locales/en';

// The template is pasted into Supabase by hand, so a broken tag would only show up in production.
const html = readFileSync(resolve(process.cwd(), 'supabase/templates/recovery.html'), 'utf8');

/** Split the template into its three language branches: Thai, English, and both (no saved language). */
function branches() {
  const match = html.match(
    /\{\{ if \.Data\.locale \}\}\{\{ if eq \.Data\.locale "th" \}\}([\s\S]*)\{\{ else \}\}([\s\S]*)\{\{ end \}\}\{\{ else \}\}([\s\S]*)\{\{ end \}\}/,
  );
  if (!match) throw new Error('recovery.html no longer has the Thai / English / both structure');
  const [, thai, english, both] = match;
  return { thai, english, both };
}

describe('password-reset email template', () => {
  it('has balanced template tags', () => {
    const opens = html.match(/\{\{\s*if\b/g) ?? [];
    const ends = html.match(/\{\{\s*end\s*\}\}/g) ?? [];
    expect(opens.length).toBe(ends.length);
  });

  it('only uses variables Supabase provides', () => {
    const tags = html.match(/\{\{[^}]*\}\}/g) ?? [];
    const vars = new Set(tags.flatMap((tag) => tag.match(/\.[A-Z]\w*(\.\w+)?/g) ?? []));
    expect([...vars].sort()).toEqual(['.ConfirmationURL', '.Data.locale', '.Email']);
  });

  it.each(['thai', 'english', 'both'] as const)('the %s version links to the reset page', (name) => {
    const body = branches()[name];
    expect(body).toContain('href="{{ .ConfirmationURL }}"');
    expect(body).toContain('{{ .Email }}');
  });

  it('writes each version in the right language', () => {
    const { thai, english, both } = branches();
    const hasThai = (s: string) => /[฀-๿]/.test(s.replace(/<[^>]+>/g, ''));
    expect(hasThai(thai)).toBe(true);
    expect(hasThai(english)).toBe(false);
    expect(hasThai(both)).toBe(true);
    expect(both).toMatch(/We received a request/);
  });

  it('keys the language off the same field the app saves at sign-up', () => {
    // auth.tsx saves `data: { locale }`, which Supabase exposes to templates as .Data.locale.
    expect(html).toContain('.Data.locale');
    expect(en.auth.newPasswordTitle).toBeTruthy();
  });
});
