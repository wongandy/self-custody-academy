import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Check, ChevronRight, Copy, Download, QrCode, Send, Usb } from 'lucide-react';
import HardwareWallet from '@/components/HardwareWallet';
import andyPortrait from '@/components/Andy.webp';
import mariaPortrait from '@/components/Maria.webp';

type ConnectScenarioProps = {
  completed: boolean;
  onBack: () => void;
  onComplete: () => void;
};

type WalletTab = 'transactions' | 'send' | 'receive';

type Step =
  | { kind: 'mentor'; mentor: 'andy' | 'maria' }
  | { kind: 'tour'; tab: WalletTab }
  | { kind: 'connect-prompt' }
  | { kind: 'connect-device' }
  | { kind: 'connected' }
  | { kind: 'recap' };

const HANDOFF_MESSAGES = [
  "Now let's get your hardware wallet connected. But before we do that I'd like to introduce you to a colleague of mine.",
  "She'll be the one to teach you all about the connecting part — I'll let her take it from here.",
];

const MARIA_MESSAGES = [
  "Hi, I'm Maria! I run this academy together with Andy, and I specialise in helping people move their Bitcoin safely.",
  "Now that your hardware wallet is set up and funded, the next step is connecting it to a wallet app on your computer — that's what I'll walk you through.",
];

const TOUR_MESSAGES: Record<WalletTab, string> = {
  transactions: "Let's take a quick look around. First, the Transactions tab — this is your account history. Every payment in or out shows up here with its date and amount. Click it to see for yourself.",
  send: "Next, the Send tab. This is where you compose payments — who it goes to, how much, and the fee you're willing to pay. We'll practice sending in a later mission. Click over to it.",
  receive: 'Finally, the Receive tab. It shows an address others can use to pay you — like an email address for bitcoin. Click it to have a look.',
};

const CONNECT_PROMPT_MESSAGE = "Right now the app looks empty because it isn't paired with your device yet. Click Connect hardware wallet below to plug it in.";

const CONNECT_DEVICE_MESSAGE = "There's your device, asking for confirmation. Always approve a connection on the device's own screen — never trust the computer alone. Press the checkmark on the device.";

const WALLET_CONNECTED_MESSAGE = "You're connected! Notice the balance appeared — 0.04998 BTC, the same bitcoin you loaded onto the device. Your keys never left it; the app is just a window onto it.";

const WALLET_RECAP_MESSAGE = "Remember: the app on your computer holds no keys. It only asks your device to sign. That's why you confirm on the device screen, not the computer — and that's exactly what you just did. Great job!";

const STEPS: Step[] = [
  { kind: 'mentor', mentor: 'andy' },
  { kind: 'mentor', mentor: 'andy' },
  { kind: 'mentor', mentor: 'maria' },
  { kind: 'mentor', mentor: 'maria' },
  { kind: 'tour', tab: 'transactions' },
  { kind: 'tour', tab: 'send' },
  { kind: 'tour', tab: 'receive' },
  { kind: 'connect-prompt' },
  { kind: 'connect-device' },
  { kind: 'connected' },
  { kind: 'recap' },
];

const WALLET_TABS: { id: WalletTab; label: string; Icon: typeof Send }[] = [
  { id: 'transactions', label: 'Transactions', Icon: ArrowLeftRight },
  { id: 'send', label: 'Send', Icon: Send },
  { id: 'receive', label: 'Receive', Icon: Download },
];

const WALLET_BALANCE = '0.04998';
const RECEIVE_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
const FEE_RATES = [1, 1.5, 1.97, 3, 5, 8, 12, 20, 35, 60, 100];

const TRANSACTIONS = [
  { date: '2026-09-21 09:48', value: '+0.04998 BTC', balance: '0.04998 BTC', incoming: true },
];

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

function stepMessage(step: Step, stepIndex: number): string {
  switch (step.kind) {
    case 'mentor':
      if (step.mentor === 'andy') return HANDOFF_MESSAGES[stepIndex];
      return MARIA_MESSAGES[stepIndex - HANDOFF_MESSAGES.length];
    case 'tour':
      return TOUR_MESSAGES[step.tab];
    case 'connect-prompt':
      return CONNECT_PROMPT_MESSAGE;
    case 'connect-device':
      return CONNECT_DEVICE_MESSAGE;
    case 'connected':
      return WALLET_CONNECTED_MESSAGE;
    case 'recap':
      return WALLET_RECAP_MESSAGE;
  }
}

