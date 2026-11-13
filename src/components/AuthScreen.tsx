import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import andyPortrait from '@/components/Andy.webp';
import { useI18n } from '@/lib/i18n';

type AuthMode = 'register' | 'login' | 'recovery';

type PasswordInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: 'new-password' | 'current-password';
  disabled: boolean;
  showLabel: string;
  hideLabel: string;
};

/** Password field with an eye button so the user can check what they typed. */
function PasswordInput({ value, onChange, placeholder, autoComplete, disabled, showLabel, hideLabel }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="auth-password">
      <input
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        className="auth-password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        title={visible ? hideLabel : showLabel}
        disabled={disabled}
      >
        {visible ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
      </button>
    </span>
  );
}

type AuthScreenProps = {
  mode: AuthMode;
  onBack: () => void;
  onSuccess: () => void;
  onSwitchMode: (mode: 'register' | 'login') => void;
  onSkip?: () => void;
  title?: string;
  subtitle?: string;
};

function AuthScreen({ mode, onSuccess, onSwitchMode, onSkip, title, subtitle }: AuthScreenProps) {
  const { signUp, signIn, resetPassword, updatePassword, cancelRecovery, linkError, clearLinkError } = useAuth();
  const { t } = useI18n();
  const a = t.auth;
  const errorText = (code: string) => {
    const messages: Record<string, string> = {
      invalid_credentials: a.errInvalidCredentials,
      user_already_exists: a.errUserExists,
      email_exists: a.errUserExists,
      email_not_confirmed: a.errEmailNotConfirmed,
      weak_password: a.errPasswordShort,
      same_password: a.errSamePassword,
      email_address_invalid: a.errEmailInvalid,
      validation_failed: a.errEmailInvalid,
      over_email_send_rate_limit: a.errRateLimit,
      over_request_rate_limit: a.errRateLimit,
      otp_expired: a.errLinkExpired,
      access_denied: a.errLinkExpired,
      session_not_found: a.errLinkExpired,
      session_expired: a.errLinkExpired,
    };
    return messages[code] ?? a.errGeneric;
  };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<'auth' | 'forgot'>(linkError ? 'forgot' : 'auth');
  const [resetSent, setResetSent] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const isRegister = mode === 'register';

  // The error belongs to the form the user just submitted; don't carry it across modes.
  const switchMode = (next: 'register' | 'login') => {
    setError(null);
    onSwitchMode(next);
  };

  const defaultTitle = isRegister ? a.registerTitle : a.loginTitle;
  const defaultSubtitle = isRegister ? a.registerSubtitle : a.loginSubtitle;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError(a.errEmailPassword);
      return;
    }

    if (isRegister) {
      if (password.length < 6) {
        setError(a.errPasswordShort);
        return;
      }
      if (password !== confirmPassword) {
        setError(a.errPasswordMismatch);
        return;
      }
    }

    setIsSubmitting(true);
    if (isRegister) {
      const result = await signUp(email.trim(), password);
      setIsSubmitting(false);
      if (result.error) {
        setError(errorText(result.error));
        return;
      }
      if (result.needsConfirmation) {
        setConfirmationSent(true);
        return;
      }
    } else {
      const result = await signIn(email.trim(), password);
      setIsSubmitting(false);
      if (result.error) {
        setError(errorText(result.error));
        return;
      }
    }

    onSuccess();
  };

  const handleNewPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(a.errPasswordShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(a.errPasswordMismatch);
      return;
    }

    setIsSubmitting(true);
    const result = await updatePassword(password);
    setIsSubmitting(false);

    if (result.error) {
      setError(errorText(result.error));
      return;
    }

    onSuccess();
  };

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError(a.errEmail);
      return;
    }

    setIsSubmitting(true);
    const result = await resetPassword(email.trim());
    setIsSubmitting(false);

    if (result.error) {
      setError(errorText(result.error));
      return;
    }
    clearLinkError();

    setResetSent(true);
  };

  if (mode === 'recovery') {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-icon-row">
            <div className="auth-icon-badge">
              <LockKeyhole size={28} strokeWidth={1.8} />
            </div>
          </div>

          <h1>{a.newPasswordTitle}</h1>
          <p className="auth-subtitle">{a.newPasswordSubtitle}</p>

          <form className="auth-form" onSubmit={handleNewPasswordSubmit}>
            <label className="auth-field">
              <span className="auth-field-label"><LockKeyhole size={13} /> {a.newPassword}</span>
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder={a.passwordPlaceholderNew}
                autoComplete="new-password"
                disabled={isSubmitting}
                showLabel={a.showPassword}
                hideLabel={a.hidePassword}
              />
            </label>

            <label className="auth-field">
              <span className="auth-field-label"><ShieldCheck size={13} /> {a.confirmPassword}</span>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={a.confirmPlaceholder}
                autoComplete="new-password"
                disabled={isSubmitting}
                showLabel={a.showPassword}
                hideLabel={a.hidePassword}
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button className="character-proceed auth-submit" type="submit" disabled={isSubmitting}>
              <span>{isSubmitting ? a.pleaseWait : a.saveNewPassword}</span>
              {!isSubmitting && <ArrowRight size={18} strokeWidth={2.5} />}
            </button>
          </form>

          <div className="auth-switch">
            <button
              type="button"
              className="auth-back-link"
              disabled={isSubmitting}
              onClick={() => {
                // A dead reset link leaves the user stuck here; let them sign in or ask for a new link.
                switchMode('login');
                cancelRecovery();
              }}
            >
              <ArrowLeft size={14} strokeWidth={2.2} /> {a.backToSignIn}
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (confirmationSent) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-icon-row">
            <div className="auth-icon-badge">
              <Mail size={28} strokeWidth={1.8} />
            </div>
          </div>

          <h1>{a.confirmTitle}</h1>
          <div className="auth-success">
            <p>{a.confirmSentBefore}<strong>{email.trim()}</strong>{a.confirmSentAfter}</p>
          </div>

          <div className="auth-switch">
            <button
              type="button"
              className="auth-back-link"
              onClick={() => {
                setConfirmationSent(false);
                setPassword('');
                setConfirmPassword('');
                switchMode('login');
              }}
            >
              <ArrowLeft size={14} strokeWidth={2.2} /> {a.backToSignIn}
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (view === 'forgot') {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-icon-row">
            <div className="auth-icon-badge">
              <LockKeyhole size={28} strokeWidth={1.8} />
            </div>
          </div>

          <h1>{a.resetTitle}</h1>
          <p className="auth-subtitle">
            {resetSent ? a.resetSentSubtitle : a.resetSubtitle}
          </p>

          {linkError && !resetSent && <p className="auth-error">{errorText(linkError)}</p>}

          {resetSent ? (
            <div className="auth-success">
              <p>{a.resetSentBefore}<strong>{email.trim()}</strong>{a.resetSentAfter}</p>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleForgotSubmit}>
              <label className="auth-field">
                <span className="auth-field-label"><Mail size={13} /> {a.email}</span>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder={a.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </label>

              {error && <p className="auth-error">{error}</p>}

              <button className="character-proceed auth-submit" type="submit" disabled={isSubmitting}>
                <span>{isSubmitting ? a.pleaseWait : a.sendReset}</span>
                {!isSubmitting && <ArrowRight size={18} strokeWidth={2.5} />}
              </button>
            </form>
          )}

          <div className="auth-switch">
            <button
              type="button"
              className="auth-back-link"
              onClick={() => {
                setView('auth');
                setResetSent(false);
                setError(null);
                clearLinkError();
              }}
            >
              <ArrowLeft size={14} strokeWidth={2.2} /> {a.backToSignIn}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-icon-row">
          {isRegister ? (
            <div className="auth-portrait" aria-label={t.common.academyMentorAria} role="img">
              <div className="auth-portrait-glow" />
              <div className="auth-portrait-ring">
                <img className="auth-portrait-image" src={andyPortrait} alt={t.common.academyMentorAria} />
              </div>
            </div>
          ) : (
            <div className="auth-icon-badge">
              <LockKeyhole size={28} strokeWidth={1.8} />
            </div>
          )}
        </div>

        <h1>{title ?? defaultTitle}</h1>
        <p className="auth-subtitle">{subtitle ?? defaultSubtitle}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span className="auth-field-label"><Mail size={13} /> {a.email}</span>
            <input
              type="email"
              autoComplete="email"
              placeholder={a.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </label>

          <label className="auth-field">
            <span className="auth-field-label"><LockKeyhole size={13} /> {a.password}</span>
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder={isRegister ? a.passwordPlaceholderNew : a.passwordPlaceholder}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              disabled={isSubmitting}
              showLabel={a.showPassword}
              hideLabel={a.hidePassword}
            />
          </label>

          {isRegister && (
            <label className="auth-field">
              <span className="auth-field-label"><ShieldCheck size={13} /> {a.confirmPassword}</span>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={a.confirmPlaceholder}
                autoComplete="new-password"
                disabled={isSubmitting}
                showLabel={a.showPassword}
                hideLabel={a.hidePassword}
              />
            </label>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button className="character-proceed auth-submit" type="submit" disabled={isSubmitting}>
            <span>{isSubmitting ? a.pleaseWait : isRegister ? a.createAccount : a.signIn}</span>
            {!isSubmitting && <ArrowRight size={18} strokeWidth={2.5} />}
          </button>

          {!isRegister && (
            <button
              type="button"
              className="auth-forgot-link"
              onClick={() => {
                setView('forgot');
                setError(null);
                setResetSent(false);
              }}
              disabled={isSubmitting}
            >
              {a.forgot}
            </button>
          )}

          {isRegister && onSkip && (
            <button className="auth-later" type="button" onClick={onSkip} disabled={isSubmitting}>
              <span>{a.guest}</span>
              <ArrowRight size={15} strokeWidth={2.2} />
            </button>
          )}
        </form>

        <div className="auth-switch">
          {isRegister ? (
            <p>{a.haveAccount} <button type="button" onClick={() => switchMode('login')}>{a.signIn}</button></p>
          ) : (
            <p>{a.newHere} <button type="button" onClick={() => switchMode('register')}>{a.createAccountLink}</button></p>
          )}
        </div>
      </div>
    </main>
  );
}

export default AuthScreen;
