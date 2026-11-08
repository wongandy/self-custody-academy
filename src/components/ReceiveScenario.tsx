import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardPaste,
  Copy,
  Eye,
  QrCode,
  SendHorizontal,
} from 'lucide-react';
import HardwareWallet, { type ExpectedAction } from '@/components/HardwareWallet';
import mariaPortrait from '@/components/Maria.webp';
import en from '@/locales/en';
import { fmt, useI18n } from '@/lib/i18n';

type ReceiveScenarioProps = {
  onBack: () => void;
  onComplete: () => void;
};

const NUDGE_DURATION_MS = 1250;

// Maria's lines live in the dictionary (`lesson5`); every locale has the same list lengths.
const INTRO_COUNT = en.lesson5.intro.length;
const SENDING_COUNT = en.lesson5.sending.length;

type MentorStage =
  | 'intro'
  | 'go-receive'
  | 'verify-rule'
  | 'compare-check'
  | 'copy-now'
  | 'hand-over'
  | 'sending'
  | 'open-tx'
  | 'waiting'
  | 'finished';

const CONTINUE_STAGES = new Set<MentorStage>(['intro', 'sending', 'finished']);

type TransactionRow = {
  date: string;
  value: string;
  balance: string;
  incoming: boolean;
  fresh?: boolean;
};

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

