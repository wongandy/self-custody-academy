import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  ReceiptText,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import HardwareWallet, { type ExpectedAction } from '@/components/HardwareWallet';
import { DeviceSwitcher } from '@/components/DeviceSwitcher';
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
  | 'enter-label'
  | 'enter-amount'
  | 'explain-fees'
  | 'select-fee'
  | 'review-tx'
  | 'hardware-review'
  | 'tx-sent'
  | 'finished';

const CONTINUE_STAGES = new Set<SendStage>(['intro', 'explain-fees', 'finished']);

// Answer key for the check-in; the wording is `lesson6.questions`, in this order.
const KNOWLEDGE_QUESTIONS: KnowledgeQuestion[] = [
  { optionIds: ['faster', 'more', 'refund'], correctId: 'faster' },
  { optionIds: ['verify', 'backup', 'speed'], correctId: 'verify' },
];

const NUDGE_DURATION_MS = 1250;
// Lesson-specific nudges are full explanations, so they stay up long enough to read.
const EXPLAIN_NUDGE_MS = 5000;
// How long after opening Transactions the sent payment slides in.
const TX_SHOW_DELAY_MS = 1200;
type NudgeKind = 'generic' | 'max' | 'send-reject';
const SEND_AMOUNT = '0.01';
// Maria's own address (the BIP173 example address), not the learner's device address.
const MARIA_ADDRESS = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
// Made-up transaction ID for the sent payment (random hex, not a real transaction).
const SENT_TXID = 'a3f1c9e07b52d84f6e19c3a7d05b8e2f41c6d9a8b7e03f5c2d14a96e8b70c3f5';

const FEE_OPTIONS: FeeOption[] = [
  { id: 'low', label: 'Low', rate: '2 sats/vB', fee: '0.00000120' },
  { id: 'medium', label: 'Medium', rate: '8 sats/vB', fee: '0.00000480' },
  { id: 'high', label: 'High', rate: '18 sats/vB', fee: '0.00001080' },
];

// The mentor's lines live in the dictionary (`lesson6`); every locale has the same list lengths.
const INTRO_COUNT = en.lesson6.intro.length;

// The wallet as Lesson 5 left it: Lesson 3's 0.1 BTC plus the Lesson 5 withdrawal.
const WALLET_BALANCE = '0.14998';
const STARTING_TRANSACTIONS = [
  { date: '2026-10-20 14:32', value: '+0.04998 BTC', balance: '0.14998 BTC' },
  { date: '2026-09-21 09:48', value: '+0.10000 BTC', balance: '0.10000 BTC' },
];

// Amounts are worked out in satoshis so the fee isn't lost to floating-point rounding.
const SATS_PER_BTC = 100_000_000;
const toSats = (btc: string) => Math.round(Number(btc) * SATS_PER_BTC);
const formatBtc = (sats: number) => (sats / SATS_PER_BTC).toFixed(8);

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