export default function ConnectScenario({ onBack, onComplete }: ConnectScenarioProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<WalletTab>('transactions');
  const [visited, setVisited] = useState<Record<WalletTab, boolean>>({
    transactions: false,
    send: false,
    receive: false,
  });
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const step = STEPS[stepIndex];
  const mentorName = step.kind === 'mentor' && step.mentor === 'andy' ? 'Andy' : 'Maria';
  const portrait = mentorName === 'Andy' ? andyPortrait : mariaPortrait;
  const message = stepMessage(step, stepIndex);
  const { displayed, done, skip } = useTypewriter(message);

  const laptopVisible = stepIndex >= STEPS.findIndex((s) => s.kind === 'tour');
  const spotlight = !laptopVisible;
  const deviceVisible = step.kind === 'connect-device' || step.kind === 'connected';
  const devicePending = step.kind === 'connect-device' && (!connected || syncing);

  const canContinue = done
    && step.kind !== 'connect-prompt'
    && !(step.kind === 'tour' && !visited[step.tab])
    && !devicePending;

  const portraitRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const flipRects = useRef<{ portrait: DOMRect; bubble: DOMRect } | null>(null);

  useEffect(() => {
    if (step.kind === 'tour') setActiveTab(step.tab);
  }, [step]);

  const handleContinue = useCallback(() => {
    if (!done) {
      skip();
      return;
    }
    if (step.kind === 'tour' && !visited[step.tab]) return;
    if (step.kind === 'connect-prompt') return;
    if (devicePending) return;
    if (step.kind === 'recap') {
      onComplete();
      return;
    }
    if (step.kind === 'mentor' && stepIndex === 3 && portraitRef.current && bubbleRef.current) {
      flipRects.current = {
        portrait: portraitRef.current.getBoundingClientRect(),
        bubble: bubbleRef.current.getBoundingClientRect(),
      };
    }
    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
  }, [done, skip, step, stepIndex, visited, devicePending, onComplete]);

  const handleTabClick = (tab: WalletTab) => {
    setActiveTab(tab);
    if (step.kind === 'tour' && tab === step.tab) {
      setVisited((v) => ({ ...v, [tab]: true }));
    }
  };

  const handleConnectClick = () => {
    if (!done || connected) return;
    setStepIndex((current) => current + 1);
  };

  const handleDeviceConfirm = () => {
    setConnected(true);
    setSyncing(true);
    setTimeout(() => setSyncing(false), 1800);
  };

  // Maria glides from the large spotlight portrait down to the compact row beneath the wallet window.
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

    const opts: KeyframeAnimationOptions = {
      duration: 560,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    };

    portraitEl.style.transformOrigin = 'top left';
    portraitEl.animate(
      [
        {
          transform: `translate(${pFirst.left - pLast.left}px, ${pFirst.top - pLast.top}px) scale(${pFirst.width / pLast.width}, ${pFirst.height / pLast.height})`,
        },
        { transform: 'translate(0, 0) scale(1, 1)' },
      ],
      opts,
    );

    bubbleEl.style.transformOrigin = 'top left';
    bubbleEl.animate(
      [
        {
          transform: `translate(${bFirst.left - bLast.left}px, ${bFirst.top - bLast.top}px) scale(${bFirst.width / bLast.width}, ${bFirst.height / bLast.height})`,
        },
        { transform: 'translate(0, 0) scale(1, 1)' },
      ],
      opts,
    );
  }, [spotlight]);

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

  const handleCopy = () => {
    navigator.clipboard?.writeText(RECEIVE_ADDRESS).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className={`scenario-page scenario-page-fit ${spotlight ? 'scenario-page-spotlight' : 'scenario-page-wallet'} ${deviceVisible ? 'scenario-page-connect' : ''}`}>
      <div className={`scenario-mentor-layout ${spotlight ? 'spotlight' : ''}`}>
        {laptopVisible && (
          <div className="wallet-laptop laptop-enter">
            <div className="wallet-window">
              <div className="wallet-window-titlebar">
                <span className="tl-dot red" />
                <span className="tl-dot yellow" />
                <span className="tl-dot green" />
              </div>
              <div className="wallet-window-body">
                <aside className="wallet-sidebar">
                  {WALLET_TABS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      className={`wallet-nav-item ${activeTab === id ? 'active' : ''}`}
                      onClick={() => handleTabClick(id)}
                      aria-pressed={activeTab === id}
                    >
                      <Icon strokeWidth={2.2} />
                      <span className="wallet-nav-label">{label}</span>
                    </button>
                  ))}
                </aside>
                <div className="wallet-canvas">
                  {activeTab === 'transactions' ? (
                    <div key={activeTab} className="wallet-transactions">
                      <div className="wallet-tx-summary">
                        <div className="wallet-tx-summary-item">
                          <span className="wallet-tx-summary-label">Balance</span>
                          <span className="wallet-tx-summary-value">{connected ? `${WALLET_BALANCE} BTC` : '—'}</span>
                        </div>
                        <div className="wallet-tx-summary-item">
                          <span className="wallet-tx-summary-label">Transactions</span>
                          <span className="wallet-tx-summary-value">{connected ? TRANSACTIONS.length : 0}</span>
                        </div>
                      </div>
                      <div className="wallet-tx-table-wrap">
                        <table className="wallet-tx-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Value</th>
                              <th>Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {connected ? (
                              TRANSACTIONS.map((tx) => (
                                <tr key={tx.date}>
                                  <td>{tx.date}</td>
                                  <td className={tx.incoming ? 'in' : 'out'}>{tx.value}</td>
                                  <td>{tx.balance}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3} className="wallet-tx-empty">Connect your hardware wallet to see your history</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        {syncing && (
                          <div className="wallet-sync-overlay">
                            <div className="tx-spinner sm" />
                            <span>Syncing with device…</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : activeTab === 'send' ? (
                    <div key={activeTab} className="wallet-send-form">
                      <div className="wallet-send-heading">Send</div>

                      <label className="wallet-send-field">
                        <span>Pay to:</span>
                        <input type="text" aria-label="Pay to" />
                      </label>

                      <label className="wallet-send-field wallet-send-amount-field">
                        <span>Amount:</span>
                        <div className="wallet-send-amount-control">
                          <input type="text" inputMode="decimal" aria-label="Amount" />
                          <span className="wallet-send-unit">BTC</span>
                        </div>
                      </label>

                      <div className="wallet-send-fee-section">
                        <div className="wallet-send-fee-title">Fee</div>
                        <label className="wallet-send-slider-label" htmlFor="fee-rate">
                          <span>Range:</span>
                          <input
                            id="fee-rate"
                            type="range"
                            min="0"
                            max={FEE_RATES.length - 1}
                            step="1"
                            defaultValue={2}
                          />
                        </label>
                        <div className="wallet-send-slider-scale" aria-hidden="true">
                          {FEE_RATES.map((rate) => <span key={rate}>{rate}</span>)}
                        </div>

                        <div className="wallet-send-fee-row">
                          <span>Rate:</span>
                          <strong>1.97 sats/vB</strong>
                          <span className="wallet-send-priority">Medium priority</span>
                        </div>
                        <div className="wallet-send-fee-row">
                          <span>Fee:</span>
                          <strong>0.00002758 BTC</strong>
                        </div>
                      </div>

                      <button className="wallet-create-transaction" type="button">
                        Create transaction
                      </button>
                    </div>
                  ) : (
                    <div key={activeTab} className="wallet-receive">
                      <div className="wallet-receive-card">
                        <div className="wallet-receive-qr">
                          <QrCode size={72} strokeWidth={1.2} />
                        </div>
                        <div className="wallet-receive-addr-row">
                          <span className="wallet-receive-addr">{RECEIVE_ADDRESS}</span>
                          <button
                            type="button"
                            className={copied ? 'wallet-receive-copy copied' : 'wallet-receive-copy'}
                            onClick={handleCopy}
                          >
                            {copied ? <Check size={12} strokeWidth={2.6} /> : <Copy size={12} strokeWidth={2.2} />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <p className="wallet-receive-note">Share this address to get paid. Each address is one-time use.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {step.kind === 'connect-prompt' && !connected && (
                <div className="wallet-connect-cta">
                  <button className="wallet-connect-btn" type="button" onClick={handleConnectClick} disabled={!done}>
                    <Usb size={14} strokeWidth={2.4} />
                    <span>{connected ? 'Connected' : 'Connect hardware wallet'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {deviceVisible && (
          <div className="connect-device-stage">
            <HardwareWallet
              initialPhase="connect-confirm"
              onConnectConfirm={handleDeviceConfirm}
              onComplete={() => {}}
            />
          </div>
        )}

        <div className="mentor-row">
          <div
            key={mentorName}
            ref={portraitRef}
            className="mentor-portrait mentor-portrait-enter"
            aria-label={`${mentorName}, your mentor`}
            role="img"
          >
            <div className="mentor-portrait-glow" />
            <div className="mentor-portrait-ring">
              <img className="mentor-portrait-image" src={portrait} alt={`${mentorName}, your mentor`} />
            </div>
            <div className="mentor-portrait-badge">{mentorName}</div>
          </div>
          <div
            ref={bubbleRef}
            className={`mentor-bubble ${canContinue ? 'is-ready' : ''}`}
            onClick={handleContinue}
          >
            <div className="mentor-bubble-content" key={`${mentorName}-${stepIndex}`}>
              <span className="mentor-bubble-name">{mentorName}</span>
              <div className="mentor-bubble-text-wrap">
                <p className="mentor-bubble-text-ghost">{message}</p>
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
              aria-label={step.kind === 'recap' ? 'Complete mission' : 'Continue'}
            >
              {step.kind === 'recap' ? <Check size={18} strokeWidth={2.5} /> : <ChevronRight size={18} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
