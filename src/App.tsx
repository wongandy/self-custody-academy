import { useCallback, useEffect, useState } from 'react';
import { LogOut, Moon, Sun, X } from 'lucide-react';
import AndyIntro from '@/components/AndyIntro';
import Roadmap from '@/components/Roadmap';
import ScenarioBriefing from '@/components/ScenarioBriefing';
import WithdrawScenario from '@/components/WithdrawScenario';
import SendScenario from '@/components/SendScenario';
import ReceiveScenario from '@/components/ReceiveScenario';
import RecoverScenario from '@/components/RecoverScenario';
import AuthScreen from '@/components/AuthScreen';
import heroImage from '@/components/hero.webp';
import bitcoinImage from '@/components/bitcoin.webp';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { clearLocalProgress, getLocalProgress, setLocalProgress } from '@/lib/localProgress';

const TOTAL_SCENARIOS = 5;

function CustodyIllustration() {
  return (
    <div className="illustration-card" aria-label="Bitcoin self-custody illustration" role="img">
      <img src={heroImage} alt="" className="illustration-image" />
    </div>
  );
}

type Screen = 'home' | 'andy-intro' | 'roadmap' | 'scenario-1' | 'scenario-2' | 'scenario-3' | 'scenario-4' | 'scenario-5' | 'auth';

const SCENARIO_SCREENS: Screen[] = ['scenario-1', 'scenario-2', 'scenario-3', 'scenario-4', 'scenario-5'];

