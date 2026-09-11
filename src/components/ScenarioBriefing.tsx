import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import HardwareWallet, { type WalletPhase } from '@/components/HardwareWallet';
import andyPortrait from '@/components/Andy.png';

type ScenarioBriefingProps = {
  completed: boolean;
  isLoggedIn: boolean;
  onBack: () => void;
  onComplete: () => void;
};

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

    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayed, done };
}

function ScenarioBriefing({ completed, isLoggedIn, onBack, onComplete }: ScenarioBriefingProps) {
  const [walletPhase, setWalletPhase] = useState<WalletPhase>('off');
  const [walletVisible, setWalletVisible] = useState(false);

  const mentorMessage = MENTOR_MESSAGES[walletPhase] || MENTOR_MESSAGES.off;
  const { displayed, done } = useTypewriter(mentorMessage);

  useEffect(() => {
    if (done && !walletVisible) {
      const timer = setTimeout(() => setWalletVisible(true), 350);
      return () => clearTimeout(timer);
    }
  }, [done, walletVisible]);

  return (
    <main className="scenario-page scenario-page-fit">
      <section className="scenario-card scenario-card-fit">
        <div className="scenario-mentor-layout">
          <div className="mentor-row">
            <div className="mentor-portrait" aria-label="Andy, your mentor" role="img">
              <div className="mentor-portrait-glow" />
              <div className="mentor-portrait-ring">
                <img className="mentor-portrait-image" src={johnPortrait} alt="Andy, your mentor" />
              </div>
            </div>
            <div className="mentor-bubble" key={walletPhase}>
              <span className="mentor-bubble-name">John</span>
              <div className="mentor-bubble-text-wrap">
                <p className="mentor-bubble-text-ghost">{mentorMessage}</p>
                <p className="mentor-bubble-text">
                  {displayed}
                  {!done && <span className="typewriter-cursor" />}
                </p>
              </div>
            </div>
          </div>
          {walletVisible && (
            <HardwareWallet
              onComplete={onComplete}
              onPhaseChange={setWalletPhase}
            />
          )}
        </div>
      </section>
    </main>
  );
}

export default ScenarioBriefing;
