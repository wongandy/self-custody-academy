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
  CircleDollarSign,
  Construction,
  Copy,
  QrCode,
  User,
} from 'lucide-react';
import HardwareWallet, { type ExpectedAction } from '@/components/HardwareWallet';
import mariaPortrait from '@/components/Maria.webp';

type SendScenarioProps = {
  completed: boolean;
  onBack: () => void;
  onComplete: () => void;
};

const NUDGE_MESSAGE = "We'll get to that later! For now, let's stick to the current step.";
const NUDGE_DURATION_MS = 1250;

// Same placeholder structure as the receiving mission: intro lines play in the
// spotlight, and the scene line is the handover where the laptop and device
// appear. STEPS is derived from the messages, so editing the intro keeps the
// reveal on the handover line.
const INTRO_MESSAGES = ['Hi'];
const SCENE_MESSAGE = 'Hello';

type SceneStep = { kind: 'intro' } | { kind: 'scene' };
const STEPS: SceneStep[] = [
  ...INTRO_MESSAGES.map((): SceneStep => ({ kind: 'intro' })),
  { kind: 'scene' },
];
const SCENE_INDEX = Math.max(STEPS.findIndex((s) => s.kind === 'scene'), 0);

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

function SendMentorScene({ onEnterPractice }: { onEnterPractice: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [nudgeActive, setNudgeActive] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 600px)').matches);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const flipRects = useRef<{ portrait: DOMRect; bubble: DOMRect } | null>(null);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const step = STEPS[stepIndex];
  const message = nudgeActive
    ? NUDGE_MESSAGE
    : step.kind === 'intro'
      ? INTRO_MESSAGES[stepIndex] ?? ''
      : SCENE_MESSAGE;
  const { displayed, done, skip } = useTypewriter(message);

  const spotlight = step.kind === 'intro';
  const interactionLocked = !done;
  const canContinue = done && !nudgeActive;
  // The device takes no part yet: Maria is speaking, and once she finishes the
  // continue button is the expected action, so it stays locked in both cases.
  const deviceLocked = interactionLocked || canContinue;
  const softwareLocked = deviceLocked;

  const expectedAction: ExpectedAction = { type: 'none' };

  const handleUnexpectedAction = useCallback(() => {
    setNudgeActive(true);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    nudgeTimer.current = setTimeout(() => setNudgeActive(false), NUDGE_DURATION_MS);
  }, []);

  useEffect(() => {
    if (nudgeActive) {
      setNudgeActive(false);
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    }
  }, [stepIndex]);

  useEffect(() => () => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
  }, []);

  const handleContinue = useCallback(() => {
    if (!done) {
      skip();
      return;
    }
    if (nudgeActive) return;
    if (step.kind === 'intro') {
      if (stepIndex === SCENE_INDEX - 1 && portraitRef.current && bubbleRef.current) {
        flipRects.current = {
          portrait: portraitRef.current.getBoundingClientRect(),
          bubble: bubbleRef.current.getBoundingClientRect(),
        };
      }
      setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
      return;
    }
    onEnterPractice();
  }, [done, skip, nudgeActive, step.kind, stepIndex, onEnterPractice]);

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

  // Maria glides from the large spotlight portrait down to the compact row beneath the devices.
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

  const cableEl = (
    <div className={`connect-cable is-linked${isMobile ? ' cable-under-wallet' : ''}`} aria-hidden="true">
      <span className="plug-end-track">
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
        <svg
          className="connect-cable-wire connect-cable-wire-under"
          viewBox="0 0 240 48"
          preserveAspectRatio="none"
        >
          <path className="cable-line" d="M20 0 C 20 14, 28 18, 50 20 C 110 25, 180 21, 240 22" pathLength={100} />
          <path className="cable-pulse" d="M20 0 C 20 14, 28 18, 50 20 C 110 25, 180 21, 240 22" pathLength={100} />
        </svg>
        <span className="connect-cable-plug plug-start" />
        <span className="connect-cable-plug plug-end" />
      </span>
    </div>
  );

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
                        className="wallet-nav-item active"
                        onClick={() => {}}
                        disabled={softwareLocked}
                        aria-pressed="true"
                      >
                        <ArrowLeftRight strokeWidth={2.2} />
                        <span className="wallet-nav-label">Transactions</span>
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
                      <button
                        type="button"
                        className="wallet-nav-item"
                        onClick={handleUnexpectedAction}
                        disabled={softwareLocked}
                        aria-pressed="false"
                      >
                        <ArrowUpRight strokeWidth={2.2} />
                        <span className="wallet-nav-label">Send</span>
                      </button>
                    </aside>
                    <div className="wallet-canvas">
                      <div className="wallet-transactions">
                        <div className="wallet-tx-summary">
                          <div className="wallet-tx-summary-item">
                            <span className="wallet-tx-summary-label">Balance</span>
                            <span className="wallet-tx-summary-value">{WALLET_BALANCE} BTC</span>
                          </div>
                          <div className="wallet-tx-summary-item">
                            <span className="wallet-tx-summary-label">Transactions</span>
                            <span className="wallet-tx-summary-value">{TRANSACTIONS.length}</span>
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
                              {TRANSACTIONS.map((tx) => (
                                <tr key={tx.date}>
                                  <td>{tx.date}</td>
                                  <td className={tx.incoming ? 'in' : 'out'}>{tx.value}</td>
                                  <td>{tx.balance}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {isMobile && cableEl}
          </div>
        )}

        {!spotlight && (
          <>
            {!isMobile && cableEl}

            <div className="connect-device-stage phase-linked">
              <div className="connect-device-row">
                <HardwareWallet
                  mode="withdraw"
                  initialPhase="ready-menu"
                  locked={deviceLocked}
                  expectedAction={expectedAction}
                  onUnexpectedAction={handleUnexpectedAction}
                  onComplete={() => {}}
                />
              </div>
            </div>
          </>
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
            <div className="mentor-bubble-content" key={nudgeActive ? 'nudge' : `maria-${stepIndex}-${message}`}>
              <span className="mentor-bubble-name">Maria</span>
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
              aria-label={step.kind === 'scene' ? 'Continue to practice' : 'Continue'}
            >
              {step.kind === 'scene' ? <Check size={18} strokeWidth={2.5} /> : <ChevronRight size={18} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function SendPractice({
  completed,
  onBack,
  onComplete,
}: {
  completed: boolean;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<'intro' | 'confirm' | 'sent' | 'done'>('intro');
  const [copied, setCopied] = useState(false);

  const SIM_ADDRESS = 'bc1qcharlie...8mk2';

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="scenario-page">
      <button className="character-back" type="button" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2.4} />
        <span>Back to roadmap</span>
      </button>

      <section className="scenario-card">
        <div className="scenario-card-topline">
          <span>Mission 06 · Sending BTC</span>
          <span><CircleDollarSign size={14} /> Simulation only</span>
        </div>
        <div className="scenario-wallet-layout">
          <div className="scenario-wallet-info">
            <span className="roadmap-label">Your final mission</span>
            <h1>Sending BTC</h1>
            <p className="scenario-lede">
              Sending bitcoin is where careful habits matter most. This mission will walk you through building, signing, and broadcasting a payment from your connected hardware wallet.
            </p>
            <div className="scenario-wallet-tips">
              <div className="scenario-wallet-tip">
                <ArrowUpRight size={16} />
                <span>Build the transaction in your wallet app, then review the details on your hardware wallet screen before signing.</span>
              </div>
              <div className="scenario-wallet-tip">
                <Check size={16} />
                <span>Always verify the full address on the device screen — not just the first and last characters.</span>
              </div>
              <div className="scenario-wallet-tip">
                <Construction size={16} />
                <span>The full sending walkthrough is being prepared. For now, try the placeholder simulation.</span>
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
                  <ArrowUpRight size={22} strokeWidth={1.6} />
                  <span>Send Bitcoin</span>
                </div>
                <p className="tx-sim-balance">Wallet balance: 0.0400 BTC</p>
                <p className="tx-sim-body">Charlie wants to be paid 0.005 BTC. Let's build and send the payment.</p>
                <button className="tx-sim-btn primary" type="button" onClick={() => setPhase('confirm')}>
                  <span>Build transaction</span>
                  <ArrowRight size={16} strokeWidth={2.4} />
                </button>
              </div>
            )}

            {phase === 'confirm' && (
              <div className="tx-sim-screen">
                <div className="tx-sim-header">
                  <User size={20} strokeWidth={1.6} />
                  <span>Confirm payment</span>
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
                <div className="tx-confirm-row">
                  <span>Amount</span>
                  <strong>0.00500 BTC</strong>
                </div>
                <p className="tx-sim-body">Check the address and amount, then sign with your hardware wallet.</p>
                <button className="tx-sim-btn primary" type="button" onClick={() => setPhase('sent')}>
                  <span>Sign and send</span>
                  <ArrowRight size={16} strokeWidth={2.4} />
                </button>
              </div>
            )}

            {phase === 'sent' && (
              <div className="tx-sim-screen tx-sim-success-screen">
                <CheckCircle2 size={36} strokeWidth={1.6} />
                <span className="tx-sim-success-title">Payment sent!</span>
                <p className="tx-sim-success-body">
                  You've sent 0.005 BTC to Charlie — built the transaction, verified the details, and signed it.
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
                  The sending lesson is a placeholder for now — the full walkthrough is coming soon.
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

export default function SendScenario({ completed, onBack, onComplete }: SendScenarioProps) {
  const [inPractice, setInPractice] = useState(false);

  if (inPractice) {
    return <SendPractice completed={completed} onBack={onBack} onComplete={onComplete} />;
  }

  return <SendMentorScene onEnterPractice={() => setInPractice(true)} />;
}
