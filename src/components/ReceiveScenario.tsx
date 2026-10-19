import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  Download,
  QrCode,
  User,
} from 'lucide-react';

type ReceiveScenarioProps = {
  completed: boolean;
  onBack: () => void;
  onComplete: () => void;
};

type Phase = 'intro' | 'generate' | 'share' | 'waiting' | 'received' | 'verify' | 'done';

const SIM_ADDRESS = 'bc1qcharlie...8mk2';

export default function ReceiveScenario({ completed, onBack, onComplete }: ReceiveScenarioProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setVerified(true);
    }, 1800);
  };

  return (
    <main className="scenario-page">
      <button className="character-back" type="button" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2.4} />
        <span>Back to roadmap</span>
      </button>

      <section className="scenario-card">
        <div className="scenario-card-topline">
          <span>Mission 05 · Receiving BTC</span>
          <span><CircleDollarSign size={14} /> Simulation only</span>
        </div>
        <div className="scenario-wallet-layout">
          <div className="scenario-wallet-info">
            <span className="roadmap-label">Your fifth mission</span>
            <h1>Receiving BTC</h1>
            <p className="scenario-lede">
              Receiving bitcoin is the other half of self-custody. Practice generating a receive address, sharing it, and verifying the incoming payment.
            </p>
            <div className="scenario-wallet-tips">
              <div className="scenario-wallet-tip">
                <QrCode size={16} />
                <span>Generate a fresh receive address on your hardware wallet. Each address is unique and tied to your wallet.</span>
              </div>
              <div className="scenario-wallet-tip">
                <Copy size={16} />
                <span>Share the address or QR code with the sender. They'll use it to direct the payment to your wallet.</span>
              </div>
              <div className="scenario-wallet-tip">
                <Check size={16} />
                <span>After the payment arrives, verify the amount and sender. Always generate a new address for each new payment.</span>
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
                  <Download size={22} strokeWidth={1.6} />
                  <span>Receive Bitcoin</span>
                </div>
                <p className="tx-sim-balance">Wallet balance: 0.0400 BTC</p>
                <p className="tx-sim-body">Charlie wants to send you 0.005 BTC. Let's generate an address and receive it.</p>
                <button className="tx-sim-btn primary" type="button" onClick={() => setPhase('generate')}>
                  <span>Generate address</span>
                  <ArrowRight size={16} strokeWidth={2.4} />
                </button>
              </div>
            )}

            {phase === 'generate' && (
              <div className="tx-sim-screen">
                <div className="tx-sim-header">
                  <QrCode size={20} strokeWidth={1.6} />
                  <span>New receive address</span>
                </div>
                <div className="tx-qr-placeholder">
                  <QrCode size={80} strokeWidth={1.2} />
                  <span className="tx-qr-label">QR code</span>
                </div>
                <div className="tx-addr-display">
                  <span className="tx-addr-full">{SIM_ADDRESS}</span>
                  <button
                    className={copied ? 'tx-copy-btn copied' : 'tx-copy-btn'}
                    type="button"
                    onClick={handleCopy}
                  >
                    {copied ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} strokeWidth={2} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="tx-sim-body">Share this address with Charlie so he can send the payment.</p>
                <button className="tx-sim-btn primary" type="button" onClick={() => setPhase('share')}>
                  <span>Share with Charlie</span>
                  <ArrowRight size={16} strokeWidth={2.4} />
                </button>
              </div>
            )}

            {phase === 'share' && (
              <div className="tx-sim-screen">
                <div className="tx-sim-header">
                  <User size={20} strokeWidth={1.6} />
                  <span>Waiting for Charlie</span>
                </div>
                <p className="tx-sim-body">
                  Address shared with Charlie. He's preparing to send 0.005 BTC to your address.
                </p>
                <div className="tx-sim-pending-row">
                  <div className="tx-spinner sm" />
                  <span>Waiting for payment...</span>
                </div>
                <button
                  className="tx-sim-btn primary"
                  type="button"
                  onClick={() => {
                    setPhase('waiting');
                    setTimeout(() => setPhase('received'), 2500);
                  }}
                >
                  <span>Simulate payment arrival</span>
                  <ArrowRight size={16} strokeWidth={2.4} />
                </button>
              </div>
            )}

            {phase === 'waiting' && (
              <div className="tx-sim-screen tx-sim-pending">
                <div className="tx-spinner" />
                <span className="tx-sim-pending-text">Receiving payment...</span>
                <span className="tx-sim-pending-sub">Charlie is broadcasting the transaction</span>
              </div>
            )}

            {phase === 'received' && (
              <div className="tx-sim-screen tx-sim-success-screen">
                <CheckCircle2 size={36} strokeWidth={1.6} />
                <span className="tx-sim-success-title">Payment received!</span>
                <div className="tx-sim-receipt">
                  <div className="tx-confirm-row">
                    <span>From</span>
                    <strong>Charlie</strong>
                  </div>
                  <div className="tx-confirm-row">
                    <span>Amount</span>
                    <strong>0.00500 BTC</strong>
                  </div>
                  <div className="tx-confirm-row">
                    <span>Status</span>
                    <strong className="tx-confirmed">Unconfirmed</strong>
                  </div>
                </div>
                <p className="tx-sim-body">Verify the payment details before trusting it.</p>
                {!verified && (
                  <button className="tx-sim-btn primary" type="button" onClick={handleVerify} disabled={verifying}>
                    {verifying ? <span>Verifying...</span> : <span>Verify payment</span>}
                    <Check size={16} strokeWidth={2.4} />
                  </button>
                )}
                {verified && (
                  <>
                    <div className="tx-addr-verified">
                      <CheckCircle2 size={16} />
                      <span>Payment confirmed on the network</span>
                    </div>
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
                  </>
                )}
              </div>
            )}

            {phase === 'done' && (
              <div className="tx-sim-screen tx-sim-success-screen">
                <CheckCircle2 size={36} strokeWidth={1.6} />
                <span className="tx-sim-success-title">Mission complete!</span>
                <p className="tx-sim-success-body">
                  You've successfully received bitcoin from Charlie — generated an address, shared it, and verified the incoming payment.
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
