import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Building2, Copy, Check } from 'lucide-react';
import HardwareWallet, { type WalletPhase } from '@/components/HardwareWallet';
import andyPortrait from '@/components/Andy.png';

type WithdrawScenarioProps = {
  completed: boolean;
  onBack: () => void;
  onComplete: () => void;
};

const RECEIVE_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

const INTRO_MESSAGES = [
  "It's time to withdraw your Bitcoin from the exchange to your hardware wallet.",
  "First, let's get a receive address from your wallet. Click the switch below to open it.",
];

const MENTOR_MESSAGES: Record<string, string> = {
  'panel-exchange': 'Paste your receive address into the exchange withdrawal form, then press Continue.',
  'panel-wallet': 'Power on your wallet, then select Receive Bitcoin to get your address.',
  'wallet-off': 'Power on your wallet by clicking the power button.',
  'wallet-booting': 'The device is booting up. Hang tight for a moment.',
  'wallet-menu': "Select 'Receive Bitcoin' to get your receive address.",
  'wallet-receive': 'There is your receive address. Copy it, switch back to the exchange, and paste it into the withdrawal form.',
  'wallet-send-blocked': "Sending directly from the wallet isn't part of this mission. To withdraw from an exchange, you need to give the exchange your receive address first — let's do that instead.",
};

function useTypewriter(text: string, speed = 10) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    indexRef.current = 0;

    if (!text) {
      setDone(true);
      return;
    }

    const timer = setInterval(() => {
      indexRef.current += 1;
      if (indexRef.current >= text.length) {
        setDisplayed(text);
        setDone(true);
        clearInterval(timer);
      } else {
        setDisplayed(text.slice(0, indexRef.current));
      }
    }, speed);

    timerRef.current = timer;
    return () => clearInterval(timer);
  }, [text, speed]);

  const skip = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayed(text);
    setDone(true);
  }, [text]);

  return { displayed, done, skip };
}

export default function WithdrawScenario({ onComplete }: WithdrawScenarioProps) {
  const [activePanel, setActivePanel] = useState<'exchange' | 'wallet'>('wallet');
  const [introStep, setIntroStep] = useState(0);
  const [introDone, setIntroDone] = useState(false);
  const [walletPhase, setWalletPhase] = useState<WalletPhase>('off');
  const [menuSelection, setMenuSelection] = useState<'create-intro' | 'recover-intro' | 'receive-address' | 'send-blocked'>('create-intro');
  const [sendAddress, setSendAddress] = useState('');
  const [amount, setAmount] = useState('0.05');
  const [copied, setCopied] = useState(false);
  const [hasRetrievedAddress, setHasRetrievedAddress] = useState(false);
  const [showSendBlockedMsg, setShowSendBlockedMsg] = useState(false);

  const isInIntro = !introDone;
  const currentIntroMessage = INTRO_MESSAGES[introStep];

  const walletStateKey = activePanel === 'wallet'
    ? walletPhase === 'menu'
      ? `wallet-menu-${menuSelection}`
      : `wallet-${walletPhase}`
    : `panel-${activePanel}`;

  const mentorMessage = isInIntro
    ? currentIntroMessage
    : showSendBlockedMsg
      ? MENTOR_MESSAGES['wallet-send-blocked']
      : MENTOR_MESSAGES[walletStateKey] || MENTOR_MESSAGES['panel-exchange'];

  const { displayed, done, skip } = useTypewriter(mentorMessage);

  useEffect(() => {
    if (walletPhase === 'receive-address') {
      setHasRetrievedAddress(true);
    }
    if (walletPhase !== 'off' && !introDone) {
      setIntroDone(true);
    }
  }, [walletPhase, introDone]);

  useEffect(() => {
    if (!showSendBlockedMsg) return;
    const t = setTimeout(() => setShowSendBlockedMsg(false), 5000);
    return () => clearTimeout(t);
  }, [showSendBlockedMsg]);

  const handleMenuSelectionChange = useCallback((sel: 'create-intro' | 'recover-intro' | 'receive-address' | 'send-blocked') => {
    setMenuSelection(sel);
    if (sel === 'send-blocked') {
      setShowSendBlockedMsg(true);
    }
  }, []);

  const handleCopyAddress = useCallback(() => {
    navigator.clipboard?.writeText(RECEIVE_ADDRESS).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const canContinue = !isInIntro
    && hasRetrievedAddress
    && sendAddress.trim().length > 0;

  const handleContinue = () => {
    if (!done) {
      skip();
      return;
    }
    if (isInIntro && introStep === 0) {
      setIntroStep(1);
      return;
    }
    if (isInIntro && introStep === 1) {
      setIntroDone(true);
      return;
    }
    if (canContinue) {
      onComplete();
    }
  };

  const bubbleKey = isInIntro ? `intro-${introStep}` : `${walletStateKey}-${showSendBlockedMsg}`;

  return (
    <main className="scenario-page scenario-page-fit">
      <div className="scenario-mentor-layout">
        <div className="mentor-row">
          <div className="mentor-portrait" aria-label="Andy, your mentor" role="img">
            <div className="mentor-portrait-glow" />
            <div className="mentor-portrait-ring">
              <img className="mentor-portrait-image" src={andyPortrait} alt="Andy, your mentor" />
            </div>
          </div>
          <div className="mentor-bubble" key={bubbleKey}>
            <span className="mentor-bubble-name">Andy</span>
            <div className="mentor-bubble-text-wrap">
              <p className="mentor-bubble-text-ghost">{mentorMessage}</p>
              <p className="mentor-bubble-text">
                {displayed}
                {!done && <span className="typewriter-cursor" />}
              </p>
            </div>
          </div>
        </div>

        <div className="withdraw-middle-area">
          {!isInIntro && (
            <button
              className="withdraw-switch-btn"
              type="button"
              onClick={() => setActivePanel(activePanel === 'exchange' ? 'wallet' : 'exchange')}
            >
              <span>{activePanel === 'exchange' ? 'Switch to Hardware Wallet' : 'Switch to Exchange'}</span>
            </button>
          )}

          <div className="withdraw-panel-slot">
            {activePanel === 'exchange' && (
              <div className="withdraw-exchange-panel">
                <div className="tx-sim-header">
                  <Building2 size={20} strokeWidth={1.6} />
                  <span>SimExchange — Withdraw Bitcoin</span>
                </div>
                <div className="tx-sim-balance">Balance: 0.0500 BTC</div>
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
                  <label>Send to address</label>
                  <input
                    type="text"
                    value={sendAddress}
                    onChange={(e) => setSendAddress(e.target.value)}
                    placeholder="Paste your wallet receive address here"
                  />
                </div>
                {hasRetrievedAddress && (
                  <button className="tx-copy-btn" type="button" onClick={handleCopyAddress}>
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied!' : 'Copy wallet address'}</span>
                  </button>
                )}
              </div>
            )}

            {activePanel === 'wallet' && (
              <div className="hw-wallet-slot">
                <HardwareWallet
                  mode="withdraw"
                  onComplete={() => {}}
                  onPhaseChange={setWalletPhase}
                  onMenuSelectionChange={handleMenuSelectionChange}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="character-footer">
        <button
          className="character-proceed"
          type="button"
          onClick={handleContinue}
          disabled={!canContinue && !isInIntro}
        >
          <span>Continue</span>
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    </main>
  );
}
