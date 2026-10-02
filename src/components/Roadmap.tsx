import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Check, KeyRound, LockKeyhole, Usb, WalletCards } from 'lucide-react';

type RoadmapProps = {
  completedScenarios: number;
  isLoading: boolean;
  errorMessage: string | null;
  isLoggedIn: boolean;
  onSelectScenario: (scenarioNumber: number) => void;
  animate?: boolean;
  justCompletedScenario?: number | null;
  onCelebrationDone?: () => void;
};

type CelebrationPhase = 'idle' | 'pre' | 'checkmark' | 'path' | 'pulse' | 'done';

type Scenario = {
  number: number;
  title: string;
  icon: typeof WalletCards;
};

const scenarios: Scenario[] = [
  { number: 1, title: 'Set up hardware wallet', icon: WalletCards },
  { number: 2, title: 'Withdraw BTC from exchange', icon: ArrowDownToLine },
  { number: 3, title: 'Recover hardware wallet', icon: KeyRound },
  { number: 4, title: 'Connect wallet', icon: Usb },
  { number: 5, title: 'Sending BTC', icon: ArrowUpFromLine },
  { number: 6, title: 'Receiving BTC', icon: ArrowDownToLine },
];

const nodePositions = [
  { top: 5, left: 28 },
  { top: 23, left: 72 },
  { top: 41, left: 28 },
  { top: 59, left: 72 },
  { top: 77, left: 28 },
  { top: 95, left: 72 },
];

const pathSegments = [
  'M112 117C112 158 288 158 288 207',
  'M288 297C288 338 112 338 112 387',
  'M112 477C112 518 288 518 288 567',
  'M288 657C288 698 112 698 112 747',
  'M112 837C112 878 288 878 288 927',
];

