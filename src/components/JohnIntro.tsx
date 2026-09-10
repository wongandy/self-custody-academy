import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type Props = {
  onBack: () => void;
  onProceed: () => void;
};

const JOHN_MESSAGES = [
  "Hey there! I'm John, and I'll be your guide through the academy.",
  "Taking custody of your own Bitcoin can feel intimidating at first, but here's the good news: you're in a safe sandbox. Everything we do here is simulated—no real funds, no stress, and zero risk of making an expensive mistake.",
  "Together, we'll practice generating seed phrases, verifying addresses, and signing transactions until it feels like second nature. Ready to take your first step?",
];

function useTypewriter(text: string, speed = 5) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    indexRef.current = 0;

    const timer = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));

      if (indexRef.current >= text.length) {
        setDone(true);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayed, done };
}

function JohnIntro({ onBack, onProceed }: Props) {
  const [messageIndex, setMessageIndex] = useState(0);
  const currentMessage = JOHN_MESSAGES[messageIndex];
  const { displayed, done } = useTypewriter(currentMessage);
  const isFinalMessage = messageIndex === JOHN_MESSAGES.length - 1;

  const handleContinue = () => {
    if (!done) return;

    if (isFinalMessage) {
      onProceed();
      return;
    }

    setMessageIndex((current) => current + 1);
  };

  return (
    <main className="character-section">
      <button className="character-back" type="button" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2.4} />
        <span>Back</span>
      </button>

      <div className="character-card">
        <div className="character-portrait" aria-label="John, your academy mentor" role="img">
          <div className="character-portrait-glow" />
          <div className="character-portrait-ring" />
          <div className="character-portrait-initial">J</div>
          <div className="character-portrait-badge">
            <span className="character-portrait-dot" />
            <span>Your mentor</span>
          </div>
        </div>

        <h2 className="character-name">John</h2>
        <p className="character-role">Self-Custody Guide</p>

        <div className="character-dialog">
          <span className="character-dialog-label">John says</span>
          <div className="character-message" aria-live="polite">
            <p>{displayed}</p>
            {!done && <span className="typewriter-cursor" />}
          </div>
        </div>

        <div className="character-actions">
          <button
            className="character-proceed"
            type="button"
            onClick={handleContinue}
            disabled={!done}
          >
            <span>Continue</span>
            <ArrowRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </main>
  );
}

export default JohnIntro;
