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

const NUDGE_MESSAGE = "No need to do that now. Let's stick to the current sending step.";
const NUDGE_DURATION_MS = 1250;
const SEND_AMOUNT = '0.005';
const MARIA_ADDRESS = RECEIVE_ADDRESS;
const MARIA_LABEL = 'Maria';

const FEE_OPTIONS: FeeOption[] = [
  { id: 'low', label: 'Low', rate: '2 sats/vB', fee: '0.00000120' },
  { id: 'medium', label: 'Medium', rate: '8 sats/vB', fee: '0.00000480' },
  { id: 'high', label: 'High', rate: '18 sats/vB', fee: '0.00001080' },
];

const HANDOVER_LINE = 'The wallet is ready. Open the Send tab, and I will walk you through the payment from there.';
const ADDRESS_LINE = "First, enter my receiving address in the Pay to field. You can use the address card above the form to avoid typing mistakes.";
const AMOUNT_LINE = `Now enter ${SEND_AMOUNT} BTC as the amount. This is a small practice payment, so you can focus on the review steps.`;
const FEE_LINE = 'The fee pays the network to process the transaction. Choose the medium priority option, then review the fee before building the transaction.';
const REVIEW_LINE = 'Review the recipient, amount, and fee in the wallet software. When everything matches, send the transaction to the hardware wallet for its own review.';
const HARDWARE_LINE = 'Now check each detail on the hardware wallet screen. Press the checkmark to move through the recipient, amount, and fee, then confirm the payment on the device.';
const SUCCESS_LINE = 'Excellent work. You verified the address, understood the network fee, and approved the payment on the hardware wallet. This is the complete sending habit to carry forward.';

const GUIDANCE_LINES = [
  'Today we are going to practice sending Bitcoin safely. The wallet software will prepare the payment, but the hardware wallet will protect the final approval.',
  'I will give you my receiving address and ask you to send a small amount of Bitcoin to it. Always compare the destination carefully before you approve a transaction.',
  'A transaction fee is paid to the Bitcoin network so miners can include the payment in a block. A higher fee can help a transaction confirm sooner, but it also costs more.',
  HANDOVER_LINE,
  ADDRESS_LINE,
  AMOUNT_LINE,
  FEE_LINE,
  REVIEW_LINE,
  HARDWARE_LINE,
  SUCCESS_LINE,
];

const HANDOVER_INDEX = Math.max(GUIDANCE_LINES.indexOf(HANDOVER_LINE), GUIDANCE_LINES.length - 1);
const ADDRESS_INDEX = GUIDANCE_LINES.indexOf(ADDRESS_LINE);
const AMOUNT_INDEX = GUIDANCE_LINES.indexOf(AMOUNT_LINE);
const FEE_INDEX = GUIDANCE_LINES.indexOf(FEE_LINE);
const REVIEW_INDEX = GUIDANCE_LINES.indexOf(REVIEW_LINE);
const HARDWARE_INDEX = GUIDANCE_LINES.indexOf(HARDWARE_LINE);
const SUCCESS_INDEX = GUIDANCE_LINES.indexOf(SUCCESS_LINE);

const WALLET_BALANCE = '0.04998';
const STARTING_TRANSACTION = { date: '2026-09-21 09:48', value: '+0.04998 BTC', balance: '0.04998 BTC' };

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

