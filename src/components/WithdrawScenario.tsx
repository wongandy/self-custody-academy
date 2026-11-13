import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Check, CheckCircle2, Copy, Smartphone, AlertTriangle, Wifi, XCircle } from 'lucide-react';
import HardwareWallet, { RECEIVE_ADDRESS, type ExpectedAction, type WalletPhase } from '@/components/HardwareWallet';
import andyPortrait from '@/components/Andy.webp';
import en from '@/locales/en';
import { fmt, renderWithIcon, useI18n, withIconMark } from '@/lib/i18n';
import { useFitScale } from '@/lib/useFitScale';
import { DeviceSwitcher } from '@/components/DeviceSwitcher';
import { useSandbox } from '@/lib/sandbox';

type WithdrawScenarioProps = {
  completed: boolean;
  onBack: () => void;
  onComplete: () => void;
};

const AVAILABLE_BALANCE = 0.05;
const NETWORK_FEE = 0.00002;

// Andy's lines live in the dictionary (`lesson2`). He reads `intro` in order
// while the wallet is still hidden; the hand-over line (`handover`) always comes
// right after them and the wallet window appears on it, so lines added to
// `intro` play first, in the spotlight.
const HANDOVER_INDEX = en.lesson2.intro.length;
const SWITCH_INTRO_COUNT = en.lesson2.switchIntro.length;
// The last exchange-intro line is the paste instruction, so the address field
// stays locked until the learner steps through to it.
const EXCHANGE_INTRO_COUNT = en.lesson2.exchangeIntro.length;
// The last receive-address line asks the learner to copy, so the device unlocks on it.
const RECEIVE_ADDRESS_COUNT = en.lesson2.receiveAddress.length;

type ExchangePhase = 'enter-address' | 'enter-amount' | 'ready-to-withdraw';

const NUDGE_DURATION_MS = 1250;

const KNOWLEDGE_QUESTIONS = [
  { textIndex: 0, optionIds: ['speed', 'match', 'fee'], correctId: 'match' },
  { textIndex: 1, optionIds: ['extra', 'balance', 'exchange'], correctId: 'extra' },
] as const;

type KnowledgeFeedback = 'prompt' | 'wrong' | 'correct';

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

