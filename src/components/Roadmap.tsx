import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Check, KeyRound, MonitorSmartphone, Usb, WalletCards } from 'lucide-react';
import { fmt, useI18n } from '@/lib/i18n';

type RoadmapProps = {
  completedLessons: number[];
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

/** Lowest lesson not yet finished, or null when every lesson is done. */
function firstUnfinished(done: ReadonlySet<number>): number | null {
  const found = scenarios.find((s) => !done.has(s.number));
  return found ? found.number : null;
}

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
  completedLessons,
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
    if (!justCompletedScenario || !completedLessons.includes(justCompletedScenario)) {
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

      const next = firstUnfinished(new Set(completedLessons)) ?? justCompletedScenario;
      const gliding = glideToLesson(lessonRefs.current[next - 1] ?? null);

      if (prefersReduced) {
        finish();
        return;
      }

      setCelebrationPhase('pre');
      const lead = gliding ? 700 : 0;
      const isLast = completedLessons.length >= scenarios.length;

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
  }, [justCompletedScenario, completedLessons]);

  const celebrating = celebrationPhase !== 'idle' && celebrationPhase !== 'done';
  const justCompleted = justCompletedScenario ?? 0;

  const doneSet = new Set(completedLessons);
  // Before the checkmark lands, show the board as it was before this lesson was finished.
  const displayDone = new Set(doneSet);
  if (celebrating && celebrationPhase === 'pre') displayDone.delete(justCompleted);

  // The lesson we nudge toward ("Start" bubble): the lowest one not yet finished.
  const suggestedScenario = firstUnfinished(displayDone);
  // Where the celebration points next, once the just-finished lesson counts as done.
  const nextAfterCelebration = firstUnfinished(doneSet);

  useEffect(() => {
    if (animate || isLoading || justCompletedScenario || arrivalScrolledRef.current) return;
    const timer = setTimeout(() => {
      arrivalScrolledRef.current = true;
      glideToLesson(lessonRefs.current[(suggestedScenario ?? scenarios.length) - 1] ?? null);
    }, 80);
    return () => clearTimeout(timer);
  }, [animate, isLoading, justCompletedScenario, suggestedScenario]);

  const getNodeState = (scenarioNumber: number): 'complete' | 'available' | 'open' => {
    if (displayDone.has(scenarioNumber)) return 'complete';
    if (celebrating) {
      // The next lesson only lights up as "available" when the pulse reaches it.
      return scenarioNumber === nextAfterCelebration && celebrationPhase === 'pulse' ? 'available' : 'open';
    }
    return scenarioNumber === suggestedScenario ? 'available' : 'open';
  };

  // Segment i joins lesson i+1 and lesson i+2; it is lit once both ends are done.
  const segBothDone = (set: ReadonlySet<number>, segIndex: number) => set.has(segIndex + 1) && set.has(segIndex + 2);

  // Segments that this completion just lit up (they get the draw animation).
  const segJustLit = (segIndex: number) =>
    celebrating
    && (segIndex + 1 === justCompleted || segIndex + 2 === justCompleted)
    && segBothDone(doneSet, segIndex);

  const isSegComplete = (segIndex: number) => {
    if (segJustLit(segIndex)) {
      return celebrationPhase === 'path' || celebrationPhase === 'pulse';
    }
    return segBothDone(displayDone, segIndex);
  };

  const segCelebrationClass = (segIndex: number) => {
    if (celebrationPhase === 'path' && segJustLit(segIndex)) {
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
    if (celebrating && scenarioNumber === nextAfterCelebration && celebrationPhase === 'pulse') {
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
            {completedLessons.length === scenarios.length ? t.roadmap.pathComplete : fmt(t.roadmap.progress, { completed: completedLessons.length, total: scenarios.length })}
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
            const isOpen = nodeState === 'open';
            const Icon = scenario.icon;
            const title = t.roadmap.titles[index];
            const position = nodePositions[index];
            const nodeDelay = animate ? 200 + index * 500 : 0;

            return (
              <button
                className={`roadmap-lesson ${isComplete ? 'complete' : ''} ${isAvailable ? 'available' : ''} ${isOpen ? 'open' : ''} ${animate ? 'roadmap-node-reveal' : ''} ${nodeCelebrationClass(scenario.number)} ${nextNodeCelebrationClass(scenario.number)}`}
                key={scenario.number}
                type="button"
                ref={(node) => {
                  lessonRefs.current[index] = node;
                }}
                disabled={isLoading}
                onClick={() => onSelectScenario(scenario.number)}
                aria-label={title}
                style={{ top: `${position.top}%`, left: `${position.left}%`, animationDelay: `${nodeDelay}ms` }}
              >
                {isAvailable && !celebrating && (
                  <span className="roadmap-start-bubble" aria-hidden="true">
                    {t.roadmap.start}
                  </span>
                )}
                <span className="roadmap-lesson-marker">
                  {isComplete ? <Check size={20} strokeWidth={3} /> : <Icon size={20} strokeWidth={2.2} />}
                </span>
                <span className={`roadmap-lesson-title-plate ${index % 2 === 0 ? 'side-right' : 'side-left'}`}>{title}</span>
              </button>
            );
          })}
        </div>

        {/* TEMPORARY: Lesson 7 device playground, outside the path and progress count */}
        <button
          type="button"
          className="roadmap-playground-link"
          onClick={() => onSelectScenario(7)}
          disabled={isLoading}
        >
          <MonitorSmartphone size={16} strokeWidth={2.2} />
          <span>Lesson 7 · Device playground</span>
        </button>
      </section>
    </main>
  );
}

export default Roadmap;
