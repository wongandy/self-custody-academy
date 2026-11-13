import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({})) }));

/** supabase.ts reads the URL once at import time, so import it fresh after setting the URL. */
async function callbackFor(url: string) {
  window.history.replaceState(null, '', url);
  vi.resetModules();
  const { initialAuthCallback } = await import('@/lib/supabase');
  return initialAuthCallback;
}

afterEach(() => window.history.replaceState(null, '', '/'));

describe('reading the auth link the user arrived from', () => {
  it('is a plain visit with no auth params', async () => {
    expect(await callbackFor('/roadmap')).toEqual({ isRecovery: false, errorCode: null });
  });

  it('detects a password-reset link', async () => {
    expect(await callbackFor('/#access_token=abc&refresh_token=def&type=recovery')).toEqual({
      isRecovery: true,
      errorCode: null,
    });
  });

  it('detects an expired link and prefers the specific error code', async () => {
    expect(
      await callbackFor('/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid'),
    ).toEqual({ isRecovery: false, errorCode: 'otp_expired' });
  });

  it('reads errors from the query string too', async () => {
    expect(await callbackFor('/?error=access_denied')).toEqual({ isRecovery: false, errorCode: 'access_denied' });
  });
});
