import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CircleDollarSign,
  WalletCards,
} from 'lucide-react';

type WithdrawScenarioProps = {
  completed: boolean;
  onBack: () => void;
  onComplete: () => void;
};

type Phase = 'intro' | 'exchange' | 'confirm' | 'sending' | 'received' | 'done';

export default function WithdrawScenario({ completed, onBack, onComplete }: WithdrawScenarioProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [amount, setAmount] = useState('0.05');
  const [fee, setFee] = useState('regular');

  const totalBTC = parseFloat(amount) || 0;
  const feeBTC = fee === 'fast' ? 0.00012 : fee === 'regular' ? 0.00006 : 0.00002;

  const handleConfirm = () => {
    setPhase('sending');
    setTimeout(() => setPhase('received'), 2200);
  };

  return (
    <main className="scenario-page">
      <button className="character-back" type="button" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2.4} />
        <span>Back to roadmap</span>
      </button>

      <section className="scenario-card">
        <div className="scenario-card-topline">
          <span>Mission 02 · Withdraw from Exchange</span>
          <span><CircleDollarSign size={14} /> Simulation only</span>
        </div>
        <div className="scenario-wallet-layout">
          <div className="scenario-wallet-info">
            <span className="roadmap-label">Your second mission</span>
            <h1>Withdraw BTC from an exchange</h1>
            <p className="scenario-lede">
              Bitcoin on an exchange isn't truly yours until you withdraw it to a wallet you control. Practice moving simulated bitcoin from an exchange to your hardware wallet.
            </p>
            <div className="scenario-wallet-tips">
              <div className="scenario-wallet-tip">
                <Building2 size={16} />
                <span>The exchange holds your bitcoin in custody — but "not your keys, not your coins." Withdraw to your own wallet to take real ownership.</span>
              </div>
              <div className="scenario-wallet-tip">
                <WalletCards size={16} />
                <span>You'll paste a receive address from your hardware wallet into the exchange withdrawal form.</span>
              </div>
              <div className="scenario-wallet-tip">
                <CheckCircle2 size={16} />
                <span>Choose a fee level and confirm the transaction. Higher fees mean faster confirmation on the network.</span>
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
            {phase === 'intro' && (
              <div className="tx-sim-screen">
                <div className="tx-sim-header">
                  <Building2 size={24} strokeWidth={1.6} />
                  <span>SimExchange</span>
                </div>
                <p className="tx-sim-balance">Balance: 0.0500 BTC</p>
                <button className="tx-sim-btn primary" type="button" onClick={() => setPhase('exchange')}>
                  <span>Withdraw to wallet</span>
                  <ArrowRight size={16} strokeWidth={2.4} />
                </button>
              </div>
            )}

            {phase === 'exchange' && (
              <div className="tx-sim-screen">
                <div className="tx-sim-header">
                  <Building2 size={20} strokeWidth={1.6} />
                  <span>Withdraw Bitcoin</span>
                </div>
                <div className="tx-sim-field">
                  <label>Amount (BTC)</label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.05"
                  />
                </div>
                <div className="tx-sim-field">
                  <label>Receive address</label>
                  <input
                    type="text"
                    readOnly
                    value="bc1qxy2k...4hwl (your wallet)"
                    className="tx-sim-addr"
                  />
                </div>
                <div className="tx-sim-field">
                  <label>Network fee</label>
                  <div className="tx-sim-fees">
                    <button
                      className={fee === 'slow' ? 'tx-fee-btn active' : 'tx-fee-btn'}
                      type="button"
                      onClick={() => setFee('slow')}
                    >
                      <span>Slow</span>
                      <small>0.00002 BTC</small>
                    </button>
                    <button
                      className={fee === 'regular' ? 'tx-fee-btn active' : 'tx-fee-btn'}
                      type="button"
                      onClick={() => setFee('regular')}
                    >
                      <span>Regular</span>
                      <small>0.00006 BTC</small>
                    </button>
                    <button
                      className={fee === 'fast' ? 'tx-fee-btn active' : 'tx-fee-btn'}
                      type="button"
                      onClick={() => setFee('fast')}
                    >
                      <span>Fast</span>
                      <small>0.00012 BTC</small>
                    </button>
                  </div>
                </div>
                <div className="tx-sim-summary">
                  <span>You send</span>
                  <strong>{totalBTC.toFixed(5)} BTC</strong>
                  <span>Fee</span>
                  <strong>{feeBTC.toFixed(5)} BTC</strong>
                  <span>Total</span>
                  <strong>{(totalBTC + feeBTC).toFixed(5)} BTC</strong>
                </div>
                <button className="tx-sim-btn primary" type="button" onClick={() => setPhase('confirm')}>
                  <span>Review withdrawal</span>
                  <ArrowRight size={16} strokeWidth={2.4} />
                </button>
                <button className="tx-sim-btn ghost" type="button" onClick={() => setPhase('intro')}>
                  Back
                </button>
              </div>
            )}

            {phase === 'confirm' && (
              <div className="tx-sim-screen">
                <div className="tx-sim-header">
                  <Check size={20} strokeWidth={2} />
                  <span>Confirm withdrawal</span>
                </div>
                <div className="tx-sim-confirm-box">
                  <div className="tx-confirm-row">
                    <span>Amount</span>
                    <strong>{totalBTC.toFixed(5)} BTC</strong>
                  </div>
                  <div className="tx-confirm-row">
                    <span>Fee</span>
                    <strong>{feeBTC.toFixed(5)} BTC</strong>
                  </div>
                  <div className="tx-confirm-row">
                    <span>To</span>
                    <strong className="tx-confirm-addr">bc1qxy2k...4hwl</strong>
                  </div>
                  <div className="tx-confirm-row total">
                    <span>Total</span>
                    <strong>{(totalBTC + feeBTC).toFixed(5)} BTC</strong>
                  </div>
                </div>
                <p className="tx-sim-warn">
                  Double-check the address. Bitcoin transactions are irreversible.
                </p>
                <button className="tx-sim-btn primary" type="button" onClick={handleConfirm}>
                  <span>Confirm & send</span>
                  <ArrowRight size={16} strokeWidth={2.4} />
                </button>
                <button className="tx-sim-btn ghost" type="button" onClick={() => setPhase('exchange')}>
                  Back
                </button>
              </div>
            )}

            {phase === 'sending' && (
              <div className="tx-sim-screen tx-sim-pending">
                <div className="tx-spinner" />
                <span className="tx-sim-pending-text">Broadcasting transaction...</span>
                <span className="tx-sim-pending-sub">Waiting for network confirmation</span>
              </div>
            )}

            {phase === 'received' && (
              <div className="tx-sim-screen tx-sim-success-screen">
                <CheckCircle2 size={36} strokeWidth={1.6} />
                <span className="tx-sim-success-title">Transaction confirmed!</span>
                <div className="tx-sim-receipt">
                  <div className="tx-confirm-row">
                    <span>Received</span>
                    <strong>{totalBTC.toFixed(5)} BTC</strong>
                  </div>
                  <div className="tx-confirm-row">
                    <span>Fee paid</span>
                    <strong>{feeBTC.toFixed(5)} BTC</strong>
                  </div>
                  <div className="tx-confirm-row">
                    <span>Status</span>
                    <strong className="tx-confirmed">Confirmed</strong>
                  </div>
                </div>
                <p className="tx-sim-success-body">
                  Your bitcoin is now in your own wallet. You hold the keys — no exchange can freeze or lose it.
                </p>
                <button
                  className="tx-sim-btn primary"
                  type="button"
                  onClick={() => {
                    onComplete();
                    setPhase('done');
                  }}
                >
                  <span>Complete mission</span>
                  <Check size={16} strokeWidth={2.6} />
                </button>
              </div>
            )}

            {phase === 'done' && (
              <div className="tx-sim-screen tx-sim-success-screen">
                <CheckCircle2 size={36} strokeWidth={1.6} />
                <span className="tx-sim-success-title">Mission complete!</span>
                <p className="tx-sim-success-body">
                  You've successfully withdrawn bitcoin from an exchange to your own wallet. This is a key step in self-custody.
                </p>
                <button className="tx-sim-btn primary" type="button" onClick={onBack}>
                  <span>Back to roadmap</span>
                  <ArrowRight size={16} strokeWidth={2.4} />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
