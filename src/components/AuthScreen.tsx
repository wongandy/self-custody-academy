import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth';

type AuthMode = 'register' | 'login';

type AuthScreenProps = {
  mode: AuthMode;
  onBack: () => void;
  onSuccess: () => void;
  onSwitchMode: (mode: AuthMode) => void;
  title?: string;
  subtitle?: string;
};

function AuthScreen({ mode, onBack, onSuccess, onSwitchMode, title, subtitle }: AuthScreenProps) {
  const { signUp, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === 'register';

  const defaultTitle = isRegister ? 'Create your academy account' : 'Welcome back';
  const defaultSubtitle = isRegister
    ? 'Save your progress and unlock the rest of the academy.'
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
      <button className="character-back" type="button" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2.4} />
        <span>Back</span>
      </button>

      <div className="auth-card">
        <div className="auth-icon-row">
          <div className="auth-icon-badge">
            {isRegister ? <UserRound size={28} strokeWidth={1.8} /> : <LockKeyhole size={28} strokeWidth={1.8} />}
          </div>
        </div>

        <div className="auth-kicker">
          <Sparkles size={13} strokeWidth={2.3} />
          <span>{isRegister ? 'One quick step' : 'Sign in'}</span>
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
