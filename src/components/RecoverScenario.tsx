import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronRight, FileText } from 'lucide-react';
import HardwareWallet, { type WalletPhase, type ExpectedAction } from '@/components/HardwareWallet';
import { loadMnemonic, persistMnemonic } from '@/lib/walletSession';
import { generateMnemonic } from '@/lib/bip39';
import andyPortrait from '@/components/Andy.webp';
import en from '@/locales/en';
import { fmt, renderWithIcon, useI18n, withIconMark } from '@/lib/i18n';
import { useFitScale } from '@/lib/useFitScale';
import { KnowledgeCheckCard, KnowledgeCheckKicker, useKnowledgeCheck, type KnowledgeQuestion } from '@/components/KnowledgeCheck';

type RecoverScenarioProps = {
  completed: boolean;
  onClose: () => void;
  onComplete: () => void;
  onBack: () => void;
};

type MenuSelection = 'idle' | 'create-intro' | 'recover-intro' | 'receive-address' | 'send-blocked';

// Andy's lines live in the dictionary (`lesson4`). He reads `intro` in order
// while the wallet is still hidden; the hand-over line (`handover`) always comes
// right after them and the wallet window appears on it, so lines added to
// `intro` play first, in the spotlight.
const HANDOVER_INDEX = en.lesson4.intro.length;
const RECOVER_INTRO_COUNT = en.lesson4.recoverIntro.length;

const NUDGE_DURATION_MS = 1250;

// Answer key for the check-in; the wording is `lesson4.questions`, in this order.
const KNOWLEDGE_QUESTIONS: KnowledgeQuestion[] = [
  { optionIds: ['phrase', 'pin', 'support'], correctId: 'phrase' },
  { optionIds: ['safe', 'gone', 'company'], correctId: 'safe' },
];

function useTypewriter(text: string, speed = 6, resetKey = '') {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    indexRef.current = 0;

    if (!text) {
      setDone(true);
      return;
    }

    const timer = setInterval(() => {
      indexRef.current += 1;
      if (indexRef.current >= text.length) {
        setDisplayed(text);
        setDone(true);
        clearInterval(timer);
      } else {
        setDisplayed(text.slice(0, indexRef.current));
      }
    }, speed);

    timerRef.current = timer;
    return () => clearInterval(timer);
  }, [text, speed, resetKey]);

  const skip = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayed(text);
    setDone(true);
  }, [text]);

  return { displayed, done, skip };
}

