import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import HardwareWallet, { type ExpectedAction, type WalletPhase } from '@/components/HardwareWallet';
import { getSessionMnemonic, persistMnemonic } from '@/lib/walletSession';
import andyPortrait from '@/components/Andy.webp';

const NUDGE_MESSAGE = "No need to do that now. Let's stick to the plan.";
const NUDGE_DURATION_MS = 1250;

type ScenarioBriefingProps = {
  onComplete: () => void;
};

const POWER_ON_MESSAGE = "That's a neat hardware wallet you got there! Okay let's start by clicking the power button to turn it on.";

// Andy reads these in order while the device is still hidden. The last entry is
// always the power-button line: the wallet window and device appear on it, so
// anything added above it plays first, in the spotlight.
const INTRO_MESSAGES = [
  "Okay let's start by learning how to setup your hardware wallet. In case you need a refresher, a hardware wallet is a physical device that allows you to store the private keys to your Bitcoin.",
  "The private keys are what give you the ability to send and manage your Bitcoin. They are protected by a secure chip inside the device.",
  POWER_ON_MESSAGE,
];

const POWER_ON_INDEX = (() => {
  const index = INTRO_MESSAGES.indexOf(POWER_ON_MESSAGE);
  return index === -1 ? INTRO_MESSAGES.length - 1 : index;
})();

const READY_MENU_MESSAGE =
  "These options will be covered in the next scenarios, Let's wrap this up for now.";

const FACTORY_RESET_MESSAGE =
  "Resetting the device isn't part of this scenario, so we'll leave it as it is for now. Let's wrap this up instead.";

// Andy delivers these one at a time while the 12 words are on screen: the
// explanation first, then the warning. The continue button moves between them.
const CREATE_WORDS_MESSAGES = [
  "Here is your 12-word recovery phrase, which creates your private keys. You must write this down on paper — never take a photo or type it on a computer.",
  "Remember to keep your copy somewhere safe and private. Whoever gets a copy of your recovery phrase is able to steal your Bitcoin.",
];

// Andy's wrap-up for the new wallet, delivered as two lines: what the device
// is not, then what it actually holds. The continue button moves between them.
const CREATE_DONE_MESSAGES = [
  "Nice work! You have now created a wallet. Remember, your Bitcoin doesn't actually live inside this hardware device — it stays safely on the blockchain.",
  "Your device simply holds the private keys that give you the power to send and receive it!",
];

const MENTOR_MESSAGES: Record<WalletPhase, string> = {
  off: POWER_ON_MESSAGE,
  booting: 'Great — the device is booting up. Hang tight for a moment.',
  // menu: "You'll see 'Create wallet' highlighted. Press the checkmark button to select it.",
   menu: "Next, you need to create a wallet. This is where your device will generate your private keys. Press the checkmark button to select it.",
  // 'create-intro': "On the next screen your 12-word recovery phrase will be shown. Press the checkmark to continue.",
  'create-intro': "Before your device can generate those private keys, it needs to create a 12-word recovery phrase first. Press the checkmark to continue.",
  'create-words': CREATE_WORDS_MESSAGES[0],
  'create-quiz':
    "Okay now it's time to prove you made a copy of it. Pick the correct word for the position shown, then press the checkmark to confirm.",
  'create-done': CREATE_DONE_MESSAGES[0],
  'recover-intro': "We'll cover wallet recovery later. Select Create Wallet for now.",
  'recover-quiz': '',
  'recover-type': '',
  'recover-done': '',
  'receive-address': 'This is your receive address — press the copy button to copy it.',
  'send-blocked': 'Sending from this wallet is not part of this mission yet. Let us get your receive address first.',
  settings: READY_MENU_MESSAGE,
  'reset-warn': FACTORY_RESET_MESSAGE,
  'reset-confirm': FACTORY_RESET_MESSAGE,
  'reset-done': FACTORY_RESET_MESSAGE,
  'ready-menu': READY_MENU_MESSAGE,
  'connect-confirm': '',
  'connect-done': '',
};

function useTypewriter(text: string, speed = 6) {
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
  }, [text, speed]);

  const skip = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayed(text);
    setDone(true);
  }, [text]);

  return { displayed, done, skip };
}

