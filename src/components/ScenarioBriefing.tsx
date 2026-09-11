import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import HardwareWallet, { type WalletPhase } from '@/components/HardwareWallet';
import andyPortrait from '@/components/Andy.png';

type ScenarioBriefingProps = {
  onBack: () => void;
  onComplete: () => void;
};

const INTRO_MESSAGES = [
  'Hi!',
  "Let's set up your first hardware wallet. Start by clicking the power button to turn it on.",
];

const MENTOR_MESSAGES: Record<WalletPhase, string> = {
  off: "Let's set up your first hardware wallet. Start by clicking the power button to turn it on.",
  booting: 'Great — the device is booting up. Hang tight for a moment.',
  menu: "You'll see 'Create wallet' highlighted. Press the checkmark button to select it.",
  'create-intro': "This screen explains what's about to happen. Press the checkmark to continue.",
  'create-words':
    "Here's your 12-word recovery phrase. In real life you'd write these down on paper — never on a screen. When you're ready, press the checkmark.",
  'create-quiz':
    "Time to prove you saved your words. Pick the correct word for the position shown, then press the checkmark to confirm.",
  'create-done': 'You did it! Your wallet is set up. Press the checkmark to wrap up this mission.',
  'recover-intro': '',
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
  const [walletVisible, setWalletVisible] = useState(false);

  const isInIntro = !introDone;
  const currentIntroMessage = INTRO_MESSAGES[introStep];
  const mentorMessage = isInIntro
    ? currentIntroMessage
    : MENTOR_MESSAGES[walletPhase] || MENTOR_MESSAGES.off;
  const { displayed, done, skip } = useTypewriter(mentorMessage);

  const canAdvanceIntro = isInIntro && introStep < INTRO_MESSAGES.length - 1;

  const handleBubbleTap = () => {
    if (!done) {
      skip();
      return;
    }
    if (canAdvanceIntro) {
      setIntroStep((s) => s + 1);
    } else if (isInIntro) {
      setIntroDone(true);
    }
  };

  useEffect(() => {
    if (introDone && !walletVisible) {
      const timer = setTimeout(() => setWalletVisible(true), 350);
      return () => clearTimeout(timer);
    }
  }, [introDone, walletVisible]);

  const bubbleKey = isInIntro ? `intro-${introStep}` : walletPhase;

  return (
    <main className="scenario-page scenario-page-fit">
      <button className="character-back" type="button" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2.4} />
        <span>Back to roadmap</span>
      </button>

      <div className="scenario-mentor-layout">
        <div className="mentor-row">
          <div className="mentor-portrait" aria-label="Andy, your mentor" role="img">
            <div className="mentor-portrait-glow" />
            <div className="mentor-portrait-ring">
              <img className="mentor-portrait-image" src={andyPortrait} alt="Andy, your mentor" />
            </div>
          </div>
          <div
            className={`mentor-bubble ${isInIntro ? 'mentor-bubble-interactive' : ''}`}
            key={bubbleKey}
            onClick={isInIntro ? handleBubbleTap : undefined}
            role={isInIntro ? 'button' : undefined}
            tabIndex={isInIntro ? 0 : undefined}
            onKeyDown={
              isInIntro
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleBubbleTap();
                    }
                  }
                : undefined
            }
          >
            <span className="mentor-bubble-name">Andy</span>
            <div className="mentor-bubble-text-wrap">
              <p className="mentor-bubble-text-ghost">{mentorMessage}</p>
              <p className="mentor-bubble-text">
                {displayed}
                {!done && <span className="typewriter-cursor" />}
              </p>
            </div>
            {isInIntro && done && (
              <div className="mentor-bubble-continue">
                <span className="mentor-bubble-continue-text">
                  {canAdvanceIntro ? 'Tap to continue' : 'Tap to begin'}
                </span>
                <ChevronDown size={14} strokeWidth={2.5} className="mentor-bubble-continue-icon" />
              </div>
            )}
          </div>
        </div>
        {walletVisible && (
          <HardwareWallet onComplete={onComplete} onPhaseChange={setWalletPhase} />
        )}
      </div>
    </main>
  );
}

export default ScenarioBriefing;
