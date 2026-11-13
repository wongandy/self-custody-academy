import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  ScanLine,
  Settings,
  Smartphone,
  Wifi,
  X,
} from 'lucide-react';
import HardwareWallet, { type ExpectedAction } from '@/components/HardwareWallet';
import { DeviceSwitcher } from '@/components/DeviceSwitcher';
import { ReceiveQrCode } from '@/components/ReceiveQrCode';
import { walletLessonsMentor as mentor } from '@/lib/mentors';
import en from '@/locales/en';
import { fmt, renderWithIcon, useI18n, withIconMark } from '@/lib/i18n';
import { useFitScale } from '@/lib/useFitScale';
import { useLaptopCableAlign } from '@/lib/useLaptopCableAlign';
import { useDeviceFit } from '@/lib/useDeviceFit';
import { getWalletName, walletWindowTitle } from '@/lib/walletName';
import { useSandbox } from '@/lib/sandbox';
import { SandboxWalletTab, type WalletTabId } from '@/components/SandboxWalletTab';
import { KnowledgeCheckCard, KnowledgeCheckKicker, useKnowledgeCheck, type KnowledgeQuestion } from '@/components/KnowledgeCheck';

type WithdrawScenarioProps = {
  completed: boolean;
  onBack: () => void;
  onComplete: () => void;
};

const AVAILABLE_BALANCE = 0.05;
const NETWORK_FEE = 0.00002;

// The next receive address of the same public BIP84 test wallet Lesson 3 uses
// (m/84'/0'/0'/0/1): Cairn hands out a fresh address for every payment, and
// it belongs to no real person.
const WITHDRAW_ADDRESS = 'bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g';

// How long the phone camera "looks" before it finds the code, then how long
// the found state shows before the scanner closes.
const SCAN_AIM_MS = 1500;
const SCAN_FOUND_MS = 700;

const NUDGE_DURATION_MS = 1250;
// Lesson-specific nudges are full explanations, so they stay up long enough to read.
const EXPLAIN_NUDGE_MS = 4500;

type NudgeKind = 'generic' | 'scan-early' | 'type-instead' | 'verify-reject';

// The mentor's lines live in the dictionary (`lesson5`); every locale has the same list lengths.
const INTRO_COUNT = en.lesson5.intro.length;

type MentorStage =
  | 'intro'
  | 'go-receive'
  | 'fresh-address'
  | 'verify-rule'
  | 'compare-check'
  | 'scan'
  | 'scanned'
  | 'enter-amount'
  | 'ready'
  | 'confirm'
  | 'success'
  | 'open-tx'
  | 'waiting'
  | 'finished';

const CONTINUE_STAGES = new Set<MentorStage>(['intro', 'fresh-address', 'scanned', 'success', 'finished']);
// Stages where the learner compares the same address across devices, so on a
// phone they may flip between them freely.
const COMPARE_STAGES = new Set<MentorStage>(['compare-check', 'scanned']);

// Answer key for the check-in; the wording is `lesson5.questions`, in this order.
const KNOWLEDGE_QUESTIONS: KnowledgeQuestion[] = [
  { optionIds: ['fee', 'typo', 'faster'], correctId: 'typo' },
  { optionIds: ['extra', 'balance', 'exchange'], correctId: 'extra' },
];

type TransactionRow = {
  date: string;
  value: string;
  balance: string;
  incoming: boolean;
  fresh?: boolean;
};

type MobilePanel = 'exchange' | 'software' | 'device';

