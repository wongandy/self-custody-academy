import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, ChevronRight, Power, XCircle } from 'lucide-react';
import HardwareWallet, { type ExpectedAction, type WalletPhase } from '@/components/HardwareWallet';
import { getSessionMnemonic, persistMnemonic } from '@/lib/walletSession';
import andyPortrait from '@/components/Andy.webp';
import en from '@/locales/en';
import { fmt, renderWithIcon, useI18n, withIconMark } from '@/lib/i18n';

const NUDGE_DURATION_MS = 1250;

type ScenarioBriefingProps = {
  onComplete: () => void;
};

// Andy's lines live in the dictionary (`lesson1`). He reads `intro` in order
// while the device is still hidden; the power-button line (`powerOn`) always
// comes right after them, and the wallet window appears on it. Resolving the
// handover by structure means lines added to `intro` play first, in the spotlight.
const POWER_ON_INDEX = en.lesson1.intro.length;
const CREATE_WORDS_COUNT = en.lesson1.createWords.length;
const CREATE_DONE_COUNT = en.lesson1.createDone.length;

type KnowledgeQuestion = {
  id: string;
  /** Position of this question's text in `lesson1.questions`. */
  textIndex: number;
  optionIds: string[];
  correctId: string;
};

const KNOWLEDGE_QUESTIONS: KnowledgeQuestion[] = [
  { id: 'recovery-phrase', textIndex: 0, optionIds: ['photo', 'paper', 'phone'], correctId: 'paper' },
  { id: 'keys-offline', textIndex: 1, optionIds: ['offline', 'app', 'backup'], correctId: 'offline' },
];

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type KnowledgeFeedback = 'prompt' | 'wrong' | 'correct';

type QuizEntry = {
  question: KnowledgeQuestion;
  optionIds: string[];
};

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

