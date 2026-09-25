import { ArrowDownToLine, Check, KeyRound, LockKeyhole, ShieldCheck, WalletCards } from 'lucide-react';
import andyPortrait from '@/components/Andy.webp';

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
  { top: 10, left: 50 },
  { top: 31, left: 72 },
  { top: 51, left: 28 },
  { top: 71, left: 72 },
  { top: 91, left: 28 },
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

        <div className="roadmap-mentor" aria-label="Andy, active learner">
          <div className="roadmap-mentor-glow" />
          <div className="roadmap-mentor-portrait">
            <img src={andyPortrait} alt="Andy" />
          </div>
          <strong>ANDY</strong>
          <span>ACTIVE LEARNER</span>
          <small>The Curious Holder</small>
        </div>

        <div className="roadmap-track-board" aria-label="Five-scenario learning path">
          <svg className="roadmap-route" viewBox="0 0 400 820" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="none">
            <path className="roadmap-route-glow" d="M200 0V60C200 90 112 90 112 128V176C112 206 288 206 288 244V292C288 322 112 322 112 360V408C112 438 288 438 288 476V524C288 554 112 554 112 592V640C112 670 288 670 288 708V820" />
            <path className="roadmap-route-line" d="M200 0V60C200 90 112 90 112 128V176C112 206 288 206 288 244V292C288 322 112 322 112 360V408C112 438 288 438 288 476V524C288 554 112 554 112 592V640C112 670 288 670 288 708V820" />
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
