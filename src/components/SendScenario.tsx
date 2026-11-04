import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  ReceiptText,
  Send,
  ShieldCheck,
} from 'lucide-react';
import HardwareWallet, { RECEIVE_ADDRESS, type ExpectedAction } from '@/components/HardwareWallet';
import mariaPortrait from '@/components/Maria.webp';

type SendScenarioProps = {
  completed: boolean;
  onBack: () => void;
  onComplete: () => void;
};

type FeeLevel = 'low' | 'medium' | 'high';

type FeeOption = {
  id: FeeLevel;
  label: string;
  rate: string;
  fee: string;
};

type SendStage =
  | 'intro'
  | 'open-send'
  | 'enter-address'
  | 'enter-amount'
  | 'explain-fees'
  | 'select-fee'
  | 'review-tx'
  | 'hardware-review'
  | 'tx-sent'
  | 'finished';

const CONTINUE_STAGES = new Set<SendStage>(['intro', 'explain-fees', 'finished']);

const NUDGE_MESSAGE = "We'll get to that later! For now, let's stick to the current step.";
const NUDGE_DURATION_MS = 1250;
const SEND_AMOUNT = '0.005';
const MARIA_ADDRESS = RECEIVE_ADDRESS;

const FEE_OPTIONS: FeeOption[] = [
  { id: 'low', label: 'Low', rate: '2 sats/vB', fee: '0.00000120' },
  { id: 'medium', label: 'Medium', rate: '8 sats/vB', fee: '0.00000480' },
  { id: 'high', label: 'High', rate: '18 sats/vB', fee: '0.00001080' },
];

const INTRO_LINES = [
  "Today we're going to practice sending Bitcoin safely. The wallet software will prepare the payment, but the hardware wallet will protect the final approval.",
  "I'll give you my receiving address and ask you to send a small amount of Bitcoin to it. Always compare the destination carefully before you approve a transaction.",
];

const OPEN_SEND_MESSAGE = 'Open the Send tab in the wallet software to get started.';
const ENTER_ADDRESS_MESSAGE = 'First, enter my receiving address in the Pay to field. You can use the address card above the form to avoid typing mistakes.';
const ENTER_AMOUNT_MESSAGE = `Now enter ${SEND_AMOUNT} BTC as the amount. This is a small practice payment so you can focus on the review steps.`;
const EXPLAIN_FEES_MESSAGE = 'Before you send, you need to choose a transaction fee. The fee pays the Bitcoin network to process your payment — a higher fee can help your transaction confirm sooner, but it also costs more.';
const SELECT_FEE_MESSAGE = "Choose the Medium fee option, then click 'Review transaction' to build the payment.";
const REVIEW_TX_MESSAGE = 'Review the recipient, amount, and fee carefully. When everything matches, send the transaction to your hardware wallet for its own review.';
const HARDWARE_REVIEW_MESSAGE = 'Now check each detail on the hardware wallet screen. Press the checkmark to move through the recipient, amount, and fee, then confirm the payment on the device.';
const TX_SENT_MESSAGE = 'The payment has been broadcast to the network. Let us check your updated balance.';
const FINISHED_MESSAGE = 'Excellent work! You verified the address, understood the network fee, and approved the payment on the hardware wallet. That is the complete sending habit to carry forward.';

const WALLET_BALANCE = '0.04998';
const SENT_BALANCE = '0.04497';
const LABEL_TEXT = 'Maria';