function App() {
  const { user, isReady, signOut } = useAuth();

  const [isDark, setIsDark] = useState(true);
  const [screen, setScreen] = useState<Screen>('home');
  const [completedScenarios, setCompletedScenarios] = useState(0);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [authReturnScreen, setAuthReturnScreen] = useState<Screen>('roadmap');
  const [, setActiveScenario] = useState(1);

  const loadLocalProgress = useCallback(() => {
    setCompletedScenarios(getLocalProgress());
  }, []);

  const loadRemoteProgress = useCallback(async () => {
    if (!user) return;
    setProgressLoading(true);
    setProgressError(null);
    const { data, error } = await supabase
      .from('learning_progress')
      .select('completed_scenarios')
      .eq('user_id', user.id)
      .maybeSingle();

    setProgressLoading(false);
    if (error) {
      setProgressError('We could not load saved progress. You can still start fresh.');
      return;
    }
    if (data) {
      const remote = data.completed_scenarios as number;
      const local = getLocalProgress();
      const best = Math.max(remote, local);
      setCompletedScenarios(best);
      if (local > remote) {
        await supabase
          .from('learning_progress')
          .upsert({ user_id: user.id, completed_scenarios: best, updated_at: new Date().toISOString() });
      }
      clearLocalProgress();
    } else {
      const local = getLocalProgress();
      if (local > 0) {
        setCompletedScenarios(local);
        await supabase
          .from('learning_progress')
          .upsert({ user_id: user.id, completed_scenarios: local, updated_at: new Date().toISOString() });
        clearLocalProgress();
      } else {
        setCompletedScenarios(0);
      }
    }
  }, [user]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [screen]);

  useEffect(() => {
    if (!isReady) return;
    if (screen === 'roadmap') {
      if (user) {
        loadRemoteProgress();
      } else {
        loadLocalProgress();
      }
    }
  }, [screen, user, isReady, loadRemoteProgress, loadLocalProgress]);

  const completeScenario = useCallback(
    async (scenarioNumber: number) => {
      const newCount = Math.min(scenarioNumber, TOTAL_SCENARIOS);
      setCompletedScenarios(newCount);

      if (user) {
        const { error } = await supabase
          .from('learning_progress')
          .upsert({ user_id: user.id, completed_scenarios: newCount, updated_at: new Date().toISOString() });
        if (error) {
          setProgressError('We could not save your progress. Your current session still works.');
        }
      } else {
        setLocalProgress(newCount);
      }
    },
    [user],
  );

  const handleScenarioComplete = useCallback(
    (scenarioNumber: number) => {
      completeScenario(scenarioNumber);
      if (scenarioNumber === 1 && !user) {
        setAuthMode('register');
        setAuthReturnScreen('roadmap');
        setScreen('auth');
      } else {
        setScreen('roadmap');
      }
    },
    [completeScenario, user],
  );

  const handleAuthSuccess = useCallback(() => {
    setScreen(authReturnScreen);
  }, [authReturnScreen]);

  const handleProfileLink = useCallback(() => {
    setAuthMode('login');
    setAuthReturnScreen('roadmap');
    setScreen('auth');
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    clearLocalProgress();
    setCompletedScenarios(0);
    setScreen('home');
  }, [signOut]);

  const isInScenario = SCENARIO_SCREENS.includes(screen);

  return (
    <div className={isDark ? 'app-shell theme-dark' : 'app-shell theme-light'}>
      <header className="site-header">
        {isInScenario || screen === 'andy-intro' ? (
          <button
            className="close-button"
            type="button"
            onClick={() => setScreen(screen === 'andy-intro' ? 'home' : 'roadmap')}
            aria-label={screen === 'andy-intro' ? 'Back to home' : 'Back to roadmap'}
          >
            <X size={20} strokeWidth={2.4} />
          </button>
        ) : (
          <a
            className="brand"
            href="#top"
            aria-label="Self Custody Academy home"
            onClick={() => setScreen('home')}
          >
            <span className="brand-mark">
              <img src={bitcoinImage} alt="Bitcoin" className="brand-logo-image" />
            </span>
            <span className="brand-name">
              <span>SELF-CUSTODY</span> <strong>ACADEMY</strong>
            </span>
          </a>
        )}

        <div className="header-actions">
          {user && (
            <button className="header-account" type="button" onClick={handleSignOut} title="Sign out">
              <span className="header-account-dot" />
              <span className="header-account-email">{user.email}</span>
              <LogOut size={14} strokeWidth={2.2} />
            </button>
          )}
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setIsDark((current) => !current)}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={!isDark}
          >
            <span className={!isDark ? 'toggle-icon active' : 'toggle-icon'}>
              <Sun size={16} strokeWidth={2.2} />
            </span>
            <span className={isDark ? 'toggle-icon active' : 'toggle-icon'}>
              <Moon size={16} strokeWidth={2.2} />
            </span>
          </button>
        </div>
      </header>

      {screen === 'home' && (
        <main id="top" className="hero-section">
          <div className="hero-visual">
            <CustodyIllustration />
          </div>

          <div className="hero-copy">
            <h1>
              The most fun way to master <em>self-custody</em> and secure your Bitcoin.
            </h1>
            {/* <p className="hero-description">
              Build confidence through hands-on lessons, helpful challenges, and a safe space to learn before your real sats are on the line.
            </p> */}
            <div className="hero-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => setScreen('andy-intro')}
              >
                <span>Get started</span>
              </button>
              <button className="profile-link" type="button" onClick={handleProfileLink}>
                I already have an account
              </button>
            </div>
            {/* <div className="trust-row">
              <div className="trust-item">
                <ShieldCheck size={17} strokeWidth={2.1} />
                <span>Practice safely</span>
              </div>
              <div className="trust-divider" />
              <div className="trust-item">
                <LockKeyhole size={17} strokeWidth={2.1} />
                <span>Keep your keys</span>
              </div>
            </div> */}
          </div>
        </main>
      )}

      {screen === 'andy-intro' && (
        <AndyIntro
          onProceed={() => setScreen('roadmap')}
        />
      )}

      {screen === 'roadmap' && (
        <Roadmap
          completedScenarios={completedScenarios}
          isLoading={progressLoading}
          errorMessage={progressError}
          isLoggedIn={!!user}
          onSelectScenario={(n) => {
            setActiveScenario(n);
            setScreen(`scenario-${n}` as Screen);
          }}
        />
      )}

      {screen === 'scenario-1' && (
        <ScenarioBriefing
          onComplete={() => handleScenarioComplete(1)}
        />
      )}

      {screen === 'scenario-2' && (
        <WithdrawScenario
          completed={completedScenarios >= 2}
          onBack={() => setScreen('roadmap')}
          onComplete={() => handleScenarioComplete(2)}
        />
      )}

      {screen === 'scenario-3' && (
        <RecoverScenario
          completed={completedScenarios >= 3}
          onClose={() => setScreen('roadmap')}
          onComplete={() => handleScenarioComplete(3)}
        />
      )}

      {screen === 'scenario-4' && (
        <SendScenario
          completed={completedScenarios >= 4}
          onBack={() => setScreen('roadmap')}
          onComplete={() => handleScenarioComplete(4)}
        />
      )}

      {screen === 'scenario-5' && (
        <ReceiveScenario
          completed={completedScenarios >= 5}
          onBack={() => setScreen('roadmap')}
          onComplete={() => handleScenarioComplete(5)}
        />
      )}

      {screen === 'auth' && (
        <AuthScreen
          mode={authMode}
          onBack={() => setScreen(authReturnScreen)}
          onSuccess={handleAuthSuccess}
          onSwitchMode={setAuthMode}
        />
      )}

      {screen === 'home' && (
        <footer className="site-footer">
          <span>Learning mode: simulation only</span>
          <span className="footer-separator">•</span>
          <span>No real BTC involved</span>
        </footer>
      )}
    </div>
  );
}

export default App;
