import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Eye,
  QrCode,
} from 'lucide-react';
import HardwareWallet, { type ExpectedAction } from '@/components/HardwareWallet';
import mariaPortrait from '@/components/Maria.webp';

type ReceiveScenarioProps = {
  onBack: () => void;
  onComplete: () => void;
};

const NUDGE_MESSAGE = "We'll get to that later! For now, let's stick to the current step.";
const NUDGE_DURATION_MS = 1250;

// One speaking turn per line, in order. The scene step is the handover: it is
// where the already-connected laptop and device appear, so deriving both from
// STEPS keeps the reveal on the right line if intro lines are added or removed.
const INTRO_MESSAGES = [
  "Now let me teach how you to receive Bitcoin.",
  // "test",
];

const SCENE_MESSAGE = "Let's head to the Receive tab where you will copy the receive address to your wallet.";

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

const RECEIVE_ADDRESS = 'bc1qq92v3345fkzdjsxwg9r7mvkgjatqqhahfpiuav99q5uw0kweaq3fuqo0';

const QR_MODULES = 25;

// Decorative QR-style matrix seeded deterministically; not a scannable code.
function buildQrModules(): boolean[][] {
  let seed = 0x9e3779b9;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const grid: boolean[][] = Array.from({ length: QR_MODULES }, () =>
    Array.from({ length: QR_MODULES }, () => rand() > 0.52));

  const drawFinder = (row0: number, col0: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = row0 + r;
        const col = col0 + c;
        if (row < 0 || col < 0 || row >= QR_MODULES || col >= QR_MODULES) continue;
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          grid[row][col] = false;
          continue;
        }
        const ring = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[row][col] = ring || core;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, QR_MODULES - 7);
  drawFinder(QR_MODULES - 7, 0);
  return grid;
}

function ReceiveQrCode() {
  const modules = useMemo(buildQrModules, []);
  return (
    <svg viewBox={`0 0 ${QR_MODULES} ${QR_MODULES}`} shapeRendering="crispEdges" role="img" aria-label="Receive address QR code">
      <rect width={QR_MODULES} height={QR_MODULES} fill="#ffffff" />
      {modules.flatMap((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#17191b" /> : null))}
    </svg>
  );
}

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

function ReceiveMentorScene({ onEnterPractice }: { onEnterPractice: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [nudgeActive, setNudgeActive] = useState(false);
  const [walletTab, setWalletTab] = useState<'transactions' | 'receive'>('transactions');
  const [addrCopied, setAddrCopied] = useState(false);
  const [addrVerified, setAddrVerified] = useState(false);
  const [verifyingAddr, setVerifyingAddr] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 600px)').matches);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const verifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  // While Maria is mid-line the devices freeze; once she finishes, the learner
  // may press device buttons — every press is gently nudged back on track.
  const deviceLocked = interactionLocked;
  const softwareLocked = deviceLocked;

  const expectedAction: ExpectedAction = { type: 'external' };

  const handleUnexpectedAction = useCallback(() => {
    setNudgeActive(true);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    nudgeTimer.current = setTimeout(() => setNudgeActive(false), NUDGE_DURATION_MS);
  }, []);

  const allowReceive = step.kind === 'scene' && done;

  const handleTransactionsTab = useCallback(() => {
    setWalletTab('transactions');
  }, []);

  const handleReceiveTab = useCallback(() => {
    if (!allowReceive) {
      handleUnexpectedAction();
      return;
    }
    setAddrVerified(false);
    setVerifyingAddr(false);
    setWalletTab('receive');
  }, [allowReceive, handleUnexpectedAction]);

  const handleCopyAddress = useCallback(() => {
    navigator.clipboard?.writeText(RECEIVE_ADDRESS).catch(() => {});
    setAddrCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setAddrCopied(false), 2000);
  }, []);

  const handleVerifyAddress = useCallback(() => {
    if (verifyingAddr) return;
    setVerifyingAddr(true);
    if (verifyTimer.current) clearTimeout(verifyTimer.current);
    verifyTimer.current = setTimeout(() => {
      setVerifyingAddr(false);
      setAddrVerified(true);
    }, 1600);
  }, [verifyingAddr]);

  useEffect(() => {
    if (nudgeActive) {
      setNudgeActive(false);
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    }
  }, [stepIndex]);

  useEffect(() => () => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    if (verifyTimer.current) clearTimeout(verifyTimer.current);
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
                        className={`wallet-nav-item${walletTab === 'receive' ? ' active' : ''}`}
                        onClick={handleReceiveTab}
                        disabled={softwareLocked}
                        aria-pressed={walletTab === 'receive'}
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
                      {walletTab === 'receive' ? (
                        <div className="rx-panel">
                          <div className="rx-panel-heading">
                            <QrCode size={14} strokeWidth={2} />
                            <span>Receive address</span>
                          </div>
                          <div className="rx-qr-frame" aria-hidden="true">
                            <ReceiveQrCode />
                          </div>
                          <p className="rx-addr">{RECEIVE_ADDRESS}</p>
                          <button className="tx-sim-btn primary rx-btn" type="button" onClick={handleCopyAddress}>
                            {addrCopied ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} strokeWidth={2} />}
                            <span>{addrCopied ? 'Copied' : 'Copy address'}</span>
                          </button>
                          {addrVerified ? (
                            <div className="tx-addr-verified">
                              <CheckCircle2 size={16} />
                              <span>Address verified on device</span>
                            </div>
                          ) : (
                            <button
                              className="tx-sim-btn ghost rx-btn"
                              type="button"
                              onClick={handleVerifyAddress}
                              disabled={verifyingAddr}
                            >
                              <Eye size={14} strokeWidth={2} />
                              <span>{verifyingAddr ? 'Verifying…' : 'Verify address on device'}</span>
                            </button>
                          )}
                        </div>
                      ) : (
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
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {isMobile && cableEl}
            </div>

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
              aria-label="Finish mission"
            >
              {step.kind === 'scene' ? <Check size={18} strokeWidth={2.5} /> : <ChevronRight size={18} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ReceiveScenario({ onBack, onComplete }: ReceiveScenarioProps) {
  return (
    <ReceiveMentorScene
      onEnterPractice={() => {
        onComplete();
        onBack();
      }}
    />
  );
}
