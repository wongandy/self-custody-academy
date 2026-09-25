import { ArrowDownToLine, Check, KeyRound, LockKeyhole, ShieldCheck, WalletCards } from 'lucide-react';

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
  { top: 92, left: 28 },
  { top: 72, left: 72 },
  { top: 50, left: 28 },
  { top: 28, left: 72 },
  { top: 8, left: 28 },
];

const pathSegments = [
  'M112 783C112 738 288 738 288 693',
  'M288 603C288 549 112 549 112 495',
  'M112 405C112 351 288 351 288 297',
  'M288 207C288 162 112 162 112 117',
];

function Roadmap({ completedScenarios, isLoading, errorMessage, isLoggedIn, onSelectScenario }: RoadmapProps) {
  const availableScenario = Math.min(completedScenarios + 1, scenarios.length);

  return (
    <main className="roadmap-page">
      <section className="roadmap-board">
        <div className="roadmap-board-heading">
          <span className="roadmap-label">Your learning path</span>
          <span className="roadmap-path-status">
            {completedScenarios === scenarios.length ? 'Path complete' : `${completedScenarios} of ${scenarios.length} missions complete`}
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

        <div className="roadmap-track-board" aria-label="Five-scenario learning path">
          <svg className="roadmap-route" viewBox="0 0 400 900" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="none">
            {pathSegments.map((d, i) => {
              const segComplete = i < completedScenarios;
              return (
                <g key={i}>
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

            return (
              <button
                className={`roadmap-mission ${isComplete ? 'complete' : ''} ${isAvailable ? 'available' : ''} ${isLocked ? 'locked' : ''}`}
                key={scenario.number}
                type="button"
                disabled={isLocked || isLoading}
                onClick={() => onSelectScenario(scenario.number)}
                aria-label={`${scenario.title}${isLocked ? ', locked' : ''}`}
                style={{ top: `${position.top}%`, left: `${position.left}%` }}
              >
                <span className="roadmap-mission-marker">
                  {isComplete ? <Check size={20} strokeWidth={3} /> : isLocked ? <LockKeyhole size={18} /> : <Icon size={20} strokeWidth={2.2} />}
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