function useTypewriter(text: string, speed = 6) {
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

export default function SendScenario({ onBack, onComplete }: SendScenarioProps) {
  const [stage, setStage] = useState<SendStage>('intro');
  const [introStep, setIntroStep] = useState(0);
  const [nudgeActive, setNudgeActive] = useState(false);
  const [walletTab, setWalletTab] = useState<'transactions' | 'send'>('transactions');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [feeLevel, setFeeLevel] = useState<FeeLevel>('medium');
  const [transactionBuilt, setTransactionBuilt] = useState(false);
  const [sendRequest, setSendRequest] = useState(false);
  const [sent, setSent] = useState(false);
  const [addressUsed, setAddressUsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 600px)').matches);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const useAddressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const flipRects = useRef<{ portrait: DOMRect; bubble: DOMRect } | null>(null);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const message = nudgeActive
    ? NUDGE_MESSAGE
    : stage === 'intro'
      ? INTRO_LINES[introStep] ?? INTRO_LINES[0]
      : stage === 'open-send'
        ? OPEN_SEND_MESSAGE
        : stage === 'enter-address'
          ? ENTER_ADDRESS_MESSAGE
          : stage === 'enter-amount'
            ? ENTER_AMOUNT_MESSAGE
            : stage === 'explain-fees'
              ? EXPLAIN_FEES_MESSAGE
              : stage === 'select-fee'
                ? SELECT_FEE_MESSAGE
                : stage === 'review-tx'
                  ? REVIEW_TX_MESSAGE
                  : stage === 'hardware-review'
                    ? HARDWARE_REVIEW_MESSAGE
                    : stage === 'tx-sent'
                      ? TX_SENT_MESSAGE
                      : FINISHED_MESSAGE;
  const { displayed, done, skip } = useTypewriter(message);

  const spotlight = stage === 'intro';
  const interactionLocked = !done;
  const canContinue = done && !nudgeActive && CONTINUE_STAGES.has(stage);
  const softwareLocked = interactionLocked || (canContinue && !nudgeActive) || stage === 'hardware-review' || stage === 'tx-sent';
  const deviceLocked = interactionLocked || (canContinue && !nudgeActive) || stage === 'tx-sent';

  const selectedFee = FEE_OPTIONS.find((option) => option.id === feeLevel) ?? FEE_OPTIONS[1];
  const formValid = recipient.trim() === MARIA_ADDRESS && amount.trim() === SEND_AMOUNT;

  const expectedAction: ExpectedAction =
    stage === 'hardware-review'
      ? { type: 'confirm' }
      : stage === 'open-send' || stage === 'enter-address' || stage === 'enter-amount' || stage === 'select-fee' || stage === 'review-tx'
        ? { type: 'external' }
        : { type: 'none' };

  const handleUnexpectedAction = useCallback(() => {
    setNudgeActive(true);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    nudgeTimer.current = setTimeout(() => setNudgeActive(false), NUDGE_DURATION_MS);
  }, []);

  useEffect(() => {
    if (!nudgeActive) return;
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    nudgeTimer.current = setTimeout(() => setNudgeActive(false), NUDGE_DURATION_MS);
    return () => {
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    };
  }, [nudgeActive]);

  useEffect(() => {
    if (nudgeActive) {
      setNudgeActive(false);
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    }
  }, [stage]);

  useEffect(() => () => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    if (useAddressTimer.current) clearTimeout(useAddressTimer.current);
  }, []);

  useEffect(() => {
    if (stage !== 'tx-sent') return;
    const timer = setTimeout(() => setStage('finished'), 2500);
    return () => clearTimeout(timer);
  }, [stage]);

  const handleContinue = useCallback(() => {
    if (!done) {
      skip();
      return;
    }
    if (nudgeActive || !canContinue) return;
    if (stage === 'intro') {
      if (introStep < INTRO_LINES.length - 1) {
        setIntroStep((current) => current + 1);
        return;
      }
      if (portraitRef.current && bubbleRef.current) {
        flipRects.current = {
          portrait: portraitRef.current.getBoundingClientRect(),
          bubble: bubbleRef.current.getBoundingClientRect(),
        };
      }
      setStage('open-send');
      return;
    }
    if (stage === 'explain-fees') {
      setStage('select-fee');
      return;
    }
    if (stage === 'finished') {
      onComplete();
      return;
    }
  }, [done, skip, nudgeActive, canContinue, stage, introStep, onComplete]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      e.preventDefault();
      handleContinue();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleContinue]);

  useLayoutEffect(() => {
    if (spotlight || !flipRects.current) return;
    const portraitEl = portraitRef.current;
    const bubbleEl = bubbleRef.current;
    if (!portraitEl || !bubbleEl) return;

    const pFirst = flipRects.current.portrait;
    const bFirst = flipRects.current.bubble;
    const pLast = portraitEl.getBoundingClientRect();
    const bLast = bubbleEl.getBoundingClientRect();
    flipRects.current = null;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const opts: KeyframeAnimationOptions = { duration: 560, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };

    portraitEl.style.transformOrigin = 'top left';
    portraitEl.animate(
      [
        { transform: `translate(${pFirst.left - pLast.left}px, ${pFirst.top - pLast.top}px) scale(${pFirst.width / pLast.width}, ${pFirst.height / pLast.height})` },
        { transform: 'translate(0, 0) scale(1, 1)' },
      ],
      opts,
    );

    bubbleEl.style.transformOrigin = 'top left';
    bubbleEl.animate(
      [
        { transform: `translate(${bFirst.left - bLast.left}px, ${bFirst.top - bLast.top}px) scale(${bFirst.width / bLast.width}, ${bFirst.height / bLast.height})` },
        { transform: 'translate(0, 0) scale(1, 1)' },
      ],
      opts,
    );
  }, [spotlight]);

  const handleSendTab = useCallback(() => {
    if (softwareLocked) return;
    if (stage === 'open-send') {
      setWalletTab('send');
      setStage('enter-address');
      return;
    }
    if (walletTab === 'send') return;
    handleUnexpectedAction();
  }, [softwareLocked, stage, walletTab, handleUnexpectedAction]);

  const handleTransactionsTab = useCallback(() => {
    if (softwareLocked) return;
    handleUnexpectedAction();
  }, [softwareLocked, handleUnexpectedAction]);

  const handleUseAddress = useCallback(() => {
    if (softwareLocked || stage !== 'enter-address') {
      if (!softwareLocked) handleUnexpectedAction();
      return;
    }
    setRecipient(MARIA_ADDRESS);
    setAddressUsed(true);
    if (useAddressTimer.current) clearTimeout(useAddressTimer.current);
    useAddressTimer.current = setTimeout(() => setAddressUsed(false), 2000);
  }, [softwareLocked, stage, handleUnexpectedAction]);

  const handleFormAction = useCallback(() => {
    if (softwareLocked) return;
    if (stage === 'enter-address') {
      if (recipient.trim() !== MARIA_ADDRESS) {
        handleUnexpectedAction();
        return;
      }
      setStage('enter-amount');
      return;
    }
    if (stage === 'enter-amount') {
      if (amount.trim() !== SEND_AMOUNT) {
        handleUnexpectedAction();
        return;
      }
      setStage('explain-fees');
      return;
    }
    if (stage === 'select-fee') {
      if (!formValid) {
        handleUnexpectedAction();
        return;
      }
      setTransactionBuilt(true);
      setStage('review-tx');
      return;
    }
  }, [softwareLocked, stage, recipient, amount, formValid, handleUnexpectedAction]);

  const handleFeeSelect = useCallback((nextFee: FeeLevel) => {
    if (softwareLocked || stage !== 'select-fee') {
      if (!softwareLocked) handleUnexpectedAction();
      return;
    }
    setFeeLevel(nextFee);
  }, [softwareLocked, stage, handleUnexpectedAction]);

  const handleSendToHardware = useCallback(() => {
    if (softwareLocked || stage !== 'review-tx') {
      if (!softwareLocked) handleUnexpectedAction();
      return;
    }
    setSendRequest(true);
    setStage('hardware-review');
  }, [softwareLocked, stage, handleUnexpectedAction]);

  const handleHardwareConfirm = useCallback(() => {
    setSent(true);
    setWalletTab('transactions');
    setStage('tx-sent');
  }, []);

  const cableEl = (
    <div className={`connect-cable is-linked${isMobile ? ' cable-under-wallet' : ''}`} aria-hidden="true">
      <span className="plug-end-track">
        <svg className="connect-cable-wire connect-cable-wire-h" viewBox="0 0 100 40" preserveAspectRatio="none">
          <path className="cable-line" d="M0 20 C 24 20, 28 32, 50 32 S 76 20, 100 20" pathLength={100} />
          <path className="cable-pulse" d="M0 20 C 24 20, 28 32, 50 32 S 76 20, 100 20" pathLength={100} />
        </svg>
        <svg className="connect-cable-wire connect-cable-wire-v" viewBox="0 0 40 100" preserveAspectRatio="none">
          <path className="cable-line" d="M20 0 C 20 24, 32 28, 32 50 S 20 76, 20 100" pathLength={100} />
          <path className="cable-pulse" d="M20 0 C 20 24, 32 28, 32 50 S 20 76, 20 100" pathLength={100} />
        </svg>
        <svg className="connect-cable-wire connect-cable-wire-under" viewBox="0 0 240 48" preserveAspectRatio="none">
          <path className="cable-line" d="M20 0 C 20 14, 28 18, 50 20 C 110 25, 180 21, 240 22" pathLength={100} />
          <path className="cable-pulse" d="M20 0 C 20 14, 28 18, 50 20 C 110 25, 180 21, 240 22" pathLength={100} />
        </svg>
        <span className="connect-cable-plug plug-start" />
        <span className="connect-cable-plug plug-end" />
      </span>
    </div>
  );

  const bubbleKey = nudgeActive
    ? 'nudge'
    : stage === 'intro'
      ? `intro-${introStep}`
      : stage;

  const formFieldsEnabled = !softwareLocked && (stage === 'enter-address' || stage === 'enter-amount');
  const feeButtonsEnabled = !softwareLocked && stage === 'select-fee';
  const useAddressEnabled = !softwareLocked && stage === 'enter-address';

  return (
    <main className={`scenario-page scenario-page-fit ${spotlight ? 'scenario-page-spotlight' : 'scenario-page-connect'}`}>
      <div className={`scenario-mentor-layout ${spotlight ? 'spotlight' : ''}`}>
        {!spotlight && (
          <div className={`connect-duo is-wide${interactionLocked ? ' is-locked' : ''}`}>
            <div className="wallet-laptop laptop-enter">
              <div className="wallet-window">
                <div className="wallet-window-titlebar">
                  <span className="tl-dot red" />
                  <span className="tl-dot yellow" />
                  <span className="tl-dot green" />
                </div>
                <div className="wallet-window-body">
                  <div className="wallet-app">
                    <aside className="wallet-sidebar">
                      <button
                        type="button"
                        className={`wallet-nav-item${walletTab === 'transactions' ? ' active' : ''}`}
                        onClick={handleTransactionsTab}
                        disabled={softwareLocked}
                        aria-pressed={walletTab === 'transactions'}
                      >
                        <ArrowLeftRight strokeWidth={2.2} />
                        <span className="wallet-nav-label">Transactions</span>
                      </button>
                      <button
                        type="button"
                        className={`wallet-nav-item${walletTab === 'send' ? ' active' : ''}`}
                        onClick={handleSendTab}
                        disabled={softwareLocked}
                        aria-pressed={walletTab === 'send'}
                      >
                        <ArrowUpRight strokeWidth={2.2} />
                        <span className="wallet-nav-label">Send</span>
                      </button>
                      <button
                        type="button"
                        className="wallet-nav-item"
                        onClick={handleUnexpectedAction}
                        disabled={softwareLocked}
                        aria-pressed="false"
                      >
                        <ArrowDownLeft strokeWidth={2.2} />
                        <span className="wallet-nav-label">Receive</span>
                      </button>
                    </aside>
                    <div className="wallet-canvas">
                      {walletTab === 'transactions' && (
                        <div className="wallet-transactions">
                          <div className="wallet-tx-summary">
                            <div className="wallet-tx-summary-item">
                              <span className="wallet-tx-summary-label">Balance</span>
                              <span className="wallet-tx-summary-value">{sent ? `${SENT_BALANCE} BTC` : `${WALLET_BALANCE} BTC`}</span>
                            </div>
                            <div className="wallet-tx-summary-item">
                              <span className="wallet-tx-summary-label">Transactions</span>
                              <span className="wallet-tx-summary-value">{sent ? 2 : 1}</span>
                            </div>
                          </div>
                          <div className="wallet-tx-table-wrap">
                            <table className="wallet-tx-table">
                              <thead>
                                <tr><th>Date</th><th>Value</th><th>Balance</th></tr>
                              </thead>
                              <tbody>
                                {sent && (
                                  <tr className="fresh"><td>2026-11-04 10:24</td><td className="out">-0.00500 BTC</td><td>{SENT_BALANCE} BTC</td></tr>
                                )}
                                <tr><td>2026-09-21 09:48</td><td className="in">+0.04998 BTC</td><td>{WALLET_BALANCE} BTC</td></tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {walletTab === 'send' && !transactionBuilt && !sent && (
                        <div className="send-form-screen">
                          <div className="send-form-heading">
                            <div className="send-form-title"><Send size={18} strokeWidth={2} /><span>Send Bitcoin</span></div>
                            <span className="send-form-balance">Balance {WALLET_BALANCE} BTC</span>
                          </div>
                          <div className="send-recipient-card">
                            <div>
                              <span className="send-recipient-label">Maria's receiving address</span>
                              <span className="send-recipient-address">{MARIA_ADDRESS}</span>
                            </div>
                            <button type="button" className="send-use-address" onClick={handleUseAddress} disabled={!useAddressEnabled}>
                              {addressUsed ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2} />}
                              <span>{addressUsed ? 'Added' : 'Use address'}</span>
                            </button>
                          </div>
                          <div className="send-form-fields">
                            <label className="tx-sim-field">
                              <span>Pay to</span>
                              <input className="tx-sim-addr" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="bc1…" disabled={!formFieldsEnabled} />
                            </label>
                            <label className="tx-sim-field">
                              <span>Label</span>
                              <input value={LABEL_TEXT} readOnly disabled />
                            </label>
                            <label className="tx-sim-field">
                              <span>Amount</span>
                              <div className="send-amount-field">
                                <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.005" disabled={!formFieldsEnabled} />
                                <span>BTC</span>
                              </div>
                            </label>
                          </div>
                          <div className="send-fee-section">
                            <div className="send-fee-heading">
                              <span>Fee</span>
                              <span className="send-fee-explanation">Pays the network to process your payment.</span>
                            </div>
                            <div className="send-fee-options">
                              {FEE_OPTIONS.map((option) => (
                                <button
                                  key={option.id}
                                  type="button"
                                  className={`tx-fee-btn${feeLevel === option.id ? ' active' : ''}`}
                                  onClick={() => handleFeeSelect(option.id)}
                                  disabled={!feeButtonsEnabled}
                                >
                                  <span>{option.label}</span>
                                  <small>{option.rate}</small>
                                </button>
                              ))}
                            </div>
                            <div className="send-fee-total">
                              <span>Estimated fee</span>
                              <strong>{selectedFee.fee} BTC</strong>
                            </div>
                          </div>
                          {stage === 'enter-address' && (
                            <button className="tx-sim-btn primary" type="button" onClick={handleFormAction} disabled={softwareLocked || recipient.trim() !== MARIA_ADDRESS}>
                              <span>Next</span><ArrowRight size={16} strokeWidth={2.4} />
                            </button>
                          )}
                          {stage === 'enter-amount' && (
                            <button className="tx-sim-btn primary" type="button" onClick={handleFormAction} disabled={softwareLocked || amount.trim() !== SEND_AMOUNT}>
                              <span>Next</span><ArrowRight size={16} strokeWidth={2.4} />
                            </button>
                          )}
                          {stage === 'select-fee' && (
                            <button className="tx-sim-btn primary" type="button" onClick={handleFormAction} disabled={softwareLocked || !formValid}>
                              <span>Review transaction</span><ArrowRight size={16} strokeWidth={2.4} />
                            </button>
                          )}
                        </div>
                      )}

                      {walletTab === 'send' && transactionBuilt && !sent && (
                        <div className="send-review-screen">
                          <div className="send-form-heading">
                            <div className="send-form-title"><ReceiptText size={18} strokeWidth={2} /><span>Review transaction</span></div>
                            <span className="send-review-status">Ready to sign</span>
                          </div>
                          <div className="tx-sim-confirm-box">
                            <div className="tx-confirm-row">
                              <span>Recipient</span>
                              <strong className="tx-confirm-addr">{MARIA_ADDRESS.slice(0, 12)}…{MARIA_ADDRESS.slice(-8)}</strong>
                            </div>
                            <div className="tx-confirm-row"><span>Amount</span><strong>{SEND_AMOUNT} BTC</strong></div>
                            <div className="tx-confirm-row"><span>Network fee</span><strong>{selectedFee.fee} BTC</strong></div>
                            <div className="tx-confirm-row total">
                              <span>Total</span>
                              <strong>{(Number(SEND_AMOUNT) + Number(selectedFee.fee)).toFixed(8)} BTC</strong>
                            </div>
                          </div>
                          <p className="tx-sim-body">The hardware wallet must review and approve this transaction before it can be broadcast.</p>
                          <button
                            className="tx-sim-btn primary"
                            type="button"
                            onClick={handleSendToHardware}
                            disabled={softwareLocked || stage !== 'review-tx'}
                          >
                            <ShieldCheck size={16} strokeWidth={2.2} />
                            <span>Review on hardware wallet</span>
                          </button>
                        </div>
                      )}

                      {walletTab === 'send' && sent && (
                        <div className="tx-sim-screen tx-sim-success-screen send-success-screen">
                          <CheckCircle2 size={38} strokeWidth={1.6} />
                          <span className="tx-sim-success-title">Payment sent</span>
                          <p className="tx-sim-success-body">{SEND_AMOUNT} BTC was approved by the hardware wallet and broadcast to Maria's address.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {isMobile && cableEl}
              <div className="device-caption">Wallet software</div>
            </div>

            {!isMobile && cableEl}

            <div className="connect-device-stage phase-linked">
              <div className="connect-device-row">
                <HardwareWallet
                  mode="withdraw"
                  initialPhase="ready-menu"
                  locked={deviceLocked}
                  expectedAction={expectedAction}
                  sendRequest={sendRequest}
                  sendAddress={MARIA_ADDRESS}
                  sendAmount={SEND_AMOUNT}
                  sendFee={selectedFee.fee}
                  onSendConfirm={handleHardwareConfirm}
                  onUnexpectedAction={handleUnexpectedAction}
                  onComplete={() => {}}
                />
              </div>
            </div>
          </div>
        )}

        <div className="mentor-row">
          <div
            key="maria"
            ref={portraitRef}
            className="mentor-portrait mentor-portrait-enter"
            aria-label="Maria, your mentor"
            role="img"
          >
            <div className="mentor-portrait-glow" />
            <div className="mentor-portrait-ring">
              <img className="mentor-portrait-image" src={mariaPortrait} alt="Maria, your mentor" />
            </div>
            <div className="mentor-portrait-badge">Maria</div>
          </div>
          <div
            ref={bubbleRef}
            className={`mentor-bubble ${canContinue ? 'is-ready' : ''}`}
            onClick={handleContinue}
          >
            <div className="mentor-bubble-content" key={bubbleKey}>
              <span className="mentor-bubble-name">Maria</span>
              <div className="mentor-bubble-text-wrap">
                <p className="mentor-bubble-text-ghost">{message}</p>
                <p className="mentor-bubble-text">
                  {displayed}
                  {!done && <span className="typewriter-cursor" />}
                </p>
              </div>
            </div>
            {canContinue && (
              <button
                className="bubble-next ready"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleContinue();
                }}
                aria-label={stage === 'finished' ? 'Complete mission' : 'Continue'}
              >
                {stage === 'finished' ? <Check size={18} strokeWidth={2.5} /> : <ChevronRight size={18} strokeWidth={2.5} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
