import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import andyPortrait from '@/components/Andy.png';

type Props = {
  onBack: () => void;
  onProceed: () => void;
};

const ANDY_MESSAGES = [
  "Hey there! I'm Andy, and I will teach you how to self-custody your Bitcoin.",
  "Learning to store your own Bitcoin takes practice. Everything here is simulated, so you can explore freely with zero risk.",
  "We'll practice the basics until you feel totally in control. Ready to start?",
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

function AndyIntro({ onBack, onProceed }: Props) {
  const [messageIndex, setMessageIndex] = useState(0);
  const currentMessage = ANDY_MESSAGES[messageIndex];
  const { displayed, done } = useTypewriter(currentMessage);
  const isFinalMessage = messageIndex === ANDY_MESSAGES.length - 1;

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
        <div className="character-portrait" aria-label="Andy, your academy mentor" role="img">
          <div className="character-portrait-glow" />
          <div className="character-portrait-ring">
            <img className="character-portrait-image" src={andyPortrait} alt="Andy, your academy mentor" />
          </div>
          <div className="character-portrait-badge">
            {/* <span className="character-portrait-dot" /> */}
            <span>John</span>
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
