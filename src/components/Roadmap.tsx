import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { fmt, useI18n } from '@/lib/i18n';
import { LESSONS, firstUnfinished } from '@/lib/lessons';
import LessonArt from '@/components/roadmap/LessonArt';

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

// Titles and descriptions come from the dictionary (`roadmap.titles`, `roadmap.descriptions`), in LESSONS order.
const scenarios = LESSONS;

// Desktop shows the path as one row of this many cards; more than that scrolls sideways.
const ROW_QUERY = '(min-width: 1100px)';
const CARDS_PER_ROW = 6;

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Scroll the desktop row sideways so `el` is centered, when it isn't fully visible. */
function revealInRow(scroller: HTMLElement | null, el: HTMLElement | null, smooth: boolean) {
  if (!scroller || !el || scroller.scrollWidth <= scroller.clientWidth) return;
  // Position within the scroller's content (it has inline padding, so offsetLeft on the card is not enough).
  const left = el.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft;
  const right = left + el.offsetWidth;
  if (left >= scroller.scrollLeft && right <= scroller.scrollLeft + scroller.clientWidth) return;
  scroller.scrollTo({
    left: left - (scroller.clientWidth - el.offsetWidth) / 2,
    behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto',
  });
}

/**
 * Scroll the page so `el` is centered in the visible space between the fixed header and
 * `dockHeight` (the mobile bottom dock, 0 on desktop). Returns true if it started a smooth scroll.
 */
function glideToLesson(el: HTMLButtonElement | null, dockHeight = 0): boolean {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const topMargin = 96;
  const bottomMargin = dockHeight > 0 ? dockHeight + 16 : 80;
  if (rect.top >= topMargin && rect.bottom <= window.innerHeight - bottomMargin) return false;
  const reduced = prefersReducedMotion();
  const visible = window.innerHeight - topMargin - bottomMargin;
  const top = window.scrollY + rect.top - topMargin - Math.max(0, (visible - rect.height) / 2);
  window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
  return !reduced;
}

type Box = { l: number; t: number; w: number; h: number };

/**
 * Connector path from card a to card b, in the grid's own coordinates.
 * Same row: a short bridge across the column gap. Same column: a bridge across the row gap.
 * Otherwise (row wrap): down into the row gap, across, and down into the next card.
 * Vertical runs stay near the card edges so they don't pass under the centered badges.
 */
