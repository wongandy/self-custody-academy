import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import andyPortrait from '@/components/Andy.webp';

type AuthMode = 'register' | 'login';

type AuthScreenProps = {
  mode: AuthMode;
  onBack: () => void;
  onSuccess: () => void;
  onSwitchMode: (mode: AuthMode) => void;
  onSkip?: () => void;
  title?: string;
  subtitle?: string;
};

function AuthScreen({ mode, onBack, onSuccess, onSwitchMode, onSkip, title, subtitle }: AuthScreenProps) {
  const { signUp, signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<'auth' | 'forgot'>('auth');
  const [resetSent, setResetSent] = useState(false);

  const isRegister = mode === 'register';

  const defaultTitle = isRegister ? 'Time to create an account' : 'Welcome back';
  const defaultSubtitle = isRegister
    ? 'Create an account to save your progress.'
    : 'Pick up right where you left off.';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    if (isRegister) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setIsSubmitting(true);
    const result = isRegister ? await signUp(email.trim(), password) : await signIn(email.trim(), password);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onSuccess();
  };

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }

    setIsSubmitting(true);
    const result = await resetPassword(email.trim());
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setResetSent(true);
  };

  if (view === 'forgot') {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-icon-row">
            <div className="auth-icon-badge">
              <LockKeyhole size={28} strokeWidth={1.8} />
            </div>
          </div>

          <h1>Reset your password</h1>
          <p className="auth-subtitle">
            {resetSent
              ? 'Check your email for a password reset link.'
              : "Enter your email and we'll send you a link to reset your password."}
          </p>

          {resetSent ? (
            <div className="auth-success">
              <p>We've sent a password reset link to <strong>{email.trim()}</strong>. Click the link in the email to set a new password.</p>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleForgotSubmit}>
              <label className="auth-field">
                <span className="auth-field-label"><Mail size={13} /> Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </label>

              {error && <p className="auth-error">{error}</p>}

              <button className="character-proceed auth-submit" type="submit" disabled={isSubmitting}>
                <span>{isSubmitting ? 'Please wait…' : 'Send reset link'}</span>
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
              }}
            >
              <ArrowLeft size={14} strokeWidth={2.2} /> Back to sign in
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
            <div className="auth-portrait" aria-label="Andy, your academy mentor" role="img">
              <div className="auth-portrait-glow" />
              <div className="auth-portrait-ring">
                <img className="auth-portrait-image" src={andyPortrait} alt="Andy, your academy mentor" />
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
            <span className="auth-field-label"><Mail size={13} /> Email</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </label>

          <label className="auth-field">
            <span className="auth-field-label"><LockKeyhole size={13} /> Password</span>
            <input
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              placeholder={isRegister ? 'At least 6 characters' : 'Your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </label>

          {isRegister && (
            <label className="auth-field">
              <span className="auth-field-label"><ShieldCheck size={13} /> Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </label>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button className="character-proceed auth-submit" type="submit" disabled={isSubmitting}>
            <span>{isSubmitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}</span>
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
              Forgot password?
            </button>
          )}

          {isRegister && onSkip && (
            <button className="auth-later" type="button" onClick={onSkip} disabled={isSubmitting}>
              <span>Continue as guest</span>
              <ArrowRight size={15} strokeWidth={2.2} />
            </button>
          )}
        </form>

        <div className="auth-switch">
          {isRegister ? (
            <p>Already have an account? <button type="button" onClick={() => onSwitchMode('login')}>Sign in</button></p>
          ) : (
            <p>New to the academy? <button type="button" onClick={() => onSwitchMode('register')}>Create an account</button></p>
          )}
        </div>
      </div>
    </main>
  );
}

export default AuthScreen;
