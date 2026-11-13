import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  SendHorizontal,
  Settings,
} from 'lucide-react';
import HardwareWallet, { type ExpectedAction } from '@/components/HardwareWallet';
import { DeviceSwitcher } from '@/components/DeviceSwitcher';
import { ReceiveQrCode } from '@/components/ReceiveQrCode';
import { walletLessonsMentor as mentor } from '@/lib/mentors';
import en from '@/locales/en';
import { fmt, useI18n } from '@/lib/i18n';
import { useFitScale } from '@/lib/useFitScale';
import { useLaptopCableAlign } from '@/lib/useLaptopCableAlign';
import { useDeviceFit } from '@/lib/useDeviceFit';
import { getWalletName, walletWindowTitle } from '@/lib/walletName';
import { useSandbox } from '@/lib/sandbox';
import { SandboxWalletTab, type WalletTabId } from '@/components/SandboxWalletTab';
import { KnowledgeCheckCard, KnowledgeCheckKicker, useKnowledgeCheck, type KnowledgeQuestion } from '@/components/KnowledgeCheck';

type ReceiveScenarioProps = {
  onBack: () => void;
  onComplete: () => void;
};

const NUDGE_DURATION_MS = 1250;
// Lesson-specific nudges are full explanations, so they stay up long enough to read.
const EARLY_COPY_NUDGE_MS = 4500;
const VERIFY_REJECT_NUDGE_MS = 5000;

type NudgeKind = 'generic' | 'early-copy' | 'verify-reject';

// The mentor's lines live in the dictionary (`lesson3`); every locale has the same list lengths.
const INTRO_COUNT = en.lesson3.intro.length;
const SENDING_COUNT = en.lesson3.sending.length;

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

// Answer key for the check-in; the wording is `lesson3.questions`, in this order.
const KNOWLEDGE_QUESTIONS: KnowledgeQuestion[] = [
  { optionIds: ['match', 'faster', 'fee'], correctId: 'match' },
  { optionIds: ['address', 'phrase', 'pin'], correctId: 'address' },
];

type TransactionRow = {
  date: string;
  value: string;
  balance: string;
  incoming: boolean;
  fresh?: boolean;
};

// A valid native SegWit address: the first receive address of the public BIP84
// test wallet (m/84'/0'/0'/0/0), so it belongs to no real person. Lesson 5's
// withdrawal uses the next one (…/0/1): a fresh address for every payment.
const RECEIVE_ADDRESS = 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu';

function useTypewriter(text: string, speed = 6, resetKey = '') {
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
  }, [text, speed, resetKey]);

  const skip = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayed(text);
    setDone(true);
  }, [text]);

  return { displayed, done, skip };
}

