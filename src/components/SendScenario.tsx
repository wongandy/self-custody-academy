import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Send,
  User,
} from 'lucide-react';

type SendScenarioProps = {
  completed: boolean;
  onBack: () => void;
  onComplete: () => void;
};

type Phase = 'intro' | 'compose' | 'verify-addr' | 'confirm' | 'sending' | 'sent' | 'done';

export default function SendScenario({ completed, onBack, onComplete }: SendScenarioProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [amount, setAmount] = useState('0.01');
  const [addrVerified, setAddrVerified] = useState(false);
  const [addrChecking, setAddrChecking] = useState(false);

  const totalBTC = parseFloat(amount) || 0;
  const feeBTC = 0.00005;

  const handleVerifyAddr = () => {
    setAddrChecking(true);
    setTimeout(() => {
      setAddrChecking(false);
      setAddrVerified(true);
    }, 1500);
  };

  return (
    <main className="scenario-page">
      <button className="character-back" type="button" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2.4} />
        <span>Back to roadmap</span>
      </button>

      <section className="scenario-card">
        <div className="scenario-card-topline">
          <span>Mission 04 · Sending BTC</span>
          <span><CircleDollarSign size={14} /> Simulation only</span>
        </div>
        <div className="scenario-wallet-layout">
          <div className="scenario-wallet-info">
            <span className="roadmap-label">Your fourth mission</span>
            <h1>Sending BTC</h1>
            <p className="scenario-lede">
              Sending bitcoin is irreversible — so it pays to be careful. Practice checking an address, confirming the details, and signing a payment on your hardware wallet.
            </p>
            <div className="scenario-wallet-tips">
              <div className="scenario-wallet-tip">
                <User size={16} />
                <span>Alice is a friend who wants to be paid in bitcoin. She shares her address with you.</span>
              </div>
              <div className="scenario-wallet-tip">
                <Check size={16} />
                <span>Always verify the recipient address character-by-character before sending. One wrong character sends bitcoin to the wrong person.</span>
              </div>
              <div className="scenario-wallet-tip">
                <Send size={16} />
                <span>You'll confirm the amount, verify the address, and sign the transaction — just like a real wallet would require.</span>
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
                  <Send size={22} strokeWidth={1.6} />
                  <span>Send Bitcoin</span>
                </div>
                <p className="tx-sim-balance">Wallet balance: 0.0500 BTC</p>
                <p className="tx-sim-body">Alice asks you to send 0.01 BTC for dinner. Let's practice doing it safely.</p>
                <button className="tx-sim-btn primary" type="button" onClick={() => setPhase('compose')}>
                  <span>Start sending</span>
                  <ArrowRight size={16} strokeWidth={2.4} />
                </button>
              </div>
            )}

            {phase === 'compose' && (
              <div className="tx-sim-screen">
                <div className="tx-sim-header">
                  <Send size={20} strokeWidth={1.6} />
                  <span>New transaction</span>
                </div>
                <div className="tx-sim-field">
                  <label>Recipient address</label>
                  <input
                    type="text"
                    readOnly
                    value="bc1qalice...7xq3 (Alice)"
                    className="tx-sim-addr"
                  />
                </div>
                <div className="tx-sim-field">
                  <label>Amount (BTC)</label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.01"
                  />
                </div>
                <div className="tx-sim-summary">
                  <span>Amount</span>
                  <strong>{totalBTC.toFixed(5)} BTC</strong>
                  <span>Network fee</span>
                  <strong>{feeBTC.toFixed(5)} BTC</strong>
                  <span>Total</span>
                  <strong>{(totalBTC + feeBTC).toFixed(5)} BTC</strong>
                </div>
                <button className="tx-sim-btn primary" type="button" onClick={() => setPhase('verify-addr')}>
                  <span>Verify address</span>
                  <ArrowRight size={16} strokeWidth={2.4} />
                </button>
                <button className="tx-sim-btn ghost" type="button" onClick={() => setPhase('intro')}>
                  Back
                </button>
              </div>
            )}

            {phase === 'verify-addr' && (
              <div className="tx-sim-screen">
                <div className="tx-sim-header">
                  <Check size={20} strokeWidth={2} />
                  <span>Verify address</span>
                </div>
                <p className="tx-sim-body">
                  Before sending, confirm the first and last few characters of Alice's address match what she gave you.
                </p>
                <div className="tx-addr-verify">
                  <div className="tx-addr-chunk">
                    <span className="tx-addr-label">First 6</span>
                    <span className="tx-addr-value">bc1qal</span>
                    <Check size={14} className="tx-addr-check" />
                  </div>
                  <div className="tx-addr-chunk">
                    <span className="tx-addr-label">Last 4</span>
                    <span className="tx-addr-value">7xq3</span>
                    <Check size={14} className="tx-addr-check" />
                  </div>
                </div>
                {addrChecking && (
                  <div className="tx-sim-pending-row">
                    <div className="tx-spinner sm" />
                    <span>Checking address on device...</span>
                  </div>
                )}
                {addrVerified && !addrChecking && (
                  <div className="tx-addr-verified">
                    <CheckCircle2 size={16} />
                    <span>Address verified on hardware wallet</span>
                  </div>
                )}
                {!addrVerified && !addrChecking && (
                  <button className="tx-sim-btn primary" type="button" onClick={handleVerifyAddr}>
                    <span>Verify on device</span>
                    <Check size={16} strokeWidth={2.4} />
                  </button>
                )}
                {addrVerified && (
                  <button className="tx-sim-btn primary" type="button" onClick={() => setPhase('confirm')}>
                    <span>Continue</span>
                    <ArrowRight size={16} strokeWidth={2.4} />
                  </button>
                )}
                <button className="tx-sim-btn ghost" type="button" onClick={() => setPhase('compose')}>
                  Back
                </button>
              </div>
            )}

            {phase === 'confirm' && (
              <div className="tx-sim-screen">
                <div className="tx-sim-header">
                  <Check size={20} strokeWidth={2} />
                  <span>Confirm & sign</span>
                </div>
                <div className="tx-sim-confirm-box">
                  <div className="tx-confirm-row">
                    <span>To</span>
                    <strong className="tx-confirm-addr">bc1qalice...7xq3</strong>
                  </div>
                  <div className="tx-confirm-row">
                    <span>Amount</span>
                    <strong>{totalBTC.toFixed(5)} BTC</strong>
                  </div>
                  <div className="tx-confirm-row">
                    <span>Fee</span>
                    <strong>{feeBTC.toFixed(5)} BTC</strong>
                  </div>
                  <div className="tx-confirm-row total">
                    <span>Total</span>
                    <strong>{(totalBTC + feeBTC).toFixed(5)} BTC</strong>
                  </div>
                </div>
                <p className="tx-sim-warn">
                  Press confirm to sign with your hardware wallet. This transaction is irreversible.
                </p>
                <button
                  className="tx-sim-btn primary"
                  type="button"
                  onClick={() => {
                    setPhase('sending');
                    setTimeout(() => setPhase('sent'), 2200);
                  }}
                >
                  <span>Sign & send</span>
                  <Check size={16} strokeWidth={2.6} />
                </button>
                <button className="tx-sim-btn ghost" type="button" onClick={() => setPhase('verify-addr')}>
                  Back
                </button>
              </div>
            )}

            {phase === 'sending' && (
              <div className="tx-sim-screen tx-sim-pending">
                <div className="tx-spinner" />
                <span className="tx-sim-pending-text">Signing & broadcasting...</span>
                <span className="tx-sim-pending-sub">Approve on hardware wallet</span>
              </div>
            )}

            {phase === 'sent' && (
              <div className="tx-sim-screen tx-sim-success-screen">
                <CheckCircle2 size={36} strokeWidth={1.6} />
                <span className="tx-sim-success-title">Payment sent!</span>
                <div className="tx-sim-receipt">
                  <div className="tx-confirm-row">
                    <span>Sent to Alice</span>
                    <strong>{totalBTC.toFixed(5)} BTC</strong>
                  </div>
                  <div className="tx-confirm-row">
                    <span>Fee</span>
                    <strong>{feeBTC.toFixed(5)} BTC</strong>
                  </div>
                  <div className="tx-confirm-row">
                    <span>Status</span>
                    <strong className="tx-confirmed">Broadcast</strong>
                  </div>
                </div>
                <p className="tx-sim-success-body">
                  You verified the address, confirmed the amount, and signed the transaction. That's the safe way to send bitcoin.
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
                  You've successfully sent bitcoin to Alice — verifying the address, confirming details, and signing the transaction.
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
