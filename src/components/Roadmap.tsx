import { ArrowRight, Check, KeyRound, LockKeyhole, ShieldCheck, WalletCards } from 'lucide-react';

type RoadmapProps = {
  completedScenarios: number;
  isLoading: boolean;
  errorMessage: string | null;
  isLoggedIn: boolean;
  onSelectScenario: (scenarioNumber: number) => void;
};

type Scenario = {
  number: number;
  title: string;
  description: string;
  icon: typeof WalletCards;
};

const scenarios: Scenario[] = [
  {
    number: 1,
    title: 'Set up hardware wallet',
    description: 'Create a safe foundation for holding your own keys.',
    icon: WalletCards,
  },
  {
    number: 2,
    title: 'Withdraw BTC from exchange',
    description: 'Move simulated bitcoin into your own wallet.',
    icon: ArrowRight,
  },
  {
    number: 3,
    title: 'Recover hardware wallet',
    description: 'Practice restoring a wallet from your 12-word phrase.',
    icon: KeyRound,
  },
  {
    number: 4,
    title: 'Send BTC to Alice',
    description: 'Practice checking and signing a bitcoin payment.',
    icon: ArrowRight,
  },
  {
    number: 5,
    title: 'Receive BTC from Charlie',
    description: 'Generate an address and verify an incoming payment.',
    icon: ArrowRight,
  },
];

const nodePositions = [
  { top: 10, left: 50 },
  { top: 30, left: 75 },
  { top: 50, left: 25 },
  { top: 70, left: 75 },
  { top: 90, left: 50 },
];

const pathSegments = [
  'M 200 90 C 200 180, 300 180, 300 270',
  'M 300 270 C 300 360, 100 360, 100 450',
  'M 100 450 C 100 540, 300 540, 300 630',
  'M 300 630 C 300 720, 200 720, 200 810',
];

const labelSides = ['right', 'left', 'right', 'left', 'right'] as const;

function Roadmap({ completedScenarios, isLoading, errorMessage, isLoggedIn, onSelectScenario }: RoadmapProps) {
  const availableScenario = Math.min(completedScenarios + 1, scenarios.length);

  return (
    <main className="roadmap-page">
      <section className="roadmap-shell">
        <div className="roadmap-main">
          <div className="roadmap-path-heading">
            <div>
              <span className="roadmap-label">Your learning path</span>
              <h2>From curious to confident</h2>
            </div>
            <span className="roadmap-path-status">
              {completedScenarios === 5 ? 'Path complete' : `${completedScenarios} of 5 missions complete`}
            </span>
          </div>

          {errorMessage && <p className="roadmap-error">We couldn't refresh saved progress. Your current view is still available.</p>}
          {isLoading && <p className="roadmap-loading">Loading your academy progress…</p>}

          {!isLoggedIn && completedScenarios >= 1 && (
            <div className="roadmap-guest-banner">
              <ShieldCheck size={18} strokeWidth={2.2} />
              <span>Progress saved on this device. Create an account to save across devices and unlock all missions.</span>
            </div>
          )}

          <div className="snake-track-wrapper" aria-label="Five-scenario learning path">
            <svg className="snake-track" viewBox="0 0 400 900" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMin meet">
              {pathSegments.map((d, i) => {
                const segComplete = i < completedScenarios;
                return (
                  <g key={i}>
                    <path d={d} className={`snake-seg-glow ${segComplete ? 'done' : 'todo'}`} />
                    <path d={d} className={`snake-seg-core ${segComplete ? 'done' : 'todo'}`} />
                  </g>
                );
              })}
            </svg>

            {scenarios.map((scenario, i) => {
              const isComplete = scenario.number <= completedScenarios;
              const isAvailable = scenario.number === availableScenario;
              const isLocked = !isComplete && !isAvailable;
              const Icon = scenario.icon;
              const pos = nodePositions[i];
              const side = labelSides[i];

              return (
                <button
                  className={`snake-node ${side} ${isComplete ? 'complete' : ''} ${isAvailable ? 'available' : ''} ${isLocked ? 'locked' : ''}`}
                  key={scenario.number}
                  type="button"
                  disabled={isLocked || isLoading}
                  onClick={() => onSelectScenario(scenario.number)}
                  aria-label={`${scenario.title}${isLocked ? ', locked' : ''}`}
                  style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
                >
                  <span className="snake-node-marker">
                    {isComplete ? <Check size={22} strokeWidth={3} /> : isLocked ? <LockKeyhole size={18} /> : <Icon size={22} strokeWidth={2.2} />}
                  </span>
                  <span className="snake-node-label">
                    <span className="snake-node-eyebrow">Mission {scenario.number}</span>
                    <strong>{scenario.title}</strong>
                    <small>{scenario.description}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

export default Roadmap;
