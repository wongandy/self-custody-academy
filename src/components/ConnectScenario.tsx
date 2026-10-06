import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, ChevronRight, Link2 } from 'lucide-react';
import HardwareWallet from '@/components/HardwareWallet';
import andyPortrait from '@/components/Andy.webp';
import mariaPortrait from '@/components/Maria.webp';

type ConnectScenarioProps = {
  completed: boolean;
  onComplete: () => void;
};

type Step =
  | { kind: 'mentor'; mentor: 'andy' | 'maria' }
  | { kind: 'connect-request' }
  | { kind: 'device-prompt' }
  | { kind: 'connected' }
  | { kind: 'recap' };

const HANDOFF_MESSAGES = [
  "Now let's get your hardware wallet connected. But before we do that I'd like to introduce you to a colleague of mine.",
  "She'll be the one to teach you all about the connecting part — I'll let her take it from here.",
];

const MARIA_MESSAGES = [
  "Hi, I'm Maria! I run this academy together with Andy, and I specialise in helping people move their Bitcoin safely.",
  "A wallet interface is simply an app that lets you view and manage your Bitcoin — your balance, your history, your payments. Yours is already running on your laptop, so let's take a look inside it.",
];

const BLOCKED_MESSAGE = "We'll cover sending and receiving Bitcoin in the upcoming missions — for now, let's finish connecting your device.";

const CONNECT_DEVICE_MESSAGE = "This is the Transactions tab — your account history. Every payment in or out shows up here with its date and amount. It's empty because the app isn't linked to your device yet, so click the Connect hardware wallet button to send the pairing request.";

const DEVICE_PROMPT_MESSAGE = "The request woke your device up — it's asking you to confirm. Only allow a connection you started yourself. Press the checkmark on the device to approve it.";

const WALLET_CONNECTED_MESSAGE = "There it is — the 0.04998 BTC you loaded onto the device is now showing in your Transactions tab. Your keys never left the device; the app is simply a window onto it.";

const WALLET_RECAP_MESSAGE = "Remember: the wallet app holds no keys of its own. It only asks your device to sign. That's why you confirm on the device, not the computer — exactly what you just did. Great job!";

const STEPS: Step[] = [
  { kind: 'mentor', mentor: 'andy' },
  { kind: 'mentor', mentor: 'andy' },
  { kind: 'mentor', mentor: 'maria' },
  { kind: 'mentor', mentor: 'maria' },
  { kind: 'connect-request' },
  { kind: 'device-prompt' },
  { kind: 'connected' },
  { kind: 'recap' },
];

const WALLET_BALANCE = '0.04998';
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
    case 'connect-request':
      return CONNECT_DEVICE_MESSAGE;
    case 'device-prompt':
      return DEVICE_PROMPT_MESSAGE;
    case 'connected':
      return WALLET_CONNECTED_MESSAGE;
    case 'recap':
      return WALLET_RECAP_MESSAGE;
  }
}

