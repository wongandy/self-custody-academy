import { ArrowLeft, ArrowRight } from 'lucide-react';

type Props = {
  onBack: () => void;
  onProceed: () => void;
};

function JohnIntro({ onBack, onProceed }: Props) {
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

        <div className="character-message">
          <p>Hey there! I'm John, and I'll be your guide through the academy.</p>
          <p>
            Taking custody of your own Bitcoin can feel intimidating at first, but here's the
            good news: you're in a safe sandbox. Everything we do here is simulated—no real
            funds, no stress, and zero risk of making an expensive mistake.
          </p>
          <p>
            Together, we'll practice generating seed phrases, verifying addresses, and
            signing transactions until it feels like second nature. Ready to take your first
            step?
          </p>
        </div>

        <button className="character-proceed" type="button" onClick={onProceed}>
          <span>Meet your character</span>
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    </main>
  );
}

export default JohnIntro;