function Roadmap({
  completedScenarios,
  isLoading,
  errorMessage,
  isLoggedIn,
  onSelectScenario,
  animate = false,
  justCompletedScenario = null,
  onCelebrationDone,
}: RoadmapProps) {
  const [revealed, setRevealed] = useState(!animate);
  const [celebrationPhase, setCelebrationPhase] = useState<CelebrationPhase>('idle');
  const doneRef = useRef(true);

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
    const timer = setTimeout(() => setRevealed(true), 2800);
    return () => clearTimeout(timer);
  }, [animate]);

  useEffect(() => {
    if (!justCompletedScenario || justCompletedScenario !== completedScenarios) {
      setCelebrationPhase('idle');
      doneRef.current = true;
      return;
    }

    doneRef.current = false;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setCelebrationPhase('done');
      doneRef.current = true;
      onCelebrationDone?.();
      return;
    }

    setCelebrationPhase('pre');
    const isLast = justCompletedScenario >= scenarios.length;
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setCelebrationPhase('checkmark'), 100));

    if (!isLast) {
      timers.push(setTimeout(() => setCelebrationPhase('path'), 550));
      timers.push(setTimeout(() => setCelebrationPhase('pulse'), 1250));
      timers.push(setTimeout(() => {
        setCelebrationPhase('done');
        doneRef.current = true;
        onCelebrationDone?.();
      }, 1900));
    } else {
      timers.push(setTimeout(() => {
        setCelebrationPhase('done');
        doneRef.current = true;
        onCelebrationDone?.();
      }, 900));
    }

    return () => {
      timers.forEach(clearTimeout);
      if (!doneRef.current) {
        onCelebrationDone?.();
      }
    };
  }, [justCompletedScenario, completedScenarios, onCelebrationDone]);

  const celebrating = celebrationPhase !== 'idle' && celebrationPhase !== 'done';
  const justCompleted = justCompletedScenario ?? 0;

  const displayCompleted = celebrating && celebrationPhase === 'pre'
    ? completedScenarios - 1
    : completedScenarios;

  const availableScenario = Math.min(displayCompleted + 1, scenarios.length);

  const getNodeState = (scenarioNumber: number): 'complete' | 'available' | 'locked' => {
    if (celebrating && scenarioNumber === justCompleted + 1) {
      if (celebrationPhase === 'pulse') return 'available';
      return 'locked';
    }
    if (scenarioNumber <= displayCompleted) return 'complete';
    if (scenarioNumber === availableScenario) return 'available';
    return 'locked';
  };

  const isSegComplete = (segIndex: number) => {
    if (celebrating && segIndex === justCompleted - 1) {
      return celebrationPhase === 'path' || celebrationPhase === 'pulse';
    }
    return segIndex < displayCompleted;
  };

  const segCelebrationClass = (segIndex: number) => {
    if (celebrating && segIndex === justCompleted - 1 && celebrationPhase === 'path') {
      return 'celebration-seg-draw';
    }
    return '';
  };

  const nodeCelebrationClass = (scenarioNumber: number) => {
    if (celebrating && scenarioNumber === justCompleted && celebrationPhase !== 'pre') {
      return 'celebration-checkmark';
    }
    return '';
  };

  const nextNodeCelebrationClass = (scenarioNumber: number) => {
    if (celebrating && scenarioNumber === justCompleted + 1 && celebrationPhase === 'pulse') {
      return 'celebration-next-pulse';
    }
    return '';
  };

  return (
    <main className={`roadmap-page ${animate ? 'is-revealing' : ''} ${revealed ? 'is-revealed' : ''}`}>
      <section className="roadmap-board">
        <div className="roadmap-board-heading">
          <span className="roadmap-label">Your learning path</span>
          <span className="roadmap-path-status">
            {completedScenarios === scenarios.length ? 'Path complete' : `${completedScenarios} of ${scenarios.length} missions complete`}
          </span>
        </div>

        {errorMessage && <p className="roadmap-error">We couldn't refresh saved progress. Your current view is still available.</p>}
        {isLoading && <p className="roadmap-loading">Loading your academy progress…</p>}

        <div className="roadmap-track-board" aria-label="Six-scenario learning path">
          <svg className="roadmap-route" viewBox="0 0 400 960" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="none">
            {pathSegments.map((d, i) => {
              const segComplete = isSegComplete(i);
              const segDelay = animate ? 500 + i * 500 : 0;
              const celClass = segCelebrationClass(i);
              return (
                <g key={i} className={animate ? 'roadmap-seg-reveal' : ''} style={{ animationDelay: `${segDelay}ms` }}>
                  <path className={`roadmap-route-glow ${segComplete ? 'done' : 'todo'} ${celClass}`} d={d} pathLength={1} />
                  <path className={`roadmap-route-line ${segComplete ? 'done' : 'todo'} ${celClass}`} d={d} pathLength={1} />
                </g>
              );
            })}
          </svg>

          {scenarios.map((scenario, index) => {
            const nodeState = getNodeState(scenario.number);
            const isComplete = nodeState === 'complete';
            const isAvailable = nodeState === 'available';
            const isLocked = nodeState === 'locked';
            const Icon = scenario.icon;
            const position = nodePositions[index];
            const nodeDelay = animate ? 200 + index * 500 : 0;

            return (
              <button
                className={`roadmap-mission ${isComplete ? 'complete' : ''} ${isAvailable ? 'available' : ''} ${isLocked ? 'locked' : ''} ${animate ? 'roadmap-node-reveal' : ''} ${nodeCelebrationClass(scenario.number)} ${nextNodeCelebrationClass(scenario.number)}`}
                key={scenario.number}
                type="button"
                disabled={isLocked || isLoading}
                onClick={() => onSelectScenario(scenario.number)}
                aria-label={`${scenario.title}${isLocked ? ', locked' : ''}`}
                style={{ top: `${position.top}%`, left: `${position.left}%`, animationDelay: `${nodeDelay}ms` }}
              >
                {isAvailable && !celebrating && (
                  <span className={`roadmap-start-bubble ${index % 2 === 0 ? 'right' : 'left'}`} aria-hidden="true">
                    START
                  </span>
                )}
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
