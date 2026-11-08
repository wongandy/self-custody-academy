import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Check, KeyRound, LockKeyhole, Usb, WalletCards } from 'lucide-react';
import { fmt, useI18n } from '@/lib/i18n';

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
  icon: typeof WalletCards;
};

// Titles come from the dictionary (`roadmap.titles`), in the same order.
const scenarios: Scenario[] = [
  { number: 1, icon: WalletCards },
  { number: 2, icon: ArrowDownToLine },
  { number: 3, icon: KeyRound },
  { number: 4, icon: Usb },
  { number: 5, icon: ArrowDownToLine },
  { number: 6, icon: ArrowUpFromLine },
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
  'M112 65C112 127 288 141.8 288 203.8',
  'M288 237.8C288 299.8 112 314.6 112 376.6',
  'M112 410.6C112 472.6 288 487.4 288 549.4',
  'M288 583.4C288 645.4 112 660.2 112 722.2',
  'M112 756.2C112 818.2 288 833 288 895',
];

function glideToLesson(el: HTMLButtonElement | null): boolean {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const topMargin = 96;
  const bottomMargin = 80;
  if (rect.top >= topMargin && rect.bottom <= window.innerHeight - bottomMargin) return false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  return !reduced;
}

function Roadmap({
  completedScenarios,
  isLoading,
  errorMessage,
  onSelectScenario,
  animate = false,
  justCompletedScenario = null,
  onCelebrationDone,
}: RoadmapProps) {
  const { t } = useI18n();
  const [revealed, setRevealed] = useState(!animate);
  const [celebrationPhase, setCelebrationPhase] = useState<CelebrationPhase>('idle');
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(true);
  const arrivalScrolledRef = useRef(false);
  const lessonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const celebrationDoneRef = useRef(onCelebrationDone);
  celebrationDoneRef.current = onCelebrationDone;

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
    revealTimerRef.current = setTimeout(() => setRevealed(true), 2800);
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, [animate]);

  const skipReveal = useCallback(() => {
    if (!animate) return;
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    setRevealed(true);
  }, [animate]);

  useEffect(() => {
    if (!animate || revealed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      e.preventDefault();
      skipReveal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [animate, revealed, skipReveal]);

  useEffect(() => {
    if (!justCompletedScenario || justCompletedScenario !== completedScenarios) {
      setCelebrationPhase('idle');
      doneRef.current = true;
      return;
    }

    doneRef.current = false;
    arrivalScrolledRef.current = true;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;

    const finish = () => {
      setCelebrationPhase('done');
      doneRef.current = true;
      celebrationDoneRef.current?.();
    };

    const runCelebration = () => {
      if (cancelled) return;

      const next = Math.min(justCompletedScenario + 1, scenarios.length);
      const gliding = glideToLesson(lessonRefs.current[next - 1] ?? null);

      if (prefersReduced) {
        finish();
        return;
      }

      setCelebrationPhase('pre');
      const lead = gliding ? 700 : 0;
      const isLast = justCompletedScenario >= scenarios.length;

      timers.push(setTimeout(() => setCelebrationPhase('checkmark'), lead + 100));

      if (!isLast) {
        timers.push(setTimeout(() => setCelebrationPhase('path'), lead + 550));
        timers.push(setTimeout(() => setCelebrationPhase('pulse'), lead + 1250));
        timers.push(setTimeout(finish, lead + 1900));
      } else {
        timers.push(setTimeout(finish, lead + 900));
      }
    };

    timers.push(setTimeout(runCelebration, 60));

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      if (!doneRef.current) {
        celebrationDoneRef.current?.();
      }
    };
  }, [justCompletedScenario, completedScenarios]);

  const celebrating = celebrationPhase !== 'idle' && celebrationPhase !== 'done';
  const justCompleted = justCompletedScenario ?? 0;

  const displayCompleted = celebrating && celebrationPhase === 'pre'
    ? completedScenarios - 1
    : completedScenarios;

  const availableScenario = Math.min(displayCompleted + 1, scenarios.length);

  useEffect(() => {
    if (animate || isLoading || justCompletedScenario || arrivalScrolledRef.current) return;
    const timer = setTimeout(() => {
      arrivalScrolledRef.current = true;
      glideToLesson(lessonRefs.current[availableScenario - 1] ?? null);
    }, 80);
    return () => clearTimeout(timer);
  }, [animate, isLoading, justCompletedScenario, availableScenario]);

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
    <main
      className={`roadmap-page ${animate ? 'is-revealing' : ''} ${revealed ? 'is-revealed' : ''}`}
      onClickCapture={(e) => {
        if (!animate || revealed) return;
        if (e.button !== 0) return;
        const target = e.target as HTMLElement | null;
        if (target && target.closest('.roadmap-lesson')) return;
        e.preventDefault();
        e.stopPropagation();
        skipReveal();
      }}
    >
      <section className="roadmap-board">
        <div className="roadmap-board-heading">
          <span className="roadmap-label">{t.roadmap.label}</span>
          <span className="roadmap-path-status">
            {completedScenarios === scenarios.length ? t.roadmap.pathComplete : fmt(t.roadmap.progress, { completed: completedScenarios, total: scenarios.length })}
          </span>
        </div>

        {errorMessage && <p className="roadmap-error">{t.roadmap.error}</p>}
        {isLoading && <p className="roadmap-loading">{t.roadmap.loading}</p>}

        <div className="roadmap-track-board" aria-label={t.roadmap.boardAria}>
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
            const title = t.roadmap.titles[index];
            const position = nodePositions[index];
            const nodeDelay = animate ? 200 + index * 500 : 0;

            return (
              <button
                className={`roadmap-lesson ${isComplete ? 'complete' : ''} ${isAvailable ? 'available' : ''} ${isLocked ? 'locked' : ''} ${animate ? 'roadmap-node-reveal' : ''} ${nodeCelebrationClass(scenario.number)} ${nextNodeCelebrationClass(scenario.number)}`}
                key={scenario.number}
                type="button"
                ref={(node) => {
                  lessonRefs.current[index] = node;
                }}
                disabled={isLocked || isLoading}
                onClick={() => onSelectScenario(scenario.number)}
                aria-label={isLocked ? fmt(t.roadmap.lockedAria, { title }) : title}
                style={{ top: `${position.top}%`, left: `${position.left}%`, animationDelay: `${nodeDelay}ms` }}
              >
                {isAvailable && !celebrating && (
                  <span className="roadmap-start-bubble" aria-hidden="true">
                    {t.roadmap.start}
                  </span>
                )}
                <span className="roadmap-lesson-marker">
                  {isComplete ? <Check size={20} strokeWidth={3} /> : isLocked ? <LockKeyhole size={18} /> : <Icon size={20} strokeWidth={2.2} />}
                </span>
                <span className={`roadmap-lesson-title-plate ${index % 2 === 0 ? 'side-right' : 'side-left'}`}>{title}</span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default Roadmap;