function formatPhoneTime(date: Date) {
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function PhoneClock() {
  const [time, setTime] = useState(() => formatPhoneTime(new Date()));

  useEffect(() => {
    let intervalId: number | undefined;
    const tick = () => setTime(formatPhoneTime(new Date()));
    // Align updates to the start of each minute.
    const timeoutId = window.setTimeout(() => {
      tick();
      intervalId = window.setInterval(tick, 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, []);

  return <span>{time}</span>;
}

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

/** The full address on two lines, never cut short. */
function SplitAddress({ address }: { address: string }) {
  const half = Math.ceil(address.length / 2);
  return (
    <>
      <span>{address.slice(0, half)}</span>
      <span>{address.slice(half)}</span>
    </>
  );
}

function WithdrawMentorScene({ onFinish }: { onFinish: () => void }) {
  const { t } = useI18n();
  // Same title bar as lesson 2: the wallet name the learner chose there
  const [windowTitle] = useState(() => walletWindowTitle('Cairn', getWalletName()));
  const l5 = t.lesson5;
  const sandbox = useSandbox();
  const [stage, setStage] = useState<MentorStage>('intro');
  const [introStep, setIntroStep] = useState(0);
  const [nudgeActive, setNudgeActive] = useState(false);
  const [nudgeKind, setNudgeKind] = useState<NudgeKind>('generic');
  const [walletTab, setWalletTab] = useState<WalletTabId>('transactions');
  const [addrVerified, setAddrVerified] = useState(false);
  const [verifyingAddr, setVerifyingAddr] = useState(false);
  const [verifyRequested, setVerifyRequested] = useState(false);
  const [scanner, setScanner] = useState<'closed' | 'aiming' | 'found'>('closed');
  const [sendAddress, setSendAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [exchangeScreen, setExchangeScreen] = useState<'form' | 'confirm' | 'success'>('form');
  const [txArrived, setTxArrived] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 600px)').matches);
  // Phones show one device at a time; the learner switches with the device switcher.
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('software');
  const [visitedDevice, setVisitedDevice] = useState(false);
  const deviceStageRef = useRef<HTMLDivElement>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const trioSlotRef = useFitScale(0.5);
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

  const parsedAmount = Number.parseFloat(amount);
  const numericAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  // While the learner types toward 0.05 ("0", "0.", "0.0", "0.05" mid-edit),
  // the value is a prefix of the target and shouldn't trigger the correction.
  const isPrefixOfAvailable = (val: string) =>
    AVAILABLE_BALANCE.toFixed(8).replace(/0+$/, '').startsWith(val.replace(/0+$/, ''));
  const amountTooLow =
    amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount < AVAILABLE_BALANCE && !isPrefixOfAvailable(amount.trim());
  const isAmountValid = numericAmount === AVAILABLE_BALANCE && amountError === '';
  const isAddressValid = sendAddress.trim() === WITHDRAW_ADDRESS;
  const receivedAmount = numericAmount > 0 ? Math.max(numericAmount - NETWORK_FEE, 0) : 0;
  const amountStage = stage === 'enter-amount' || stage === 'ready';

  const viewingDevice = isMobile && mobilePanel === 'device';
  const viewingExchange = isMobile && mobilePanel === 'exchange';
  const viewingSoftware = isMobile && mobilePanel === 'software';

  // Phones: some steps span devices, so the mentor first says which one to open.
  const mobileLine: { key: string; text: string } | null = !isMobile
    ? null
    : stage === 'compare-check'
      ? visitedDevice
        ? { key: 'compare-mobile', text: l5.compareCheckMobile }
        : { key: 'verify-sent', text: l5.verifySent }
      : stage === 'scan'
        ? viewingExchange
          ? { key: 'scan-prompt', text: l5.scanPrompt }
          : { key: 'go-exchange-mobile', text: l5.goExchangeMobile }
        : stage === 'open-tx' && !viewingSoftware
          ? { key: 'open-tx-mobile', text: l5.openTxMobile }
          : null;
  const mobileSwitchHint: MobilePanel | null =
    stage === 'compare-check' && !viewingDevice
      ? 'device'
      : stage === 'scan' && !viewingExchange
        ? 'exchange'
        : stage === 'open-tx' && !viewingSoftware
          ? 'software'
          : null;

  const stageLine = (): string => {
    switch (stage) {
      case 'intro': return l5.intro[introStep] ?? l5.intro[0];
      case 'go-receive': return l5.goReceive;
      case 'fresh-address': return l5.freshAddress;
      case 'verify-rule': return l5.verifyRule;
      case 'compare-check': return l5.compareCheck;
      case 'scan': return l5.goExchange;
      case 'scanned': return l5.scanned;
      case 'enter-amount': return amountTooLow ? l5.amountCorrection : l5.enterAmount;
      case 'ready': return l5.readyToWithdraw;
      case 'confirm': return l5.exchangeConfirm;
      case 'success': return l5.exchangeSuccess;
      case 'open-tx': return l5.openTx;
      case 'waiting': return l5.waiting;
      case 'finished': return l5.finished;
    }
  };
  const nudgeLine = nudgeKind === 'scan-early'
    ? l5.scanEarly
    : nudgeKind === 'type-instead'
      ? l5.typeInstead
      : nudgeKind === 'verify-reject'
        ? l5.verifyReject
        : t.common[mentor.nudge];
  const message = withIconMark(nudgeActive
    ? nudgeLine
    : check.active
      ? check.mentorLine
      : mobileLine
        ? mobileLine.text
        : stageLine());
  const bubbleKey = nudgeActive
    ? `nudge-${nudgeKind}`
    : check.active
      ? check.mentorKey
      : mobileLine
        ? mobileLine.key
        : stage === 'intro'
          ? `intro-${introStep}`
          : stage === 'enter-amount'
            ? `enter-amount-${amountTooLow}`
            : stage;
  const { displayed, done, skip } = useTypewriter(message, 6, bubbleKey);

  const spotlight = stage === 'intro';
  useLaptopCableAlign(laptopBodyRef, !spotlight);
  useDeviceFit(deviceStageRef, isMobile && !spotlight && !check.active && viewingDevice);

  // The scan button chip in the mentor's lines matches the one in the address field.
  const renderMentorText = (text: string) =>
    renderWithIcon(
      text,
      <span className="mentor-copy-button-indicator" aria-hidden="true">
        <ScanLine size={12} strokeWidth={2.2} />
      </span>,
    );

  const handleMobileSwitch = useCallback((panel: MobilePanel) => {
    setMobilePanel(panel);
    if (panel === 'device') setVisitedDevice(true);
  }, []);

  const interactionLocked = !done && !sandbox;
  const canContinue = done && !nudgeActive && !check.active && CONTINUE_STAGES.has(stage);
  // While the mentor is mid-line the devices freeze; once the line is done the
  // learner may press anything — presses that don't fit the step are nudged.
  const deviceLocked = interactionLocked;
  const expectedAction: ExpectedAction = { type: 'external' };

  const showNudge = useCallback((kind: NudgeKind) => {
    setNudgeKind(kind);
    setNudgeActive(true);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    nudgeTimer.current = setTimeout(() => setNudgeActive(false), kind === 'generic' ? NUDGE_DURATION_MS : EXPLAIN_NUDGE_MS);
  }, []);
  const handleUnexpectedAction = useCallback(() => showNudge('generic'), [showNudge]);
  // X on the device's verify screen: the mentor explains what rejecting is for,
  // and the address stays on the device so the learner can still confirm it.
  const handleVerifyReject = useCallback(() => showNudge('verify-reject'), [showNudge]);

  // ── Wallet software ──

  const handleTransactionsTab = useCallback(() => {
    if (sandbox) {
      setWalletTab('transactions');
      return;
    }
    if (stage !== 'open-tx' && stage !== 'waiting' && stage !== 'finished') {
      handleUnexpectedAction();
      return;
    }
    setWalletTab('transactions');
    if (stage === 'open-tx') setStage('waiting');
  }, [stage, handleUnexpectedAction, sandbox]);

  const handleReceiveTab = useCallback(() => {
    if (stage === 'go-receive') {
      setWalletTab('receive');
      setStage('fresh-address');
      return;
    }
    if (!sandbox && (stage === 'intro' || stage === 'open-tx' || stage === 'waiting' || stage === 'finished')) {
      handleUnexpectedAction();
      return;
    }
    setWalletTab('receive');
  }, [stage, handleUnexpectedAction, sandbox]);

  const handleVerifyAddress = useCallback(() => {
    if (verifyingAddr || verifyRequested || addrVerified) return;
    if (!sandbox && stage !== 'verify-rule') {
      handleUnexpectedAction();
      return;
    }
    setVerifyingAddr(true);
    setVerifyRequested(true);
    setStage('compare-check');
  }, [verifyingAddr, verifyRequested, addrVerified, sandbox, stage, handleUnexpectedAction]);

  const handleDeviceVerified = useCallback(() => {
    setVerifyingAddr(false);
    setAddrVerified(true);
    setStage((current) => (current === 'compare-check' ? 'scan' : current));
  }, []);

  // ── Phone: BitExchange ──

  const handleOpenScanner = useCallback(() => {
    if (scanner !== 'closed') return;
    if (!sandbox && stage !== 'scan') {
      showNudge(addrVerified ? 'generic' : 'scan-early');
      return;
    }
    setScanner('aiming');
  }, [scanner, sandbox, stage, addrVerified, showNudge]);

  const handleCloseScanner = useCallback(() => {
    if (scanTimer.current) clearTimeout(scanTimer.current);
    setScanner('closed');
  }, []);

  // The camera "finds" the code after a moment, then fills in the address.
  useEffect(() => {
    if (scanner === 'closed') return;
    scanTimer.current = setTimeout(() => {
      if (scanner === 'aiming') {
        setScanner('found');
        return;
      }
      setScanner('closed');
      setSendAddress(WITHDRAW_ADDRESS);
      setStage((current) => (current === 'scan' ? 'scanned' : current));
    }, scanner === 'aiming' ? SCAN_AIM_MS : SCAN_FOUND_MS);
    return () => {
      if (scanTimer.current) clearTimeout(scanTimer.current);
    };
  }, [scanner]);

  // Typing an address by hand is possible in a real app; the lesson explains
  // why scanning is better instead of letting the learner type 42 characters.
  const handleAddressFieldClick = useCallback(() => {
    if (sandbox || isAddressValid) return;
    showNudge(stage === 'scan' ? 'type-instead' : addrVerified ? 'generic' : 'scan-early');
  }, [sandbox, isAddressValid, stage, addrVerified, showNudge]);

  const handleAmountChange = useCallback((val: string) => {
    if (!sandbox && !amountStage) {
      handleUnexpectedAction();
      return;
    }
    setAmount(val);
    const parsed = parseFloat(val);
    setAmountError(val !== '' && !isNaN(parsed) && parsed > AVAILABLE_BALANCE
      ? 'Insufficient balance. The amount exceeds your available balance.'
      : '');
  }, [sandbox, amountStage, handleUnexpectedAction]);

  const handleMax = useCallback(() => {
    if (!sandbox && !amountStage) {
      handleUnexpectedAction();
      return;
    }
    setAmount(AVAILABLE_BALANCE.toFixed(8));
    setAmountError('');
  }, [sandbox, amountStage, handleUnexpectedAction]);

  // The amount step follows the field: a valid amount readies the Withdraw button.
  useEffect(() => {
    if (stage === 'enter-amount' && isAmountValid && isAddressValid) setStage('ready');
    else if (stage === 'ready' && !isAmountValid) setStage('enter-amount');
  }, [stage, isAmountValid, isAddressValid]);

  const handleWithdraw = useCallback(() => {
    if (!sandbox && stage !== 'ready') {
      handleUnexpectedAction();
      return;
    }
    setExchangeScreen('confirm');
    setStage((current) => (current === 'ready' ? 'confirm' : current));
  }, [sandbox, stage, handleUnexpectedAction]);

  const handleBackToForm = useCallback(() => {
    setExchangeScreen('form');
    setStage((current) => (current === 'confirm' ? 'ready' : current));
  }, []);

  const handleConfirm = useCallback(() => {
    setExchangeScreen('success');
    setStage((current) => (current === 'confirm' ? 'success' : current));
  }, []);

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
    // A new step always speaks over an old nudge.
  }, [stage]);

  useEffect(() => () => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    if (scanTimer.current) clearTimeout(scanTimer.current);
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
    switch (stage) {
      case 'intro':
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
      case 'fresh-address':
        setStage('verify-rule');
        return;
      case 'scanned':
        setStage('enter-amount');
        // The amount is typed on the phone, so bring it back after a comparison.
        if (isMobile) setMobilePanel('exchange');
        return;
      case 'success':
        setStage('open-tx');
        return;
      default:
        check.start();
    }
  }, [done, skip, check, nudgeActive, stage, introStep, isMobile]);

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

  // The mentor glides from the large spotlight portrait down to the compact row beneath the devices.
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
    for (const [el, first, last] of [[portraitEl, pFirst, pLast], [bubbleEl, bFirst, bLast]] as const) {
      el.style.transformOrigin = 'top left';
      el.animate(
        [
          {
            transform: `translate(${first.left - last.left}px, ${first.top - last.top}px) scale(${first.width / last.width}, ${first.height / last.height})`,
          },
          { transform: 'translate(0, 0) scale(1, 1)' },
        ],
        opts,
      );
    }
  }, [spotlight]);

  // Lesson 3 left 0.1 BTC in the wallet; the withdrawal arrives on top of it.
  const balance = txArrived ? '0.14998' : '0.10000';
  const baseTransactions: TransactionRow[] = [
    { date: '2026-09-21 09:48', value: '+0.10000 BTC', balance: '0.10000 BTC', incoming: true },
  ];
  const transactions: TransactionRow[] = txArrived
    ? [{ date: '2026-10-20 14:32', value: '+0.04998 BTC', balance: '0.14998 BTC', incoming: true, fresh: true }, ...baseTransactions]
    : baseTransactions;

  // Phones: on the hardware wallet panel the cord comes in from above; on the
  // wallet software panel it hangs under the laptop. Laptops: between the two.
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

  const phoneEl = (
    <div className={`withdraw-phone-wrap wd-phone${isMobile && !viewingExchange ? ' mobile-hidden' : ''}`}>
      <div className="withdraw-phone">
        <div className="withdraw-phone-notch" />
        <div className="withdraw-phone-screen">
          <div className="withdraw-phone-statusbar">
            <PhoneClock />
            <span className="withdraw-phone-statusbar-icons">
              <Wifi className="withdraw-phone-signal" size={11} strokeWidth={2.5} aria-hidden="true" />
              <span className="withdraw-phone-battery" />
            </span>
          </div>
          <div className="withdraw-phone-content">
            {exchangeScreen === 'form' && (
              <>
                <div className="withdraw-phone-app-header">
                  <Smartphone size={14} strokeWidth={1.8} />
                  <span>BitExchange</span>
                </div>

                <div className="withdraw-phone-section">
                  <label>Asset</label>
                  <button className="withdraw-asset-dropdown" type="button" disabled>
                    <span className="withdraw-asset-icon">
                      <span className="withdraw-asset-btc">B</span>
                    </span>
                    <span className="withdraw-asset-name">Bitcoin</span>
                    <ChevronDown size={14} strokeWidth={2} className="withdraw-asset-chevron" />
                  </button>
                </div>

                <div className="withdraw-phone-section">
                  <label htmlFor="wd-send-address">Send to address</label>
                  {isAddressValid ? (
                    <div className="wd-addr-scanned" aria-label={WITHDRAW_ADDRESS}>
                      <span className="wd-addr-scanned-text"><SplitAddress address={WITHDRAW_ADDRESS} /></span>
                      <CheckCircle2 size={14} strokeWidth={2.2} aria-hidden="true" />
                    </div>
                  ) : (
                    <div className="wd-addr-field">
                      <input
                        id="wd-send-address"
                        type="text"
                        value={sendAddress}
                        readOnly={!sandbox}
                        onClick={handleAddressFieldClick}
                        onChange={(e) => setSendAddress(e.target.value)}
                        placeholder="Scan or paste address"
                        className="withdraw-addr-input"
                      />
                      <button
                        className={`wd-scan-btn${stage === 'scan' && (viewingExchange || !isMobile) ? ' is-next' : ''}`}
                        type="button"
                        onClick={handleOpenScanner}
                        aria-label="Scan QR code"
                      >
                        <ScanLine size={14} strokeWidth={2.2} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="withdraw-phone-section">
                  <div className="withdraw-phone-label-row">
                    <label>Withdraw amount</label>
                    <button className="withdraw-max-btn" type="button" onClick={handleMax}>
                      MAX
                    </button>
                  </div>
                  <div className="withdraw-amount-input-wrap">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="0.00"
                      className={amountError ? 'error' : ''}
                    />
                    <span className="withdraw-amount-unit">BTC</span>
                  </div>
                  {amountError && <p className="withdraw-amount-error">{amountError}</p>}
                </div>

                <div className="withdraw-phone-summary">
                  <div className="withdraw-summary-row">
                    <span>Available</span>
                    <strong>{AVAILABLE_BALANCE.toFixed(4)} BTC</strong>
                  </div>
                  <div className="withdraw-summary-row">
                    <span>Network fee</span>
                    <strong>{NETWORK_FEE.toFixed(5)} BTC</strong>
                  </div>
                  <div className="withdraw-summary-row received">
                    <span>Received</span>
                    <strong>{receivedAmount > 0 ? receivedAmount.toFixed(8) : '—'} BTC</strong>
                  </div>
                </div>

                <button
                  className="withdraw-btn"
                  type="button"
                  onClick={handleWithdraw}
                  disabled={!sandbox && stage !== 'ready'}
                >
                  Withdraw
                </button>
              </>
            )}

            {exchangeScreen === 'confirm' && (
              <>
                <div className="withdraw-phone-app-header">
                  <button className="withdraw-confirm-back" type="button" onClick={handleBackToForm} aria-label="Back">
                    <ArrowLeft size={14} strokeWidth={2} />
                  </button>
                  <span>Confirm order</span>
                </div>

                <div className="withdraw-confirm-info">
                  <div className="withdraw-confirm-receive">
                    <span className="withdraw-confirm-receive-label">Receive amount</span>
                    <span className="withdraw-confirm-receive-value">{receivedAmount.toFixed(8)} BTC</span>
                  </div>
                  <div className="withdraw-confirm-detail">
                    <span>Network</span>
                    <strong>Bitcoin</strong>
                  </div>
                  <div className="withdraw-confirm-detail withdraw-confirm-address-detail">
                    <span>Address</span>
                    <strong className="withdraw-confirm-addr" aria-label={sendAddress} title={sendAddress}>
                      <SplitAddress address={sendAddress} />
                    </strong>
                  </div>
                  <div className="withdraw-confirm-detail">
                    <span>Withdrawal amount</span>
                    <strong>{numericAmount.toFixed(8)} BTC</strong>
                  </div>
                  <div className="withdraw-confirm-detail">
                    <span>Network fee</span>
                    <strong>{NETWORK_FEE.toFixed(5)} BTC</strong>
                  </div>
                </div>

                <div className="withdraw-confirm-warning">
                  <AlertTriangle size={12} strokeWidth={2} />
                  <span>Please confirm the address and network are correct. Transactions cannot be cancelled once confirmed.</span>
                </div>

                <button className="withdraw-confirm-btn" type="button" onClick={handleConfirm}>
                  Confirm
                </button>
              </>
            )}

            {exchangeScreen === 'success' && (
              <>
                <div className="withdraw-phone-app-header">
                  <Smartphone size={14} strokeWidth={1.8} />
                  <span>BitExchange</span>
                </div>

                <div className="withdraw-success-wrap">
                  <div className="withdraw-success-icon">
                    <Check size={32} strokeWidth={3} />
                  </div>
                  <p className="withdraw-success-title">Withdrawal Submitted</p>
                  <p className="withdraw-success-subtitle">Your Bitcoin is on its way</p>

                  <div className="withdraw-success-details">
                    <div className="withdraw-confirm-detail">
                      <span>Amount</span>
                      <strong>{numericAmount.toFixed(8)} BTC</strong>
                    </div>
                    <div className="withdraw-confirm-detail">
                      <span>Network fee</span>
                      <strong>{NETWORK_FEE.toFixed(5)} BTC</strong>
                    </div>
                    <div className="withdraw-confirm-detail">
                      <span>Received</span>
                      <strong className="withdraw-success-received">{receivedAmount.toFixed(8)} BTC</strong>
                    </div>
                    <div className="withdraw-confirm-detail withdraw-confirm-address-detail">
                      <span>Address</span>
                      <strong className="withdraw-confirm-addr" aria-label={sendAddress} title={sendAddress}>
                        <SplitAddress address={sendAddress} />
                      </strong>
                    </div>
                  </div>

                  <div className="withdraw-success-status">
                    <span className="withdraw-success-pulse" />
                    <span>Processing on blockchain</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Camera scanner, over the app ── */}
          {scanner !== 'closed' && (
            <div className={`wd-scanner${scanner === 'found' ? ' is-found' : ''}`} role="dialog" aria-label="Scan QR code">
              <div className="wd-scanner-top">
                <button className="wd-scanner-close" type="button" onClick={handleCloseScanner} aria-label="Close scanner">
                  <X size={16} strokeWidth={2.2} />
                </button>
                <span>Scan QR code</span>
              </div>
              <div className="wd-scanner-view">
                {/* What the camera sees: the laptop screen with Cairn's QR code */}
                <div className="wd-scanner-scene" aria-hidden="true">
                  <div className="wd-scanner-qr">
                    <ReceiveQrCode address={WITHDRAW_ADDRESS} />
                  </div>
                </div>
                <div className="wd-scanner-frame" aria-hidden="true">
                  <span className="wd-corner tl" />
                  <span className="wd-corner tr" />
                  <span className="wd-corner bl" />
                  <span className="wd-corner br" />
                  {scanner === 'aiming' && <span className="wd-scanner-line" />}
                </div>
              </div>
              <p className="wd-scanner-hint" aria-live="polite">
                {scanner === 'found' ? (
                  <>
                    <CheckCircle2 size={13} strokeWidth={2.4} />
                    <span>Bitcoin address found</span>
                  </>
                ) : (
                  <span>Point your camera at the QR code</span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="device-caption">{t.common.captionPhone}</div>
    </div>
  );

  return (
    <main className={`scenario-page scenario-page-fit lesson-fit ${check.active ? 'knowledge-check-scene' : spotlight ? 'scenario-page-spotlight' : 'scenario-page-connect connect-paged scenario-page-withdraw'}`}>
      <div className={`scenario-mentor-layout ${spotlight ? 'spotlight' : ''} ${check.active ? 'knowledge-check-layout' : ''}`}>
        {check.active && <KnowledgeCheckKicker />}
        {!spotlight && !check.active && (
          <div ref={trioSlotRef} className="fit-slot fit-wrap">
            <div className={`wd-trio${interactionLocked ? ' is-locked' : ''}${isMobile ? ' has-device-switcher' : ''}`}>
              {phoneEl}
              <div className={`connect-duo is-wide${interactionLocked ? ' is-locked' : ''}${isMobile ? ' has-device-switcher' : ''}`}>
                <div className={`wallet-laptop laptop-enter${isMobile && !viewingSoftware ? ' mobile-hidden' : ''}`}>
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
                              disabled={deviceLocked}
                              aria-pressed={walletTab === 'transactions'}
                            >
                              <ArrowLeftRight strokeWidth={2.2} />
                              <span className="wallet-nav-label">Transactions</span>
                            </button>
                            <button
                              type="button"
                              className={`wallet-nav-item${walletTab === 'send' ? ' active' : ''}`}
                              onClick={sandbox ? () => setWalletTab('send') : handleUnexpectedAction}
                              disabled={deviceLocked}
                              aria-pressed={walletTab === 'send'}
                            >
                              <ArrowUpRight strokeWidth={2.2} />
                              <span className="wallet-nav-label">Send</span>
                            </button>
                            <button
                              type="button"
                              className={`wallet-nav-item${walletTab === 'receive' ? ' active' : ''}`}
                              onClick={handleReceiveTab}
                              disabled={deviceLocked}
                              aria-pressed={walletTab === 'receive'}
                            >
                              <ArrowDownLeft strokeWidth={2.2} />
                              <span className="wallet-nav-label">Receive</span>
                            </button>
                            <button
                              type="button"
                              className={`wallet-nav-item${walletTab === 'settings' ? ' active' : ''}`}
                              onClick={sandbox ? () => setWalletTab('settings') : handleUnexpectedAction}
                              disabled={deviceLocked}
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
                                  <ReceiveQrCode address={WITHDRAW_ADDRESS} />
                                </div>
                                <span className="wallet-field-label">Receive address</span>
                                <p className="rx-addr">{WITHDRAW_ADDRESS}</p>
                                {/* No copy button here: the phone scans the QR code instead. */}
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
                                    disabled={verifyingAddr}
                                  >
                                    <Eye size={14} strokeWidth={2} />
                                    <span>{verifyingAddr ? 'Verifying…' : 'Verify address on device'}</span>
                                  </button>
                                )}
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

                  {viewingSoftware && cableEl}
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
                      verifyAddress={WITHDRAW_ADDRESS}
                      onVerifyConfirm={handleDeviceVerified}
                      onVerifyReject={handleVerifyReject}
                      onComplete={() => {}}
                    />
                  </div>
                </div>

                {isMobile && (
                  <DeviceSwitcher
                    options={[
                      { id: 'exchange', label: t.common.captionPhone },
                      { id: 'software', label: t.common.captionWalletSoftware },
                      { id: 'device', label: t.common.captionHardwareWallet },
                    ]}
                    active={mobilePanel}
                    onSelect={handleMobileSwitch}
                    pulseId={mobileSwitchHint}
                    disabled={!sandbox && mobileSwitchHint === null && !COMPARE_STAGES.has(stage)}
                  />
                )}
              </div>
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
            <div className="mentor-bubble-content" key={bubbleKey}>
              <span className="mentor-bubble-name">{mentor.name}</span>
              <div className="mentor-bubble-text-wrap">
                <p className="mentor-bubble-text-ghost">{renderMentorText(message)}</p>
                <p className="mentor-bubble-text">
                  {renderMentorText(displayed)}
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
              aria-label={t.common.continue}
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        {check.active && <KnowledgeCheckCard check={check} ready={done} />}
      </div>
    </main>
  );
}

export default function WithdrawScenario({ onBack, onComplete }: WithdrawScenarioProps) {
  return (
    <WithdrawMentorScene
      onFinish={() => {
        onComplete();
        onBack();
      }}
    />
  );
}
