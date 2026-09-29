import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import andyPortrait from '@/components/Andy.webp';

type Props = {
  onProceed: () => void;
};

const ANDY_MESSAGES = [
  "Hey there! I'm Andy, and I will teach you how to self-custody your Bitcoin. Learning to store your own Bitcoin takes practice.",
  "Everything here is simulated, so you can explore freely with zero risk. We'll practice the basics until you feel totally in control.",
  "Your learning path has five missions. Each one unlocks the next. Let's take a look at your roadmap.",
];

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
      setDisplayed(text.slice(0, indexRef.current));

      if (indexRef.current >= text.length) {
        setDone(true);
        clearInterval(timer);
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

function AndyIntro({ onProceed }: Props) {
  const [messageIndex, setMessageIndex] = useState(0);
  const currentMessage = ANDY_MESSAGES[messageIndex];
  const { displayed, done, skip } = useTypewriter(currentMessage);
  const isFinalMessage = messageIndex === ANDY_MESSAGES.length - 1;

  const handleContinue = () => {
    if (!done) {
      skip();
      return;
    }

    if (isFinalMessage) {
      onProceed();
      return;
    }

    setMessageIndex((current) => current + 1);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      e.preventDefault();
      handleContinue();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <main className="character-section">
      <div className="character-lesson">
        <div className="character-portrait" aria-label="Andy, your academy mentor" role="img">
          <div className="character-portrait-glow" />
          <div className="character-portrait-ring">
            <img className="character-portrait-image" src={andyPortrait} alt="Andy, your academy mentor" />
          </div>
          <div className="character-portrait-badge">
            <span>Andy</span>
          </div>
        </div>

        <div
          className={`character-dialog ${done ? 'is-ready' : ''}`}
          onClick={handleContinue}
        >
          <div className="character-message" aria-live="polite">
            <p>{displayed}</p>
            {!done && <span className="typewriter-cursor" />}
          </div>
          <button
            className={`bubble-next ${done ? 'ready' : ''}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleContinue();
            }}
            disabled={!done}
            aria-label="Continue"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* <div className="character-footer">
        <div className="character-footer-inner">
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
      </div> */}
    </main>
  );
}

export default AndyIntro;
