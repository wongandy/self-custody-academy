import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronRight, FileText, X } from 'lucide-react';
import HardwareWallet, { type WalletPhase } from '@/components/HardwareWallet';
import { loadMnemonic } from '@/lib/walletSession';
import andyPortrait from '@/components/Andy.webp';

type RecoverScenarioProps = {
  completed: boolean;
  onClose: () => void;
  onComplete: () => void;
  onBack: () => void;
};

type MenuSelection = 'idle' | 'create-intro' | 'recover-intro' | 'receive-address' | 'send-blocked';

const INTRO_MESSAGES = [
  "Now let's talk about one of the most overlooked aspect of self-custody — recovering one's wallet.",
  'Wallet recovery is a straightforward process and is essential if your hardware wallet ever gets lost, stolen or destroyed.',
  "Let's head back to your hardware wallet and I'll teach you how to do it.",
];

const RECOVER_INTRO_MESSAGES = [
  'On the next screen, you will be asked to input each word of your recovery phrase.',
  "In case you lost your copy, don't worry — since this is just a simulation, you'll have an option to view it on the next screen.",
  'But in real life though, if you lose your recovery phrase, no one can help you so make sure to back them up in paper.',
  'To view your recovery phrase, just press the button with a paper symbol just below my portrait.',
];

const RECOVER_TYPE_MESSAGE =
  "Type a letter, confirm the matching word, and repeat for all 12 words. Use X to backspace if you mistype.";