export default function RecoverScenario({ onComplete, onBack }: RecoverScenarioProps) {
  const { t } = useI18n();
  const l3 = t.lesson4;
  const INTRO_MESSAGES = [...l3.intro, l3.handover];
  const MENTOR_MESSAGES: Record<string, string> = {
    'wallet-menu': l3.walletMenu,
    'wallet-settings': l3.walletSettings,
    'wallet-reset-warn': l3.walletResetWarn,
    'wallet-reset-confirm': l3.walletResetConfirm,
    'wallet-reset-cancelled': l3.walletResetCancelled,
    'wallet-reset-done': l3.walletResetDone,
    'wallet-booting': l3.walletBooting,
    'wallet-wiped': l3.walletWiped,
    'wallet-recover-done': l3.walletRecoverDone,
    'wallet-recover-celebrate': l3.walletRecoverCelebrate,
    'wallet-receive-blocked': l3.walletReceiveBlocked,
    'wallet-send-blocked': l3.walletSendBlocked,
  };
  const [introStep, setIntroStep] = useState(0);
  const [introDone, setIntroDone] = useState(false);
  const [walletPhase, setWalletPhase] = useState<WalletPhase>('menu');
  const [wiped, setWiped] = useState(false);
  const [menuSelection, setMenuSelection] = useState<MenuSelection>('idle');
  const [resetCancelled, setResetCancelled] = useState(false);
  const [recoveryDone, setRecoveryDone] = useState(false);
  const [recoveryDoneStep, setRecoveryDoneStep] = useState(0);
  const [recoverIntroStep, setRecoverIntroStep] = useState(0);
  const [showingWords, setShowingWords] = useState(false);
  const [expectedMnemonic, setExpectedMnemonic] = useState<string[] | null>(null);
  const [nudgeActive, setNudgeActive] = useState(false);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPhase = useRef<WalletPhase>('menu');
  const check = useKnowledgeCheck(KNOWLEDGE_QUESTIONS, l3, () => {
    onComplete();
    onBack();
  });
  const portraitRef = useRef<HTMLDivElement>(null);
  const deviceAreaRef = useFitScale();
  const bubbleRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const flipRects = useRef<{ portrait: DOMRect; bubble: DOMRect } | null>(null);

  // True when Lesson 1 was skipped and we made a fresh practice phrase for this lesson.
  const [practicePhrase, setPracticePhrase] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadMnemonic().then((words) => {
      if (cancelled) return;
      if (words) {
        setExpectedMnemonic(words);
        return;
      }
      const fresh = generateMnemonic(12);
      setExpectedMnemonic(fresh);
      setPracticePhrase(true);
      persistMnemonic(fresh).catch(() => {
        // Saving is best-effort; the phrase still works for this session.
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The wallet stays hidden, and Andy stays in the spotlight, until his
  // hand-over line; that line is where the wallet window slides in.
  const walletVisible = introDone || introStep >= HANDOVER_INDEX;
  const spotlight = !introDone && introStep < HANDOVER_INDEX;
  const isInRecoverIntro = introDone && walletPhase === 'recover-intro';
  const isInRecoverType = introDone && walletPhase === 'recover-type';
  const recoverIntroFinal = RECOVER_INTRO_COUNT - 1;

  const postResetMenu = wiped && walletPhase === 'menu';
  const walletStateKey = recoveryDone
    ? (recoveryDoneStep === 1 ? 'wallet-recover-celebrate' : 'wallet-recover-done')
    : postResetMenu
      ? 'wallet-wiped'
      : resetCancelled
        ? 'wallet-reset-cancelled'
        : walletPhase === 'menu'
          ? menuSelection === 'idle'
            ? 'wallet-menu'
            : menuSelection === 'send-blocked'
              ? 'wallet-send-blocked'
              : menuSelection === 'receive-address'
                ? 'wallet-receive-blocked'
                : `wallet-menu-${menuSelection}`
          : walletPhase === 'settings'
            ? 'wallet-settings'
            : `wallet-${walletPhase}`;

  const recoverIntroMessage = l3.recoverIntro[recoverIntroStep] ?? '';
  // The recovery words themselves are never translated.
  const wordsMessage = expectedMnemonic
    ? fmt(practicePhrase ? l3.wordsPractice : l3.words, { words: expectedMnemonic.map((w, i) => `${i + 1}. ${w}`).join('  ') })
    : l3.wordsMissing;

  const baseMentorMessage = introDone
    ? (MENTOR_MESSAGES[walletStateKey] ?? MENTOR_MESSAGES['wallet-menu'])
    : INTRO_MESSAGES[introStep];

  const mentorMessage = withIconMark(nudgeActive
    ? t.common.nudge
    : check.active
      ? check.mentorLine
    : showingWords
      ? wordsMessage
      : isInRecoverIntro
        ? recoverIntroMessage
        : isInRecoverType
          ? l3.recoverType
          : baseMentorMessage);

  const bubbleKey = nudgeActive
    ? 'nudge'
    : check.active
      ? check.mentorKey
      : showingWords
        ? 'words'
        : introDone
          ? `${walletStateKey}-${recoverIntroStep}`
          : `intro-${introStep}`;
  const { displayed, done, skip } = useTypewriter(mentorMessage, 6, bubbleKey);

  // The paper-button line marks where the icon goes with `{icon}`; it appears once typing reaches it.
  const renderMentorText = (text: string) =>
    renderWithIcon(
      text,
      <span className="mentor-copy-button-indicator paper" aria-hidden="true">
        <FileText size={12} strokeWidth={2.2} />
      </span>,
    );

  const canContinue = nudgeActive || check.active
    ? false
    : !introDone
      ? introStep < HANDOVER_INDEX && done
      : recoveryDone || isInRecoverIntro;

  const handleUnexpectedAction = useCallback(() => {
    setNudgeActive(true);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    nudgeTimer.current = setTimeout(() => setNudgeActive(false), NUDGE_DURATION_MS);
  }, []);

  useEffect(() => {
    if (nudgeActive) {
      setNudgeActive(false);
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    }
  }, [walletPhase]);

  useEffect(() => () => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
  }, []);

  // The intro ends as soon as the learner touches the wallet, so the mentor
  // never lingers on the hand-over line after control has been handed over.
  useEffect(() => {
    if (introDone) return;
    if (walletPhase !== 'menu') {
      setIntroDone(true);
    }
  }, [walletPhase, introDone]);

  const expectedAction: ExpectedAction =
    !walletVisible
      ? { type: 'none' }
    : walletPhase === 'menu' && !wiped
      ? { type: 'confirm-menu-item', label: 'Settings' }
    : walletPhase === 'menu' && wiped
      ? { type: 'confirm-menu-item', label: 'Recover wallet' }
    : walletPhase === 'settings' || walletPhase === 'reset-warn' || walletPhase === 'reset-confirm'
      ? { type: 'confirm' }
    : walletPhase === 'recover-type'
      ? { type: 'confirm' }
    : { type: 'none' };

  const handleMenuSelectionChange = useCallback((sel: MenuSelection) => {
    setMenuSelection(sel);
    setResetCancelled(false);
  }, []);

  const handlePhaseChange = useCallback((phase: WalletPhase) => {
    const from = prevPhase.current;
    prevPhase.current = phase;
    if (phase === 'reset-done') setWiped(true);
    if (from === 'reset-confirm' && phase === 'menu') setResetCancelled(true);
    if (phase === 'recover-intro') {
      setRecoverIntroStep(0);
      setShowingWords(false);
    }
    if (phase === 'recover-type') {
      setShowingWords(false);
    }
    if (phase === 'recover-done') {
      setRecoveryDone(true);
      setShowingWords(false);
    }
    setWalletPhase(phase);
  }, []);

  useLayoutEffect(() => {
    const align = () => {
      const actions = document.querySelector<HTMLElement>('.header-actions');
      if (!actions) return;
      const rect = actions.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const place = (el: HTMLElement | null, left: number) => {
        if (!el) return;
        el.style.position = 'fixed';
        el.style.left = `${left}px`;
        el.style.top = `${centerY - el.offsetHeight / 2}px`;
        el.style.zIndex = '40';
        el.style.transform = 'none';
      };
      place(closeRef.current, rect.right + 14);
    };

    align();
    window.addEventListener('resize', align);
    return () => window.removeEventListener('resize', align);
  }, [introDone]);

  useLayoutEffect(() => {
    if (spotlight || !flipRects.current) return;
    const portrait = portraitRef.current;
    const bubble = bubbleRef.current;
    if (!portrait || !bubble) return;

    const pFirst = flipRects.current.portrait;
    const bFirst = flipRects.current.bubble;
    const pLast = portrait.getBoundingClientRect();
    const bLast = bubble.getBoundingClientRect();
    flipRects.current = null;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const opts: KeyframeAnimationOptions = {
      duration: 560,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    };

    portrait.style.transformOrigin = 'top left';
    portrait.animate(
      [
        {
          transform: `translate(${pFirst.left - pLast.left}px, ${pFirst.top - pLast.top}px) scale(${pFirst.width / pLast.width}, ${pFirst.height / pLast.height})`,
        },
        { transform: 'translate(0, 0) scale(1, 1)' },
      ],
      opts,
    );

    bubble.style.transformOrigin = 'top left';
    bubble.animate(
      [
        {
          transform: `translate(${bFirst.left - bLast.left}px, ${bFirst.top - bLast.top}px) scale(${bFirst.width / bLast.width}, ${bFirst.height / bLast.height})`,
        },
        { transform: 'translate(0, 0) scale(1, 1)' },
      ],
      opts,
    );
  }, [spotlight]);

  const handleContinue = useCallback(() => {
    if (!done) {
      skip();
      return;
    }
    if (check.active) {
      if (check.answered) check.advance();
      return;
    }
    if (!introDone) {
      if (introStep < HANDOVER_INDEX) {
        if (introStep === HANDOVER_INDEX - 1 && portraitRef.current && bubbleRef.current) {
          flipRects.current = {
            portrait: portraitRef.current.getBoundingClientRect(),
            bubble: bubbleRef.current.getBoundingClientRect(),
          };
        }
        setIntroStep(introStep + 1);
      }
      return;
    }
    if (isInRecoverIntro) {
      if (recoverIntroStep < recoverIntroFinal) {
        setRecoverIntroStep(recoverIntroStep + 1);
      } else {
        // After the last intro message, advance the wallet to recover-type
        setAdvanceFromIntro(true);
      }
    } else if (recoveryDone) {
      if (recoveryDoneStep === 0) {
        setRecoveryDoneStep(1);
      } else {
        check.start();
      }
    }
  }, [done, skip, introDone, introStep, isInRecoverIntro, recoverIntroStep, recoverIntroFinal, recoveryDone, recoveryDoneStep, check]);

  const [advanceFromIntro, setAdvanceFromIntro] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (!canContinue && !check.active && done) return;
      e.preventDefault();
      handleContinue();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // The paper button must not compete with the continue arrow: while the
  // continue button is active, the reveal stays inert.
  const paperEnabled = !canContinue;

  const handlePaperClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!paperEnabled) return;
    setShowingWords((prev) => !prev);
  }, [paperEnabled]);

  const showPaperButton = !check.active && (isInRecoverType || (isInRecoverIntro && recoverIntroStep === recoverIntroFinal));
  const walletLocked = (isInRecoverIntro || recoveryDone) && !nudgeActive;
  // The wallet ignores input while Andy is still talking, and while the
  // continue button is the only expected action.
  const deviceLocked = walletLocked || (!introDone && !done);

  return (
    <main className={`scenario-page scenario-page-fit lesson-fit ${spotlight ? 'scenario-page-spotlight' : ''} ${check.active ? 'knowledge-check-scene' : ''}`}>
      <div className={`scenario-mentor-layout ${spotlight ? 'spotlight' : ''} ${check.active ? 'knowledge-check-layout' : ''}`}>
        {check.active && <KnowledgeCheckKicker />}
        {walletVisible && !check.active && (
          <div ref={deviceAreaRef} className="recover-device-area fit-slot">
            <div className="recover-device-enter">
              <HardwareWallet
                mode="withdraw"
                initialPhase="menu"
                explicitReset
                locked={deviceLocked}
                advanceFromRecoverIntro={advanceFromIntro}
                expectedMnemonic={expectedMnemonic ?? undefined}
                expectedAction={expectedAction}
                onUnexpectedAction={handleUnexpectedAction}
                onComplete={() => {}}
                onPhaseChange={handlePhaseChange}
                onMenuSelectionChange={handleMenuSelectionChange}
              />
            </div>
          </div>
        )}

        <div className="mentor-row">
          <div ref={portraitRef} className="mentor-portrait" aria-label={fmt(t.common.mentorAria, { name: 'Andy' })} role="img">
            <div className="mentor-portrait-glow" />
            <div className="mentor-portrait-ring">
              <img className="mentor-portrait-image" src={andyPortrait} alt={fmt(t.common.mentorAria, { name: 'Andy' })} />
            </div>
            <div className="mentor-portrait-badge">Andy</div>
            {showPaperButton && (
              <button
                className={`paper-reveal-btn paper-reveal-pop ${showingWords ? 'active' : 'paper-reveal-pulse'}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handlePaperClick}
                aria-label={showingWords ? l3.hidePhrase : l3.showPhrase}
                title={showingWords ? l3.hidePhrase : l3.showPhrase}
              >
                <FileText size={18} strokeWidth={2.2} />
              </button>
            )}
          </div>
          <div
            ref={bubbleRef}
            className={`mentor-bubble ${canContinue ? 'is-ready' : ''}`}
            onClick={handleContinue}
          >
            <div className="mentor-bubble-content" key={bubbleKey}>
              <span className="mentor-bubble-name">Andy</span>
              <div className="mentor-bubble-text-wrap">
                <p className="mentor-bubble-text-ghost">{renderMentorText(mentorMessage)}</p>
                <p className="mentor-bubble-text">
                  {renderMentorText(displayed)}
                  {!done && <span className="typewriter-cursor" />}
                </p>
              </div>
            </div>
            <button
              className={`bubble-next ${canContinue ? 'ready' : ''}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleContinue();
              }}
              disabled={!canContinue}
              aria-label={t.common.continue}
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        {check.active && <KnowledgeCheckCard check={check} ready={done} />}
      </div>
    </main>
  );
}
