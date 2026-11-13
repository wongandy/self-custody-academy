import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import en from '@/locales/en';
import th from '@/locales/th';
import { authError, fakeSession, renderAuth } from '@/test/authHarness';
import { initialAuthCallback, resetSupabaseMock, supabaseMock } from '@/test/supabaseMock';

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'));

const a = en.auth;
const api = supabaseMock.supabase.auth;

beforeEach(() => {
  resetSupabaseMock();
  window.history.replaceState(null, '', '/academy');
});

const emailInput = () => screen.getByPlaceholderText(a.emailPlaceholder);

describe('login', () => {
  it('asks for email and password when the form is empty', async () => {
    const { user } = renderAuth();
    await user.click(screen.getByRole('button', { name: a.signIn }));
    expect(screen.getByText(a.errEmailPassword)).toBeInTheDocument();
    expect(api.signInWithPassword).not.toHaveBeenCalled();
  });

  it('signs in with a trimmed email and reports success', async () => {
    api.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    const { user, onSuccess } = renderAuth();
    await user.type(emailInput(), '  learner@example.com ');
    await user.type(screen.getByPlaceholderText(a.passwordPlaceholder), 'hunter22');
    await user.click(screen.getByRole('button', { name: a.signIn }));
    expect(api.signInWithPassword).toHaveBeenCalledWith({ email: 'learner@example.com', password: 'hunter22' });
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it.each([
    ['invalid_credentials', 400, a.errInvalidCredentials],
    ['over_request_rate_limit', 429, a.errRateLimit],
    [undefined, 429, a.errRateLimit],
    [undefined, 0, a.errGeneric],
  ])('shows a friendly message for %s (HTTP %s)', async (code, status, message) => {
    api.signInWithPassword.mockResolvedValue({ data: {}, error: authError(code, status) });
    const { user, onSuccess } = renderAuth();
    await user.type(emailInput(), 'learner@example.com');
    await user.type(screen.getByPlaceholderText(a.passwordPlaceholder), 'wrong-pass');
    await user.click(screen.getByRole('button', { name: a.signIn }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('recovers when the request itself throws (e.g. offline)', async () => {
    api.signInWithPassword.mockRejectedValue(new TypeError('Failed to fetch'));
    const { user, onSuccess } = renderAuth();
    await user.type(emailInput(), 'learner@example.com');
    await user.type(screen.getByPlaceholderText(a.passwordPlaceholder), 'hunter22');
    await user.click(screen.getByRole('button', { name: a.signIn }));
    expect(await screen.findByText(a.errGeneric)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: a.signIn })).toBeEnabled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('locks the form while signing in', async () => {
    let finish!: (v: unknown) => void;
    api.signInWithPassword.mockReturnValue(new Promise((r) => (finish = r)));
    const { user } = renderAuth();
    await user.type(emailInput(), 'learner@example.com');
    await user.type(screen.getByPlaceholderText(a.passwordPlaceholder), 'hunter22');
    await user.click(screen.getByRole('button', { name: a.signIn }));
    expect(screen.getByRole('button', { name: a.pleaseWait })).toBeDisabled();
    expect(emailInput()).toBeDisabled();
    await act(async () => finish({ data: {}, error: null }));
  });

  it('does not carry an error over to the register form', async () => {
    const { user } = renderAuth();
    await user.click(screen.getByRole('button', { name: a.signIn }));
    expect(screen.getByText(a.errEmailPassword)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: a.createAccountLink }));
    expect(screen.getByRole('heading', { name: a.registerTitle })).toBeInTheDocument();
    expect(screen.queryByText(a.errEmailPassword)).not.toBeInTheDocument();
  });
});

describe('sign-up', () => {
  async function fillRegister(user: ReturnType<typeof renderAuth>['user'], password: string, confirm = password) {
    await user.type(emailInput(), 'new@example.com');
    await user.type(screen.getByPlaceholderText(a.passwordPlaceholderNew), password);
    await user.type(screen.getByPlaceholderText(a.confirmPlaceholder), confirm);
    await user.click(screen.getByRole('button', { name: a.createAccount }));
  }

  it('validates before calling Supabase', async () => {
    const { user } = renderAuth({ mode: 'register' });
    await user.click(screen.getByRole('button', { name: a.createAccount }));
    expect(screen.getByText(a.errEmailPassword)).toBeInTheDocument();

    await fillRegister(user, '12345');
    expect(screen.getByText(a.errPasswordShort)).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(a.passwordPlaceholderNew));
    await user.clear(screen.getByPlaceholderText(a.confirmPlaceholder));
    await user.clear(emailInput());
    await fillRegister(user, 'abcdef', 'abcdeg');
    expect(screen.getByText(a.errPasswordMismatch)).toBeInTheDocument();
    expect(api.signUp).not.toHaveBeenCalled();
  });

  it('creates the account with the redirect URL and saved language, then signs in', async () => {
    api.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: fakeSession() }, error: null });
    const { user, onSuccess } = renderAuth({ mode: 'register' });
    await fillRegister(user, 'abcdef');
    expect(api.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'abcdef',
      options: { emailRedirectTo: 'http://localhost:3000/academy', data: { locale: 'en' } },
    });
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('saves Thai as the email language for Thai users', async () => {
    api.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: fakeSession() }, error: null });
    const { user } = renderAuth({ mode: 'register', locale: 'th' });
    await user.type(screen.getByPlaceholderText(th.auth.emailPlaceholder), 'new@example.com');
    await user.type(screen.getByPlaceholderText(th.auth.passwordPlaceholderNew), 'abcdef');
    await user.type(screen.getByPlaceholderText(th.auth.confirmPlaceholder), 'abcdef');
    await user.click(screen.getByRole('button', { name: th.auth.createAccount }));
    expect(api.signUp.mock.calls[0][0].options.data).toEqual({ locale: 'th' });
  });

  it.each([
    ['an error code', { data: { user: null, session: null }, error: authError('user_already_exists', 422) }],
    ['a hidden duplicate', { data: { user: { identities: [] }, session: null }, error: null }],
  ])('tells the user the email is taken (%s)', async (_label, response) => {
    api.signUp.mockResolvedValue(response);
    const { user, onSuccess } = renderAuth({ mode: 'register' });
    await fillRegister(user, 'abcdef');
    expect(await screen.findByText(a.errUserExists)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('shows "check your email" when confirmation is required, and goes back to sign in', async () => {
    api.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null });
    const { user, onSuccess } = renderAuth({ mode: 'register' });
    await fillRegister(user, 'abcdef');
    expect(screen.getByRole('heading', { name: a.confirmTitle })).toBeInTheDocument();
    expect(screen.getByText('new@example.com')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: a.backToSignIn }));
    expect(screen.getByRole('heading', { name: a.loginTitle })).toBeInTheDocument();
    expect(emailInput()).toHaveValue('new@example.com');
  });

  it('lets the user continue as a guest', async () => {
    const { user, onSkip } = renderAuth({ mode: 'register' });
    await user.click(screen.getByRole('button', { name: a.guest }));
    expect(onSkip).toHaveBeenCalledOnce();
  });
});

