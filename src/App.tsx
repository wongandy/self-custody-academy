import { useCallback, useEffect, useState } from 'react';
import { LogOut, Moon, Sun, X } from 'lucide-react';
import AndyIntro from '@/components/AndyIntro';
import Roadmap from '@/components/Roadmap';
import PathSelector from '@/components/PathSelector';
import ScenarioBriefing from '@/components/ScenarioBriefing';
import WithdrawScenario from '@/components/WithdrawScenario';
import ConnectScenario from '@/components/ConnectScenario';
import SendScenario from '@/components/SendScenario';
import ReceiveScenario from '@/components/ReceiveScenario';
import RecoverScenario from '@/components/RecoverScenario';
import AuthScreen from '@/components/AuthScreen';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import heroImage from '@/components/hero.webp';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { clearLocalProgress, getLocalProgress, setLocalProgress } from '@/lib/localProgress';
import { applyTheme, getStoredTheme, type Theme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import { clearStoredMnemonic } from '@/lib/walletSession';

const TOTAL_SCENARIOS = 6;

function CustodyIllustration() {
  const { t } = useI18n();
  return (
    <div className="illustration-card" aria-label={t.home.illustrationAria} role="img">
      <img src={heroImage} alt="" className="illustration-image" />
    </div>
  );
}

type Screen = 'home' | 'andy-intro' | 'path-selector' | 'roadmap' | 'scenario-1' | 'scenario-2' | 'scenario-3' | 'scenario-4' | 'scenario-5' | 'scenario-6' | 'auth';

const SCENARIO_SCREENS: Screen[] = ['scenario-1', 'scenario-2', 'scenario-3', 'scenario-4', 'scenario-5', 'scenario-6'];

function App() {
  const { user, isReady, isRecovering, linkError, signOut } = useAuth();
  const { t } = useI18n();

  // Arriving from a password-reset email: show the "set a new password" form.
  // Arriving from an expired/invalid auth link: show the login screen (it opens the reset form).
  const [screen, setScreen] = useState<Screen>(isRecovering || linkError ? 'auth' : 'home');
  const [completedScenarios, setCompletedScenarios] = useState(0);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'register' | 'login'>(linkError ? 'login' : 'register');
  const [authReturnScreen, setAuthReturnScreen] = useState<Screen>('roadmap');
  const [, setActiveScenario] = useState(1);
  const [roadmapAnimate, setRoadmapAnimate] = useState(false);
  const [justCompletedScenario, setJustCompletedScenario] = useState<number | null>(null);
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

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

  const goToRoadmap = useCallback(() => {
    setRoadmapAnimate(false);
    setScreen('roadmap');
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [screen]);

  useEffect(() => {
    if (isRecovering) {
      setAuthReturnScreen('roadmap');
      setScreen('auth');
    }
  }, [isRecovering]);

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
      setJustCompletedScenario(scenarioNumber);
      if (scenarioNumber === 1 && !user) {
        setAuthMode('register');
        setAuthReturnScreen('roadmap');
        setScreen('auth');
      } else {
        goToRoadmap();
      }
    },
    [completeScenario, user],
  );

  const handleAuthSuccess = useCallback(() => {
    setRoadmapAnimate(false);
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
    clearStoredMnemonic();
    setCompletedScenarios(0);
    setScreen('home');
  }, [signOut]);

  const isInScenario = SCENARIO_SCREENS.includes(screen);

  return (
    <div className={`app-shell theme-${theme}`}>
      <header className="site-header">
        {isInScenario || screen === 'andy-intro' || screen === 'path-selector' ? (
          <button
            className="close-button"
            type="button"
            onClick={() => {
              if (screen === 'andy-intro' || screen === 'path-selector') {
                setScreen('home');
              } else {
                goToRoadmap();
              }
            }}
            aria-label={screen === 'andy-intro' || screen === 'path-selector' ? t.header.backHome : t.header.backRoadmap}
          >
            <X size={20} strokeWidth={2.4} />
          </button>
        ) : (
          <a
            className="brand"
            href="/"
            aria-label={t.header.homeAria}
            onClick={() => setScreen('home')}
          >
            {/* <span className="brand-mark">
              <img src={bitcoinImage} alt="Bitcoin" className="brand-logo-image" />
            </span> */}
            <span className="brand-name">
              <span>SELF-CUSTODY</span> <strong>ACADEMY</strong>
            </span>
          </a>
        )}

        <div className="header-actions">
          <LocaleSwitcher />
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? t.header.toLight : t.header.toDark}
            aria-label={theme === 'dark' ? t.header.toLight : t.header.toDark}
          >
            <Sun size={16} strokeWidth={2.1} className="theme-toggle-icon theme-toggle-sun" />
            <Moon size={16} strokeWidth={2.1} className="theme-toggle-icon theme-toggle-moon" />
          </button>
          {user && (
            <button className="header-account" type="button" onClick={handleSignOut} title={t.header.signOut}>
              <span className="header-account-dot" />
              <span className="header-account-email">{user.email}</span>
              <LogOut size={14} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </header>

      {screen === 'home' && (
        <main id="top" className="hero-section">
          <div className="hero-visual">
            <CustodyIllustration />
          </div>

          <div className="hero-copy">
            <h1>
              {t.home.titleBefore}<em>{t.home.titleEm}</em>{t.home.titleAfter}
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
                <span>{t.home.getStarted}</span>
              </button>
              <button className="profile-link" type="button" onClick={handleProfileLink}>
                {t.home.haveAccount}
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
          onProceed={() => setScreen('path-selector')}
        />
      )}

      {screen === 'path-selector' && (
        <PathSelector
          onSelectFundamentals={() => {
            setRoadmapAnimate(true);
            setScreen('roadmap');
          }}
        />
      )}

      {screen === 'roadmap' && (
        <Roadmap
          completedScenarios={completedScenarios}
          isLoading={progressLoading}
          errorMessage={progressError}
          isLoggedIn={!!user}
          animate={roadmapAnimate}
          justCompletedScenario={justCompletedScenario}
          onCelebrationDone={() => setJustCompletedScenario(null)}
          onSelectScenario={(n) => {
            setActiveScenario(n);
            setRoadmapAnimate(false);
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
          onBack={goToRoadmap}
          onComplete={() => handleScenarioComplete(2)}
        />
      )}

      {screen === 'scenario-3' && (
        <RecoverScenario
          completed={completedScenarios >= 3}
          onClose={goToRoadmap}
          onComplete={() => handleScenarioComplete(3)}
          onBack={goToRoadmap}
        />
      )}

      {screen === 'scenario-4' && (
        <ConnectScenario
          completed={completedScenarios >= 4}
          onComplete={() => handleScenarioComplete(4)}
        />
      )}

      {screen === 'scenario-5' && (
        <ReceiveScenario
          onBack={goToRoadmap}
          onComplete={() => handleScenarioComplete(5)}
        />
      )}

      {screen === 'scenario-6' && (
        <SendScenario
          completed={completedScenarios >= 6}
          onBack={goToRoadmap}
          onComplete={() => handleScenarioComplete(6)}
        />
      )}

      {screen === 'auth' && (
        <AuthScreen
          key={isRecovering ? 'recovery' : 'auth'}
          mode={isRecovering ? 'recovery' : authMode}
          onBack={() => setScreen(authReturnScreen)}
          onSuccess={handleAuthSuccess}
          onSwitchMode={setAuthMode}
          onSkip={goToRoadmap}
        />
      )}

      {screen === 'home' && (
        <footer className="site-footer">
          <span>{t.home.footerMode}</span>
          <span className="footer-separator">•</span>
          <span>{t.home.footerNoBtc}</span>
          <a
            className="footer-backer"
            href="https://codeorange.dev/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="footer-backer-label">{t.home.footerSupportedBy}</span>
            <img
              className="footer-backer-logo footer-backer-logo--light"
              src="/code-orange-logo-light.png"
              alt="Code Orange dev school"
            />
            <img
              className="footer-backer-logo footer-backer-logo--dark"
              src="/code-orange-logo-dark.png"
              alt="Code Orange dev school"
            />
          </a>
        </footer>
      )}
    </div>
  );
}

export default App;
