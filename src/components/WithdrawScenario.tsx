import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowLeftRight, ChevronDown, ChevronRight, Check, Smartphone, AlertTriangle } from 'lucide-react';
import HardwareWallet, { RECEIVE_ADDRESS, type WalletPhase } from '@/components/HardwareWallet';
import andyPortrait from '@/components/Andy.webp';

type WithdrawScenarioProps = {
  completed: boolean;
  onBack: () => void;
  onComplete: () => void;
};

const AVAILABLE_BALANCE = 0.05;
const NETWORK_FEE = 0.00002;

const INTRO_MESSAGES = [
  "This time I will teach you how to withdraw your Bitcoin from the exchange to your hardware wallet.",
  "Now that you've already set up your hardware wallet, it's time to select 'Receive Bitcoin' to generate a receive address.",
];

const SWITCH_INTRO_MESSAGES = [
  "Receive address copied! Now let's switch over to the exchange on your phone and paste it there.",
  'Press "Switch to Exchange Wallet" at the top to head to the exchange.',
];

const EXCHANGE_INTRO_MESSAGES = [
  'Need to double-check your receive address? Press the switch button above to hop back to your hardware wallet.',
  'Fill up the Withdraw Amount field, paste your receive address in the Send To Address field, then press Withdraw.',
];

