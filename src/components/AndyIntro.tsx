import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import andyPortrait from '@/components/Andy.webp';
import { useI18n } from '@/lib/i18n';
import { useTypewriter } from '@/lib/useTypewriter';

type Props = {
  onProceed: () => void;
  /** What Andy says; defaults to his welcome (`andyIntro.lines`). */
  lines?: readonly string[];
};

function AndyIntro({ onProceed, lines }: Props) {
  const { t } = useI18n();
  const ANDY_MESSAGES = lines ?? t.andyIntro.lines;
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
        <div className="character-portrait" aria-label={t.common.academyMentorAria} role="img">
          <div className="character-portrait-glow" />
          <div className="character-portrait-ring">
            <img className="character-portrait-image" src={andyPortrait} alt={t.common.academyMentorAria} />
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
            aria-label={t.common.continue}
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
