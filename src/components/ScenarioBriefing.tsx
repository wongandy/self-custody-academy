import { ArrowLeft, ArrowRight, CheckCircle2, CircleDollarSign, ShieldCheck } from 'lucide-react';

type ScenarioBriefingProps = {
  completed: boolean;
  isLoggedIn: boolean;
  onBack: () => void;
  onComplete: () => void;
};

function ScenarioBriefing({ completed, isLoggedIn, onBack, onComplete }: ScenarioBriefingProps) {
  return (
    <main className="scenario-page">
      <button className="character-back" type="button" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2.4} />
        <span>Back to roadmap</span>
      </button>

      <section className="scenario-card">
        <div className="scenario-card-topline">
          <span>Mission 01 · Briefing</span>
          <span><CircleDollarSign size={14} /> Simulation only</span>
        </div>
        <div className="scenario-briefing-grid">
          <div className="scenario-copy">
            <span className="roadmap-label">Your first mission</span>
            <h1>Set up your hardware wallet</h1>
            <p className="scenario-lede">
              Before bitcoin can be truly yours, you need a secure place to keep the keys. In this practice mission, you'll prepare Ben's hardware wallet and learn why each step matters.
            </p>
            <div className="scenario-goals">
              <div><ShieldCheck size={18} /><span>Understand what a hardware wallet protects</span></div>
              <div><CheckCircle2 size={18} /><span>Practice setting up a new device safely</span></div>
              <div><CircleDollarSign size={18} /><span>Complete everything with simulated bitcoin</span></div>
            </div>
            <button className="character-proceed scenario-action" type="button" onClick={onComplete}>
              <span>{completed ? 'Mission completed' : 'Complete placeholder mission'}</span>
              {completed ? <CheckCircle2 size={18} strokeWidth={2.5} /> : <ArrowRight size={18} strokeWidth={2.5} />}
            </button>
            {!isLoggedIn && !completed && (
              <p className="scenario-gate-note">
                <ShieldCheck size={13} strokeWidth={2.2} />
                After this mission, you'll create a free account to save your progress and unlock the rest.
              </p>
            )}
            <p className="scenario-note">The full interactive workbench will be added here next.</p>
          </div>
          <div className="scenario-character-stage">
            <div className="scenario-orbit scenario-orbit-one" />
            <div className="scenario-orbit scenario-orbit-two" />
            <div className="scenario-ben-face">B</div>
            <div className="scenario-character-tag"><span /> Ben · active learner</div>
            <div className="scenario-speech">
              <strong>John says:</strong>
              “Let's start with the keys. Once you understand those, everything else gets easier.”
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ScenarioBriefing;