function ReceiveMentorScene({ onFinish }: { onFinish: () => void }) {
  const { t } = useI18n();
  const l5 = t.lesson5;
  const [stage, setStage] = useState<MentorStage>('intro');
  const [introStep, setIntroStep] = useState(0);
  const [sendingStep, setSendingStep] = useState(0);
  const [nudgeActive, setNudgeActive] = useState(false);
  const [walletTab, setWalletTab] = useState<'transactions' | 'receive'>('transactions');
  const [addrCopied, setAddrCopied] = useState(false);
  const [addrVerified, setAddrVerified] = useState(false);
  const [verifyingAddr, setVerifyingAddr] = useState(false);
  const [verifyRequested, setVerifyRequested] = useState(false);
  const [warned, setWarned] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [txArrived, setTxArrived] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 600px)').matches);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    ? t.common.nudgeLater
    : stage === 'intro'
      ? l5.intro[introStep] ?? l5.intro[0]
      : stage === 'go-receive'
        ? l5.goReceive
        : stage === 'verify-rule'
          ? l5.verifyRule
          : stage === 'compare-check'
            ? l5.compareCheck
            : stage === 'copy-now'
              ? l5.copyNow
              : stage === 'hand-over'
                ? warned ? l5.warn : l5.handOver
                : stage === 'sending'
                  ? l5.sending[sendingStep] ?? l5.sending[0]
                  : stage === 'open-tx'
                    ? l5.openTx
                    : stage === 'waiting'
                      ? l5.waiting
                      : l5.finished;
  const { displayed, done, skip } = useTypewriter(message);

  const spotlight = stage === 'intro';
  const interactionLocked = !done;
  const canContinue = done && !nudgeActive && CONTINUE_STAGES.has(stage);
  // While Maria is mid-line the devices freeze; once she finishes, the learner
  // may press device buttons — every press is gently nudged back on track.
  const deviceLocked = interactionLocked;
  const softwareLocked = deviceLocked;
  const chatLocked = !done || nudgeActive;

  const expectedAction: ExpectedAction = { type: 'external' };

  const handleUnexpectedAction = useCallback(() => {
    setNudgeActive(true);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    nudgeTimer.current = setTimeout(() => setNudgeActive(false), NUDGE_DURATION_MS);
  }, []);

  const handleTransactionsTab = useCallback(() => {
    const allowed = stage === 'open-tx' || stage === 'waiting' || stage === 'finished';
    if (!allowed) {
      handleUnexpectedAction();
      return;
    }
    setWalletTab('transactions');
    if (stage === 'open-tx') {
      setStage('waiting');
    }
  }, [stage, handleUnexpectedAction]);

  const handleReceiveTab = useCallback(() => {
    if (stage === 'go-receive') {
      setWalletTab('receive');
      setStage('verify-rule');
      return;
    }
    if (stage === 'open-tx' || stage === 'waiting' || stage === 'finished') {
      handleUnexpectedAction();
      return;
    }
    setWalletTab('receive');
  }, [stage, handleUnexpectedAction]);

  const handleCopyAddress = useCallback(() => {
    if (!addrVerified) {
      handleUnexpectedAction();
      return;
    }
    navigator.clipboard?.writeText(RECEIVE_ADDRESS).catch(() => {});
    setAddrCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setAddrCopied(false), 2000);
    if (stage === 'copy-now') {
      setStage('hand-over');
    }
  }, [addrVerified, stage, handleUnexpectedAction]);

  const handleVerifyAddress = useCallback(() => {
    if (verifyingAddr || verifyRequested || addrVerified) return;
    setVerifyingAddr(true);
    setVerifyRequested(true);
    setStage('compare-check');
  }, [verifyingAddr, verifyRequested, addrVerified]);

  const handleDeviceVerified = useCallback(() => {
    setVerifyingAddr(false);
    setAddrVerified(true);
    setStage('copy-now');
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setChatInput(text.trim());
      }
    } catch {
      // Clipboard read refused — the learner can still paste into the field.
    }
  }, []);

  const handleSubmitAddress = useCallback(() => {
    if (chatLocked) return;
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    if (trimmed === RECEIVE_ADDRESS) {
      setWarned(false);
      setChatInput('');
      setStage('sending');
      setSendingStep(0);
    } else {
      setWarned(true);
    }
  }, [chatInput, chatLocked]);

  useEffect(() => {
    if (stage !== 'waiting') return;
    const timer = setTimeout(() => {
      setTxArrived(true);
      setStage('finished');
    }, 4000);
    return () => clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    if (nudgeActive) {
      setNudgeActive(false);
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    }
  }, [stage]);

  useEffect(() => () => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const handleContinue = useCallback(() => {
    if (!done) {
      skip();
      return;
    }
    if (nudgeActive || !CONTINUE_STAGES.has(stage)) return;
    if (stage === 'intro') {
      if (introStep < INTRO_COUNT - 1) {
        setIntroStep((current) => current + 1);
        return;
      }
      if (portraitRef.current && bubbleRef.current) {
        flipRects.current = {
          portrait: portraitRef.current.getBoundingClientRect(),
          bubble: bubbleRef.current.getBoundingClientRect(),
        };
      }
      setStage('go-receive');
      return;
    }
    if (stage === 'sending') {
      if (sendingStep < SENDING_COUNT - 1) {
        setSendingStep((current) => current + 1);
      } else {
        setStage('open-tx');
      }
      return;
    }
    onFinish();
  }, [done, skip, nudgeActive, stage, introStep, sendingStep, onFinish]);

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

  const balance = txArrived ? '0.14998' : '0.04998';
  const baseTransactions: TransactionRow[] = [
    { date: '2026-09-21 09:48', value: '+0.04998 BTC', balance: '0.04998 BTC', incoming: true },
  ];
  const transactions: TransactionRow[] = txArrived
    ? [{ date: '2026-10-20 14:32', value: '+0.10000 BTC', balance: '0.14998 BTC', incoming: true, fresh: true }, ...baseTransactions]
    : baseTransactions;

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

  const bubbleKey = nudgeActive
    ? 'nudge'
    : stage === 'intro'
      ? `intro-${introStep}`
      : stage === 'hand-over'
        ? `hand-over-${warned}`
        : stage === 'sending'
          ? `sending-${sendingStep}`
          : stage;

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
                        className="wallet-nav-item"
                        onClick={handleUnexpectedAction}
                        disabled={softwareLocked}
                        aria-pressed="false"
                      >
                        <ArrowUpRight strokeWidth={2.2} />
                        <span className="wallet-nav-label">Send</span>
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
                          <button
                            className="tx-sim-btn primary rx-btn"
                            type="button"
                            onClick={handleCopyAddress}
                          >
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
                              disabled={verifyingAddr || stage === 'go-receive'}
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
                            <span className="wallet-tx-summary-value">{balance} BTC</span>
                          </div>
                          <div className="wallet-tx-summary-item">
                            <span className="wallet-tx-summary-label">Transactions</span>
                            <span className="wallet-tx-summary-value">{transactions.length}</span>
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
                              {transactions.map((tx) => (
                                <tr key={tx.date} className={tx.fresh ? 'fresh' : undefined}>
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
              <div className="device-caption">{t.common.captionWalletSoftware}</div>
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
                  verifyRequest={verifyRequested}
                  verifyAddress={RECEIVE_ADDRESS}
                  onVerifyConfirm={handleDeviceVerified}
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
            aria-label={fmt(t.common.mentorAria, { name: 'Maria' })}
            role="img"
          >
            <div className="mentor-portrait-glow" />
            <div className="mentor-portrait-ring">
              <img className="mentor-portrait-image" src={mariaPortrait} alt={fmt(t.common.mentorAria, { name: 'Maria' })} />
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
              {stage === 'hand-over' && (
                <div className="mentor-chat-input-row" onClick={(e) => e.stopPropagation()}>
                  <input
                    className="mentor-chat-input"
                    type="text"
                    value={chatInput}
                    placeholder={l5.chatPlaceholder}
                    aria-label={l5.chatAria}
                    disabled={chatLocked}
                    onChange={(e) => {
                      setChatInput(e.target.value);
                      if (warned) setWarned(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmitAddress();
                      }
                    }}
                  />
                  <button
                    className="mentor-chat-btn"
                    type="button"
                    onClick={handlePaste}
                    disabled={chatLocked}
                    aria-label={l5.pasteAria}
                  >
                    <ClipboardPaste size={16} strokeWidth={2} />
                  </button>
                  <button
                    className="mentor-chat-btn send"
                    type="button"
                    onClick={handleSubmitAddress}
                    disabled={chatLocked || !chatInput.trim()}
                    aria-label={l5.sendAria}
                  >
                    <SendHorizontal size={16} strokeWidth={2.2} />
                  </button>
                </div>
              )}
            </div>
            {canContinue && (
              <button
                className={`bubble-next ready`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleContinue();
                }}
                aria-label={stage === 'finished' ? t.common.finishLesson : t.common.continue}
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

export default function ReceiveScenario({ onBack, onComplete }: ReceiveScenarioProps) {
  return (
    <ReceiveMentorScene
      onFinish={() => {
        onComplete();
        onBack();
      }}
    />
  );
}