export default function SendScenario({ onComplete }: SendScenarioProps) {
  const { t } = useI18n();
  // Same title bar as lesson 2: the wallet name the learner chose there
  const [windowTitle] = useState(() => walletWindowTitle('Cairn', getWalletName()));
  const l6 = t.lesson6;
  const [stage, setStage] = useState<SendStage>('intro');
  const [introStep, setIntroStep] = useState(0);
  const [nudgeActive, setNudgeActive] = useState(false);
  const [nudgeKind, setNudgeKind] = useState<NudgeKind>('generic');
  const [nudgeSeq, setNudgeSeq] = useState(0);
  const [walletTab, setWalletTab] = useState<WalletTabId>('transactions');
  const sandbox = useSandbox();
  const [recipient, setRecipient] = useState('');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [feeLevel, setFeeLevel] = useState<FeeLevel>('medium');
  const [transactionBuilt, setTransactionBuilt] = useState(false);
  const [sendRequest, setSendRequest] = useState(false);
  const [sent, setSent] = useState(false);
  // The sent payment appears in Transactions a moment after the tab opens, so it
  // slides in like the incoming payment in Lesson 3.
  const [txShown, setTxShown] = useState(false);
  const txShowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [addressCopied, setAddressCopied] = useState(false);
  const [addressWrong, setAddressWrong] = useState(false);
  // A spendable amount that isn't the one Maria asked for: she says so (Cairn has no complaint).
  const [amountWrong, setAmountWrong] = useState(false);
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
  const check = useKnowledgeCheck(KNOWLEDGE_QUESTIONS, l6, onComplete);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // Phones: the payment is approved on the device, so Maria says when to switch.
  // While the device shows the payment the learner may flip back and forth to
  // compare it with Cairn; otherwise the switcher only works when she asks for it.
  const viewingDevice = isMobile && mobilePanel === 'device';
  const mobileLine: { key: string; text: string } | null = !isMobile
    ? null
    : stage === 'hardware-review'
      ? visitedDevice
        ? { key: 'hw-review-mobile', text: l6.hardwareReviewMobile }
        : { key: 'sent-to-device', text: l6.sentToDevice }
      : stage === 'tx-sent'
        ? viewingDevice
          ? { key: 'tx-sent-device', text: l6.txSentDevice }
          : { key: 'tx-sent-mobile', text: l6.txSentMobile }
        : null;
  const mobileSwitchHint: 'software' | 'device' | null =
    stage === 'hardware-review' && !viewingDevice
      ? 'device'
      : stage === 'tx-sent' && viewingDevice
        ? 'software'
        : null;
  const message = nudgeActive
    ? nudgeKind === 'max'
      ? fmt(l6.maxNudge, { amount: SEND_AMOUNT })
      : nudgeKind === 'send-reject'
        ? l6.sendReject
        : t.common[mentor.nudge]
    : check.active
      ? check.mentorLine
    : mobileLine
      ? mobileLine.text
    : addressWrong && stage === 'enter-address'
      ? l6.addressWrong
      : amountWrong && stage === 'enter-amount'
        ? fmt(l6.amountWrong, { amount: SEND_AMOUNT })
      : stage === 'intro'
        ? fmt(l6.intro[introStep] ?? l6.intro[0], { amount: SEND_AMOUNT })
        : stage === 'open-send'
          ? l6.openSend
          : stage === 'enter-address'
            ? l6.enterAddress
            : stage === 'enter-label'
              ? l6.enterLabel
              : stage === 'enter-amount'
                ? fmt(l6.enterAmount, { amount: SEND_AMOUNT })
                : stage === 'explain-fees'
                  ? l6.explainFees
                  : stage === 'select-fee'
                    ? l6.selectFee
                    : stage === 'review-tx'
                      ? l6.reviewTx
                      : stage === 'hardware-review'
                        ? l6.hardwareReview
                        : stage === 'tx-sent'
                          ? l6.txSent
                          : l6.finished;
  const bubbleKey = nudgeActive
    ? `nudge-${nudgeKind}`
    : check.active
      ? check.mentorKey
      : mobileLine
        ? mobileLine.key
      : addressWrong && stage === 'enter-address'
        ? 'address-wrong'
        : amountWrong && stage === 'enter-amount'
          ? 'amount-wrong'
        : stage === 'intro'
          ? `intro-${introStep}`
          : stage;
  const { displayed, done, skip } = useTypewriter(message, 6, bubbleKey);

  const spotlight = stage === 'intro';
  useLaptopCableAlign(laptopBodyRef, !spotlight);
  useDeviceFit(deviceStageRef, isMobile && !spotlight && !check.active);

  const handleMobileSwitch = useCallback((panel: 'software' | 'device') => {
    setMobilePanel(panel);
    if (panel === 'device') setVisitedDevice(true);
  }, []);

  // Safety net: the lesson ends in the app.
  useEffect(() => {
    if (stage === 'finished') setMobilePanel('software');
  }, [stage]);
  const interactionLocked = !done && !sandbox;
  const canContinue = done && !nudgeActive && !addressWrong && !check.active && CONTINUE_STAGES.has(stage);
  const softwareLocked = !sandbox && (interactionLocked || (canContinue && !nudgeActive) || stage === 'hardware-review');
  const deviceLocked = interactionLocked || (canContinue && !nudgeActive) || stage === 'tx-sent';

  const selectedFee = FEE_OPTIONS.find((option) => option.id === feeLevel) ?? FEE_OPTIONS[1];
  // What leaves the wallet is the amount plus the fee; the balance after uses the fee actually chosen.
  const totalSentSats = toSats(SEND_AMOUNT) + toSats(selectedFee.fee);
  const sentBalance = formatBtc(toSats(WALLET_BALANCE) - totalSentSats);
  // The amount as typed, in satoshis; null while it isn't a positive number yet.
  const amountTrimmed = amount.trim();
  const amountSats = amountTrimmed !== '' && Number.isFinite(Number(amountTrimmed)) && Number(amountTrimmed) > 0
    ? toSats(amountTrimmed)
    : null;
  const amountIsRequested = amountSats === toSats(SEND_AMOUNT);
  // Cairn's own check, as in a real wallet: the amount plus the fee must fit in the balance.
  const insufficientFunds = amountSats !== null && amountSats + toSats(selectedFee.fee) > toSats(WALLET_BALANCE);
  const formValid = recipient.trim() === MARIA_ADDRESS && amountIsRequested;

  const expectedAction: ExpectedAction =
    stage === 'hardware-review'
      ? { type: 'confirm' }
      : stage === 'open-send' || stage === 'enter-address' || stage === 'enter-label' || stage === 'enter-amount' || stage === 'select-fee' || stage === 'review-tx'
        ? { type: 'external' }
        : { type: 'none' };

  const showNudge = useCallback((kind: NudgeKind) => {
    setNudgeKind(kind);
    setNudgeSeq((seq) => seq + 1);
    setNudgeActive(true);
  }, []);
  const handleUnexpectedAction = useCallback(() => showNudge('generic'), [showNudge]);

  useEffect(() => {
    if (!nudgeActive) return;
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    const duration = nudgeKind === 'generic' ? NUDGE_DURATION_MS : EXPLAIN_NUDGE_MS;
    nudgeTimer.current = setTimeout(() => setNudgeActive(false), duration);
    return () => {
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    };
  }, [nudgeActive, nudgeKind, nudgeSeq]);

  useEffect(() => {
    if (nudgeActive) {
      setNudgeActive(false);
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    }
  }, [stage]);

  useEffect(() => () => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    if (txShowTimer.current) clearTimeout(txShowTimer.current);
  }, []);

  // Auto-advance: correct address -> enter-label stage
  // Wrong address (10+ chars that don't match) -> show wrong-address warning
  useEffect(() => {
    if (stage !== 'enter-address') return;
    const trimmed = recipient.trim();
    if (trimmed.length === 0) {
      setAddressWrong(false);
      return;
    }
    if (trimmed.toLowerCase() === MARIA_ADDRESS.toLowerCase()) {
      setAddressWrong(false);
      setStage('enter-label');
      return;
    }
    if (trimmed.length >= 10) {
      setAddressWrong(true);
    }
  }, [recipient, stage]);

  // Auto-advance: non-empty label -> enter-amount stage (brief delay so learner sees it)
  useEffect(() => {
    if (stage !== 'enter-label') return;
    if (label.trim().length === 0) return;
    const timer = setTimeout(() => setStage('enter-amount'), 600);
    return () => clearTimeout(timer);
  }, [label, stage]);

  // Auto-advance: correct amount -> explain-fees stage (brief delay).
  // Any other amount Cairn can cover: once the learner stops typing, Maria says
  // it isn't the amount she asked for. More than the balance is Cairn's error to show.
  useEffect(() => {
    if (stage !== 'enter-amount') return;
    setAmountWrong(false);
    if (amountIsRequested) {
      const timer = setTimeout(() => setStage('explain-fees'), 600);
      return () => clearTimeout(timer);
    }
    if (amountSats === null || insufficientFunds) return;
    const timer = setTimeout(() => setAmountWrong(true), 900);
    return () => clearTimeout(timer);
  }, [amount, stage, amountIsRequested, amountSats, insufficientFunds]);

  const handleContinue = useCallback(() => {
    if (!done) {
      skip();
      return;
    }
    if (check.active) {
      if (check.answered) check.advance();
      return;
    }
    if (nudgeActive || !canContinue) return;
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
      setStage('open-send');
      return;
    }
    if (stage === 'explain-fees') {
      setStage('select-fee');
      return;
    }
    if (stage === 'finished') {
      check.start();
      return;
    }
  }, [done, skip, check, nudgeActive, canContinue, stage, introStep]);

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
    if (sandbox) {
      setWalletTab('send');
      if (stage === 'open-send') setStage('enter-address');
      return;
    }
    if (softwareLocked) return;
    if (stage === 'open-send') {
      setWalletTab('send');
      setStage('enter-address');
      return;
    }
    if (walletTab === 'send') return;
    handleUnexpectedAction();
  }, [sandbox, softwareLocked, stage, walletTab, handleUnexpectedAction]);

  const handleTransactionsTab = useCallback(() => {
    if (softwareLocked) return;
    // After approving, Maria asks the learner to open Transactions to watch the payment appear.
    if (stage === 'tx-sent') {
      if (walletTab === 'transactions') return;
      setWalletTab('transactions');
      if (txShowTimer.current) clearTimeout(txShowTimer.current);
      txShowTimer.current = setTimeout(() => {
        setTxShown(true);
        setStage('finished');
      }, TX_SHOW_DELAY_MS);
      return;
    }
    if (sandbox) {
      setWalletTab('transactions');
      return;
    }
    if (walletTab === 'transactions') return;
    handleUnexpectedAction();
  }, [sandbox, softwareLocked, stage, walletTab, handleUnexpectedAction]);

  // MAX is there to teach, not to use: it fills in the whole balance minus the fee,
  // and Maria explains what it's for and that she only needs the lesson amount.
  const handleMax = useCallback(() => {
    if (softwareLocked || (stage !== 'enter-amount' && !sandbox)) return;
    setAmount(formatBtc(toSats(WALLET_BALANCE) - toSats(selectedFee.fee)));
    showNudge('max');
  }, [softwareLocked, stage, selectedFee.fee, showNudge]);

  const handleSendReject = useCallback(() => showNudge('send-reject'), [showNudge]);

  const handleCopyAddress = useCallback(() => {
    navigator.clipboard?.writeText(MARIA_ADDRESS).catch(() => {});
    setAddressCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setAddressCopied(false), 2000);
  }, []);

  const handleFeeSelect = useCallback((nextFee: FeeLevel) => {
    if (softwareLocked || (stage !== 'select-fee' && !sandbox)) {
      if (!softwareLocked) handleUnexpectedAction();
      return;
    }
    setFeeLevel(nextFee);
  }, [sandbox, softwareLocked, stage, handleUnexpectedAction]);

  const handleBuildTransaction = useCallback(() => {
    if (softwareLocked || (stage !== 'select-fee' && !sandbox)) {
      if (!softwareLocked) handleUnexpectedAction();
      return;
    }
    if (!formValid && !sandbox) {
      handleUnexpectedAction();
      return;
    }
    setTransactionBuilt(true);
    setStage('review-tx');
  }, [sandbox, softwareLocked, stage, formValid, handleUnexpectedAction]);

  const handleSendToHardware = useCallback(() => {
    if (softwareLocked || (stage !== 'review-tx' && !sandbox)) {
      if (!softwareLocked) handleUnexpectedAction();
      return;
    }
    setSendRequest(true);
    setStage('hardware-review');
  }, [sandbox, softwareLocked, stage, handleUnexpectedAction]);

  const handleHardwareConfirm = useCallback(() => {
    setSent(true);
    setStage('tx-sent');
  }, []);

  const cableEl = (
    <div className={`connect-cable is-linked${isMobile ? (viewingDevice ? ' cable-device-panel' : ' cable-under-wallet') : ''}`} aria-hidden="true">
      <span className="plug-end-track">
        <svg className="connect-cable-wire connect-cable-wire-h" viewBox="0 0 100 40" preserveAspectRatio="none">
          <path className="cable-line" d="M0 20 L 20 20 C 36 20, 36 31, 50 31 C 64 31, 64 20, 80 20 L 100 20" pathLength={100} />
          <path className="cable-pulse" d="M0 20 L 20 20 C 36 20, 36 31, 50 31 C 64 31, 64 20, 80 20 L 100 20" pathLength={100} />
        </svg>
        <svg className="connect-cable-wire connect-cable-wire-v" viewBox="0 0 40 100" preserveAspectRatio="none">
          <path className="cable-line" d="M20 0 C 20 24, 32 28, 32 50 S 20 76, 20 100" pathLength={100} />
          <path className="cable-pulse" d="M20 0 C 20 24, 32 28, 32 50 S 20 76, 20 100" pathLength={100} />
        </svg>
        <svg className="connect-cable-wire connect-cable-wire-under" viewBox="0 0 240 48" preserveAspectRatio="none">
          <path className="cable-line" d="M20 0 C 20 14, 28 18, 50 20 C 110 25, 180 21, 240 22" pathLength={100} />
          <path className="cable-pulse" d="M20 0 C 20 14, 28 18, 50 20 C 110 25, 180 21, 240 22" pathLength={100} />
        </svg>
        <svg className="connect-cable-wire connect-cable-wire-device" viewBox="0 0 200 48" preserveAspectRatio="none">
          <path className="cable-line" d="M0 26 C 47 26, 93 26, 140 26 C 172 26, 200 20, 200 11" pathLength={100} />
          <path className="cable-pulse" d="M0 26 C 47 26, 93 26, 140 26 C 172 26, 200 20, 200 11" pathLength={100} />
        </svg>
        <span className="connect-cable-plug plug-start" />
        <span className="connect-cable-plug plug-end" />
      </span>
    </div>
  );

  const addressFieldEnabled = sandbox || (!softwareLocked && stage === 'enter-address');
  const labelFieldEnabled = sandbox || (!softwareLocked && stage === 'enter-label');
  const amountFieldEnabled = sandbox || (!softwareLocked && stage === 'enter-amount');
  const feeButtonsEnabled = sandbox || (!softwareLocked && stage === 'select-fee');
  const showAddressInBubble = stage === 'enter-address' && !nudgeActive;

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
                          onClick={handleSendTab}
                          disabled={softwareLocked}
                          aria-pressed={walletTab === 'send'}
                        >
                          <ArrowUpRight strokeWidth={2.2} />
                          <span className="wallet-nav-label">Send</span>
                        </button>
                        <button
                          type="button"
                          className={`wallet-nav-item${walletTab === 'receive' ? ' active' : ''}`}
                          onClick={sandbox ? () => setWalletTab('receive') : handleUnexpectedAction}
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
                        {(walletTab === 'receive' || walletTab === 'settings') && <SandboxWalletTab tab={walletTab} />}
                        {walletTab === 'transactions' && (
                          <div className="wallet-transactions">
                            <div className="wallet-tab-heading">
                              <div className="wallet-tab-title"><ArrowLeftRight strokeWidth={2} /><span>Transactions</span></div>
                            </div>
                            <div className="wallet-tx-summary">
                              <div className="wallet-tx-summary-item">
                                <span className="wallet-tx-summary-label">Balance</span>
                                <span className="wallet-tx-summary-value">{txShown ? `${sentBalance} BTC` : `${WALLET_BALANCE} BTC`}</span>
                              </div>
                              <div className="wallet-tx-summary-item">
                                <span className="wallet-tx-summary-label">Transactions</span>
                                <span className="wallet-tx-summary-value">{txShown ? STARTING_TRANSACTIONS.length + 1 : STARTING_TRANSACTIONS.length}</span>
                              </div>
                            </div>
                            <div className="wallet-tx-table-wrap">
                              <table className="wallet-tx-table">
                                <thead>
                                  <tr><th>Date</th><th>Value</th><th>Balance</th></tr>
                                </thead>
                                <tbody>
                                  {txShown && (
                                    <tr className="fresh"><td>2026-11-04 10:24</td><td className="out">-{formatBtc(totalSentSats)} BTC</td><td>{sentBalance} BTC</td></tr>
                                  )}
                                  {STARTING_TRANSACTIONS.map((tx) => (
                                    <tr key={tx.date}><td>{tx.date}</td><td className="in">{tx.value}</td><td>{tx.balance}</td></tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {walletTab === 'send' && !transactionBuilt && !sent && (
                          <div className="send-form-screen">
                            <div className="send-form-heading wallet-tab-heading">
                              <div className="wallet-tab-title"><ArrowUpRight strokeWidth={2} /><span>Send Bitcoin</span></div>
                              <span className="send-form-balance">Balance {WALLET_BALANCE} BTC</span>
                            </div>
                            <div className="send-form-fields">
                              <label className="tx-sim-field">
                                <span>Pay to</span>
                                <input
                                  className={`tx-sim-addr${addressWrong ? ' error' : ''}`}
                                  value={recipient}
                                  onChange={(e) => {
                                    setRecipient(e.target.value);
                                    setAddressWrong(false);
                                  }}
                                  placeholder="bc1…"
                                  disabled={!addressFieldEnabled}
                                />
                              </label>
                              <label className="tx-sim-field">
                                <span>Label</span>
                                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Add a label…" disabled={!labelFieldEnabled} />
                              </label>
                              <label className="tx-sim-field">
                                <span className="send-amount-label">
                                  Amount
                                  {insufficientFunds && <em className="send-amount-error" role="alert">Insufficient funds</em>}
                                </span>
                                <div className="send-amount-field">
                                  <input
                                    className={insufficientFunds ? 'error' : undefined}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    disabled={!amountFieldEnabled}
                                    aria-invalid={insufficientFunds}
                                  />
                                  <span>BTC</span>
                                  <button className="withdraw-max-btn" type="button" onClick={handleMax} disabled={!amountFieldEnabled}>MAX</button>
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
                            {(stage === 'select-fee' || sandbox) && (
                              <button className="tx-sim-btn primary" type="button" onClick={handleBuildTransaction} disabled={softwareLocked || (!formValid && !sandbox)}>
                                <span>Review transaction</span><ArrowRight size={16} strokeWidth={2.4} />
                              </button>
                            )}
                          </div>
                        )}

                        {walletTab === 'send' && transactionBuilt && !sent && (
                          <div className="send-review-screen">
                            <div className="send-form-heading wallet-tab-heading">
                              <div className="wallet-tab-title"><ReceiptText strokeWidth={2} /><span>Review transaction</span></div>
                              <span className="send-review-status">Ready to sign</span>
                            </div>
                            <div className="tx-sim-confirm-box">
                              {/* Never shorten an address: show it in full, grouped in fours like the device screen */}
                              <div className="tx-confirm-row tx-confirm-row-address">
                                <span>Recipient</span>
                                <strong className="tx-confirm-addr">{MARIA_ADDRESS.match(/.{1,4}/g)?.join(' ')}</strong>
                              </div>
                              <div className="tx-confirm-row"><span>Amount</span><strong>{SEND_AMOUNT} BTC</strong></div>
                              <div className="tx-confirm-row"><span>Network fee</span><strong>{selectedFee.fee} BTC</strong></div>
                              <div className="tx-confirm-row total">
                                <span>Total</span>
                                <strong>{formatBtc(totalSentSats)} BTC</strong>
                              </div>
                            </div>
                            <button
                              className="tx-sim-btn primary"
                              type="button"
                              onClick={handleSendToHardware}
                              disabled={softwareLocked || (stage !== 'review-tx' && !sandbox)}
                            >
                              <ShieldCheck size={16} strokeWidth={2.2} />
                              <span>Review on hardware wallet</span>
                            </button>
                          </div>
                        )}

                        {walletTab === 'send' && sent && (
                          // What a real wallet shows after broadcasting: it can't know who owns
                          // an address, so no names; just the status and the transaction ID.
                          <div className="send-review-screen send-success-screen">
                            <div className="send-form-heading wallet-tab-heading">
                              <div className="wallet-tab-title"><CheckCircle2 strokeWidth={2} /><span>Transaction broadcast</span></div>
                              <span className="send-review-status send-status-pending">Unconfirmed</span>
                            </div>
                            <div className="tx-sim-confirm-box">
                              <div className="tx-confirm-row"><span>Amount</span><strong>{SEND_AMOUNT} BTC</strong></div>
                              <div className="tx-confirm-row"><span>Network fee</span><strong>{selectedFee.fee} BTC</strong></div>
                              <div className="tx-confirm-row tx-confirm-row-address">
                                <span>Transaction ID</span>
                                <strong className="send-success-txid">{SENT_TXID}</strong>
                              </div>
                            </div>
                            <p className="send-success-note">Sent to the Bitcoin network. It confirms once a miner includes it in a block.</p>
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
                  initialPhase="connect-done"
                  locked={deviceLocked}
                  expectedAction={expectedAction}
                  sendRequest={sendRequest}
                  sendAddress={MARIA_ADDRESS}
                  sendAmount={SEND_AMOUNT}
                  sendFee={selectedFee.fee}
                  onSendReject={handleSendReject}
                  onSendConfirm={handleHardwareConfirm}
                  onUnexpectedAction={handleUnexpectedAction}
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
                disabled={!sandbox && mobileSwitchHint === null && stage !== 'hardware-review'}
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
            <div className={`mentor-bubble-content${showAddressInBubble ? ' has-chat' : ''}`} key={bubbleKey}>
              <span className="mentor-bubble-name">{mentor.name}</span>
              <div className="mentor-bubble-text-wrap">
                <p className="mentor-bubble-text-ghost">{message}</p>
                <p className="mentor-bubble-text">
                  {displayed}
                  {!done && <span className="typewriter-cursor" />}
                </p>
              </div>
              {showAddressInBubble && (
                <div className="mentor-chat-input-row" onClick={(e) => e.stopPropagation()}>
                  <span className="mentor-address-display">{MARIA_ADDRESS}</span>
                  <button
                    className="mentor-chat-btn"
                    type="button"
                    onClick={handleCopyAddress}
                    aria-label={fmt(l6.copyAddressAria, { name: mentor.name })}
                  >
                    {addressCopied ? <Check size={16} strokeWidth={2.4} /> : <Copy size={16} strokeWidth={2} />}
                  </button>
                </div>
              )}
            </div>
            {!showAddressInBubble && (
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
