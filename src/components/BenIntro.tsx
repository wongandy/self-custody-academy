import { ArrowLeft, ArrowRight } from 'lucide-react';

type Props = {
  onBack: () => void;
  onBegin: () => void;
};

function BenIntro({ onBack, onBegin }: Props) {
  return (
    <main className="character-section">
      <button className="character-back" type="button" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2.4} />
        <span>Back</span>
      </button>

      <div className="character-card">
        <div className="character-portrait" aria-label="Ben, your character" role="img">
          <div className="character-portrait-glow" />
          <div className="character-portrait-ring" />
          <div className="character-portrait-initial">B</div>
          <div className="character-portrait-badge">
            <span className="character-portrait-dot" />
            <span>Your character</span>
          </div>
        </div>

        <h2 className="character-name">Ben</h2>
        <p className="character-role">Your Character</p>

        <div className="character-message">
          <p>
            Meet Ben. He's new to self-custody and ready to learn the ropes—from seed phrases
            to signing his first transaction.
          </p>
          <p>
            You'll guide Ben through each lesson, with John's help every step of the way.
            Practice makes progress, and Ben's here to learn alongside you.
          </p>
        </div>

        <button className="character-proceed" type="button" onClick={onBegin}>
          <span>Begin</span>
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    </main>
  );
}

export default BenIntro;
