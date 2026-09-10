import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import johnPortrait from '@/components/John.png';

type Props = {
  onBack: () => void;
  onProceed: () => void;
};

const JOHN_MESSAGES = [
  "Hey there! I'm John, and I'll be your guide through the academy.",
  "Self-custody can feel intimidating, but you're in a safe sandbox. Everything here is simulated—zero real funds, zero risk.",
  "Test only",
  "We'll practice seed phrases, addresses, and transactions until it's second nature. Ready to dive in?",
];

function useTypewriter(text: string, speed = 10) {
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
      <div className="character-card">
        <div className="character-portrait" aria-label="John, your academy mentor" role="img">
          <div className="character-portrait-glow" />
          <div className="character-portrait-ring">
            <img className="character-portrait-image" src={johnPortrait} alt="John, your academy mentor" />
          </div>
          <div className="character-portrait-badge">
            <span className="character-portrait-dot" />
            <span>Your mentor</span>
          </div>
        </div>

        <div className="character-dialog">
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