export default function SendScenario({ completed, onBack, onComplete }: SendScenarioProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [walletTab, setWalletTab] = useState<'transactions' | 'send'>('transactions');
  const [recipient, setRecipient] = useState('');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [feeLevel, setFeeLevel] = useState<FeeLevel>('medium');
  const [transactionBuilt, setTransactionBuilt] = useState(false);
  const [sendRequest, setSendRequest] = useState(false);
  const [sent, setSent] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [nudgeActive, setNudgeActive] = useState(false);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const flipRects = useRef<{ portrait: DOMRect; bubble: DOMRect } | null>(null);

  const message = nudgeActive ? NUDGE_MESSAGE : GUIDANCE_LINES[lineIndex] ?? GUIDANCE_LINES[0];
  const { displayed, done, skip } = useTypewriter(message);
  const spotlight = lineIndex < HANDOVER_INDEX;
  const walletVisible = lineIndex >= HANDOVER_INDEX;
  const canContinue = !nudgeActive && done && (lineIndex < HANDOVER_INDEX || lineIndex === SUCCESS_INDEX);
  const softwareLocked = !done || lineIndex === HARDWARE_INDEX || canContinue || sent;
  const deviceLocked = !done || canContinue || (lineIndex >= HANDOVER_INDEX && lineIndex !== HARDWARE_INDEX && lineIndex !== SUCCESS_INDEX) || sent;
  const selectedFee = FEE_OPTIONS.find((option) => option.id === feeLevel) ?? FEE_OPTIONS[1];
  const formValid = recipient.trim() === MARIA_ADDRESS && label.trim().length > 0 && amount.trim() === SEND_AMOUNT;
  const expectedAction: ExpectedAction = lineIndex === HARDWARE_INDEX && sendRequest
    ? { type: 'confirm' }
    : lineIndex >= HANDOVER_INDEX && lineIndex < SUCCESS_INDEX
      ? { type: 'external' }
      : { type: 'none' };

  const handleUnexpectedAction = useCallback(() => {
    setNudgeActive(true);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    nudgeTimer.current = setTimeout(() => setNudgeActive(false), NUDGE_DURATION_MS);
  }, []);

  useEffect(() => {
    if (!nudgeActive) return;
    const timer = setTimeout(() => setNudgeActive(false), NUDGE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [nudgeActive]);

  useEffect(() => {
    if (nudgeActive) {
      setNudgeActive(false);
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    }
  }, [lineIndex]);

  useEffect(() => () => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
  }, []);

  const handleContinue = useCallback(() => {
    if (!done) {
      skip();
      return;
    }
    if (nudgeActive || !canContinue) return;
    if (lineIndex < HANDOVER_INDEX) {
      if (lineIndex === HANDOVER_INDEX - 1 && portraitRef.current && bubbleRef.current) {
        flipRects.current = {
          portrait: portraitRef.current.getBoundingClientRect(),
          bubble: bubbleRef.current.getBoundingClientRect(),
        };
      }
      setLineIndex((current) => current + 1);
      return;
    }
    if (lineIndex === SUCCESS_INDEX) onComplete();
  }, [canContinue, done, lineIndex, nudgeActive, onComplete, skip]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      event.preventDefault();
      handleContinue();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleContinue]);

  useLayoutEffect(() => {
    if (spotlight || !flipRects.current) return;
    const portrait = portraitRef.current;
    const bubble = bubbleRef.current;
    if (!portrait || !bubble) return;

    const firstPortrait = flipRects.current.portrait;
    const firstBubble = flipRects.current.bubble;
    const lastPortrait = portrait.getBoundingClientRect();
    const lastBubble = bubble.getBoundingClientRect();
    flipRects.current = null;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const options: KeyframeAnimationOptions = { duration: 560, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };

    portrait.style.transformOrigin = 'top left';
    portrait.animate([
      { transform: `translate(${firstPortrait.left - lastPortrait.left}px, ${firstPortrait.top - lastPortrait.top}px) scale(${firstPortrait.width / lastPortrait.width}, ${firstPortrait.height / lastPortrait.height})` },
      { transform: 'translate(0, 0) scale(1, 1)' },
    ], options);

    bubble.style.transformOrigin = 'top left';
    bubble.animate([
      { transform: `translate(${firstBubble.left - lastBubble.left}px, ${firstBubble.top - lastBubble.top}px) scale(${firstBubble.width / lastBubble.width}, ${firstBubble.height / lastBubble.height})` },
      { transform: 'translate(0, 0) scale(1, 1)' },
    ], options);
  }, [spotlight]);

  const advanceTo = (expectedIndex: number, nextIndex: number) => {
    if (softwareLocked || lineIndex !== expectedIndex) {
      if (!softwareLocked) handleUnexpectedAction();
      return;
    }
    setLineIndex(nextIndex);
  };

  const handleWalletTab = (tab: 'transactions' | 'send') => {
    if (softwareLocked) return;
    if (tab === 'send' && lineIndex === HANDOVER_INDEX) {
      setWalletTab('send');
      setLineIndex(ADDRESS_INDEX);
      return;
    }
    if (tab === walletTab) return;
    handleUnexpectedAction();
  };

  const handleUseAddress = () => {
    if (softwareLocked || lineIndex !== ADDRESS_INDEX) {
      if (!softwareLocked) handleUnexpectedAction();
      return;
    }
    setRecipient(MARIA_ADDRESS);
    setAddressCopied(true);
    window.setTimeout(() => setAddressCopied(false), 1600);
  };

  const handleAddressContinue = () => {
    if (recipient.trim() !== MARIA_ADDRESS) {
      handleUnexpectedAction();
      return;
    }
    advanceTo(ADDRESS_INDEX, AMOUNT_INDEX);
  };

  const handleAmountContinue = () => {
    if (amount.trim() !== SEND_AMOUNT) {
      handleUnexpectedAction();
      return;
    }
    advanceTo(AMOUNT_INDEX, FEE_INDEX);
  };

  const handleFeeSelect = (nextFee: FeeLevel) => {
    if (softwareLocked || lineIndex !== FEE_INDEX) {
      if (!softwareLocked) handleUnexpectedAction();
      return;
    }
    setFeeLevel(nextFee);
  };

  const handleBuildTransaction = () => {
    if (!formValid) {
      handleUnexpectedAction();
      return;
    }
    advanceTo(FEE_INDEX, REVIEW_INDEX);
    setTransactionBuilt(true);
  };

  const handleSendToHardware = () => {
    if (softwareLocked || !transactionBuilt || lineIndex !== REVIEW_INDEX) {
      if (!softwareLocked) handleUnexpectedAction();
      return;
    }
    setSendRequest(true);
    setLineIndex(HARDWARE_INDEX);
  };

  const handleHardwareConfirm = () => {
    if (lineIndex !== HARDWARE_INDEX) return;
    setSent(true);
    setLineIndex(SUCCESS_INDEX);
  };

  return (
    <main className={`scenario-page scenario-page-fit ${spotlight ? 'scenario-page-spotlight' : 'scenario-page-send'}`}>
      <button className="character-back" type="button" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2.4} />
        <span>Back to roadmap</span>
      </button>

      <div className={`send-scenario-layout ${spotlight ? 'spotlight' : ''}`}>
        {walletVisible && (
          <div className="send-practice-area">
            <div className="send-wallet-column">
              <div className="wallet-laptop send-wallet-laptop">
                <div className="wallet-window send-wallet-window">
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
                          onClick={() => handleWalletTab('transactions')}
                          disabled={softwareLocked}
                          aria-pressed={walletTab === 'transactions'}
                        >
                          <ArrowLeftRight strokeWidth={2.2} />
                          <span className="wallet-nav-label">Transactions</span>
                        </button>
                        <button
                          type="button"
                          className={`wallet-nav-item${walletTab === 'send' ? ' active' : ''}`}
                          onClick={() => handleWalletTab('send')}
                          disabled={softwareLocked}
                          aria-pressed={walletTab === 'send'}
                        >
                          <ArrowUpRight strokeWidth={2.2} />
                          <span className="wallet-nav-label">Send</span>
                        </button>
                        <button
                          type="button"
                          className="wallet-nav-item"
                          onClick={() => handleUnexpectedAction()}
                          disabled={softwareLocked}
                          aria-pressed="false"
                        >
                          <ArrowDownLeft strokeWidth={2.2} />
                          <span className="wallet-nav-label">Receive</span>
                        </button>
                      </aside>

                      <div className="wallet-canvas send-wallet-canvas">
                        {walletTab === 'transactions' && (
                          <div className="wallet-transactions">
                            <div className="wallet-tx-summary">
                              <div className="wallet-tx-summary-item">
                                <span className="wallet-tx-summary-label">Balance</span>
                                <span className="wallet-tx-summary-value">{sent ? '0.04497 BTC' : WALLET_BALANCE} BTC</span>
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
                                    <tr><td>2026-11-04 10:24</td><td className="out">-0.00500 BTC</td><td>0.04497 BTC</td></tr>
                                  )}
                                  <tr><td>{STARTING_TRANSACTION.date}</td><td className="in">{STARTING_TRANSACTION.value}</td><td>{STARTING_TRANSACTION.balance}</td></tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {walletTab === 'send' && !transactionBuilt && (
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
                              <button type="button" className="send-use-address" onClick={handleUseAddress} disabled={softwareLocked}>
                                {addressCopied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2} />}
                                <span>{addressCopied ? 'Added' : 'Use address'}</span>
                              </button>
                            </div>
                            <div className="send-form-fields">
                              <label className="tx-sim-field">
                                <span>Pay to</span>
                                <input className="tx-sim-addr" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="bc1…" disabled={softwareLocked} />
                              </label>
                              <label className="tx-sim-field">
                                <span>Label</span>
                                <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Required" disabled={softwareLocked} />
                              </label>
                              <label className="tx-sim-field">
                                <span>Amount</span>
                                <div className="send-amount-field"><input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.005" disabled={softwareLocked} /><span>BTC</span></div>
                              </label>
                            </div>
                            <div className="send-fee-section">
                              <div className="send-fee-heading"><span>Fee</span><span className="send-fee-explanation">Pays the network to process your payment.</span></div>
                              <div className="send-fee-options">
                                {FEE_OPTIONS.map((option) => (
                                  <button key={option.id} type="button" className={`tx-fee-btn${feeLevel === option.id ? ' active' : ''}`} onClick={() => handleFeeSelect(option.id)} disabled={softwareLocked}>
                                    <span>{option.label}</span><small>{option.rate}</small>
                                  </button>
                                ))}
                              </div>
                              <div className="send-fee-range"><span>Lower fee</span><input type="range" min="0" max="2" value={FEE_OPTIONS.findIndex((option) => option.id === feeLevel)} onChange={(event) => handleFeeSelect(FEE_OPTIONS[Number(event.target.value)]?.id ?? 'medium')} disabled={softwareLocked} /><span>Faster</span></div>
                              <div className="send-fee-total"><span>Estimated fee</span><strong>{selectedFee.fee} BTC</strong></div>
                            </div>
                            <button className="tx-sim-btn primary" type="button" onClick={handleBuildTransaction} disabled={softwareLocked || lineIndex !== FEE_INDEX || !formValid}>
                              <span>Review transaction</span><ArrowRight size={16} strokeWidth={2.4} />
                            </button>
                          </div>
                        )}

                        {walletTab === 'send' && transactionBuilt && !sent && (
                          <div className="send-review-screen">
                            <div className="send-form-heading"><div className="send-form-title"><ReceiptText size={18} strokeWidth={2} /><span>Review transaction</span></div><span className="send-review-status">Ready to sign</span></div>
                            <div className="tx-sim-confirm-box">
                              <div className="tx-confirm-row"><span>Recipient</span><strong className="tx-confirm-addr">{MARIA_ADDRESS.slice(0, 12)}…{MARIA_ADDRESS.slice(-8)}</strong></div>
                              <div className="tx-confirm-row"><span>Amount</span><strong>{SEND_AMOUNT} BTC</strong></div>
                              <div className="tx-confirm-row"><span>Network fee</span><strong>{selectedFee.fee} BTC</strong></div>
                              <div className="tx-confirm-row total"><span>Total</span><strong>{(Number(SEND_AMOUNT) + Number(selectedFee.fee)).toFixed(8)} BTC</strong></div>
                            </div>
                            <p className="tx-sim-body">The hardware wallet must review and approve this transaction before it can be broadcast.</p>
                            <button className="tx-sim-btn primary" type="button" onClick={handleSendToHardware} disabled={softwareLocked || lineIndex !== REVIEW_INDEX}><ShieldCheck size={16} strokeWidth={2.2} /><span>Review on hardware wallet</span></button>
                          </div>
                        )}

                        {sent && (
                          <div className="tx-sim-screen tx-sim-success-screen send-success-screen">
                            <CheckCircle2 size={38} strokeWidth={1.6} />
                            <span className="tx-sim-success-title">Payment sent</span>
                            <p className="tx-sim-success-body">{SEND_AMOUNT} BTC was approved by the hardware wallet and broadcast to Maria's address.</p>
                            <div className="tx-sim-receipt"><div className="tx-confirm-row"><span>Status</span><strong className="tx-confirmed">Broadcast</strong></div><div className="tx-confirm-row"><span>Fee</span><strong>{selectedFee.fee} BTC</strong></div></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="device-caption">Wallet software</div>
              </div>
            </div>

            <div className="send-hardware-column">
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
        )}

        <div className="mentor-row">
          <div ref={portraitRef} className="mentor-portrait mentor-portrait-enter" aria-label="Maria, your mentor" role="img">
            <div className="mentor-portrait-glow" />
            <div className="mentor-portrait-ring"><img className="mentor-portrait-image" src={mariaPortrait} alt="Maria, your mentor" /></div>
            <div className="mentor-portrait-badge">Maria</div>
          </div>
          <div ref={bubbleRef} className={`mentor-bubble ${canContinue ? 'is-ready' : ''}`} onClick={handleContinue}>
            <div className="mentor-bubble-content" key={nudgeActive ? 'nudge' : `maria-send-${lineIndex}-${message}`}>
              <span className="mentor-bubble-name">Maria</span>
              <div className="mentor-bubble-text-wrap"><p className="mentor-bubble-text-ghost">{message}</p><p className="mentor-bubble-text">{displayed}{!done && <span className="typewriter-cursor" />}</p></div>
            </div>
            <button className={`bubble-next ${canContinue ? 'ready' : ''}`} type="button" onClick={(event) => { event.stopPropagation(); handleContinue(); }} disabled={!canContinue} aria-label={lineIndex === SUCCESS_INDEX ? 'Complete mission' : 'Continue'}>
              {lineIndex === SUCCESS_INDEX ? <Check size={18} strokeWidth={2.5} /> : <ChevronRight size={18} strokeWidth={2.5} />}
            </button>
          </div>
        </div>

        {(completed || sent) && <div className="scenario-wallet-status active send-completion-status"><span className="scenario-wallet-status-dot" /><span>Mission completed</span></div>}
      </div>
    </main>
  );
}
