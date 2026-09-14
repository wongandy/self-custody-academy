import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft, ChevronDown, Copy, Check, Smartphone, AlertTriangle } from 'lucide-react';
import HardwareWallet, { type WalletPhase } from '@/components/HardwareWallet';
import andyPortrait from '@/components/Andy.png';

type WithdrawScenarioProps = {
  completed: boolean;
  onBack: () => void;
  onComplete: () => void;
};

const RECEIVE_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
const AVAILABLE_BALANCE = 0.05;
const NETWORK_FEE = 0.00002;

const INTRO_MESSAGES = [
  "It's time to withdraw your Bitcoin from the exchange to your hardware wallet.",
  "First, let's get a receive address from your wallet. Click the switch below to open it.",
];

const MENTOR_MESSAGES: Record<string, string> = {
  'panel-exchange': 'Paste your receive address into the exchange withdrawal form, then press Withdraw.',
  'panel-wallet': 'Power on your wallet, then select Receive Bitcoin to get your address.',
  'wallet-off': 'Power on your wallet by clicking the power button.',
  'wallet-booting': 'The device is booting up. Hang tight for a moment.',
  'wallet-menu': "Select 'Receive Bitcoin' to get your receive address.",
  'wallet-receive': 'There is your receive address. Copy it, switch back to the exchange, and paste it into the withdrawal form.',
  'wallet-send-blocked': "Sending directly from the wallet isn't part of this mission. To withdraw from an exchange, you need to give the exchange your receive address first — let's do that instead.",
  'exchange-confirm': 'Review the withdrawal details carefully. Once you confirm, the transaction cannot be cancelled.',
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
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [copied, setCopied] = useState(false);
  const [hasRetrievedAddress, setHasRetrievedAddress] = useState(false);
  const [showSendBlockedMsg, setShowSendBlockedMsg] = useState(false);
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);
  const [exchangeScreen, setExchangeScreen] = useState<'form' | 'confirm'>('form');

  const isInIntro = !introDone;
  const currentIntroMessage = INTRO_MESSAGES[introStep];

  const walletStateKey = activePanel === 'wallet'
    ? walletPhase === 'menu'
      ? `wallet-menu-${menuSelection}`
      : `wallet-${walletPhase}`
    : exchangeScreen === 'confirm'
      ? 'exchange-confirm'
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

  const handleAmountChange = useCallback((val: string) => {
    setAmount(val);
    const parsed = parseFloat(val);
    if (val === '' || isNaN(parsed)) {
      setAmountError('');
      return;
    }
    if (parsed > AVAILABLE_BALANCE) {
      setAmountError('Insufficient balance. The amount exceeds your available balance.');
    } else {
      setAmountError('');
    }
  }, []);

  const handleMax = useCallback(() => {
    const maxAmount = AVAILABLE_BALANCE - NETWORK_FEE;
    setAmount(maxAmount.toFixed(8));
    setAmountError('');
  }, []);

  const numericAmount = parseFloat(amount) || 0;
  const receivedAmount = numericAmount > 0 ? Math.max(numericAmount - NETWORK_FEE, 0) : 0;
  const isAmountValid = numericAmount > 0 && numericAmount <= AVAILABLE_BALANCE && amountError === '';
  const isAddressValid = sendAddress.trim().length > 0;
  const canWithdraw = hasRetrievedAddress && isAmountValid && isAddressValid;

  const handleWithdraw = () => {
    if (canWithdraw) {
      setExchangeScreen('confirm');
    }
  };

  const handleBackToForm = () => {
    setExchangeScreen('form');
  };

  const handleConfirm = () => {
    onComplete();
  };

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

          <div className="withdraw-panels-wrap">
            {/* ── Smartphone exchange panel ── */}
            <div className={`withdraw-phone-wrap ${activePanel === 'exchange' ? '' : 'withdraw-panel-hidden'}`}>
              <div className="withdraw-phone">
                <div className="withdraw-phone-notch" />
                <div className="withdraw-phone-screen">
                  <div className="withdraw-phone-statusbar">
                    <span>9:41</span>
                    <span className="withdraw-phone-statusbar-icons">
                      <span className="withdraw-phone-signal" />
                      <span className="withdraw-phone-battery" />
                    </span>
                  </div>
                  <div className="withdraw-phone-content">
                    {exchangeScreen === 'form' && (
                      <>
                        <div className="withdraw-phone-app-header">
                          <Smartphone size={14} strokeWidth={1.8} />
                          <span>SimExchange</span>
                        </div>

                        <div className="withdraw-phone-section">
                          <label>Asset</label>
                          <button
                            className="withdraw-asset-dropdown"
                            type="button"
                            onClick={() => setAssetDropdownOpen(!assetDropdownOpen)}
                          >
                            <span className="withdraw-asset-icon">
                              <span className="withdraw-asset-btc">B</span>
                            </span>
                            <span className="withdraw-asset-name">Bitcoin</span>
                            <ChevronDown size={14} strokeWidth={2} className={`withdraw-asset-chevron ${assetDropdownOpen ? 'open' : ''}`} />
                          </button>
                          {assetDropdownOpen && (
                            <div className="withdraw-asset-menu">
                              <div className="withdraw-asset-option active">
                                <span className="withdraw-asset-icon">
                                  <span className="withdraw-asset-btc">B</span>
                                </span>
                                <span className="withdraw-asset-name">Bitcoin</span>
                                <Check size={12} strokeWidth={2.5} />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="withdraw-phone-section">
                          <div className="withdraw-phone-label-row">
                            <label>Withdraw amount</label>
                            <button className="withdraw-max-btn" type="button" onClick={handleMax}>
                              MAX
                            </button>
                          </div>
                          <div className="withdraw-amount-input-wrap">
                            <input
                              type="text"
                              value={amount}
                              onChange={(e) => handleAmountChange(e.target.value)}
                              placeholder="0.00"
                              className={amountError ? 'error' : ''}
                            />
                            <span className="withdraw-amount-unit">BTC</span>
                          </div>
                          {amountError && (
                            <p className="withdraw-amount-error">{amountError}</p>
                          )}
                        </div>

                        <div className="withdraw-phone-section">
                          <label>Send to address</label>
                          <input
                            type="text"
                            value={sendAddress}
                            onChange={(e) => setSendAddress(e.target.value)}
                            placeholder="Paste wallet receive address"
                            className="withdraw-addr-input"
                          />
                          {hasRetrievedAddress && (
                            <button className="withdraw-copy-btn" type="button" onClick={handleCopyAddress}>
                              {copied ? <Check size={11} /> : <Copy size={11} />}
                              <span>{copied ? 'Copied!' : 'Copy wallet address'}</span>
                            </button>
                          )}
                        </div>

                        <div className="withdraw-phone-summary">
                          <div className="withdraw-summary-row">
                            <span>Available</span>
                            <strong>{AVAILABLE_BALANCE.toFixed(4)} BTC</strong>
                          </div>
                          <div className="withdraw-summary-row">
                            <span>Network fee</span>
                            <strong>{NETWORK_FEE.toFixed(5)} BTC</strong>
                          </div>
                          <div className="withdraw-summary-row received">
                            <span>Received</span>
                            <strong>{receivedAmount > 0 ? receivedAmount.toFixed(8) : '—'} BTC</strong>
                          </div>
                        </div>

                        <button
                          className="withdraw-btn"
                          type="button"
                          onClick={handleWithdraw}
                          disabled={!canWithdraw}
                        >
                          Withdraw
                        </button>
                      </>
                    )}

                    {exchangeScreen === 'confirm' && (
                      <>
                        <div className="withdraw-phone-app-header">
                          <button className="withdraw-confirm-back" type="button" onClick={handleBackToForm}>
                            <ArrowLeft size={14} strokeWidth={2} />
                          </button>
                          <span>Confirm order</span>
                        </div>

                        <div className="withdraw-confirm-info">
                          <div className="withdraw-confirm-receive">
                            <span className="withdraw-confirm-receive-label">Receive amount</span>
                            <span className="withdraw-confirm-receive-value">{receivedAmount.toFixed(8)} BTC</span>
                          </div>

                          <div className="withdraw-confirm-detail">
                            <span>Network</span>
                            <strong>Bitcoin</strong>
                          </div>
                          <div className="withdraw-confirm-detail">
                            <span>Address</span>
                            <strong className="withdraw-confirm-addr">{sendAddress || RECEIVE_ADDRESS}</strong>
                          </div>
                          <div className="withdraw-confirm-detail">
                            <span>Withdrawal amount</span>
                            <strong>{numericAmount.toFixed(8)} BTC</strong>
                          </div>
                          <div className="withdraw-confirm-detail">
                            <span>Network fee</span>
                            <strong>{NETWORK_FEE.toFixed(5)} BTC</strong>
                          </div>
                          <div className="withdraw-confirm-detail">
                            <span>Wallet label</span>
                            <strong>HW Wallet 1</strong>
                          </div>
                        </div>

                        <div className="withdraw-confirm-warning">
                          <AlertTriangle size={12} strokeWidth={2} />
                          <span>Please confirm the address and network are correct. Transactions cannot be cancelled once confirmed.</span>
                        </div>

                        <button
                          className="withdraw-confirm-btn"
                          type="button"
                          onClick={handleConfirm}
                        >
                          Confirm
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Hardware wallet panel ── */}
            <div className={`withdraw-wallet-wrap ${activePanel === 'wallet' ? '' : 'withdraw-panel-hidden'}`}>
              <div className="hw-wallet-slot">
                <HardwareWallet
                  mode="withdraw"
                  onComplete={() => {}}
                  onPhaseChange={setWalletPhase}
                  onMenuSelectionChange={handleMenuSelectionChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="character-footer">
        <button
          className="character-proceed"
          type="button"
          onClick={handleContinue}
          disabled={!isInIntro}
        >
          <span>Continue</span>
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    </main>
  );
}