const MENTOR_MESSAGES: Record<string, string> = {
  'wallet-menu': "Select Settings to reset the device to factory settings.",
  'wallet-settings':
    "A factory reset clears everything — only the recovery phrase you wrote down can restore your wallet.",
  'wallet-reset-warn':
    "Don't worry. As long as your recovery phrase is backed up offline, your Bitcoin is safe.",
  'wallet-reset-confirm':
    "Last warning. Be completely sure that your recovery phrase has been written down. There's no going back after this.",
  'wallet-reset-cancelled':
    "Nothing was erased. Your wallet is still on the device. We can head back into Settings whenever you're ready.",
  'wallet-reset-done':
    'The device is wiping itself clean. Let it finish and restart.',
  'wallet-booting': "It's coming back up as a fresh, empty device. One moment.",
  'wallet-wiped':
    "The device is blank now — just like a new one out of the box. Let's practice recovering your wallet. Select Recover wallet.",
  'wallet-recover-done':
    "Your wallet is back. This is the power of self-custody — as long as your recovery phrase is safe, your Bitcoin is never truly lost.",
  'wallet-recover-celebrate':
    "And that's a wrap on recovery! You just did something most Bitcoin owners never practice. Give yourself a pat on the back — you've earned it. Press Continue to head back to the roadmap.",
  'wallet-receive-blocked':
    "Receiving isn't part of this mission. Stick with Settings so we can reset the device and practise recovering it.",
  'wallet-send-blocked':
    "Sending isn't part of this mission. Stick with Settings so we can reset the device and practise recovering it.",
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

export default function RecoverScenario({ completed, onClose, onComplete, onBack }: RecoverScenarioProps) {
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
  const prevPhase = useRef<WalletPhase>('menu');
  const portraitRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const flipRects = useRef<{ portrait: DOMRect; bubble: DOMRect } | null>(null);

  useEffect(() => {
    loadMnemonic().then((words) => {
      if (words) setExpectedMnemonic(words);
    });
  }, []);

  const spotlight = !introDone;
  const isInRecoverIntro = introDone && walletPhase === 'recover-intro';
  const isInRecoverType = introDone && walletPhase === 'recover-type';
  const recoverIntroFinal = RECOVER_INTRO_MESSAGES.length - 1;

  const canContinue = !introDone
    || recoveryDone
    || isInRecoverIntro;

  const finalStep = INTRO_MESSAGES.length - 1;
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
            : `wallet-menu-${menuSelection}`
          : walletPhase === 'settings'
            ? 'wallet-settings'
            : `wallet-${walletPhase}`;

  const recoverIntroMessage = RECOVER_INTRO_MESSAGES[recoverIntroStep] ?? '';
  const wordsMessage = expectedMnemonic
    ? `Here are your 12 words: ${expectedMnemonic.map((w, i) => `${i + 1}. ${w}`).join('  ')}`
    : 'I could not find your simulation phrase. You may need to redo Mission 1 to generate a new wallet.';

  const baseMentorMessage = introDone
    ? (MENTOR_MESSAGES[walletStateKey] ?? MENTOR_MESSAGES['wallet-menu'])
    : INTRO_MESSAGES[introStep];

  const mentorMessage = showingWords
    ? wordsMessage
    : isInRecoverIntro
      ? recoverIntroMessage
      : isInRecoverType
        ? RECOVER_TYPE_MESSAGE
        : baseMentorMessage;

  const { displayed, done, skip } = useTypewriter(mentorMessage);

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
    if (!introDone) {
      if (introStep < finalStep) {
        setIntroStep(introStep + 1);
        return;
      }
      if (portraitRef.current && bubbleRef.current) {
        flipRects.current = {
          portrait: portraitRef.current.getBoundingClientRect(),
          bubble: bubbleRef.current.getBoundingClientRect(),
        };
      }
      setIntroDone(true);
    } else if (isInRecoverIntro) {
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
        onComplete();
        onBack();
      }
    }
  }, [done, skip, introDone, introStep, finalStep, isInRecoverIntro, recoverIntroStep, recoverIntroFinal, recoveryDone, recoveryDoneStep, onBack, onComplete]);

  const [advanceFromIntro, setAdvanceFromIntro] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (!canContinue) return;
      e.preventDefault();
      handleContinue();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handlePaperClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowingWords((prev) => !prev);
  }, []);

  const showPaperButton = isInRecoverType || (isInRecoverIntro && recoverIntroStep === recoverIntroFinal);
  const walletLocked = isInRecoverIntro;

  return (
    <main className={`scenario-page scenario-page-fit ${spotlight ? 'scenario-page-spotlight' : ''}`}>
      <button ref={closeRef} className="recover-close" type="button" onClick={onClose} aria-label="Back to roadmap">
        <X size={18} strokeWidth={2.2} />
      </button>

      <div className={`scenario-mentor-layout ${spotlight ? 'spotlight' : ''}`}>
        {!spotlight && (
          <div className="recover-device-area">
            <div className="recover-device-enter">
              <HardwareWallet
                mode="withdraw"
                initialPhase="menu"
                explicitReset
                locked={walletLocked}
                advanceFromRecoverIntro={advanceFromIntro}
                expectedMnemonic={expectedMnemonic ?? undefined}
                onComplete={() => {}}
                onPhaseChange={handlePhaseChange}
                onMenuSelectionChange={handleMenuSelectionChange}
              />
            </div>
          </div>
        )}

        <div className="mentor-row">
          <div ref={portraitRef} className="mentor-portrait" aria-label="Andy, your mentor" role="img">
            <div className="mentor-portrait-glow" />
            <div className="mentor-portrait-ring">
              <img className="mentor-portrait-image" src={andyPortrait} alt="Andy, your mentor" />
            </div>
            <div className="mentor-portrait-badge">Andy</div>
            {showPaperButton && (
              <button
                className={`paper-reveal-btn paper-reveal-pop ${showingWords ? 'active' : 'paper-reveal-pulse'}`}
                type="button"
                onClick={handlePaperClick}
                aria-label={showingWords ? 'Hide recovery phrase' : 'Show recovery phrase'}
                title={showingWords ? 'Hide recovery phrase' : 'Show recovery phrase'}
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
            <div className="mentor-bubble-content" key={showingWords ? 'words' : introDone ? `${walletStateKey}-${recoverIntroStep}` : `intro-${introStep}`}>
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
    </main>
  );
}
