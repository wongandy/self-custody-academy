import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, ChevronRight, Layers, Link2 } from 'lucide-react';
import HardwareWallet from '@/components/HardwareWallet';
import andyPortrait from '@/components/Andy.webp';
import mariaPortrait from '@/components/Maria.webp';

type ConnectScenarioProps = {
  completed: boolean;
  onComplete: () => void;
};

type Step =
  | { kind: 'mentor'; mentor: 'andy' | 'maria' }
  | { kind: 'wallet-intro' }
  | { kind: 'device-arrival' }
  | { kind: 'connect-request' }
  | { kind: 'device-prompt' }
  | { kind: 'connected' }
  | { kind: 'recap' };

type ConnectionPhase = 'idle' | 'arriving' | 'plugging' | 'seating' | 'linked';

type BootPhase = 'pending' | 'brand' | 'loading' | 'leaving' | 'ready';

const ARRIVE_MS = 760;
const PLUG_MS = 820;
const SEAT_MS = 700;

const BOOT_BRAND_MS = 1200;
const BOOT_LOAD_MS = 1300;
const BOOT_FADE_MS = 460;

const CONNECTION_DELAYS: Record<ConnectionPhase, number> = {
  idle: ARRIVE_MS,
  arriving: PLUG_MS,
  plugging: SEAT_MS,
  seating: SEAT_MS,
  linked: SEAT_MS,
};

const HANDOFF_MESSAGES = [
  "Now let's connect your hardware wallet to a wallet software. But before we do that I'd like to introduce you to a colleague of mine.",
  "She'll be the one to teach you all about the connecting part — I'll let her take it from here.",
];

const MARIA_MESSAGES = [
  "Hi, I'm Maria! I run this academy together with Andy, and I specialise in helping people move their Bitcoin safely.",
  "A wallet software is simply an app that lets you view and manage your Bitcoin — your balance, your history, your payments.",
  "We'll be using one you already have installed on your laptop called Cairn. Let's open it and take a look inside.",
];

const WALLET_WAITING_MESSAGE = "Let's wait for it to finish initializing.";

const WALLET_INTRO_MESSAGE =
  'This is the Transactions tab. Every sending or receiving transaction your wallet is involved will show up here.';

const DEVICE_ARRIVAL_MESSAGE =
  "But first we need to plug our hardware wallet into the laptop and pair it with the app in order to see your wallet's transaction history. Let's do that.";

const BLOCKED_MESSAGE = "We'll cover sending and receiving Bitcoin in the upcoming missions — for now, let's finish connecting your device.";

const CONNECT_DEVICE_MESSAGE =
  'Your hardware wallet is now connected to the laptop. Click the Connect hardware wallet button on the app to send the pairing request.';

const DEVICE_PROMPT_MESSAGE = "Now confirm the pairing request on your hardware wallet by pressing the checkmark button.";

const WALLET_CONNECTED_MESSAGE = "Nicely done! You have successfully paired your hardware wallet with the Cairn wallet software.";

const WALLET_RECAP_MESSAGE = "Remember: the wallet app holds no keys of its own. It only asks your device to sign. That's why you confirm on the device, not the computer — exactly what you just did. Great job!";

const STEPS: Step[] = [
  { kind: 'mentor', mentor: 'andy' },
  { kind: 'mentor', mentor: 'andy' },
  { kind: 'mentor', mentor: 'maria' },
  { kind: 'mentor', mentor: 'maria' },
  { kind: 'mentor', mentor: 'maria' },
  { kind: 'wallet-intro' },
  { kind: 'device-arrival' },
  { kind: 'connect-request' },
  { kind: 'device-prompt' },
  { kind: 'connected' },
  { kind: 'recap' },
];

const WALLET_INTRO_INDEX = STEPS.findIndex((s) => s.kind === 'wallet-intro');