export default function WithdrawScenario({ onComplete }: WithdrawScenarioProps) {
  const { t } = useI18n();
  const l2 = t.lesson2;
  const INTRO_MESSAGES = [...l2.intro, l2.handover];
  const EXCHANGE_PHASE_MESSAGES: Record<ExchangePhase, readonly string[]> = {
    'enter-address': [l2.exchangeIntro[EXCHANGE_INTRO_COUNT - 1]],
    'enter-amount': [l2.enterAmount],
    'ready-to-withdraw': [l2.readyToWithdraw],
  };
  const MENTOR_MESSAGES: Record<string, string> = {
    'panel-exchange': l2.panelExchange,
    'panel-wallet': l2.panelWallet,
    'wallet-booting': l2.walletBooting,
    'wallet-menu': l2.walletMenu,
    'wallet-settings': l2.walletSettings,
    'wallet-menu-receive-address': l2.walletMenuReceive,
    'wallet-menu-send-blocked': l2.walletMenuSendBlocked,
    'wallet-receive-copied': l2.walletReceiveCopied,
    'wallet-receive-copied-desktop': l2.walletReceiveCopiedDesktop,
    'exchange-address-mismatch': l2.addressMismatch,
    'exchange-confirm': l2.exchangeConfirm,
    'exchange-success': l2.exchangeSuccess,
    'factory-reset-blocked': l2.factoryResetBlocked,
  };
  const [activePanel, setActivePanel] = useState<'exchange' | 'wallet'>('wallet');
  const [introStep, setIntroStep] = useState(0);
  const [introDone, setIntroDone] = useState(false);
  const [walletPhase, setWalletPhase] = useState<WalletPhase>('menu');
  const [menuSelection, setMenuSelection] = useState<'create-intro' | 'recover-intro' | 'receive-address' | 'send-blocked'>('receive-address');
  const [sendAddress, setSendAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [hasRetrievedAddress, setHasRetrievedAddress] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [receiveAddressStep, setReceiveAddressStep] = useState<number | null>(null);
  const [exchangeIntroStep, setExchangeIntroStep] = useState<number | null>(null);
  const exchangeIntroPlayed = useRef(false);
  const [switchIntroStep, setSwitchIntroStep] = useState<number | null>(null);
  const [exchangePhase, setExchangePhase] = useState<ExchangePhase>('enter-address');
  const [switchPulse, setSwitchPulse] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'withdraw-slide-left' | 'withdraw-slide-right' | null>(null);
  const usedSwitchPrompt = useRef(false);
  const [resetBlockedMsg, setResetBlockedMsg] = useState(false);
  const [nudgeActive, setNudgeActive] = useState(false);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);
  const [exchangeScreen, setExchangeScreen] = useState<'form' | 'confirm' | 'success'>('form');
  const [knowledgeCheckActive, setKnowledgeCheckActive] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [checkedAnswer, setCheckedAnswer] = useState(false);
  const [knowledgeFeedback, setKnowledgeFeedback] = useState<KnowledgeFeedback>('prompt');
  const [wrongOptionId, setWrongOptionId] = useState<string | null>(null);
  const [wrongAttempt, setWrongAttempt] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 600px)').matches);
  // TEMPORARY (/test sandbox): the phone is on screen and every field is open from the start.
  const sandbox = useSandbox();
  const [phoneVisible, setPhoneVisible] = useState(sandbox);
  const portraitRef = useRef<HTMLDivElement>(null);
  const middleAreaRef = useFitScale();
  const bubbleRef = useRef<HTMLDivElement>(null);
  const flipRects = useRef<{ portrait: DOMRect; bubble: DOMRect } | null>(null);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const isInIntro = !introDone;
  // The wallet stays hidden, and Andy stays in the spotlight, until his
  // hand-over line; that line is where the wallet window slides in.
  const walletVisible = introStep >= HANDOVER_INDEX;
  const spotlight = isInIntro && introStep < HANDOVER_INDEX;
  const isOnExchangeForm = (isMobile ? activePanel === 'exchange' : phoneVisible) && exchangeScreen === 'form';
  const exchangeIntroLocking = exchangeIntroStep !== null && exchangeIntroStep < EXCHANGE_INTRO_COUNT - 1;
  const addressLocked = !sandbox && isOnExchangeForm && (exchangeIntroLocking || exchangePhase === 'enter-amount' || exchangePhase === 'ready-to-withdraw');
  const amountLocked = !sandbox && isOnExchangeForm && exchangePhase === 'enter-address';
  const amountNudgeLocked = !sandbox && isOnExchangeForm && exchangePhase === 'ready-to-withdraw';
  const maxLocked = !sandbox && isOnExchangeForm && (exchangePhase === 'enter-address' || exchangePhase === 'ready-to-withdraw');
  const withdrawBtnLocked = !sandbox && isOnExchangeForm && (exchangePhase === 'enter-address' || exchangePhase === 'enter-amount');
  const switchNudgeLocked = !sandbox && isOnExchangeForm && (exchangePhase === 'enter-amount' || exchangePhase === 'ready-to-withdraw');
  const expectedAction: ExpectedAction =
    activePanel === 'wallet' && walletPhase === 'menu' && !hasRetrievedAddress
      ? { type: 'confirm-menu-item', label: 'Receive Bitcoin' }
      : activePanel === 'wallet' && walletPhase === 'receive-address'
        ? { type: 'copy-address' }
        : { type: 'none' };

  const showSwitchButton = !isInIntro && (
    switchIntroStep !== null ? switchIntroStep === SWITCH_INTRO_COUNT - 1 : addressCopied || activePanel === 'exchange'
  );
  const showSwitcher = isMobile && (sandbox ? walletVisible : showSwitchButton);
  const currentIntroMessage = INTRO_MESSAGES[introStep];

  const trimmedAddress = sendAddress.trim();
  const matchesReceiveAddress = trimmedAddress.length > 0 && trimmedAddress.toLowerCase() === RECEIVE_ADDRESS.toLowerCase();
  const looksLikeFullAddress = trimmedAddress.length >= 10;
  const addressMismatch = trimmedAddress.length > 0 && !matchesReceiveAddress && looksLikeFullAddress;
  const parsedAmount = Number.parseFloat(amount);
  const numericAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  // While the learner types toward 0.05 ("0", "0.", "0.0", "0.05" mid-edit),
  // the value is a prefix of the target and shouldn't trigger the correction.
  const amountTooLow =
    amount.trim() !== '' &&
    Number.isFinite(parsedAmount) &&
    parsedAmount < AVAILABLE_BALANCE &&
    !isPrefixOfAvailableBalance(amount.trim());

  function isPrefixOfAvailableBalance(val: string): boolean {
    return AVAILABLE_BALANCE.toFixed(8).replace(/0+$/, '').startsWith(val.replace(/0+$/, ''));
  }

  const isExchangePanelActive = isMobile ? activePanel === 'exchange' : phoneVisible;
  const walletStateKey = isExchangePanelActive
    ? exchangeScreen === 'confirm'
      ? 'exchange-confirm'
      : exchangeScreen === 'success'
        ? 'exchange-success'
        : 'panel-exchange'
    : walletPhase === 'menu'
      ? `wallet-menu-${menuSelection}`
      : walletPhase === 'receive-address'
        ? addressCopied
          ? isMobile ? 'wallet-receive-copied' : 'wallet-receive-copied-desktop'
          : 'wallet-receive-address'
        : `wallet-${walletPhase}`;

  const currentQuizQuestion = KNOWLEDGE_QUESTIONS[quizIndex] ?? KNOWLEDGE_QUESTIONS[0];
  const currentQuizText = l2.questions[currentQuizQuestion.textIndex];
  const quizOptionLabel = (optionId: string) => (currentQuizText.options as Record<string, string>)[optionId] ?? optionId;
  const mentorMessage = withIconMark(nudgeActive
    ? t.common.nudge
    : knowledgeCheckActive
      ? knowledgeFeedback === 'wrong'
        ? t.common.wrongAnswer
        : knowledgeFeedback === 'correct'
          ? currentQuizText.correctLine
          : l2.knowledgePrompts[quizIndex] ?? l2.knowledgePrompts[0]
    : isInIntro
      ? currentIntroMessage
      : receiveAddressStep !== null
        ? l2.receiveAddress[receiveAddressStep]
        // The exchange walkthrough only speaks while the exchange is on screen;
        // flipping back to the wallet (e.g. to re-copy the address) falls
        // through to the wallet's own guidance.
        : exchangeIntroStep !== null && isExchangePanelActive
          ? l2.exchangeIntro[exchangeIntroStep]
          : resetBlockedMsg && activePanel === 'wallet'
        ? MENTOR_MESSAGES['factory-reset-blocked']
        : switchIntroStep !== null
        ? l2.switchIntro[switchIntroStep]
        : addressMismatch && isOnExchangeForm
          ? MENTOR_MESSAGES['exchange-address-mismatch']
          : amountTooLow && isOnExchangeForm
            ? l2.amountCorrection
            : isOnExchangeForm
              ? EXCHANGE_PHASE_MESSAGES[exchangePhase][0]
            : MENTOR_MESSAGES[walletStateKey] || MENTOR_MESSAGES['panel-exchange']);

  const mentorMessageKey = nudgeActive
    ? 'nudge'
    : knowledgeCheckActive
      ? `knowledge-check-${quizIndex}-${knowledgeFeedback}-${wrongAttempt}`
      : isInIntro
        ? `intro-${introStep}`
        : `${walletStateKey}-${resetBlockedMsg}-${receiveAddressStep}-${exchangeIntroStep}-${switchIntroStep}-${exchangePhase}-${amountTooLow}-${addressMismatch}`;
  const { displayed, done, skip } = useTypewriter(mentorMessage, 6, mentorMessageKey);
  const knowledgeCheckCanAnswer = knowledgeCheckActive && !checkedAnswer && done;

  const canContinue = nudgeActive
    ? false
    : knowledgeCheckActive
      ? false
      : isInIntro
        ? introStep < HANDOVER_INDEX && done
      : receiveAddressStep !== null
        ? receiveAddressStep < RECEIVE_ADDRESS_COUNT - 1 && done
        : exchangeIntroStep !== null && isExchangePanelActive
          ? exchangeIntroStep < EXCHANGE_INTRO_COUNT - 1 && done
          : switchIntroStep !== null
          ? switchIntroStep < SWITCH_INTRO_COUNT - 1
          : !isOnExchangeForm && exchangeScreen === 'success';

  const switchLocked = !sandbox && activePanel === 'exchange' && canContinue;

  // The wallet ignores input while Andy is still talking, and while the
  // continue button is the only expected action.
  const deviceLocked = knowledgeCheckActive || canContinue || (isInIntro && !done) || (receiveAddressStep !== null && !done) || (exchangeIntroStep !== null && !done);

  // The copy-button line marks where the icon goes with `{icon}`; it appears once typing reaches it.
  const renderMentorText = (text: string) =>
    renderWithIcon(
      text,
      <span className="mentor-copy-button-indicator" aria-hidden="true">
        <Copy size={12} strokeWidth={2.2} />
      </span>,
    );

  useEffect(() => {
    if (walletPhase === 'receive-address' && !addressCopied) {
      setReceiveAddressStep(0);
    } else {
      setReceiveAddressStep(null);
    }
  }, [walletPhase, addressCopied]);

  useEffect(() => {
    if (walletPhase === 'receive-address') {
      setHasRetrievedAddress(true);
    }
  }, [walletPhase]);

  useEffect(() => {
    if (introDone) return;
    if (walletPhase !== 'menu') {
      setIntroDone(true);
    }
  }, [walletPhase, introDone]);

  useEffect(() => {
    if (walletPhase !== 'menu') {
      setResetBlockedMsg(false);
    }
  }, [walletPhase]);

  useEffect(() => {
    if (switchIntroStep === SWITCH_INTRO_COUNT - 1) {
      setSwitchPulse(true);
      return;
    }
    setSwitchPulse(false);
  }, [switchIntroStep]);

  useLayoutEffect(() => {
    if (spotlight || !flipRects.current) return;
    const portrait = portraitRef.current;
    const bubble = bubbleRef.current;
    if (!portrait || !bubble) return;

    const pFirst = flipRects.current.portrait;
    const bFirst = flipRects.current.bubble;
    const pLast = portrait.getBoundingClientRect();
    const bLast = bubble.getBoundingClientRect();
    flipRects.current = null;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const opts: KeyframeAnimationOptions = {
      duration: 560,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    };

    portrait.style.transformOrigin = 'top left';
    portrait.animate(
      [
        {
          transform: `translate(${pFirst.left - pLast.left}px, ${pFirst.top - pLast.top}px) scale(${pFirst.width / pLast.width}, ${pFirst.height / pLast.height})`,
        },
        { transform: 'translate(0, 0) scale(1, 1)' },
      ],
      opts,
    );

    bubble.style.transformOrigin = 'top left';
    bubble.animate(
      [
        {
          transform: `translate(${bFirst.left - bLast.left}px, ${bFirst.top - bLast.top}px) scale(${bFirst.width / bLast.width}, ${bFirst.height / bLast.height})`,
        },
        { transform: 'translate(0, 0) scale(1, 1)' },
      ],
      opts,
    );
  }, [spotlight]);

  const handleMenuSelectionChange = useCallback((sel: 'create-intro' | 'recover-intro' | 'receive-address' | 'send-blocked') => {
    setMenuSelection(sel);
    setResetBlockedMsg(false);
  }, []);

  const handleFactoryResetAttempt = useCallback(() => {
    setResetBlockedMsg(true);
  }, []);

  const handleUnexpectedAction = useCallback(() => {
    setNudgeActive(true);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    nudgeTimer.current = setTimeout(() => setNudgeActive(false), NUDGE_DURATION_MS);
  }, []);

  useEffect(() => {
    if (!nudgeActive) return;
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    nudgeTimer.current = setTimeout(() => setNudgeActive(false), NUDGE_DURATION_MS);
    return () => {
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    };
  }, [nudgeActive]);

  useEffect(() => () => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
  }, []);

  useEffect(() => {
    if (nudgeActive) {
      setNudgeActive(false);
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    }
  }, [walletPhase]);

  const handleCopyAddress = useCallback(() => {
    navigator.clipboard?.writeText(RECEIVE_ADDRESS).catch(() => {});
    setAddressCopied(true);
    if (!usedSwitchPrompt.current) {
      usedSwitchPrompt.current = true;
      if (isMobile) {
        setSwitchIntroStep(0);
      } else {
        setPhoneVisible(true);
        exchangeIntroPlayed.current = true;
        setExchangeIntroStep(0);
      }
    }
  }, [isMobile]);

  const handleSwitchPanel = useCallback(() => {
    if (!isMobile || switchLocked) return;
    if (switchNudgeLocked) {
      handleUnexpectedAction();
      return;
    }
    if (switchIntroStep !== null) {
      setSwitchIntroStep(null);
    }
    if (activePanel === 'wallet' && !exchangeIntroPlayed.current) {
      exchangeIntroPlayed.current = true;
      setExchangeIntroStep(0);
    }
    setSlideDirection(activePanel === 'wallet' ? 'withdraw-slide-right' : 'withdraw-slide-left');
    setActivePanel((panel) => (panel === 'exchange' ? 'wallet' : 'exchange'));
  }, [switchLocked, switchNudgeLocked, switchIntroStep, activePanel, handleUnexpectedAction]);

  const handleAmountChange = useCallback((val: string) => {
    if (amountLocked || amountNudgeLocked) {
      handleUnexpectedAction();
      return;
    }
    setAmount(val);
    const parsed = parseFloat(val);
    if (val === '' || isNaN(parsed)) {
      setAmountError('');
      return;
    }
    if (parsed > AVAILABLE_BALANCE) {
      setAmountError('Insufficient balance. The amount exceeds your available balance.');
    } else {
      setAmountError('');
    }
  }, [amountLocked, amountNudgeLocked, handleUnexpectedAction]);

  const handleMax = useCallback(() => {
    if (maxLocked) return;
    setAmount(AVAILABLE_BALANCE.toFixed(8));
    setAmountError('');
  }, [maxLocked]);

  const receivedAmount = numericAmount > 0 ? Math.max(numericAmount - NETWORK_FEE, 0) : 0;
  const isAmountValid = numericAmount === AVAILABLE_BALANCE && amountError === '';
  const isAddressValid = matchesReceiveAddress;
  const canWithdraw = hasRetrievedAddress && isAmountValid && isAddressValid;
  const displayAddress = sendAddress || RECEIVE_ADDRESS;
  const addressBreakIndex = Math.ceil(displayAddress.length / 2);
  const addressFirstLine = displayAddress.slice(0, addressBreakIndex);
  const addressSecondLine = displayAddress.slice(addressBreakIndex);

  const handleWithdraw = () => {
    if (withdrawBtnLocked) return;
    if (canWithdraw || sandbox) {
      setExchangeScreen('confirm');
    }
  };

  const handleBackToForm = () => {
    setExchangeScreen('form');
    setExchangePhase('ready-to-withdraw');
  };

  const handleConfirm = () => {
    setExchangeScreen('success');
  };

  const handleContinue = () => {
    if (!done) {
      skip();
      return;
    }
    if (isInIntro && introStep < HANDOVER_INDEX) {
      if (introStep === HANDOVER_INDEX - 1 && portraitRef.current && bubbleRef.current) {
        flipRects.current = {
          portrait: portraitRef.current.getBoundingClientRect(),
          bubble: bubbleRef.current.getBoundingClientRect(),
        };
      }
      setIntroStep(introStep + 1);
      return;
    }
    if (receiveAddressStep !== null) {
      if (receiveAddressStep < RECEIVE_ADDRESS_COUNT - 1) {
        setReceiveAddressStep(receiveAddressStep + 1);
      }
      return;
    }
    if (exchangeIntroStep !== null && isExchangePanelActive) {
      if (exchangeIntroStep < EXCHANGE_INTRO_COUNT - 1) {
        setExchangeIntroStep(exchangeIntroStep + 1);
      }
      // The last line ("paste the receive address…") waits for the paste, not
      // a click; clearing the step here would restart the same line.
      return;
    }
    if (switchIntroStep !== null) {
      if (switchIntroStep < SWITCH_INTRO_COUNT - 1) {
        setSwitchIntroStep(switchIntroStep + 1);
      }
      return;
    }
    if (knowledgeCheckActive) {
      if (checkedAnswer) {
        handleContinueFromCheck();
      }
      return;
    }
    if (exchangeScreen === 'success') {
      setKnowledgeCheckActive(true);
      setQuizIndex(0);
      setSelectedOption(null);
      setCheckedAnswer(false);
      setKnowledgeFeedback('prompt');
      setWrongOptionId(null);
      setWrongAttempt(0);
      return;
    }
  };

  const handleOptionSelect = (optionId: string) => {
    if (!knowledgeCheckCanAnswer) return;
    setWrongOptionId(null);
    if (optionId === currentQuizQuestion.correctId) {
      setSelectedOption(optionId);
      setKnowledgeFeedback('correct');
      setCheckedAnswer(true);
      return;
    }
    setSelectedOption(null);
    setWrongOptionId(optionId);
    setWrongAttempt((attempt) => attempt + 1);
    setKnowledgeFeedback('wrong');
  };

  const handleContinueFromCheck = () => {
    if (!checkedAnswer || !done) return;
    if (quizIndex < KNOWLEDGE_QUESTIONS.length - 1) {
      setQuizIndex((index) => index + 1);
      setSelectedOption(null);
      setCheckedAnswer(false);
      setKnowledgeFeedback('prompt');
      setWrongOptionId(null);
      setWrongAttempt(0);
      return;
    }
    onComplete();
  };

  const bubbleKey = mentorMessageKey;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (!knowledgeCheckActive && !canContinue && done) return;
      e.preventDefault();
      handleContinue();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  useEffect(() => {
    if (!isOnExchangeForm) return;
    if (exchangePhase === 'enter-address' && isAddressValid) {
      setExchangePhase('enter-amount');
      if (exchangeIntroStep !== null) setExchangeIntroStep(null);
    } else if (exchangePhase === 'enter-amount' && isAmountValid && isAddressValid) {
      setExchangePhase('ready-to-withdraw');
    } else if (exchangePhase === 'ready-to-withdraw' && !isAmountValid) {
      setExchangePhase('enter-amount');
    }
  }, [isOnExchangeForm, exchangePhase, isAddressValid, isAmountValid, exchangeIntroStep]);

  return (
    <main className={`scenario-page scenario-page-fit lesson-fit ${spotlight ? 'scenario-page-spotlight' : ''} ${knowledgeCheckActive ? 'knowledge-check-scene' : ''}`}>
      <div className={`scenario-mentor-layout ${spotlight ? 'spotlight' : ''} ${knowledgeCheckActive ? 'knowledge-check-layout' : ''}`}>
        {knowledgeCheckActive && <div className="knowledge-check-kicker">{t.quiz.checkIn}</div>}
        {!knowledgeCheckActive && <div ref={middleAreaRef} className={`withdraw-middle-area fit-slot${spotlight ? ' hidden' : ''}${showSwitcher ? ' has-device-switcher' : ''}`}>
          <div className="withdraw-panels-wrap">
            {/* ── Smartphone exchange panel ── */}
            <div className={`withdraw-phone-wrap ${!isMobile ? (phoneVisible ? 'withdraw-phone-desktop-enter' : 'withdraw-panel-hidden') : activePanel === 'exchange' ? slideDirection ?? '' : 'withdraw-panel-hidden'}`}>
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
                          <button
                            className="withdraw-asset-dropdown"
                            type="button"
                            onClick={() => {
                              setAssetDropdownOpen(!assetDropdownOpen);
                            }}
                            disabled
                          >
                            <span className="withdraw-asset-icon">
                              <span className="withdraw-asset-btc">B</span>
                            </span>
                            <span className="withdraw-asset-name">Bitcoin</span>
                            <ChevronDown size={14} strokeWidth={2} className={`withdraw-asset-chevron ${assetDropdownOpen ? 'open' : ''}`} />
                          </button>
                          {assetDropdownOpen && (
                            <div className="withdraw-asset-menu">
                              <div className="withdraw-asset-option active">
                                <span className="withdraw-asset-icon">
                                  <span className="withdraw-asset-btc">B</span>
                                </span>
                                <span className="withdraw-asset-name">Bitcoin</span>
                                <Check size={12} strokeWidth={2.5} />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="withdraw-phone-section">
                          <label>Send to address</label>
                          <input
                            type="text"
                            value={sendAddress}
                            onChange={(e) => {
                              if (addressLocked) {
                                handleUnexpectedAction();
                                return;
                              }
                              setSendAddress(e.target.value);
                            }}
                            disabled={addressLocked}
                            placeholder="Paste wallet receive address"
                            className={`withdraw-addr-input${addressMismatch ? ' error' : ''}`}
                          />
                          {/* {trimmedAddress.length === 0 && (
                            <p className="withdraw-addr-status hint">
                              <span>Go to your hardware wallet, copy the receive address, then paste it here.</span>
                            </p>
                          )} */}
                        </div>
                        
                        <div className="withdraw-phone-section">
                          <div className="withdraw-phone-label-row">
                            <label>Withdraw amount</label>
                            <button className="withdraw-max-btn" type="button" onClick={handleMax} disabled={maxLocked}>
                              MAX
                            </button>
                          </div>
                          <div className="withdraw-amount-input-wrap">
                            <input
                              type="text"
                              value={amount}
                              onChange={(e) => handleAmountChange(e.target.value)}
                              disabled={amountLocked}
                              placeholder="0.00"
                              className={amountError ? 'error' : ''}
                            />
                            <span className="withdraw-amount-unit">BTC</span>
                          </div>
                          {amountError && (
                            <p className="withdraw-amount-error">{amountError}</p>
                          )}
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
                          disabled={(!canWithdraw && !sandbox) || withdrawBtnLocked}
                        >
                          Withdraw
                        </button>
                      </>
                    )}

                    {exchangeScreen === 'confirm' && (
                      <>
                        <div className="withdraw-phone-app-header">
                          <button className="withdraw-confirm-back" type="button" onClick={handleBackToForm}>
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
                            <strong className="withdraw-confirm-addr" aria-label={displayAddress} title={displayAddress}>
                              <span>{addressFirstLine}</span>
                              <span>{addressSecondLine}</span>
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

                        <button
                          className="withdraw-confirm-btn"
                          type="button"
                          onClick={handleConfirm}
                        >
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
                              <strong className="withdraw-confirm-addr" aria-label={displayAddress} title={displayAddress}>
                                <span>{addressFirstLine}</span>
                                <span>{addressSecondLine}</span>
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
                </div>
              </div>
              <div className="device-caption">{t.common.captionPhone}</div>
            </div>

            {/* ── Hardware wallet panel ── */}
            {walletVisible && (
              <div className={`withdraw-wallet-wrap withdraw-wallet-slide-in ${isMobile ? (activePanel === 'wallet' ? slideDirection ?? '' : 'withdraw-panel-hidden') : phoneVisible ? 'withdraw-wallet-desktop-shift' : ''}`}>
                <div className="hw-wallet-slot">
                  <HardwareWallet
                    mode="withdraw"
                    startAtMenu
                    locked={deviceLocked}
                    onComplete={() => {}}
                    onPhaseChange={setWalletPhase}
                    onMenuSelectionChange={handleMenuSelectionChange}
                    onCopyAddress={handleCopyAddress}
                    onFactoryResetAttempt={handleFactoryResetAttempt}
                    onUnexpectedAction={handleUnexpectedAction}
                    expectedAction={expectedAction}
                  />
                </div>
              </div>
            )}
          </div>

          {showSwitcher && (
            <DeviceSwitcher
              options={[
                { id: 'wallet', label: t.common.captionHardwareWallet },
                { id: 'exchange', label: l2.deviceExchange },
              ]}
              active={activePanel}
              onSelect={handleSwitchPanel}
              pulseId={switchPulse ? 'exchange' : null}
              disabled={switchLocked}
            />
          )}
        </div>}

        <div className="mentor-row">
          <div ref={portraitRef} className="mentor-portrait" aria-label={fmt(t.common.mentorAria, { name: 'Andy' })} role="img">
            <div className="mentor-portrait-glow" />
            <div className="mentor-portrait-ring">
              <img className="mentor-portrait-image" src={andyPortrait} alt={fmt(t.common.mentorAria, { name: 'Andy' })} />
            </div>
            <div className="mentor-portrait-badge">Andy</div>
          </div>
          <div
            ref={bubbleRef}
            className={`mentor-bubble ${canContinue ? 'is-ready' : ''}`}
            onClick={handleContinue}
          >
            <div className="mentor-bubble-content" key={bubbleKey}>
              <span className="mentor-bubble-name">Andy</span>
              <div className="mentor-bubble-text-wrap">
                <p className="mentor-bubble-text-ghost">{renderMentorText(mentorMessage)}</p>
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
        {knowledgeCheckActive && (
          <div className="knowledge-check-card" role="group" aria-label={t.quiz.groupAria}>
            <div className="knowledge-check-header">
              <span>{fmt(t.quiz.progress, { current: quizIndex + 1, total: KNOWLEDGE_QUESTIONS.length })}</span>
            </div>
            <p className="knowledge-check-question">{currentQuizText.question}</p>
            <div className="knowledge-check-options">
              {currentQuizQuestion.optionIds.map((optionId) => {
                const isSelected = selectedOption === optionId;
                const isCorrect = checkedAnswer && optionId === currentQuizQuestion.correctId;
                const isWrong = wrongOptionId === optionId;
                return (
                  <button
                    key={optionId}
                    type="button"
                    className={`knowledge-check-option ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                    onClick={() => handleOptionSelect(optionId)}
                    disabled={!knowledgeCheckCanAnswer}
                  >
                    {isCorrect ? <CheckCircle2 size={16} strokeWidth={2.2} /> : isWrong ? <XCircle size={16} strokeWidth={2.2} /> : null}
                    <span>{quizOptionLabel(optionId)}</span>
                  </button>
                );
              })}
            </div>
            <button
              className="knowledge-check-submit"
              type="button"
              onClick={handleContinueFromCheck}
              disabled={!checkedAnswer || !done}
            >
              {quizIndex === KNOWLEDGE_QUESTIONS.length - 1 ? t.quiz.finish : t.quiz.next}
            </button>
          </div>
        )}
      </div>

      {/* <div className="character-footer">
        <div className="character-footer-inner">
          <button
            className="character-proceed"
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
          >
            <span>Continue</span>
            <ArrowRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div> */}
    </main>
  );
}
