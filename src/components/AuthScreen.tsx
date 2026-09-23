import { useState, type FormEvent } from 'react';
import { ArrowRight, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
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
  const { signUp, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

          {isRegister && onSkip && (
            <button className="auth-later" type="button" onClick={onSkip} disabled={isSubmitting}>
              Later
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