function ScenarioBriefing({ onComplete }: ScenarioBriefingProps) {
  const { t } = useI18n();
  const l1 = t.lesson1;
  const [introStep, setIntroStep] = useState(0);
  const [introDone, setIntroDone] = useState(false);
  const [walletPhase, setWalletPhase] = useState<WalletPhase>('off');
  const [menuSelection, setMenuSelection] = useState<'create-intro' | 'recover-intro' | 'receive-address' | 'send-blocked'>('create-intro');
  const [createWordsStep, setCreateWordsStep] = useState(0);
  const [createDoneStep, setCreateDoneStep] = useState(0);
  const [readyMenuSeen, setReadyMenuSeen] = useState(false);
  const [readyMenuHint, setReadyMenuHint] = useState(false);
  const [resetRefused, setResetRefused] = useState(false);
  const [knowledgeCheckActive, setKnowledgeCheckActive] = useState(false);
  const [quiz, setQuiz] = useState<QuizEntry[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [checkedAnswer, setCheckedAnswer] = useState(false);
  const [knowledgeFeedback, setKnowledgeFeedback] = useState<KnowledgeFeedback>('prompt');
  const [wrongOptionId, setWrongOptionId] = useState<string | null>(null);
  const [wrongAttempt, setWrongAttempt] = useState(0);
  const [nudgeActive, setNudgeActive] = useState(false);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const flipRects = useRef<{ portrait: DOMRect; bubble: DOMRect } | null>(null);

  const isInIntro = !introDone;
  // The device stays hidden, and Andy stays in the spotlight, until his
  // power-button line; that line is where the wallet window slides in.
  const walletVisible = introStep >= POWER_ON_INDEX;
  const spotlight = isInIntro && introStep < POWER_ON_INDEX;
  const createWordsLastStep = createWordsStep >= CREATE_WORDS_COUNT - 1;
  const createDoneLastStep = createDoneStep >= CREATE_DONE_COUNT - 1;
  const currentQuizEntry = quiz[quizIndex] ?? quiz[0] ?? null;
  const currentQuizText = currentQuizEntry ? l1.questions[currentQuizEntry.question.textIndex] : null;
  const quizOptionLabel = (optionId: string) =>
    (currentQuizText?.options as Record<string, string> | undefined)?.[optionId] ?? optionId;
  const introMessages = [...l1.intro, l1.powerOn];
  const currentIntroMessage = introMessages[introStep];
  const knowledgePrompt = l1.knowledgePrompts[quizIndex] ?? l1.knowledgePrompts[0];
  // What Andy says for each device phase; phases without a line fall back to the power-on line.
  const phaseMessages: Partial<Record<WalletPhase, string>> = {
    off: l1.powerOn,
    booting: l1.booting,
    menu: l1.menu,
    'create-intro': l1.createIntro,
    'create-words': l1.createWords[0],
    'create-quiz': l1.createQuiz,
    'create-done': l1.createDone[0],
    'recover-intro': l1.recoverLater,
    'receive-address': l1.receiveAddress,
    'send-blocked': l1.sendBlocked,
    settings: l1.readyMenu,
    'reset-warn': l1.factoryReset,
    'reset-confirm': l1.factoryReset,
    'reset-done': l1.factoryReset,
    'ready-menu': l1.readyMenu,
  };
  const baseMentorMessage = isInIntro
    ? currentIntroMessage
    : knowledgeCheckActive
      ? knowledgeFeedback === 'wrong'
        ? t.common.wrongAnswer
        : knowledgeFeedback === 'correct'
          ? currentQuizText?.correctLine ?? knowledgePrompt
          : knowledgePrompt
      : resetRefused
      ? l1.factoryReset
      : walletPhase === 'menu' && menuSelection === 'recover-intro'
      ? l1.recoverLater
      : walletPhase === 'ready-menu' && readyMenuHint
        ? l1.readyMenu
        : walletPhase === 'create-words'
          ? l1.createWords[createWordsStep] ?? l1.createWords[0]
          : walletPhase === 'create-done'
            ? l1.createDone[createDoneStep] ?? l1.createDone[0]
            : phaseMessages[walletPhase] || l1.powerOn;
  const mentorMessage = withIconMark(nudgeActive ? t.common.nudge : baseMentorMessage);
  const mentorMessageKey = nudgeActive
    ? 'nudge'
    : knowledgeCheckActive
      ? `knowledge-check-${quizIndex}-${knowledgeFeedback}-${wrongAttempt}`
      : isInIntro
      ? `intro-${introStep}`
      : walletPhase === 'create-words'
        ? `create-words-${createWordsStep}`
        : walletPhase === 'create-done'
          ? `create-done-${createDoneStep}`
          : `${walletPhase}-${resetRefused}`;
  const { displayed, done, skip } = useTypewriter(mentorMessage, 6, mentorMessageKey);
  const knowledgeCheckCanAnswer = knowledgeCheckActive && !checkedAnswer && done;

  // Lines that name a device button mark it with `{icon}`; the chip mirrors that button.
  // Only the power-on line uses the power button — every other `{icon}` line is the checkmark.
  // After the menu line spells out "checkmark button", later lines show the chip alone,
  // so there the chip carries a spoken label instead of being hidden from screen readers.
  const iconOnlyLine = baseMentorMessage === l1.createIntro || baseMentorMessage === l1.createQuiz;
  const renderMentorText = (text: string) =>
    renderWithIcon(
      text,
      <span
        className="mentor-copy-button-indicator device"
        {...(iconOnlyLine ? { role: 'img', 'aria-label': t.common.checkmarkButton } : { 'aria-hidden': true })}
      >
        {baseMentorMessage === l1.powerOn ? <Power size={12} strokeWidth={2.4} /> : <Check size={12} strokeWidth={2.6} />}
      </span>,
    );

  const canContinue = nudgeActive
    ? false
    : isInIntro
      ? introStep < POWER_ON_INDEX && done
      : knowledgeCheckActive
        ? false
        : walletPhase === 'create-words'
          ? !createWordsLastStep && done
        : walletPhase === 'create-done'
          ? done
          : walletPhase === 'ready-menu' && !knowledgeCheckActive;

  // The device ignores input while Andy is still talking — in the intro, while
  // he reads the recovery-phrase lines, and while he wraps up the new wallet.
  const deviceLocked =
    canContinue ||
    knowledgeCheckActive ||
    (isInIntro && !done) ||
    ((walletPhase === 'create-words' || walletPhase === 'create-done') && !done);

  useEffect(() => {
    if (walletPhase !== 'off' && !introDone) {
      setIntroDone(true);
    }
  }, [walletPhase, introDone]);

  useEffect(() => {
    if (walletPhase !== 'menu' && walletPhase !== 'ready-menu') {
      setResetRefused(false);
    }
  }, [walletPhase]);

  useEffect(() => {
    if (walletPhase === 'create-done') {
      setCreateDoneStep(0);
    }
  }, [walletPhase]);

  useEffect(() => {
    if (walletPhase !== 'create-words') return;
    setCreateWordsStep(0);
    const words = getSessionMnemonic();
    if (words && words.length === 12) {
      persistMnemonic(words);
    }
  }, [walletPhase]);

  const handleContinue = () => {
    if (!done) {
      skip();
      return;
    }
    if (knowledgeCheckActive) {
      if (checkedAnswer) {
        handleContinueFromCheck();
      }
      return;
    }
    if (isInIntro && introStep < POWER_ON_INDEX) {
      const nextStep = introStep + 1;
      if (nextStep === POWER_ON_INDEX && portraitRef.current && bubbleRef.current) {
        flipRects.current = {
          portrait: portraitRef.current.getBoundingClientRect(),
          bubble: bubbleRef.current.getBoundingClientRect(),
        };
      }
      setIntroStep(nextStep);
      return;
    }
    if (walletPhase === 'create-words') {
      if (!createWordsLastStep) {
        setCreateWordsStep((step) => step + 1);
      }
      return;
    }
    if (walletPhase === 'create-done') {
      if (!createDoneLastStep) {
        setCreateDoneStep((step) => step + 1);
        return;
      }
      setQuiz(shuffled(KNOWLEDGE_QUESTIONS).map((question) => ({ question, optionIds: shuffled(question.optionIds) })));
      setQuizIndex(0);
      setKnowledgeCheckActive(true);
      return;
    }
    if (walletPhase === 'ready-menu') {
      onComplete();
    }
  };

  const handleOptionSelect = (optionId: string) => {
    if (!knowledgeCheckCanAnswer || !currentQuizEntry) return;
    setWrongOptionId(null);
    if (optionId === currentQuizEntry.question.correctId) {
      setSelectedOption(optionId);
      setKnowledgeFeedback('correct');
      setCheckedAnswer(true);
      return;
    }
    setSelectedOption(null);
    setWrongOptionId(optionId);
    setWrongAttempt((attempt) => attempt + 1);
    setKnowledgeFeedback('wrong');
  };

  const isLastQuizQuestion = quizIndex >= quiz.length - 1;

  const handleContinueFromCheck = () => {
    if (!checkedAnswer || !done) return;
    if (!isLastQuizQuestion) {
      setQuizIndex((index) => index + 1);
      setSelectedOption(null);
      setCheckedAnswer(false);
      setKnowledgeFeedback('prompt');
      setWrongOptionId(null);
      setWrongAttempt(0);
      return;
    }
    setReadyMenuSeen(true);
    setReadyMenuHint(false);
    onComplete();
  };

  const handleFactoryResetAttempt = useCallback(() => {
    setReadyMenuHint(false);
    setResetRefused(true);
  }, []);

  const handleUnexpectedAction = useCallback(() => {
    setNudgeActive(true);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    nudgeTimer.current = setTimeout(() => setNudgeActive(false), NUDGE_DURATION_MS);
  }, []);

  useEffect(() => {
    if (!nudgeActive) return;
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    nudgeTimer.current = setTimeout(() => setNudgeActive(false), NUDGE_DURATION_MS);
    return () => {
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    };
  }, [nudgeActive]);

  useEffect(() => () => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
  }, []);

  useEffect(() => {
    if (nudgeActive) {
      setNudgeActive(false);
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    }
  }, [walletPhase]);

  const expectedAction: ExpectedAction =
    walletPhase === 'off'
      ? { type: 'power-on' }
      : walletPhase === 'menu'
        ? { type: 'confirm-menu-item', label: 'Create wallet' }
      : walletPhase === 'create-intro' || walletPhase === 'create-words' || walletPhase === 'create-quiz'
          ? { type: 'confirm' }
          : { type: 'none' };

  const handleReadyMenuSelect = useCallback(() => {
    setResetRefused(false);
    setReadyMenuHint(true);
  }, []);

  const bubbleKey = mentorMessageKey;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      e.preventDefault();
      handleContinue();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

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

  return (
    <main className={`scenario-page scenario-page-fit ${spotlight ? 'scenario-page-spotlight' : ''} ${knowledgeCheckActive ? 'knowledge-check-scene' : ''}`}>
      <div className={`scenario-mentor-layout ${spotlight ? 'spotlight' : ''} ${knowledgeCheckActive ? 'knowledge-check-layout' : ''}`}>
        {knowledgeCheckActive && <div className="knowledge-check-kicker">{t.quiz.checkIn}</div>}
        {!knowledgeCheckActive && (
          <div className={walletVisible ? 'hw-wallet-slot' : 'hw-wallet-slot hidden'}>
            <HardwareWallet
              onComplete={() => {}}
              onPhaseChange={setWalletPhase}
              onMenuSelectionChange={setMenuSelection}
              onReadyMenuSelect={handleReadyMenuSelect}
              onFactoryResetAttempt={handleFactoryResetAttempt}
              onUnexpectedAction={handleUnexpectedAction}
              advanceToReadyMenu={readyMenuSeen}
              expectedAction={expectedAction}
              locked={deviceLocked}
            />
          </div>
        )}
        <div className={`mentor-row ${knowledgeCheckActive ? 'knowledge-check-mentor-row' : ''}`}>
          <div ref={portraitRef} className="mentor-portrait" aria-label={fmt(t.common.mentorAria, { name: 'Andy' })} role="img">
            <div className="mentor-portrait-glow" />
            <div className="mentor-portrait-ring">
              <img className="mentor-portrait-image" src={andyPortrait} alt={fmt(t.common.mentorAria, { name: 'Andy' })} />
            </div>
            <div className="mentor-portrait-badge">Andy</div>
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
        {knowledgeCheckActive && (
          <div className="knowledge-check-card" role="group" aria-label={t.quiz.groupAria}>
            <div className="knowledge-check-header">
              <span>{fmt(t.quiz.progress, { current: quizIndex + 1, total: quiz.length })}</span>
            </div>
            <p className="knowledge-check-question">{currentQuizText?.question}</p>
            <div className="knowledge-check-options">
              {(currentQuizEntry?.optionIds ?? []).map((optionId) => {
                const isSelected = selectedOption === optionId;
                const isCorrect = checkedAnswer && optionId === currentQuizEntry.question.correctId;
                const isWrong = wrongOptionId === optionId;
                return (
                  <button
                    key={optionId}
                    type="button"
                    className={`knowledge-check-option ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                    onClick={() => handleOptionSelect(optionId)}
                    disabled={!knowledgeCheckCanAnswer}
                  >
                    {isCorrect ? <CheckCircle2 size={16} strokeWidth={2.2} /> : isWrong ? <XCircle size={16} strokeWidth={2.2} /> : null}
                    <span>{quizOptionLabel(optionId)}</span>
                  </button>
                );
              })}
            </div>
            <button
              className="knowledge-check-submit"
              type="button"
              onClick={handleContinueFromCheck}
              disabled={!checkedAnswer || !done}
            >
              {isLastQuizQuestion ? t.quiz.finish : t.quiz.next}
            </button>
          </div>
        )}
      </div>

      {/* <div className="character-footer">
        <div className="character-footer-inner">
          <button
            className="character-proceed"
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
          >
            <span>Continue</span>
            <ArrowRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div> */}
    </main>
  );
}

export default ScenarioBriefing;
