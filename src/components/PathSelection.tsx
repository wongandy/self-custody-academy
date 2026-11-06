import { ChevronRight, Clock3, GitBranch, KeyRound, LockKeyhole, WalletCards } from 'lucide-react';
import { useState } from 'react';

type PathSelectionProps = {
  onSelectFundamentals: () => void;
};

type PathId = 'fundamentals' | 'deeper';

function PathSelection({ onSelectFundamentals }: PathSelectionProps) {
  const [selectedPath, setSelectedPath] = useState<PathId>('fundamentals');
  const [showComingSoon, setShowComingSoon] = useState(false);

  return (
    <main className="path-selection-page">
      <section className="path-selection-shell" aria-labelledby="path-selection-title">
        <div className="path-selection-heading">
          <span className="path-selection-kicker">Your learning journey</span>
          <h1 id="path-selection-title">Choose your path</h1>
          <p>Start with the essential skills, or explore what comes next as your confidence grows.</p>
        </div>

        <div className="path-selection-options path-selection-desktop-options">
          <button className="path-option-card fundamentals" type="button" onClick={onSelectFundamentals}>
            <div className="path-option-topline">
              <span className="path-option-number">01</span>
              <span className="path-option-status">Available now</span>
            </div>

            <div className="path-option-visual fundamentals-visual" aria-hidden="true">
              <div className="path-option-icon-primary">
                <LockKeyhole size={52} strokeWidth={1.7} />
              </div>
              <div className="path-option-icon-secondary">
                <WalletCards size={42} strokeWidth={1.7} />
              </div>
            </div>

            <div className="path-option-copy">
              <h2>Fundamentals</h2>
              <p>The essential building blocks of self-custody.</p>
              <span className="path-option-includes">
                <strong>Includes:</strong> hardware wallet setup, withdrawals, recovery, and more.
              </span>
            </div>

            <span className="path-option-action" aria-hidden="true">
              Start learning
              <ChevronRight size={17} strokeWidth={2.5} />
            </span>
          </button>

          <button
            className="path-option-card deeper"
            type="button"
            onClick={() => {
              setSelectedPath('deeper');
              setShowComingSoon(true);
            }}
            aria-describedby="going-deeper-status"
          >
            <div className="path-option-topline">
              <span className="path-option-number">02</span>
              <span className="path-option-status">Coming soon</span>
            </div>

            <div className="path-option-visual deeper-visual" aria-hidden="true">
              <div className="path-option-icon-primary">
                <KeyRound size={50} strokeWidth={1.7} />
              </div>
              <div className="path-option-icon-secondary">
                <GitBranch size={43} strokeWidth={1.7} />
              </div>
            </div>

            <div className="path-option-copy">
              <h2>Going Deeper</h2>
              <p>Advanced security for protecting larger amounts.</p>
              <span className="path-option-includes">
                <strong>Coming soon:</strong> passphrases, multisig setups, watch-only wallets, and more.
              </span>
            </div>

            <span className="path-option-action" aria-hidden="true">
              <Clock3 size={16} strokeWidth={2.3} />
              In preparation
            </span>
          </button>
        </div>

        <div className="path-selection-mobile-options" role="group" aria-label="Learning paths">
          <button
            className={`path-mobile-option fundamentals ${selectedPath === 'fundamentals' ? 'selected' : ''}`}
            type="button"
            onClick={() => setSelectedPath('fundamentals')}
            aria-pressed={selectedPath === 'fundamentals'}
          >
            <span className="path-mobile-option-icon" aria-hidden="true"><LockKeyhole size={24} strokeWidth={1.8} /></span>
            <span className="path-mobile-option-name">Fundamentals</span>
            <span className="path-mobile-option-status">Available</span>
          </button>
          <button
            className={`path-mobile-option deeper ${selectedPath === 'deeper' ? 'selected' : ''}`}
            type="button"
            onClick={() => {
              setSelectedPath('deeper');
              setShowComingSoon(true);
            }}
            aria-pressed={selectedPath === 'deeper'}
          >
            <span className="path-mobile-option-icon" aria-hidden="true"><KeyRound size={24} strokeWidth={1.8} /></span>
            <span className="path-mobile-option-name">Going Deeper</span>
            <span className="path-mobile-option-status">Coming soon</span>
          </button>
        </div>

        <div className="path-selection-mobile-detail" aria-live="polite">
          {selectedPath === 'fundamentals' ? (
            <>
              <p>The essential building blocks of self-custody.</p>
              <button className="path-selection-mobile-action" type="button" onClick={onSelectFundamentals}>
                Start Fundamentals
                <ChevronRight size={17} strokeWidth={2.5} />
              </button>
            </>
          ) : (
            <p>Going Deeper is still being prepared. Start with Fundamentals to build your foundation.</p>
          )}
        </div>

        <p className={`path-selection-status ${showComingSoon ? 'visible' : ''}`} id="going-deeper-status" aria-live="polite">
          {showComingSoon ? 'Going Deeper is still being prepared. Start with Fundamentals to build your foundation.' : ''}
        </p>
      </section>
    </main>
  );
}

export default PathSelection;
