import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import HardwareWallet, { type WalletPhase } from '@/components/HardwareWallet';
import andyPortrait from '@/components/Andy.webp';

type ScenarioBriefingProps = {
  onBack: () => void;
  onComplete: () => void;
};

const INTRO_MESSAGES = [
  "Let's setup your hardware wallet. Don't worry, we'll walk through it together.",
  "Start by clicking the power button to turn it on.",
];

const READY_MENU_MESSAGE =
  "These options will be covered in the next scenarios, you may press Continue to wrap up.";

const MENTOR_MESSAGES: Record<WalletPhase, string> = {
  off: "Start by clicking the power button to turn it on.",
  booting: 'Great — the device is booting up. Hang tight for a moment.',
  menu: "You'll see 'Create wallet' highlighted. Press the checkmark button to select it.",
  'create-intro': "This screen explains what's about to happen. Press the checkmark to continue.",
  'create-words':
    "Here's your 12-word recovery phrase. In real life you'd write these down on paper — never on a screen. When you're ready, press the checkmark.",
  'create-quiz':
    "Time to prove you saved your words. Pick the correct word for the position shown, then press the checkmark to confirm.",
  'create-done': 'You did it! Your wallet is set up.',
  'recover-intro': "We'll cover wallet recovery later. Select Create Wallet for now.",
  'recover-quiz': '',
  'recover-done': '',
  'receive-address': 'This is your receive address — press the copy button to copy it.',
  'send-blocked': 'Sending from this wallet is not part of this mission yet. Let us get your receive address first.',
  'ready-menu': READY_MENU_MESSAGE,
};

function useTypewriter(text: string, speed = 10) {
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

function ScenarioBriefing({ onBack, onComplete }: ScenarioBriefingProps) {
  const [introStep, setIntroStep] = useState(0);
  const [introDone, setIntroDone] = useState(false);
  const [walletPhase, setWalletPhase] = useState<WalletPhase>('off');
  const [menuSelection, setMenuSelection] = useState<'create-intro' | 'recover-intro' | 'receive-address' | 'send-blocked'>('create-intro');
  const [walletVisible, setWalletVisible] = useState(false);
  const [readyMenuSeen, setReadyMenuSeen] = useState(false);
  const [readyMenuHint, setReadyMenuHint] = useState<string | null>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const flipRects = useRef<{ portrait: DOMRect; bubble: DOMRect } | null>(null);

  const isInIntro = !introDone;
  const spotlight = isInIntro && introStep === 0;
  const currentIntroMessage = INTRO_MESSAGES[introStep];
  const mentorMessage = isInIntro
    ? currentIntroMessage
    : walletPhase === 'menu' && menuSelection === 'recover-intro'
      ? "We'll cover wallet recovery later. Select Create Wallet for now."
      : walletPhase === 'ready-menu' && readyMenuHint
        ? readyMenuHint
        : MENTOR_MESSAGES[walletPhase] || MENTOR_MESSAGES.off;
  const { displayed, done, skip } = useTypewriter(mentorMessage);

  const canContinue = isInIntro
    ? introStep === 0 && done
    : walletPhase === 'create-done' || walletPhase === 'ready-menu';

  useEffect(() => {
    if (walletPhase !== 'off' && !introDone) {
      setIntroDone(true);
    }
  }, [walletPhase, introDone]);

  const handleContinue = () => {
    if (!done) {
      skip();
      return;
    }
    if (isInIntro && introStep === 0) {
      if (portraitRef.current && bubbleRef.current) {
        flipRects.current = {
          portrait: portraitRef.current.getBoundingClientRect(),
          bubble: bubbleRef.current.getBoundingClientRect(),
        };
      }
      setWalletVisible(true);
      setIntroStep(1);
      return;
    }
    if (walletPhase === 'create-done') {
      setReadyMenuSeen(true);
      setReadyMenuHint(null);
      return;
    }
    if (walletPhase === 'ready-menu') {
      onComplete();
    }
  };

  const handleReadyMenuSelect = useCallback((label: string) => {
    setReadyMenuHint(
      label === 'Receive Bitcoin'
        ? "This option will be covered in the next scenarios, you may press Continue to wrap up."
        : "This option will be covered in the next scenarios, you may press Continue to wrap up.",
    );
  }, []);

  const bubbleKey = isInIntro ? `intro-${introStep}` : walletPhase;

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
            advanceToReadyMenu={readyMenuSeen}
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
