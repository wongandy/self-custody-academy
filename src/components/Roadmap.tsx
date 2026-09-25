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

          <div
            className="snake-path"
            aria-label="Five-scenario learning path"
          >
            {scenarios.map((scenario, i) => {
              const isComplete = scenario.number <= completedScenarios;
              const isAvailable = scenario.number === availableScenario;
              const isLocked = !isComplete && !isAvailable;
              const Icon = scenario.icon;
              const side = i % 2 === 0 ? 'left' : 'right';

              return (
                <button
                  className={`snake-step ${side} ${isComplete ? 'complete' : ''} ${isAvailable ? 'available' : ''} ${isLocked ? 'locked' : ''}`}
                  key={scenario.number}
                  type="button"
                  disabled={isLocked || isLoading}
                  onClick={() => onSelectScenario(scenario.number)}
                  aria-label={`${scenario.title}${isLocked ? ', locked' : ''}`}
                >
                  <span className="snake-marker">
                    {isComplete ? <Check size={20} strokeWidth={3} /> : isLocked ? <LockKeyhole size={18} /> : <Icon size={20} strokeWidth={2.2} />}
                  </span>
                  <span className="snake-label">
                    <span className="snake-eyebrow">Mission {scenario.number}</span>
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