function ScenarioBriefing({ onComplete }: ScenarioBriefingProps) {
  const [introStep, setIntroStep] = useState(0);
  const [introDone, setIntroDone] = useState(false);
  const [walletPhase, setWalletPhase] = useState<WalletPhase>('off');
  const [menuSelection, setMenuSelection] = useState<'create-intro' | 'recover-intro' | 'receive-address' | 'send-blocked'>('create-intro');
  const [createWordsStep, setCreateWordsStep] = useState(0);
  const [createDoneStep, setCreateDoneStep] = useState(0);
  const [readyMenuSeen, setReadyMenuSeen] = useState(false);
  const [readyMenuHint, setReadyMenuHint] = useState<string | null>(null);
  const [resetRefused, setResetRefused] = useState(false);
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
  const createWordsLastStep = createWordsStep >= CREATE_WORDS_MESSAGES.length - 1;
  const createDoneLastStep = createDoneStep >= CREATE_DONE_MESSAGES.length - 1;
  const currentIntroMessage = INTRO_MESSAGES[introStep];
  const baseMentorMessage = isInIntro
    ? currentIntroMessage
    : resetRefused
      ? FACTORY_RESET_MESSAGE
      : walletPhase === 'menu' && menuSelection === 'recover-intro'
      ? "We'll cover wallet recovery later. Select Create Wallet for now."
      : walletPhase === 'ready-menu' && readyMenuHint
        ? readyMenuHint
        : walletPhase === 'create-words'
          ? CREATE_WORDS_MESSAGES[createWordsStep] ?? CREATE_WORDS_MESSAGES[0]
          : walletPhase === 'create-done'
            ? CREATE_DONE_MESSAGES[createDoneStep] ?? CREATE_DONE_MESSAGES[0]
            : MENTOR_MESSAGES[walletPhase] || MENTOR_MESSAGES.off;
  const mentorMessage = nudgeActive ? NUDGE_MESSAGE : baseMentorMessage;
  const { displayed, done, skip } = useTypewriter(mentorMessage);

  const canContinue = nudgeActive
    ? false
    : isInIntro
      ? introStep < POWER_ON_INDEX && done
      : walletPhase === 'create-words'
        ? !createWordsLastStep && done
        : walletPhase === 'create-done'
          ? done
          : walletPhase === 'ready-menu';

  // The device ignores input while Andy is still talking — in the intro, while
  // he reads the recovery-phrase lines, and while he wraps up the new wallet.
  const deviceLocked =
    canContinue ||
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
      setReadyMenuSeen(true);
      setReadyMenuHint(null);
      return;
    }
    if (walletPhase === 'ready-menu') {
      onComplete();
    }
  };

  const handleFactoryResetAttempt = useCallback(() => {
    setReadyMenuHint(null);
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

  const handleReadyMenuSelect = useCallback((label: string) => {
    setResetRefused(false);
    setReadyMenuHint(
      label === 'Receive Bitcoin'
        ? "These options will be covered in the next scenarios, Let's wrap this up for now."
        : "These options will be covered in the next scenarios, Let's wrap this up for now.",
    );
  }, []);

  const bubbleKey = nudgeActive
    ? 'nudge'
    : isInIntro
      ? `intro-${introStep}`
      : walletPhase === 'create-words'
        ? `create-words-${createWordsStep}`
        : walletPhase === 'create-done'
          ? `create-done-${createDoneStep}`
          : `${walletPhase}-${resetRefused}`;

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
    <main className={`scenario-page scenario-page-fit ${spotlight ? 'scenario-page-spotlight' : ''}`}>
      <div className={`scenario-mentor-layout ${spotlight ? 'spotlight' : ''}`}>
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
        <div className="mentor-row">
          <div ref={portraitRef} className="mentor-portrait" aria-label="Andy, your mentor" role="img">
            <div className="mentor-portrait-glow" />
            <div className="mentor-portrait-ring">
              <img className="mentor-portrait-image" src={andyPortrait} alt="Andy, your mentor" />
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
                <p className="mentor-bubble-text-ghost">{mentorMessage}</p>
                <p className="mentor-bubble-text">
                  {displayed}
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
              aria-label="Continue"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
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
