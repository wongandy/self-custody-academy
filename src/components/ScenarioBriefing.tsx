import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import HardwareWallet, { type WalletPhase } from '@/components/HardwareWallet';
import andyPortrait from '@/components/Andy.png';

type ScenarioBriefingProps = {
  onBack: () => void;
  onComplete: () => void;
};

const INTRO_MESSAGES = [
  "Let's setup your hardware wallet. Don't worry, we'll walk through it together.",
  "Start by clicking the power button to turn it on.",
];

const MENTOR_MESSAGES: Record<WalletPhase, string> = {
  off: "Start by clicking the power button to turn it on.",
  booting: 'Great — the device is booting up. Hang tight for a moment.',
  menu: "You'll see 'Create wallet' highlighted. Press the checkmark button to select it.",
  'create-intro': "This screen explains what's about to happen. Press the checkmark to continue.",
  'create-words':
    "Here's your 12-word recovery phrase. In real life you'd write these down on paper — never on a screen. When you're ready, press the checkmark.",
  'create-quiz':
    "Time to prove you saved your words. Pick the correct word for the position shown, then press the checkmark to confirm.",
  'create-done': 'You did it! Your wallet is set up. Press Continue to wrap up this mission.',
  'recover-intro': "We'll cover wallet recovery later. Select Create Wallet for now.",
  'recover-quiz': '',
  'recover-done': '',
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

  const isInIntro = !introDone;
  const currentIntroMessage = INTRO_MESSAGES[introStep];
  const mentorMessage = isInIntro
    ? currentIntroMessage
    : walletPhase === 'menu' && menuSelection === 'recover-intro'
      ? "We'll cover wallet recovery later. Select Create Wallet for now."
      : MENTOR_MESSAGES[walletPhase] || MENTOR_MESSAGES.off;
  const { displayed, done, skip } = useTypewriter(mentorMessage);

  const canContinue = isInIntro
    ? introStep === 0 && done
    : walletPhase === 'create-done';

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
      setWalletVisible(true);
      setIntroStep(1);
      return;
    }
    if (walletPhase === 'create-done') {
      onComplete();
    }
  };

  const bubbleKey = isInIntro ? `intro-${introStep}` : walletPhase;

  return (
    <main className="scenario-page scenario-page-fit">
      <div className="scenario-mentor-layout">
        <div className="mentor-row">
          <div className="mentor-portrait" aria-label="Andy, your mentor" role="img">
            <div className="mentor-portrait-glow" />
            <div className="mentor-portrait-ring">
              <img className="mentor-portrait-image" src={andyPortrait} alt="Andy, your mentor" />
            </div>
          </div>
          <div className="mentor-bubble" key={bubbleKey}>
            <span className="mentor-bubble-name">Andy</span>
            <div className="mentor-bubble-text-wrap">
              <p className="mentor-bubble-text-ghost">{mentorMessage}</p>
              <p className="mentor-bubble-text">
                {displayed}
                {!done && <span className="typewriter-cursor" />}
              </p>
            </div>
            <button
              className={`bubble-next ${canContinue ? 'ready' : ''}`}
              type="button"
              onClick={handleContinue}
              disabled={!canContinue}
              aria-label="Continue"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <div className={walletVisible ? 'hw-wallet-slot' : 'hw-wallet-slot hidden'}>
          <HardwareWallet
            onComplete={() => {}}
            onPhaseChange={setWalletPhase}
            onMenuSelectionChange={setMenuSelection}
          />
        </div>
      </div>

      <div className="character-footer">
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
      </div>
    </main>
  );
}

export default ScenarioBriefing;