const WALLET_BALANCE = '0.04998';
const WALLET_APP_NAME = 'Cairn';
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
    case 'wallet-intro':
      return WALLET_INTRO_MESSAGE;
    case 'device-arrival':
      return DEVICE_ARRIVAL_MESSAGE;
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
  const [connection, setConnection] = useState<ConnectionPhase>('idle');
  const [arrivalStarted, setArrivalStarted] = useState(false);
  const [bootPhase, setBootPhase] = useState<BootPhase>('pending');
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = STEPS[stepIndex];
  const mentorName = step.kind === 'mentor' && step.mentor === 'andy' ? 'Andy' : 'Maria';
  const portrait = mentorName === 'Andy' ? andyPortrait : mariaPortrait;
  // Maria asks the learner to wait until Cairn has finished starting up, then
  // explains the Transactions tab once the app is on screen.
  const walletBooting = step.kind === 'wallet-intro' && bootPhase !== 'ready';
  const message = blocked
    ? BLOCKED_MESSAGE
    : walletBooting
      ? WALLET_WAITING_MESSAGE
      : stepMessage(step, stepIndex);
  const { displayed, done, skip } = useTypewriter(message);

  const walletVisible = stepIndex >= WALLET_INTRO_INDEX;
  const spotlight = !walletVisible;
  const showCable = connection === 'plugging' || connection === 'seating' || connection === 'linked';
  const connecting = step.kind === 'device-arrival' && arrivalStarted && connection !== 'linked';

  // Nothing on the laptop, device or phone responds until the mentor has finished talking
  // and Cairn has finished starting up.
  const interactionLocked = !done || connecting || walletBooting;

  const requestPending = step.kind === 'connect-request' && !connectRequested;
  const confirmPending = step.kind === 'device-prompt' && (!connected || syncing);
  const devicePending = requestPending || confirmPending;

  const canContinue = done && !walletBooting && (blocked || (!devicePending && !connecting));

  const portraitRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const flipRects = useRef<{ portrait: DOMRect; bubble: DOMRect } | null>(null);

  // The device slides in, the cord plugs into the laptop, then the device meets the cord.
  // The device stays off screen until the learner continues from Maria's explanation.
  useEffect(() => {
    if (step.kind !== 'device-arrival' || !arrivalStarted) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (connection !== 'linked') setConnection('linked');
      return;
    }

    const order: ConnectionPhase[] = ['idle', 'arriving', 'plugging', 'seating', 'linked'];
    const nextIndex = order.indexOf(connection) + 1;
    if (nextIndex >= order.length) return;

    const timer = setTimeout(() => setConnection(order[nextIndex]), CONNECTION_DELAYS[connection]);
    return () => clearTimeout(timer);
  }, [step.kind, connection, arrivalStarted]);

  // The moment the cord finishes seating, Maria moves on to the pairing request on her own.
  useEffect(() => {
    if (step.kind !== 'device-arrival' || connection !== 'linked') return;
    setStepIndex((current) => (STEPS[current].kind === 'device-arrival' ? current + 1 : current));
  }, [step.kind, connection]);

  // The device has confirmed the pairing and the sync animation has run its course:
  // the balance and history are on screen, so Maria moves to her connected line on her own.
  useEffect(() => {
    if (step.kind !== 'device-prompt' || !connected || syncing) return;
    setStepIndex((current) => (STEPS[current].kind === 'device-prompt' ? current + 1 : current));
  }, [step.kind, connected, syncing]);

  // The app boots once the wallet window is on screen: brand mark, a short load,
  // then the tabs and history fade in. Leaving the mission unmounts this component,
  // so the sequence replays on every visit.
  useEffect(() => {
    if (!walletVisible) return;

    if (bootPhase === 'pending') {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setBootPhase('ready');
        return;
      }
      setBootPhase('brand');
      return;
    }

    if (bootPhase === 'ready') return;

    const delay = bootPhase === 'brand' ? BOOT_BRAND_MS : bootPhase === 'loading' ? BOOT_LOAD_MS : BOOT_FADE_MS;
    const timer = setTimeout(() => {
      setBootPhase((current) => {
        if (current === 'brand') return 'loading';
        if (current === 'loading') return 'leaving';
        return 'ready';
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [walletVisible, bootPhase]);

  const handleContinue = useCallback(() => {
    if (!done) {
      skip();
      return;
    }
    if (walletBooting) return;
    if (blocked) {
      setBlocked(false);
      return;
    }
    if (step.kind === 'device-arrival' && !arrivalStarted) {
      setArrivalStarted(true);
      return;
    }
    if (devicePending || connecting) return;
    if (step.kind === 'recap') {
      onComplete();
      return;
    }
    if (step.kind === 'mentor' && stepIndex === WALLET_INTRO_INDEX - 1 && portraitRef.current && bubbleRef.current) {
      flipRects.current = {
        portrait: portraitRef.current.getBoundingClientRect(),
        bubble: bubbleRef.current.getBoundingClientRect(),
      };
    }
    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
  }, [done, skip, walletBooting, blocked, step, stepIndex, arrivalStarted, devicePending, connecting, onComplete]);

  const handleRequestConnect = () => {
    if (interactionLocked || connectRequested) return;
    setConnectRequested(true);
    setStepIndex((current) => (STEPS[current].kind === 'connect-request' ? current + 1 : current));
  };

  const handleDeviceConfirm = () => {
    setConnected(true);
    setSyncing(true);
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => setSyncing(false), 1800);
  };

  useEffect(() => () => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
  }, []);

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
        {walletVisible && (
          <div className={`connect-duo ${interactionLocked ? 'is-locked' : ''}`}>
            <div className="wallet-laptop laptop-enter">
              <div className="wallet-window">
                <div className="wallet-window-titlebar">
                  <span className="tl-dot red" />
                  <span className="tl-dot yellow" />
                  <span className="tl-dot green" />
                </div>
                <div className="wallet-window-body">
                  {bootPhase !== 'ready' && (
                    <div
                      className={`wallet-splash${bootPhase === 'leaving' ? ' is-leaving' : ''}`}
                      aria-live="polite"
                      aria-label={`${WALLET_APP_NAME} is starting up`}
                    >
                      <div className="wallet-splash-brand">
                        <span className="wallet-splash-mark">
                          <Layers strokeWidth={2} />
                        </span>
                        <span className="wallet-splash-name">{WALLET_APP_NAME}</span>
                      </div>
                      <div className={`wallet-splash-loader${bootPhase === 'loading' ? ' is-loading' : ''}`}>
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  )}
                  <div className={`wallet-app${bootPhase === 'leaving' ? ' is-entering' : ''}`} aria-hidden={bootPhase !== 'ready'}>
                    <aside className="wallet-sidebar">
                    <button
                      type="button"
                      className="wallet-nav-item active"
                      onClick={() => setBlocked(false)}
                      disabled={interactionLocked}
                      aria-pressed="true"
                    >
                      <ArrowLeftRight strokeWidth={2.2} />
                      <span className="wallet-nav-label">Transactions</span>
                    </button>
                    <button
                      type="button"
                      className="wallet-nav-item"
                      onClick={() => setBlocked(true)}
                      disabled={interactionLocked}
                      aria-pressed="false"
                    >
                      <ArrowUpRight strokeWidth={2.2} />
                      <span className="wallet-nav-label">Send</span>
                    </button>
                    <button
                      type="button"
                      className="wallet-nav-item"
                      onClick={() => setBlocked(true)}
                      disabled={interactionLocked}
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
                                      disabled={interactionLocked || step.kind !== 'connect-request'}
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
            </div>

            <div
              className={`connect-cable ${arrivalStarted && showCable ? `is-${connection}` : 'is-dormant'}${syncing ? ' is-syncing' : ''}`}
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

            <div
              className={`connect-device-stage ${!arrivalStarted || connection === 'idle' ? 'is-dormant' : `phase-${connection}`}`}
            >
              <HardwareWallet
                mode="withdraw"
                initialPhase="ready-menu"
                locked={interactionLocked}
                connectRequest={connectRequested}
                onConnectConfirm={handleDeviceConfirm}
                onComplete={() => {}}
              />
            </div>
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
            <div className="mentor-bubble-content" key={`${mentorName}-${stepIndex}-${message}`}>
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
