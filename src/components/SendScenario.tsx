import { ArrowLeft, ArrowUpFromLine, Construction } from 'lucide-react';

type SendScenarioProps = {
  completed: boolean;
  onBack: () => void;
  onComplete: () => void;
};

export default function SendScenario({ completed, onBack }: SendScenarioProps) {
  return (
    <main className="scenario-page">
      <button className="character-back" type="button" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2.4} />
        <span>Back to roadmap</span>
      </button>

      <section className="scenario-card">
        <div className="scenario-card-topline">
          <span>Mission 05 · Sending BTC</span>
          <span><ArrowUpFromLine size={14} /> Simulation only</span>
        </div>
        <div className="scenario-wallet-layout">
          <div className="scenario-wallet-info">
            <span className="roadmap-label">Your fifth mission</span>
            <h1>Sending BTC</h1>
            <p className="scenario-lede">
              Sending bitcoin is where careful habits matter most. This mission will walk you through building, signing, and broadcasting a payment from your connected hardware wallet.
            </p>
            <div className="scenario-wallet-tips">
              <div className="scenario-wallet-tip">
                <ArrowUpFromLine size={16} />
                <span>Build the transaction in your wallet app, then review the details on your hardware wallet screen before signing.</span>
              </div>
              <div className="scenario-wallet-tip">
                <Construction size={16} />
                <span>The full sending walkthrough is being prepared. Check back soon to practice it step by step.</span>
              </div>
            </div>
            {completed && (
              <div className="scenario-wallet-status active">
                <span className="scenario-wallet-status-dot" />
                <span>Mission completed</span>
              </div>
            )}
          </div>

          <div className="tx-sim-panel">
            <div className="tx-sim-screen tx-sim-success-screen">
              <Construction size={36} strokeWidth={1.6} />
              <span className="tx-sim-success-title">Coming soon</span>
              <p className="tx-sim-success-body">
                The sending lesson isn't available yet. For now, explore the connecting mission and come back when this one is ready.
              </p>
              <button className="tx-sim-btn primary" type="button" onClick={onBack}>
                <span>Back to roadmap</span>
                <ArrowUpFromLine size={16} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