describe('forgot password', () => {
  it('requires an email', async () => {
    const { user } = renderAuth();
    await user.click(screen.getByRole('button', { name: a.forgot }));
    await user.click(screen.getByRole('button', { name: a.sendReset }));
    expect(screen.getByText(a.errEmail)).toBeInTheDocument();
    expect(api.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('keeps the email typed on the sign-in form and sends the reset link back to this page', async () => {
    api.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    const { user } = renderAuth();
    await user.type(emailInput(), 'learner@example.com');
    await user.click(screen.getByRole('button', { name: a.forgot }));
    expect(emailInput()).toHaveValue('learner@example.com');
    await user.click(screen.getByRole('button', { name: a.sendReset }));
    expect(api.resetPasswordForEmail).toHaveBeenCalledWith('learner@example.com', {
      redirectTo: 'http://localhost:3000/academy',
    });
    expect(screen.getByText(a.resetSentSubtitle)).toBeInTheDocument();
    expect(screen.getByText('learner@example.com')).toBeInTheDocument();
  });

  it('shows the rate-limit message', async () => {
    api.resetPasswordForEmail.mockResolvedValue({ data: {}, error: authError('over_email_send_rate_limit', 429) });
    const { user } = renderAuth();
    await user.click(screen.getByRole('button', { name: a.forgot }));
    await user.type(emailInput(), 'learner@example.com');
    await user.click(screen.getByRole('button', { name: a.sendReset }));
    expect(await screen.findByText(a.errRateLimit)).toBeInTheDocument();
  });

  it('returns to the sign-in form without leftover errors', async () => {
    const { user } = renderAuth();
    await user.click(screen.getByRole('button', { name: a.forgot }));
    await user.click(screen.getByRole('button', { name: a.sendReset }));
    await user.click(screen.getByRole('button', { name: a.backToSignIn }));
    expect(screen.getByRole('heading', { name: a.loginTitle })).toBeInTheDocument();
    expect(screen.queryByText(a.errEmail)).not.toBeInTheDocument();
  });

  it('opens the reset form with an explanation when an email link has expired', async () => {
    initialAuthCallback.errorCode = 'otp_expired';
    api.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    const { user } = renderAuth();
    expect(screen.getByRole('heading', { name: a.resetTitle })).toBeInTheDocument();
    expect(screen.getByText(a.errLinkExpired)).toBeInTheDocument();

    await user.type(emailInput(), 'learner@example.com');
    await user.click(screen.getByRole('button', { name: a.sendReset }));
    expect(screen.queryByText(a.errLinkExpired)).not.toBeInTheDocument();
  });
});

describe('setting a new password from the reset email', () => {
  const newPassword = () => screen.getAllByPlaceholderText(a.passwordPlaceholderNew)[0];

  it('shows the new-password form when opened from the email link', () => {
    initialAuthCallback.isRecovery = true;
    renderAuth();
    expect(screen.getByRole('heading', { name: a.newPasswordTitle })).toBeInTheDocument();
  });

  it('switches to the new-password form when Supabase reports PASSWORD_RECOVERY', async () => {
    renderAuth();
    expect(screen.getByRole('heading', { name: a.loginTitle })).toBeInTheDocument();
    act(() => supabaseMock.emit('PASSWORD_RECOVERY', fakeSession()));
    expect(await screen.findByRole('heading', { name: a.newPasswordTitle })).toBeInTheDocument();
  });

  it('validates, saves the password and finishes', async () => {
    initialAuthCallback.isRecovery = true;
    api.updateUser.mockResolvedValueOnce({ data: { user: null }, error: authError('same_password', 422) });
    const { user, onSuccess } = renderAuth();

    await user.type(newPassword(), '123');
    await user.click(screen.getByRole('button', { name: a.saveNewPassword }));
    expect(screen.getByText(a.errPasswordShort)).toBeInTheDocument();

    await user.clear(newPassword());
    await user.type(newPassword(), 'brand-new');
    await user.type(screen.getByPlaceholderText(a.confirmPlaceholder), 'brand-new');
    await user.click(screen.getByRole('button', { name: a.saveNewPassword }));
    expect(await screen.findByText(a.errSamePassword)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: a.saveNewPassword }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(api.updateUser).toHaveBeenLastCalledWith({ password: 'brand-new' });
  });

  it('explains a dead reset link and lets the user get back to sign in', async () => {
    initialAuthCallback.isRecovery = true;
    api.updateUser.mockResolvedValue({ data: { user: null }, error: authError('session_not_found', 403) });
    const { user } = renderAuth();
    await user.type(newPassword(), 'brand-new');
    await user.type(screen.getByPlaceholderText(a.confirmPlaceholder), 'brand-new');
    await user.click(screen.getByRole('button', { name: a.saveNewPassword }));
    expect(await screen.findByText(a.errLinkExpired)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: a.backToSignIn }));
    expect(api.signOut).toHaveBeenCalled();
    expect(await screen.findByRole('heading', { name: a.loginTitle })).toBeInTheDocument();
  });
});

describe('saved email language', () => {
  it('saves the browsing language on accounts that have none', async () => {
    api.getSession.mockResolvedValue({ data: { session: fakeSession() }, error: null });
    renderAuth({ locale: 'th' });
    await waitFor(() => expect(api.updateUser).toHaveBeenCalledWith({ data: { locale: 'th' } }));
  });

  it('leaves accounts alone when the language already matches', async () => {
    api.getSession.mockResolvedValue({ data: { session: fakeSession({ locale: 'en' }) }, error: null });
    renderAuth({ locale: 'en' });
    await waitFor(() => expect(api.getSession).toHaveBeenCalled());
    await act(async () => {});
    expect(api.updateUser).not.toHaveBeenCalled();
  });
});
