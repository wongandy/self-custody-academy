import { useEffect, useState } from 'react';
import { ArrowDownToLine, Check, KeyRound, LockKeyhole, ShieldCheck, WalletCards } from 'lucide-react';

type RoadmapProps = {
  completedScenarios: number;
  isLoading: boolean;
  errorMessage: string | null;
  isLoggedIn: boolean;
  onSelectScenario: (scenarioNumber: number) => void;
  animate?: boolean;
};

type Scenario = {
  number: number;
  title: string;
  icon: typeof WalletCards;
};

const scenarios: Scenario[] = [
  { number: 1, title: 'Set up hardware wallet', icon: WalletCards },
  { number: 2, title: 'Withdraw BTC from exchange', icon: ArrowDownToLine },
  { number: 3, title: 'Recover hardware wallet', icon: KeyRound },
  { number: 4, title: 'Send BTC to Alice', icon: ArrowDownToLine },
  { number: 5, title: 'Receive BTC from Charlie', icon: ArrowDownToLine },
];

const nodePositions = [
  { top: 7, left: 30 },
  { top: 28, left: 70 },
  { top: 50, left: 30 },
  { top: 72, left: 70 },
  { top: 93, left: 30 },
];

const pathSegments = [
  'M120 100C120 170 280 170 280 240',
  'M280 320C280 390 120 390 120 460',
  'M120 540C120 610 280 610 280 680',
  'M280 760C280 810 120 810 120 860',
];

function Roadmap({ completedScenarios, isLoading, errorMessage, isLoggedIn, onSelectScenario, animate = false }: RoadmapProps) {
  const availableScenario = Math.min(completedScenarios + 1, scenarios.length);
  const [revealed, setRevealed] = useState(!animate);
  const progressPercent = Math.round((completedScenarios / scenarios.length) * 100);

  useEffect(() => {
    if (!animate) {
      setRevealed(true);
      return;
    }
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setRevealed(true);
      return;
    }
    const timer = setTimeout(() => setRevealed(true), 1400);
    return () => clearTimeout(timer);
  }, [animate]);

  return (
    <main className={`roadmap-page ${animate ? 'is-revealing' : ''} ${revealed ? 'is-revealed' : ''}`}>
      <section className="roadmap-board">
        <div className="roadmap-board-heading">
          <span className="roadmap-label">Your learning path</span>
          <span className="roadmap-path-status">
            {completedScenarios === scenarios.length ? 'Path complete' : `${completedScenarios} of ${scenarios.length} missions complete`}
          </span>
        </div>

        <div className="roadmap-progress-bar" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
          <div className="roadmap-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        {errorMessage && <p className="roadmap-error">We couldn't refresh saved progress. Your current view is still available.</p>}
        {isLoading && <p className="roadmap-loading">Loading your academy progress…</p>}

        {!isLoggedIn && completedScenarios >= 1 && (
          <div className="roadmap-guest-banner">
            <ShieldCheck size={18} strokeWidth={2.2} />
            <span>Progress saved on this device. Create an account to save across devices and unlock all missions.</span>
          </div>
        )}

        <div className="roadmap-track-board" aria-label="Five-scenario learning path">
          <svg className="roadmap-route" viewBox="0 0 400 900" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="none">
            {pathSegments.map((d, i) => {
              const segComplete = i < completedScenarios;
              const segDelay = animate ? i * 280 : 0;
              return (
                <g key={i} className={animate ? 'roadmap-seg-reveal' : ''} style={{ animationDelay: `${segDelay}ms` }}>
                  <path className={`roadmap-route-glow ${segComplete ? 'done' : 'todo'}`} d={d} />
                  <path className={`roadmap-route-line ${segComplete ? 'done' : 'todo'}`} d={d} />
                </g>
              );
            })}
          </svg>

          {scenarios.map((scenario, index) => {
            const isComplete = scenario.number <= completedScenarios;
            const isAvailable = scenario.number === availableScenario;
            const isLocked = !isComplete && !isAvailable;
            const Icon = scenario.icon;
            const position = nodePositions[index];
            const nodeDelay = animate ? 200 + index * 280 : 0;

            return (
              <button
                className={`roadmap-mission ${isComplete ? 'complete' : ''} ${isAvailable ? 'available' : ''} ${isLocked ? 'locked' : ''} ${animate ? 'roadmap-node-reveal' : ''}`}
                key={scenario.number}
                type="button"
                disabled={isLocked || isLoading}
                onClick={() => onSelectScenario(scenario.number)}
                aria-label={`${scenario.title}${isLocked ? ', locked' : ''}`}
                style={{ top: `${position.top}%`, left: `${position.left}%`, animationDelay: `${nodeDelay}ms` }}
              >
                <span className="roadmap-mission-card">
                  <span className="roadmap-mission-number">{String(scenario.number).padStart(2, '0')}</span>
                  <span className="roadmap-mission-marker">
                    {isComplete ? <Check size={20} strokeWidth={3} /> : isLocked ? <LockKeyhole size={18} /> : <Icon size={20} strokeWidth={2.2} />}
                  </span>
                </span>
                <span className="roadmap-mission-title">{scenario.title}</span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default Roadmap;
