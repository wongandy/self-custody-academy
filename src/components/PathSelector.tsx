import { ArrowRight, Clock3, KeyRound, LockKeyhole, WalletCards } from 'lucide-react';

type PathSelectorProps = {
  onSelectFundamentals: () => void;
};

function PathSelector({ onSelectFundamentals }: PathSelectorProps) {
  return (
    <main className="path-selector-page">
      <div className="path-selector-content">
        <div className="path-selector-heading">
          <span className="path-selector-kicker">Your learning journey</span>
          <h1>Choose your path</h1>
          <p>Start with the essential skills, or explore what comes next as your confidence grows.</p>
        </div>

        <div className="path-selector-options" aria-label="Learning paths">
          <button className="path-card path-card-fundamentals" type="button" onClick={onSelectFundamentals}>
            <div className="path-card-topline">
              <span className="path-card-number">01</span>
              <span className="path-card-status">Available now</span>
            </div>
            <div className="path-card-symbols" aria-hidden="true">
              <span className="path-card-symbol path-card-symbol-large"><LockKeyhole size={38} strokeWidth={1.8} /></span>
              <span className="path-card-symbol path-card-symbol-small"><WalletCards size={30} strokeWidth={1.8} /></span>
            </div>
            <h2>Fundamentals</h2>
            <p className="path-card-description">The essential building blocks of self-custody.</p>
            <p className="path-card-includes"><strong>Includes:</strong> hardware wallet setup, withdrawals, recovery, and more.</p>
            <span className="path-card-action">Start learning <ArrowRight size={16} strokeWidth={2.3} /></span>
          </button>

          <div className="path-card path-card-deeper" aria-disabled="true">
            <div className="path-card-topline">
              <span className="path-card-number">02</span>
              <span className="path-card-status">Coming soon</span>
            </div>
            <div className="path-card-symbols" aria-hidden="true">
              <span className="path-card-symbol path-card-symbol-large"><KeyRound size={38} strokeWidth={1.8} /></span>
              <span className="path-card-symbol path-card-symbol-small"><Clock3 size={30} strokeWidth={1.8} /></span>
            </div>
            <h2>Going Deeper</h2>
            <p className="path-card-description">Advanced security for protecting larger amounts.</p>
            <p className="path-card-includes"><strong>Coming soon:</strong> passphrases, multisig setups, watch-only wallets, and more.</p>
            <span className="path-card-action">In preparation</span>
          </div>
        </div>
      </div>
    </main>
  );
}

export default PathSelector;
