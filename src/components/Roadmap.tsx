import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDollarSign,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';

type RoadmapProps = {
  completedScenarios: number;
  isLoading: boolean;
  errorMessage: string | null;
  isLoggedIn: boolean;
  onBack: () => void;
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

function CharacterPlaceholder({ label, initial, active = false }: { label: string; initial: string; active?: boolean }) {
  return (
    <div className={active ? 'roadmap-character active' : 'roadmap-character'}>
      <div className="roadmap-character-glow" />
      <div className="roadmap-character-face">{initial}</div>
      <span>{label}</span>
    </div>
  );
}

function Roadmap({ completedScenarios, isLoading, errorMessage, isLoggedIn, onBack, onSelectScenario }: RoadmapProps) {
  const availableScenario = Math.min(completedScenarios + 1, scenarios.length);
  const progressPercent = Math.round((completedScenarios / scenarios.length) * 100);

  return (
    <main className="roadmap-page">
      <div className="roadmap-topbar">
        <button className="character-back" type="button" onClick={onBack}>
          <ArrowLeft size={16} strokeWidth={2.4} />
          <span>Back</span>
        </button>
        <div className="roadmap-kicker">
          <Sparkles size={14} strokeWidth={2.3} />
          <span>Academy roadmap</span>
        </div>
        <span className="roadmap-mode">Simulation mode</span>
      </div>

      <section className="roadmap-shell">
        <div className="roadmap-main">
          <div className="roadmap-progress-card">
            <div className="roadmap-progress-heading">
              <div>
                <span className="roadmap-label">Ben's current progress</span>
                <h2>Build your self-custody confidence</h2>
              </div>
              <div className="roadmap-progress-count">
                <strong>{completedScenarios}/5</strong>
                <span>missions complete</span>
              </div>
            </div>
            <div className="roadmap-progress-track" aria-label={`${progressPercent}% complete`}>
              <span style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="roadmap-stats">
              <span><CircleDollarSign size={15} /> 0.0000 BTC <em>simulated</em></span>
              <span><ShieldCheck size={15} /> {completedScenarios} badges earned</span>
              <span><WalletCards size={15} /> 5 missions total</span>
            </div>
          </div>

          <div className="roadmap-path-heading">
            <div>
              <span className="roadmap-label">Your learning path</span>
              <h2>From curious to confident</h2>
            </div>
            <span className="roadmap-path-status">{completedScenarios === 5 ? 'Path complete' : 'Next mission highlighted'}</span>
          </div>

          {errorMessage && <p className="roadmap-error">We couldn't refresh saved progress. Your current view is still available.</p>}
          {isLoading && <p className="roadmap-loading">Loading your academy progress…</p>}

          {!isLoggedIn && completedScenarios >= 1 && (
            <div className="roadmap-guest-banner">
              <ShieldCheck size={18} strokeWidth={2.2} />
              <span>Progress saved on this device. Create an account to save across devices and unlock all missions.</span>
            </div>
          )}

          <div className="roadmap-path" aria-label="Five-scenario learning path">
            <div className="roadmap-path-line" />
            {scenarios.map((scenario) => {
              const isComplete = scenario.number <= completedScenarios;
              const isAvailable = scenario.number === availableScenario;
              const isLocked = !isComplete && !isAvailable;
              const Icon = scenario.icon;

              return (
                <button
                  className={`roadmap-node ${isComplete ? 'complete' : ''} ${isAvailable ? 'available' : ''} ${isLocked ? 'locked' : ''}`}
                  key={scenario.number}
                  type="button"
                  disabled={isLocked || isLoading}
                  onClick={() => onSelectScenario(scenario.number)}
                  aria-label={`${scenario.title}${isLocked ? ', locked' : ''}`}
                >
                  <span className="roadmap-node-number">
                    {isComplete ? <Check size={18} strokeWidth={3} /> : isLocked ? <LockKeyhole size={17} /> : <Icon size={19} strokeWidth={2.2} />}
                  </span>
                  <span className="roadmap-node-copy">
                    <span className="roadmap-node-eyebrow">
                      Mission {scenario.number} {isComplete ? '· Complete' : isAvailable ? '· Ready' : '· Locked'}
                    </span>
                    <strong>{scenario.title}</strong>
                    <small>{scenario.description}</small>
                  </span>
                  {isAvailable && <ArrowRight className="roadmap-node-arrow" size={18} strokeWidth={2.5} />}
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