function ReceiveMentorScene({ onFinish }: { onFinish: () => void }) {
  const { t } = useI18n();
  // Same title bar as lesson 2: the wallet name the learner chose there
  const [windowTitle] = useState(() => walletWindowTitle('Cairn', getWalletName()));
  const l5 = t.lesson3;
  const [stage, setStage] = useState<MentorStage>('intro');
  const [introStep, setIntroStep] = useState(0);
  const [sendingStep, setSendingStep] = useState(0);
  const [nudgeActive, setNudgeActive] = useState(false);
  const [nudgeKind, setNudgeKind] = useState<NudgeKind>('generic');
  const [walletTab, setWalletTab] = useState<WalletTabId>('transactions');
  const sandbox = useSandbox();
  const [addrCopied, setAddrCopied] = useState(false);
  const [addrVerified, setAddrVerified] = useState(false);
  const [verifyingAddr, setVerifyingAddr] = useState(false);
  const [verifyRequested, setVerifyRequested] = useState(false);
  const [warned, setWarned] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [pasteFailed, setPasteFailed] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [txArrived, setTxArrived] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 600px)').matches);
  // Phones show one device at a time; the learner switches with the device switcher.
  const [mobilePanel, setMobilePanel] = useState<'software' | 'device'>('software');
  const [visitedDevice, setVisitedDevice] = useState(false);
  const deviceStageRef = useRef<HTMLDivElement>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const duoSlotRef = useFitScale(0.5);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const laptopBodyRef = useRef<HTMLDivElement>(null);
  const flipRects = useRef<{ portrait: DOMRect; bubble: DOMRect } | null>(null);
  const check = useKnowledgeCheck(KNOWLEDGE_QUESTIONS, l5, onFinish);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // Phones: the address check spans both devices, so Maria says which one to look at.
  // During the comparison the learner may flip back and forth; otherwise the
  // lesson waits for the one tap she asks for.
  const viewingDevice = isMobile && mobilePanel === 'device';
  const mobileLine: { key: string; text: string } | null = !isMobile
    ? null
    : stage === 'compare-check'
      ? visitedDevice
        ? { key: 'compare-mobile', text: l5.compareCheckMobile }
        : { key: 'verify-sent', text: l5.verifySent }
      : stage === 'copy-now'
        ? viewingDevice
          ? { key: 'verified-mobile', text: l5.verifiedMobile }
          : { key: 'copy-now-mobile', text: l5.copyNowMobile }
        : null;
  const mobileSwitchHint: 'software' | 'device' | null =
    stage === 'compare-check' && !viewingDevice
      ? 'device'
      : stage === 'copy-now' && viewingDevice
        ? 'software'
        : null;
  const message = nudgeActive
    ? nudgeKind === 'early-copy' ? l5.copyTooEarly : nudgeKind === 'verify-reject' ? l5.verifyReject : t.common[mentor.nudge]
    : check.active
      ? check.mentorLine
    : mobileLine
      ? mobileLine.text
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
  const bubbleKey = nudgeActive
    ? `nudge-${nudgeKind}`
    : check.active
      ? check.mentorKey
      : mobileLine
        ? mobileLine.key
      : stage === 'intro'
        ? `intro-${introStep}`
        : stage === 'hand-over'
          ? `hand-over-${warned}`
          : stage === 'sending'
            ? `sending-${sendingStep}`
            : stage;
  const { displayed, done, skip } = useTypewriter(message, 6, bubbleKey);

  const spotlight = stage === 'intro';
  useLaptopCableAlign(laptopBodyRef, !spotlight);
  useDeviceFit(deviceStageRef, isMobile && !spotlight && !check.active);

  const handleMobileSwitch = useCallback((panel: 'software' | 'device') => {
    setMobilePanel(panel);
    if (panel === 'device') setVisitedDevice(true);
  }, []);

  // Safety net: everything after the copy happens in the app.
  useEffect(() => {
    if (stage === 'hand-over' || stage === 'sending' || stage === 'open-tx' || stage === 'waiting' || stage === 'finished') {
      setMobilePanel('software');
    }
  }, [stage]);
  const interactionLocked = !done && !sandbox;
  const canContinue = done && !nudgeActive && !check.active && CONTINUE_STAGES.has(stage);
  // While Maria is mid-line the devices freeze; once she finishes, the learner
  // may press device buttons — every press is gently nudged back on track.
  const deviceLocked = interactionLocked;
  const softwareLocked = deviceLocked;
  const chatLocked = !done || nudgeActive;

  const expectedAction: ExpectedAction = { type: 'external' };

  const showNudge = useCallback((kind: NudgeKind) => {
    setNudgeKind(kind);
    setNudgeActive(true);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    const duration = kind === 'early-copy' ? EARLY_COPY_NUDGE_MS : kind === 'verify-reject' ? VERIFY_REJECT_NUDGE_MS : NUDGE_DURATION_MS;
    nudgeTimer.current = setTimeout(() => setNudgeActive(false), duration);
  }, []);
  const handleUnexpectedAction = useCallback(() => showNudge('generic'), [showNudge]);
  // X on the device's verify screen: Maria explains what rejecting is for, and the
  // address stays on the device so the learner can still confirm it.
  const handleVerifyReject = useCallback(() => showNudge('verify-reject'), [showNudge]);

  const handleTransactionsTab = useCallback(() => {
    if (sandbox) {
      setWalletTab('transactions');
      return;
    }
    const allowed = stage === 'open-tx' || stage === 'waiting' || stage === 'finished';
    if (!allowed) {
      handleUnexpectedAction();
      return;
    }
    setWalletTab('transactions');
    if (stage === 'open-tx') {
      setStage('waiting');
    }
  }, [stage, handleUnexpectedAction, sandbox]);

  const handleReceiveTab = useCallback(() => {
    if (sandbox) {
      setWalletTab('receive');
      if (stage === 'go-receive') setStage('verify-rule');
      return;
    }
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
  }, [stage, handleUnexpectedAction, sandbox]);

  const handleCopyAddress = useCallback(() => {
    // Copy stays clickable, as in a real wallet; copying before verifying is the
    // mistake this lesson is about, so Maria explains why instead of a generic nudge.
    if (!addrVerified) {
      showNudge('early-copy');
      return;
    }
    navigator.clipboard?.writeText(RECEIVE_ADDRESS).catch(() => {});
    setAddrCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setAddrCopied(false), 2000);
    if (stage === 'copy-now') {
      setStage('hand-over');
    }
  }, [addrVerified, stage, showNudge]);

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
        setPasteFailed(false);
        return;
      }
    } catch {
      // Clipboard read refused or unsupported (e.g. Firefox) — fall through.
    }
    // The button couldn't paste: put the cursor in the field and say how to paste by hand.
    setPasteFailed(true);
    chatInputRef.current?.focus();
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
    if (check.active) {
      if (check.answered) check.advance();
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
    check.start();
  }, [done, skip, check, nudgeActive, stage, introStep, sendingStep]);

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

  // The wallet is brand new (Lesson 2 left it empty), so this is its first payment.
  const balance = txArrived ? '0.10000' : '0.00000';
  const transactions: TransactionRow[] = txArrived
    ? [{ date: '2026-09-21 09:48', value: '+0.10000 BTC', balance: '0.10000 BTC', incoming: true, fresh: true }]
    : [];

  const cableEl = (
    <div className={`connect-cable is-linked${isMobile ? (viewingDevice ? ' cable-device-panel' : ' cable-under-wallet') : ''}`} aria-hidden="true">
      <span className="plug-end-track">
        <svg
          className="connect-cable-wire connect-cable-wire-h"
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
        >
          <path className="cable-line" d="M0 20 L 20 20 C 36 20, 36 31, 50 31 C 64 31, 64 20, 80 20 L 100 20" pathLength={100} />
          <path className="cable-pulse" d="M0 20 L 20 20 C 36 20, 36 31, 50 31 C 64 31, 64 20, 80 20 L 100 20" pathLength={100} />
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
        <svg
          className="connect-cable-wire connect-cable-wire-device"
          viewBox="0 0 200 48"
          preserveAspectRatio="none"
        >
          <path className="cable-line" d="M0 26 C 47 26, 93 26, 140 26 C 172 26, 200 20, 200 11" pathLength={100} />
          <path className="cable-pulse" d="M0 26 C 47 26, 93 26, 140 26 C 172 26, 200 20, 200 11" pathLength={100} />
        </svg>
        <span className="connect-cable-plug plug-start" />
        <span className="connect-cable-plug plug-end" />
      </span>
    </div>
  );

  return (
    <main className={`scenario-page scenario-page-fit lesson-fit ${check.active ? 'knowledge-check-scene' : spotlight ? 'scenario-page-spotlight' : 'scenario-page-connect connect-paged'}`}>
      <div className={`scenario-mentor-layout ${spotlight ? 'spotlight' : ''} ${check.active ? 'knowledge-check-layout' : ''}`}>
        {check.active && <KnowledgeCheckKicker />}
        {!spotlight && !check.active && (
          <div ref={duoSlotRef} className="fit-slot fit-wrap">
          <div className={`connect-duo is-wide${interactionLocked ? ' is-locked' : ''}${isMobile ? ' has-device-switcher' : ''}`}>
            <div className={`wallet-laptop laptop-enter${viewingDevice ? ' mobile-hidden' : ''}`}>
              <div ref={laptopBodyRef} className="wallet-laptop-body">
                <div className="wallet-window">
                  <div className="wallet-window-titlebar">
                    <span className="tl-dot red" />
                    <span className="tl-dot yellow" />
                    <span className="tl-dot green" />
                    <span className="wallet-window-title">{windowTitle}</span>
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
                          onClick={sandbox ? () => setWalletTab('send') : handleUnexpectedAction}
                          disabled={softwareLocked}
                          aria-pressed={walletTab === 'send'}
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
                        <button
                          type="button"
                          className={`wallet-nav-item${walletTab === 'settings' ? ' active' : ''}`}
                          onClick={sandbox ? () => setWalletTab('settings') : handleUnexpectedAction}
                          disabled={softwareLocked}
                          aria-pressed={walletTab === 'settings'}
                        >
                          <Settings strokeWidth={2.2} />
                          <span className="wallet-nav-label">Settings</span>
                        </button>
                      </aside>
                      <div className="wallet-canvas">
                        {walletTab === 'send' || walletTab === 'settings' ? (
                          <SandboxWalletTab tab={walletTab} />
                        ) : walletTab === 'receive' ? (
                          <div className="rx-panel">
                            <div className="wallet-tab-heading">
                              <div className="wallet-tab-title"><ArrowDownLeft strokeWidth={2} /><span>Receive Bitcoin</span></div>
                            </div>
                            <div className="rx-qr-frame" aria-hidden="true">
                              <ReceiveQrCode address={RECEIVE_ADDRESS} />
                            </div>
                            <span className="wallet-field-label">Receive address</span>
                            <p className="rx-addr">{RECEIVE_ADDRESS}</p>
                            {/* Top to bottom in the order the lesson teaches: verify, then copy.
                                The highlighted (primary) button is always the next step. */}
                            {addrVerified ? (
                              <div className="tx-addr-verified">
                                <CheckCircle2 size={16} />
                                <span>Address verified on device</span>
                              </div>
                            ) : (
                              <button
                                className="tx-sim-btn primary rx-btn"
                                type="button"
                                onClick={handleVerifyAddress}
                                disabled={verifyingAddr || (stage === 'go-receive' && !sandbox)}
                              >
                                <Eye size={14} strokeWidth={2} />
                                <span>{verifyingAddr ? 'Verifying…' : 'Verify address on device'}</span>
                              </button>
                            )}
                            <button
                              className={`tx-sim-btn ${addrVerified ? 'primary' : 'ghost'} rx-btn`}
                              type="button"
                              onClick={handleCopyAddress}
                            >
                              {addrCopied ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} strokeWidth={2} />}
                              <span>{addrCopied ? 'Copied' : 'Copy address'}</span>
                            </button>
                          </div>
                        ) : (
                        <div className="wallet-transactions">
                          <div className="wallet-tab-heading">
                            <div className="wallet-tab-title"><ArrowLeftRight strokeWidth={2} /><span>Transactions</span></div>
                          </div>
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
                                {transactions.length === 0 && (
                                  <tr className="wallet-tx-empty">
                                    <td colSpan={3}>No transactions yet</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="wallet-laptop-base" aria-hidden="true">
                  <span className="wallet-laptop-notch" />
                </div>
              </div>

              {isMobile && !viewingDevice && cableEl}
              <div className="device-caption">{t.common.captionWalletSoftware}</div>
            </div>

            {!isMobile && cableEl}

            <div ref={deviceStageRef} className={`connect-device-stage phase-linked${isMobile && !viewingDevice ? ' mobile-hidden' : ''}`}>
              <div className="connect-device-row">
                {viewingDevice && cableEl}
                <HardwareWallet
                  mode="withdraw"
                  initialPhase="ready-menu"
                  locked={deviceLocked}
                  expectedAction={expectedAction}
                  onUnexpectedAction={handleUnexpectedAction}
                  verifyRequest={verifyRequested}
                  verifyAddress={RECEIVE_ADDRESS}
                  onVerifyConfirm={handleDeviceVerified}
                  onVerifyReject={handleVerifyReject}
                  onComplete={() => {}}
                />
              </div>
            </div>

            {isMobile && (
              <DeviceSwitcher
                options={[
                  { id: 'software', label: t.common.captionWalletSoftware },
                  { id: 'device', label: t.common.captionHardwareWallet },
                ]}
                active={mobilePanel}
                onSelect={handleMobileSwitch}
                pulseId={mobileSwitchHint}
                disabled={!sandbox && mobileSwitchHint === null && stage !== 'compare-check'}
              />
            )}
          </div>
          </div>
        )}

        <div className="mentor-row">
          <div
            key={mentor.name}
            ref={portraitRef}
            className="mentor-portrait mentor-portrait-enter"
            aria-label={fmt(t.common.mentorAria, { name: mentor.name })}
            role="img"
          >
            <div className="mentor-portrait-glow" />
            <div className="mentor-portrait-ring">
              <img className="mentor-portrait-image" src={mentor.portrait} alt={fmt(t.common.mentorAria, { name: mentor.name })} />
            </div>
            <div className="mentor-portrait-badge">{mentor.name}</div>
          </div>
          <div
            ref={bubbleRef}
            className={`mentor-bubble ${canContinue ? 'is-ready' : ''}`}
            onClick={handleContinue}
          >
            <div className={`mentor-bubble-content${stage === 'hand-over' ? ' has-chat' : ''}`} key={bubbleKey}>
              <span className="mentor-bubble-name">{mentor.name}</span>
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
                    ref={chatInputRef}
                    className="mentor-chat-input"
                    type="text"
                    value={chatInput}
                    placeholder={pasteFailed ? l5.pasteFallback : l5.chatPlaceholder}
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
                    aria-label={fmt(l5.sendAria, { name: mentor.name })}
                  >
                    <SendHorizontal size={16} strokeWidth={2.2} />
                  </button>
                </div>
              )}
            </div>
            {stage !== 'hand-over' && (
              <button
                className={`bubble-next ${canContinue ? 'ready' : ''}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleContinue();
                }}
                disabled={!canContinue}
                aria-label={t.common.continue}
              >
                <ChevronRight size={18} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
        {check.active && <KnowledgeCheckCard check={check} ready={done} />}
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