function connectorPath(a: Box, b: Box): string {
  if (Math.abs(a.t - b.t) < 2) {
    const y = Math.round(a.t + Math.min(a.h, b.h) * 0.3);
    return `M${a.l + a.w} ${y}H${b.l}`;
  }
  if (Math.abs(a.l - b.l) < 2) {
    const x = a.l + Math.min(28, a.w * 0.12);
    return `M${x} ${a.t + a.h}V${b.t}`;
  }
  const x1 = a.l + a.w - Math.min(28, a.w * 0.12);
  const x2 = b.l + Math.min(28, b.w * 0.12);
  const ym = (a.t + a.h + b.t) / 2;
  return `M${x1} ${a.t + a.h}V${ym}H${x2}V${b.t}`;
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
  const [connectors, setConnectors] = useState<{ w: number; h: number; paths: string[] }>({ w: 0, h: 0, paths: [] });
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(true);
  const arrivalScrolledRef = useRef(false);
  const gridRef = useRef<HTMLOListElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  // Height of the mobile bottom dock (the sticky footer), so auto-scroll keeps cards clear of it.
  const dockHeightRef = useRef(0);
  const rowRevealedRef = useRef(false);
  const lessonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const celebrationDoneRef = useRef(onCelebrationDone);
  celebrationDoneRef.current = onCelebrationDone;

  const isRowLayout = useMediaQuery(ROW_QUERY);
  const isScrollable = isRowLayout && scenarios.length > CARDS_PER_ROW;
  const [scrollEdges, setScrollEdges] = useState({ atStart: true, atEnd: false });

  // Once the progress bar has scrolled up under the fixed header, show a thin copy of it there.
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [showMiniProgress, setShowMiniProgress] = useState(false);
  // The fixed header is 64px on wider screens and 56px on phones: measure it so the line sits flush under it.
  const [headerHeight, setHeaderHeight] = useState(64);
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.site-header');
    if (!header) return;
    const measure = () => setHeaderHeight(header.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const el = progressRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowMiniProgress(!entry.isIntersecting && entry.boundingClientRect.top < headerHeight),
      { rootMargin: `-${headerHeight}px 0px 0px 0px` },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [headerHeight]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const { titles, descriptions } = t.roadmap;
    if (titles.length !== scenarios.length || descriptions.length !== scenarios.length) {
      console.warn(`Roadmap: ${scenarios.length} lessons, but ${titles.length} titles and ${descriptions.length} descriptions in this locale.`);
    }
  }, [t]);

  const updateScrollEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const atStart = el.scrollLeft <= 2;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    setScrollEdges((prev) => (prev.atStart === atStart && prev.atEnd === atEnd ? prev : { atStart, atEnd }));
  }, []);

  const pageRow = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

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
    revealTimerRef.current = setTimeout(() => setRevealed(true), 1800);
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

  // Measure the cards (offsets ignore the reveal transforms) and route the connectors between them.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const measure = () => {
      const boxes: Box[] = [];
      for (const el of lessonRefs.current) {
        if (!el) return;
        boxes.push({ l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
      }
      const paths = boxes.slice(0, -1).map((a, i) => connectorPath(a, boxes[i + 1]));
      // scrollWidth: in the scrolling desktop row the cards run past the visible width.
      setConnectors({ w: grid.scrollWidth, h: grid.offsetHeight, paths });
      updateScrollEdges();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [isScrollable, updateScrollEdges]);

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
      revealInRow(scrollerRef.current, lessonRefs.current[next - 1] ?? null, true);
      const gliding = glideToLesson(lessonRefs.current[next - 1] ?? null, dockHeightRef.current);

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

  // The lesson we nudge toward ("Recommended next"): the lowest one not yet finished.
  const suggestedScenario = firstUnfinished(displayDone);
  // Where the celebration points next, once the just-finished lesson counts as done.
  const nextAfterCelebration = firstUnfinished(doneSet);

  // The footer (the main button) only renders while there's a lesson to continue.
  const hasFooter = suggestedScenario !== null;

  // Below 1100px the footer is a sticky bottom dock: track its height so auto-scroll keeps
  // cards clear of it. 0 on desktop or when there's no footer.
  useLayoutEffect(() => {
    const footer = footerRef.current;
    if (!footer || isRowLayout || !hasFooter) {
      dockHeightRef.current = 0;
      return;
    }
    const measure = () => {
      dockHeightRef.current = footer.offsetHeight;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(footer);
    return () => observer.disconnect();
  }, [isRowLayout, hasFooter]);

  useEffect(() => {
    if (animate || isLoading || justCompletedScenario || arrivalScrolledRef.current) return;
    const timer = setTimeout(() => {
      arrivalScrolledRef.current = true;
      glideToLesson(lessonRefs.current[(suggestedScenario ?? scenarios.length) - 1] ?? null, dockHeightRef.current);
    }, 80);
    return () => clearTimeout(timer);
  }, [animate, isLoading, justCompletedScenario, suggestedScenario]);

  // Desktop row with more lessons than fit: keep the recommended lesson in view. Runs again when
  // saved progress arrives (the suggestion changes). The first scroll is instant; later ones glide.
  // It does nothing if the card is already visible.
  useLayoutEffect(() => {
    if (!isScrollable || isLoading || justCompletedScenario) return;
    revealInRow(scrollerRef.current, lessonRefs.current[(suggestedScenario ?? scenarios.length) - 1] ?? null, rowRevealedRef.current);
    rowRevealedRef.current = true;
    updateScrollEdges();
  }, [isScrollable, isLoading, justCompletedScenario, suggestedScenario, updateScrollEdges]);

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

  const segCelebrationClass = (segIndex: number) =>
    celebrationPhase === 'path' && segJustLit(segIndex) ? 'celebration-seg-draw' : '';

  const cardCelebrationClass = (scenarioNumber: number) => {
    if (celebrating && scenarioNumber === justCompleted && celebrationPhase !== 'pre') return 'celebration-checkmark';
    if (celebrating && scenarioNumber === nextAfterCelebration && celebrationPhase === 'pulse') return 'celebration-next-pulse';
    return '';
  };

  const total = scenarios.length;
  const doneCount = displayDone.size;
  const allDone = doneSet.size === total;
  // "Next" implies earlier progress, so a brand-new learner sees "Start here" instead.
  const nextLabel = doneSet.size === 0 ? t.roadmap.startHere : t.roadmap.recommendedNext;

  const revealDelay = (ms: number) => (animate ? { animationDelay: `${ms}ms` } : undefined);

  return (
    <main
      className={`roadmap-page ${animate ? 'is-revealing' : ''} ${revealed ? 'is-revealed' : ''}`}
      onClickCapture={(e) => {
        if (!animate || revealed) return;
        if (e.button !== 0) return;
        const target = e.target as HTMLElement | null;
        if (target && target.closest('.roadmap-card, .roadmap-cta')) return;
        e.preventDefault();
        e.stopPropagation();
        skipReveal();
      }}
    >
      <section className="roadmap-board">
        <div className="roadmap-board-heading">
          <span className="roadmap-label">{t.roadmap.label}</span>
          <span className="roadmap-path-status">
            {allDone ? t.roadmap.pathComplete : fmt(t.roadmap.progress, { completed: doneSet.size, total })}
          </span>
        </div>

        <div
          ref={progressRef}
          className="roadmap-progress"
          role="progressbar"
          aria-label={t.roadmap.label}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={doneCount}
        >
          <span className="roadmap-progress-fill" style={{ width: `${(doneCount / total) * 100}%` }} />
        </div>

        {errorMessage && <p className="roadmap-error">{t.roadmap.error}</p>}
        {isLoading && <p className="roadmap-loading">{t.roadmap.loading}</p>}

        <div
          className={[
            'roadmap-grid-wrap',
            isScrollable ? 'is-scrollable' : '',
            isScrollable && !scrollEdges.atStart ? 'has-more-left' : '',
            isScrollable && !scrollEdges.atEnd ? 'has-more-right' : '',
            scenarios.length < CARDS_PER_ROW ? 'is-short' : '',
          ].filter(Boolean).join(' ')}
        >
          {isScrollable && (
            <button
              className="roadmap-row-arrow is-prev"
              type="button"
              onClick={() => pageRow(-1)}
              disabled={scrollEdges.atStart}
              aria-label={t.roadmap.prevLessons}
            >
              <ChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
            </button>
          )}
          <div className="roadmap-scroller" ref={scrollerRef} onScroll={isScrollable ? updateScrollEdges : undefined}>
          <div className="roadmap-track">
          <svg
            className={`roadmap-connectors ${animate ? 'roadmap-reveal-fade' : ''}`}
            style={revealDelay(200 + total * 140)}
            width={connectors.w}
            height={connectors.h}
            viewBox={`0 0 ${connectors.w || 1} ${connectors.h || 1}`}
            fill="none"
            aria-hidden="true"
          >
            {connectors.paths.map((d, i) => (
              <path
                key={i}
                className={`roadmap-connector ${isSegComplete(i) ? 'done' : 'todo'} ${segCelebrationClass(i)}`}
                d={d}
                // A unit length only while drawing in; the resting dotted style is measured in px.
                pathLength={segCelebrationClass(i) ? 1 : undefined}
              />
            ))}
          </svg>

          <ol className="roadmap-grid" ref={gridRef} aria-label={fmt(t.roadmap.boardAria, { n: scenarios.length })}>
            {scenarios.map((scenario, index) => {
              const n = scenario.number;
              const state = getNodeState(n);
              const title = t.roadmap.titles[index];
              const lessonLabel = fmt(t.roadmap.lessonLabel, { n });
              const stateLabel = state === 'complete' ? t.roadmap.completed : state === 'available' ? nextLabel : '';

              return (
                <li key={n}>
                  <button
                    className={`roadmap-card ${state} ${animate ? 'roadmap-card-reveal' : ''} ${cardCelebrationClass(n)}`}
                    type="button"
                    ref={(node) => {
                      lessonRefs.current[index] = node;
                    }}
                    disabled={isLoading}
                    onClick={() => onSelectScenario(n)}
                    aria-label={`${lessonLabel}: ${title}${stateLabel ? `. ${stateLabel}` : ''}`}
                    style={revealDelay(200 + index * 140)}
                  >
                    <span className="roadmap-card-art">
                      <LessonArt n={n} />
                      {state === 'complete' && (
                        <span className="roadmap-card-check" aria-hidden="true">
                          <Check size={14} strokeWidth={3.2} />
                        </span>
                      )}
                    </span>
                    <span className="roadmap-card-body">
                      <span className="roadmap-card-eyebrow">{lessonLabel}</span>
                      <span className="roadmap-card-title">{title}</span>
                      <span className="roadmap-card-desc">{t.roadmap.descriptions[index]}</span>
                    </span>
                    {state === 'available' && (
                      <span className="roadmap-card-badge is-next" aria-hidden="true">
                        {nextLabel}
                      </span>
                    )}
                    {state === 'complete' && (
                      <span className="roadmap-card-badge is-replay" aria-hidden="true">
                        <RotateCcw size={12} strokeWidth={2.4} />
                        {t.roadmap.replay}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
          </div>
          </div>
          {isScrollable && (
            <button
              className="roadmap-row-arrow is-next"
              type="button"
              onClick={() => pageRow(1)}
              disabled={scrollEdges.atEnd}
              aria-label={t.roadmap.nextLessons}
            >
              <ChevronRight size={20} strokeWidth={2.4} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Only while there's a lesson to continue; on phones this is the sticky bottom bar,
            so an empty one would just be a stray strip. */}
        {suggestedScenario !== null && (
          <div
            ref={footerRef}
            className={`roadmap-footer ${animate ? 'roadmap-reveal-fade' : ''}`}
            style={revealDelay(300 + total * 140)}
          >
            <button
              className="roadmap-cta"
              type="button"
              disabled={isLoading}
              onClick={() => onSelectScenario(suggestedScenario)}
              aria-label={`${fmt(t.roadmap.startLessonCta, { n: suggestedScenario })}: ${t.roadmap.titles[suggestedScenario - 1]}`}
            >
              {fmt(t.roadmap.startLessonCta, { n: suggestedScenario })}
              <ArrowRight size={16} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
        )}
      </section>

      {/* Decorative copy of the progress bar; the real one above keeps role="progressbar". */}
      <div
        className={`roadmap-mini-progress ${showMiniProgress ? 'is-visible' : ''}`}
        // Overlap the header's 1px bottom border so the line and the header read as one edge.
        style={{ top: headerHeight - 1 }}
        aria-hidden="true"
      >
        <span style={{ width: `${(doneCount / total) * 100}%` }} />
      </div>
    </main>
  );
}

export default Roadmap;