const MENTOR_MESSAGES: Record<string, string> = {
  'panel-exchange': 'Fill up the Withdraw Amount field, paste your receive address in the Send To Address field, then press Withdraw.',
  'panel-wallet': "Select 'Receive Bitcoin' to get your receive address.",
  'wallet-booting': 'The device is booting up. Hang tight for a moment.',
  'wallet-menu': "Select 'Receive Bitcoin' to get your receive address.",
  'wallet-menu-receive-address': "Select 'Receive Bitcoin' to get your receive address.",
  'wallet-receive-address': "There's your receive address. Click the copy button next to it to copy it.",
  'wallet-receive-copied': 'Address copied! Press the switch button above to go back to the exchange and paste it there.',
  'wallet-send-blocked': "Sending directly from the wallet isn't part of this mission. To withdraw from an exchange, you need to give the exchange your receive address first — let's do that instead.",
  'exchange-address-mismatch': "That address doesn't match the one your hardware wallet gave you. One wrong character sends your Bitcoin somewhere else — go back to your wallet and copy it again.",
  'exchange-confirm': 'Review the withdrawal details carefully. Once you confirm, the transaction cannot be cancelled.',
  'exchange-success': "Well done! Your Bitcoin is on its way to your hardware wallet. Let's wrap this up.",
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
  const [walletPhase, setWalletPhase] = useState<WalletPhase>('menu');
  const [menuSelection, setMenuSelection] = useState<'create-intro' | 'recover-intro' | 'receive-address' | 'send-blocked'>('receive-address');
  const [sendAddress, setSendAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [hasRetrievedAddress, setHasRetrievedAddress] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [switchIntroStep, setSwitchIntroStep] = useState<number | null>(null);
  const [exchangeIntroStep, setExchangeIntroStep] = useState<number | null>(null);
  const [switchPulse, setSwitchPulse] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'withdraw-slide-left' | 'withdraw-slide-right' | null>(null);
  const usedSwitchPrompt = useRef(false);
  const [showSendBlockedMsg, setShowSendBlockedMsg] = useState(false);
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);
  const [exchangeScreen, setExchangeScreen] = useState<'form' | 'confirm' | 'success'>('form');
  const [walletEntered, setWalletEntered] = useState(false);
  const portraitRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const flipRects = useRef<{ portrait: DOMRect; bubble: DOMRect } | null>(null);

  const isInIntro = !introDone;
  const spotlight = isInIntro && introStep === 0;
  const canContinue = isInIntro
    ? introStep !== 1
    : switchIntroStep !== null
      ? switchIntroStep < SWITCH_INTRO_MESSAGES.length - 1
      : exchangeIntroStep !== null
        ? exchangeIntroStep < EXCHANGE_INTRO_MESSAGES.length - 1
        : exchangeScreen === 'success';
  const showSwitchButton = !isInIntro && (
    switchIntroStep !== null ? switchIntroStep === SWITCH_INTRO_MESSAGES.length - 1 : addressCopied || activePanel === 'exchange'
  );
  const currentIntroMessage = INTRO_MESSAGES[introStep];

  const trimmedAddress = sendAddress.trim();
  const matchesReceiveAddress = trimmedAddress.length > 0 && trimmedAddress.toLowerCase() === RECEIVE_ADDRESS.toLowerCase();
  const looksLikeFullAddress = trimmedAddress.length >= RECEIVE_ADDRESS.length;
  const addressMismatch = trimmedAddress.length > 0 && !matchesReceiveAddress && looksLikeFullAddress;

  const walletStateKey = activePanel === 'wallet'
    ? walletPhase === 'menu'
      ? `wallet-menu-${menuSelection}`
      : walletPhase === 'receive-address'
        ? addressCopied
          ? 'wallet-receive-copied'
          : 'wallet-receive-address'
        : `wallet-${walletPhase}`
    : exchangeScreen === 'confirm'
      ? 'exchange-confirm'
      : exchangeScreen === 'success'
        ? 'exchange-success'
        : `panel-${activePanel}`;

  const mentorMessage = isInIntro
    ? currentIntroMessage
    : showSendBlockedMsg
      ? MENTOR_MESSAGES['wallet-send-blocked']
      : switchIntroStep !== null
        ? SWITCH_INTRO_MESSAGES[switchIntroStep]
        : addressMismatch && activePanel === 'exchange'
          ? MENTOR_MESSAGES['exchange-address-mismatch']
          : exchangeIntroStep !== null && activePanel === 'exchange'
            ? EXCHANGE_INTRO_MESSAGES[exchangeIntroStep]
            : MENTOR_MESSAGES[walletStateKey] || MENTOR_MESSAGES['panel-exchange'];

  const { displayed, done, skip } = useTypewriter(mentorMessage);

  useEffect(() => {
    if (walletPhase === 'receive-address') {
      setHasRetrievedAddress(true);
    }
  }, [walletPhase]);

  useEffect(() => {
    if (introDone) return;
    if (walletPhase !== 'menu' || showSendBlockedMsg) {
      setIntroDone(true);
    }
  }, [walletPhase, showSendBlockedMsg, introDone]);

  useEffect(() => {
    if (switchIntroStep === SWITCH_INTRO_MESSAGES.length - 1) {
      setSwitchPulse(true);
      return;
    }
    if (exchangeIntroStep === 0 && activePanel === 'exchange') {
      setSwitchPulse(true);
      return;
    }
    setSwitchPulse(false);
  }, [switchIntroStep, exchangeIntroStep, activePanel]);

  useLayoutEffect(() => {
    if (spotlight || !flipRects.current) return;
    const portrait = portraitRef.current;
    const bubble = bubbleRef.current;
    if (!portrait || !bubble) return;

    const pFirst = flipRects.current.portrait;
    const bFirst = flipRects.current.bubble;
    const pLast = portrait.getBoundingClientRect();
    const bLast = bubble.getBoundingClientRect();
    flipRects.current = null;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const opts: KeyframeAnimationOptions = {
      duration: 560,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    };

    portrait.style.transformOrigin = 'top left';
    portrait.animate(
      [
        {
          transform: `translate(${pFirst.left - pLast.left}px, ${pFirst.top - pLast.top}px) scale(${pFirst.width / pLast.width}, ${pFirst.height / pLast.height})`,
        },
        { transform: 'translate(0, 0) scale(1, 1)' },
      ],
      opts,
    );

    bubble.style.transformOrigin = 'top left';
    bubble.animate(
      [
        {
          transform: `translate(${bFirst.left - bLast.left}px, ${bFirst.top - bLast.top}px) scale(${bFirst.width / bLast.width}, ${bFirst.height / bLast.height})`,
        },
        { transform: 'translate(0, 0) scale(1, 1)' },
      ],
      opts,
    );
  }, [spotlight]);

  const handleMenuSelectionChange = useCallback((sel: 'create-intro' | 'recover-intro' | 'receive-address' | 'send-blocked') => {
    setMenuSelection(sel);
    setShowSendBlockedMsg(sel === 'send-blocked');
  }, []);

  const handleCopyAddress = useCallback(() => {
    navigator.clipboard?.writeText(RECEIVE_ADDRESS).catch(() => {});
    setAddressCopied(true);
    if (!usedSwitchPrompt.current) {
      usedSwitchPrompt.current = true;
      setSwitchIntroStep(0);
    }
  }, []);

  const handleSwitchPanel = useCallback(() => {
    if (switchIntroStep !== null) {
      setSwitchIntroStep(null);
    }
    setExchangeIntroStep((step) => {
      if (step === null) return 0;
      if (step >= EXCHANGE_INTRO_MESSAGES.length - 1) return null;
      return step;
    });
    setSlideDirection(activePanel === 'wallet' ? 'withdraw-slide-right' : 'withdraw-slide-left');
    setActivePanel((panel) => (panel === 'exchange' ? 'wallet' : 'exchange'));
  }, [switchIntroStep, activePanel]);

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
  const isAddressValid = matchesReceiveAddress;
  const canWithdraw = hasRetrievedAddress && isAmountValid && isAddressValid;

  const handleWithdraw = () => {
    if (canWithdraw) {
      setExchangeIntroStep(null);
      setExchangeScreen('confirm');
    }
  };

  const handleBackToForm = () => {
    setExchangeScreen('form');
  };

  const handleConfirm = () => {
    setExchangeScreen('success');
  };

  const handleContinue = () => {
    if (!done) {
      skip();
      return;
    }
    if (isInIntro && introStep === 0) {
      if (portraitRef.current && bubbleRef.current) {
        flipRects.current = {
          portrait: portraitRef.current.getBoundingClientRect(),
          bubble: bubbleRef.current.getBoundingClientRect(),
        };
      }
      setWalletEntered(true);
      setIntroStep(1);
      return;
    }
    if (switchIntroStep !== null) {
      if (switchIntroStep < SWITCH_INTRO_MESSAGES.length - 1) {
        setSwitchIntroStep(switchIntroStep + 1);
      }
      return;
    }
    if (exchangeIntroStep !== null && activePanel === 'exchange') {
      if (exchangeIntroStep < EXCHANGE_INTRO_MESSAGES.length - 1) {
        setExchangeIntroStep(exchangeIntroStep + 1);
      }
      return;
    }
    if (exchangeScreen === 'success') {
      onComplete();
      return;
    }
  };

  const bubbleKey = isInIntro
    ? `intro-${introStep}`
    : `${walletStateKey}-${showSendBlockedMsg}-${switchIntroStep}-${exchangeIntroStep}-${addressMismatch}`;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (!canContinue) return;
      e.preventDefault();
      handleContinue();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <main className={`scenario-page scenario-page-fit ${spotlight ? 'scenario-page-spotlight' : ''}`}>
      <div className={`scenario-mentor-layout ${spotlight ? 'spotlight' : ''}`}>
        <div className={spotlight ? 'withdraw-middle-area hidden' : 'withdraw-middle-area'}>
          {showSwitchButton && (
            <button
              className={`withdraw-switch-btn withdraw-switch-btn-enter${switchPulse ? ' withdraw-switch-btn-pulse' : ''}`}
              type="button"
              onClick={handleSwitchPanel}
            >
              <ArrowLeftRight size={14} strokeWidth={2.2} />
              <span key={activePanel} className="withdraw-switch-label">
                {activePanel === 'exchange' ? 'Switch to Hardware Wallet' : 'Switch to Exchange Wallet'}
              </span>
            </button>
          )}

          <div className="withdraw-panels-wrap">
            {/* ── Smartphone exchange panel ── */}
            <div className={`withdraw-phone-wrap ${activePanel === 'exchange' ? slideDirection ?? '' : 'withdraw-panel-hidden'}`}>
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
                            className={`withdraw-addr-input${addressMismatch ? ' error' : ''}`}
                          />
                          {trimmedAddress.length === 0 && (
                            <p className="withdraw-addr-status hint">
                              <span>Go to your hardware wallet, copy the receive address, then paste it here.</span>
                            </p>
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

                    {exchangeScreen === 'success' && (
                      <>
                        <div className="withdraw-phone-app-header">
                          <Smartphone size={14} strokeWidth={1.8} />
                          <span>SimExchange</span>
                        </div>

                        <div className="withdraw-success-wrap">
                          <div className="withdraw-success-icon">
                            <Check size={32} strokeWidth={3} />
                          </div>
                          <p className="withdraw-success-title">Withdrawal Submitted</p>
                          <p className="withdraw-success-subtitle">Your Bitcoin is on its way</p>

                          <div className="withdraw-success-details">
                            <div className="withdraw-confirm-detail">
                              <span>Amount</span>
                              <strong>{numericAmount.toFixed(8)} BTC</strong>
                            </div>
                            <div className="withdraw-confirm-detail">
                              <span>Network fee</span>
                              <strong>{NETWORK_FEE.toFixed(5)} BTC</strong>
                            </div>
                            <div className="withdraw-confirm-detail">
                              <span>Received</span>
                              <strong className="withdraw-success-received">{receivedAmount.toFixed(8)} BTC</strong>
                            </div>
                            <div className="withdraw-confirm-detail">
                              <span>Address</span>
                              <strong className="withdraw-confirm-addr">{sendAddress || RECEIVE_ADDRESS}</strong>
                            </div>
                          </div>

                          <div className="withdraw-success-status">
                            <span className="withdraw-success-pulse" />
                            <span>Processing on blockchain</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Hardware wallet panel ── */}
            {walletEntered && (
              <div className={`withdraw-wallet-wrap withdraw-wallet-slide-in ${activePanel === 'wallet' ? slideDirection ?? '' : 'withdraw-panel-hidden'}`}>
                <div className="hw-wallet-slot">
                  <HardwareWallet
                    mode="withdraw"
                    startAtMenu
                    onComplete={() => {}}
                    onPhaseChange={setWalletPhase}
                    onMenuSelectionChange={handleMenuSelectionChange}
                    onCopyAddress={handleCopyAddress}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mentor-row">
          <div ref={portraitRef} className="mentor-portrait" aria-label="Andy, your mentor" role="img">
            <div className="mentor-portrait-glow" />
            <div className="mentor-portrait-ring">
              <img className="mentor-portrait-image" src={andyPortrait} alt="Andy, your mentor" />
            </div>
            <div className="mentor-portrait-badge">Andy</div>
          </div>
          <div
            ref={bubbleRef}
            className={`mentor-bubble ${canContinue ? 'is-ready' : ''}`}
            onClick={handleContinue}
          >
            <div className="mentor-bubble-content" key={bubbleKey}>
              <span className="mentor-bubble-name">Andy</span>
              <div className="mentor-bubble-text-wrap">
                <p className="mentor-bubble-text-ghost">{mentorMessage}</p>
                <p className="mentor-bubble-text">
                  {displayed}
                  {!done && <span className="typewriter-cursor" />}
                </p>
              </div>
            </div>
            <button
              className={`bubble-next ${canContinue ? 'ready' : ''}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleContinue();
              }}
              disabled={!canContinue}
              aria-label="Continue"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* <div className="character-footer">
        <div className="character-footer-inner">
          <button
            className="character-proceed"
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
          >
            <span>Continue</span>
            <ArrowRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div> */}
    </main>
  );
}