export default function ConnectScenario({ onComplete }: ConnectScenarioProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [connectRequested, setConnectRequested] = useState(false);
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const step = STEPS[stepIndex];
  const mentorName = step.kind === 'mentor' && step.mentor === 'andy' ? 'Andy' : 'Maria';
  const portrait = mentorName === 'Andy' ? andyPortrait : mariaPortrait;
  const message = blocked ? BLOCKED_MESSAGE : stepMessage(step, stepIndex);
  const { displayed, done, skip } = useTypewriter(message);

  const laptopVisible = stepIndex >= STEPS.findIndex((s) => s.kind === 'connect-request');
  const spotlight = !laptopVisible;
  const deviceVisible = stepIndex >= STEPS.findIndex((s) => s.kind === 'connect-request');
  const requestPending = step.kind === 'connect-request' && !connectRequested;
  const confirmPending = step.kind === 'device-prompt' && (!connected || syncing);
  const devicePending = requestPending || confirmPending;

  const canContinue = done && (blocked || !devicePending);

  const portraitRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const flipRects = useRef<{ portrait: DOMRect; bubble: DOMRect } | null>(null);

  const handleContinue = useCallback(() => {
    if (!done) {
      skip();
      return;
    }
    if (blocked) {
      setBlocked(false);
      return;
    }
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
  }, [done, skip, blocked, step, stepIndex, devicePending, onComplete]);

  const handleRequestConnect = () => {
    if (connectRequested) return;
    setConnectRequested(true);
    setStepIndex((current) => (STEPS[current].kind === 'connect-request' ? current + 1 : current));
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

  return (
    <main className={`scenario-page scenario-page-fit ${spotlight ? '' : 'scenario-page-connect'}`}>
      <div className={`scenario-mentor-layout ${spotlight ? 'spotlight' : ''}`}>
        {laptopVisible && (
          <div className="connect-duo">
            <div className="wallet-laptop laptop-enter">
              <div className="wallet-window">
                <div className="wallet-window-titlebar">
                  <span className="tl-dot red" />
                  <span className="tl-dot yellow" />
                  <span className="tl-dot green" />
                </div>
                <div className="wallet-window-body">
                  <aside className="wallet-sidebar">
                    <button
                      type="button"
                      className="wallet-nav-item active"
                      onClick={() => setBlocked(false)}
                      aria-pressed="true"
                    >
                      <ArrowLeftRight strokeWidth={2.2} />
                      <span className="wallet-nav-label">Transactions</span>
                    </button>
                    <button
                      type="button"
                      className="wallet-nav-item"
                      onClick={() => setBlocked(true)}
                      aria-pressed="false"
                    >
                      <ArrowUpRight strokeWidth={2.2} />
                      <span className="wallet-nav-label">Send</span>
                    </button>
                    <button
                      type="button"
                      className="wallet-nav-item"
                      onClick={() => setBlocked(true)}
                      aria-pressed="false"
                    >
                      <ArrowDownLeft strokeWidth={2.2} />
                      <span className="wallet-nav-label">Receive</span>
                    </button>
                  </aside>
                  <div className="wallet-canvas">
                    <div className="wallet-transactions">
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
                                <td colSpan={3} className="wallet-tx-empty-cell">
                                  <div className="wallet-tx-empty">
                                    <span>Connect your hardware wallet to see your history</span>
                                    <button
                                      type="button"
                                      className={requestPending ? 'wallet-connect-btn attention' : 'wallet-connect-btn'}
                                      onClick={handleRequestConnect}
                                    >
                                      <Link2 size={14} strokeWidth={2.2} />
                                      <span>Connect hardware wallet</span>
                                    </button>
                                  </div>
                                </td>
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
                  </div>
                </div>
              </div>
            </div>

            {deviceVisible && (
              <div
                className={`connect-cable${syncing ? ' is-syncing' : ''}`}
                aria-hidden="true"
              >
                <svg
                  className="connect-cable-wire connect-cable-wire-h"
                  viewBox="0 0 100 40"
                  preserveAspectRatio="none"
                >
                  <path className="cable-line" d="M0 20 C 24 20, 28 32, 50 32 S 76 20, 100 20" pathLength={100} />
                  <path className="cable-pulse" d="M0 20 C 24 20, 28 32, 50 32 S 76 20, 100 20" pathLength={100} />
                </svg>
                <svg
                  className="connect-cable-wire connect-cable-wire-v"
                  viewBox="0 0 40 100"
                  preserveAspectRatio="none"
                >
                  <path className="cable-line" d="M20 0 C 20 24, 32 28, 32 50 S 20 76, 20 100" pathLength={100} />
                  <path className="cable-pulse" d="M20 0 C 20 24, 32 28, 32 50 S 20 76, 20 100" pathLength={100} />
                </svg>
                <span className="connect-cable-plug plug-start" />
                <span className="connect-cable-plug plug-end" />
              </div>
            )}

            {deviceVisible && (
              <div className="connect-device-stage">
                <HardwareWallet
                  mode="withdraw"
                  initialPhase="ready-menu"
                  connectRequest={connectRequested}
                  onConnectConfirm={handleDeviceConfirm}
                  onComplete={() => {}}
                />
              </div>
            )}
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
