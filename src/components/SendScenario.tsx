import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import andyPortrait from '@/components/Andy.webp';
import mariaPortrait from '@/components/Maria.png';

type SendScenarioProps = {
  completed: boolean;
  onBack: () => void;
  onComplete: () => void;
};

const HANDOFF_MESSAGES = [
  "Now that we've covered the basics of setting up a hardware wallet, I'd like to introduce you to a colleague of mine.",
  "She'll be the one to teach you all about the sending part — I'll let her take it from here.",
];

const MARIA_MESSAGES = [
  "Hi, I'm Maria! I work alongside Andy here at the academy, and I specialise in helping people move their Bitcoin safely.",
  "Now that your hardware wallet is set up and funded, the next step is learning how to send some of it — that's what I'll walk you through.",
  "Whenever you're ready, we'll practice sending your first bitcoin the safe way.",
];

type Mentor = 'andy' | 'maria';

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

export default function SendScenario({ onBack }: SendScenarioProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [activeMentor, setActiveMentor] = useState<Mentor>('andy');

  const messages = activeMentor === 'andy' ? HANDOFF_MESSAGES : MARIA_MESSAGES;
  const currentMessage = messages[messageIndex];
  const { displayed, done, skip } = useTypewriter(currentMessage);

  const isLastMessage = messageIndex === messages.length - 1;
  const canContinue = done;
  const portrait = activeMentor === 'andy' ? andyPortrait : mariaPortrait;
  const mentorName = activeMentor === 'andy' ? 'Andy' : 'Maria';

  const handleContinue = () => {
    if (!done) {
      skip();
      return;
    }

    if (activeMentor === 'andy' && messageIndex === HANDOFF_MESSAGES.length - 1) {
      setActiveMentor('maria');
      setMessageIndex(0);
      return;
    }

    if (isLastMessage) {
      // Intentionally inert for now: next step of Mission 4 will be wired here.
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
    <main className="scenario-page scenario-page-spotlight">
      <div className="scenario-mentor-layout spotlight">
        <div className="mentor-row">
          <div
            key={activeMentor}
            className="mentor-portrait mentor-portrait-enter"
            aria-label={`${mentorName}, your mentor`}
            role="img"
          >
            <div className="mentor-portrait-glow" />
            <div className="mentor-portrait-ring">
              <img className="mentor-portrait-image" src={portrait} alt={`${mentorName}, your mentor`} />
            </div>
            <div className="mentor-portrait-badge">{mentorName}</div>
          </div>
          <div
            className={`mentor-bubble ${canContinue ? 'is-ready' : ''}`}
            onClick={handleContinue}
          >
            <div className="mentor-bubble-content" key={`${activeMentor}-${messageIndex}`}>
              <span className="mentor-bubble-name">{mentorName}</span>
              <div className="mentor-bubble-text-wrap">
                <p className="mentor-bubble-text-ghost">{currentMessage}</p>
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

      <button className="character-back" type="button" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2.4} />
        <span>Back to roadmap</span>
      </button>
    </main>
  );
}
