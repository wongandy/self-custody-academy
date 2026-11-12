import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ChevronDown, ChevronRight, Download, Layers, Plus, Settings, Usb, Wallet } from 'lucide-react';
import HardwareWallet, { type ExpectedAction } from '@/components/HardwareWallet';
import { DeviceSwitcher } from '@/components/DeviceSwitcher';
import andyPortrait from '@/components/Andy.webp';
import mariaPortrait from '@/components/Maria.webp';
import en, { type Dictionary } from '@/locales/en';
import { fmt, useI18n } from '@/lib/i18n';
import { useFitScale } from '@/lib/useFitScale';
import { useLaptopCableAlign } from '@/lib/useLaptopCableAlign';
import { useDeviceFit } from '@/lib/useDeviceFit';
import { useSandbox } from '@/lib/sandbox';
import { SandboxWalletTab, type WalletTabId } from '@/components/SandboxWalletTab';
import { KnowledgeCheckCard, KnowledgeCheckKicker, useKnowledgeCheck, type KnowledgeQuestion } from '@/components/KnowledgeCheck';
import { setWalletName as saveWalletName, walletWindowTitle } from '@/lib/walletName';

type ConnectScenarioProps = {
  completed: boolean;
  onComplete: () => void;
};

type Step =
  | { kind: 'mentor'; mentor: 'andy' | 'maria' }
  | { kind: 'wallet-intro' }
  | { kind: 'wallet-name' }
  | { kind: 'wallet-settings' }
  | { kind: 'device-arrival' }
  | { kind: 'connect-request' }
  | { kind: 'device-prompt' }
  | { kind: 'keystore-details' }
  | { kind: 'open-transactions' }
  | { kind: 'connected' };

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

const NUDGE_DURATION_MS = 1250;

// Answer key for the check-in; the wording is `lesson4.questions`, in this order.
const KNOWLEDGE_QUESTIONS: KnowledgeQuestion[] = [
  { optionIds: ['view', 'spend', 'recover'], correctId: 'view' },
  { optionIds: ['device', 'laptop', 'cloud'], correctId: 'device' },
];

// One speaking turn per line, in order: Andy hands over (`lesson4.andy`), then
// Maria takes it (`lesson4.maria`). Deriving the turns from the dictionary's
// lists means adding or removing a line can never leave a turn without a line
// or shift the lines out of step. Every locale has the same list lengths.
// The Settings and keystore explanations work the same way: one step per line.
const HANDOFF_COUNT = en.lesson4.andy.length;
const STEPS: Step[] = [
  ...en.lesson4.andy.map((): Step => ({ kind: 'mentor', mentor: 'andy' })),
  ...en.lesson4.maria.map((): Step => ({ kind: 'mentor', mentor: 'maria' })),
  { kind: 'wallet-intro' },
  { kind: 'wallet-name' },
  ...en.lesson4.walletSettings.map((): Step => ({ kind: 'wallet-settings' })),
  { kind: 'device-arrival' },
  { kind: 'connect-request' },
  { kind: 'device-prompt' },
  ...en.lesson4.keystoreDetails.map((): Step => ({ kind: 'keystore-details' })),
  { kind: 'open-transactions' },
  { kind: 'connected' },
];

const WALLET_INTRO_INDEX = STEPS.findIndex((s) => s.kind === 'wallet-intro');
const WALLET_NAME_INDEX = STEPS.findIndex((s) => s.kind === 'wallet-name');
const WALLET_SETTINGS_INDEX = STEPS.findIndex((s) => s.kind === 'wallet-settings');
const KEYSTORE_DETAILS_INDEX = STEPS.findIndex((s) => s.kind === 'keystore-details');
const CONNECTED_INDEX = STEPS.findIndex((s) => s.kind === 'connected');

// What Cairn reads from the paired device into Keystore 1. The xpub is the
// public BIP32 test-vector key, so nothing here belongs to a real wallet.
const KEYSTORE = {
  fingerprint: '3442193e',
  derivation: "m/84'/0'/0'",
  xpub: 'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz',
};
const WALLET_NAME_MAX = 24;

const WALLET_BALANCE = '0.04998';
const WALLET_APP_NAME = 'Cairn';
const TRANSACTIONS = [
  { date: '2026-09-21 09:48', value: '+0.04998 BTC', balance: '0.04998 BTC', incoming: true },
];

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

function stepMessage(l4: Dictionary['lesson4'], step: Step, stepIndex: number): string {
  switch (step.kind) {
    case 'mentor':
      if (step.mentor === 'andy') return l4.andy[stepIndex] ?? '';
      return l4.maria[stepIndex - HANDOFF_COUNT] ?? '';
    case 'wallet-intro':
      return l4.walletIntro;
    case 'wallet-name':
      return l4.walletName;
    case 'wallet-settings':
      return l4.walletSettings[stepIndex - WALLET_SETTINGS_INDEX] ?? '';
    case 'device-arrival':
      return l4.deviceArrival;
    case 'connect-request':
      return l4.connectDevice;
    case 'device-prompt':
      return l4.devicePrompt;
    case 'keystore-details':
      return l4.keystoreDetails[stepIndex - KEYSTORE_DETAILS_INDEX] ?? '';
    case 'open-transactions':
      return l4.openTransactions;
    case 'connected':
      return l4.connected;
  }
}

export default function ConnectScenario({ onComplete }: ConnectScenarioProps) {
  const { t } = useI18n();
  const l4 = t.lesson4;
  const [stepIndex, setStepIndex] = useState(0);
  const [connectRequested, setConnectRequested] = useState(false);
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connection, setConnection] = useState<ConnectionPhase>('idle');
  const [arrivalRequested, setArrivalRequested] = useState(false);
  const [arrivalStarted, setArrivalStarted] = useState(false);
  const [bootPhase, setBootPhase] = useState<BootPhase>('pending');
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 600px)').matches);
  const [mobilePanel, setMobilePanel] = useState<'software' | 'device'>('software');
  const [mobileDeviceEntered, setMobileDeviceEntered] = useState(false);
  const [mobileCordSeated, setMobileCordSeated] = useState(false);
  const [nudgeActive, setNudgeActive] = useState(false);
  const [walletName, setWalletName] = useState('');
  // TEMPORARY (/test sandbox): a tab the learner opened by hand, overriding the lesson's.
  const sandbox = useSandbox();
  const [sandboxTab, setSandboxTab] = useState<WalletTabId | null>(null);
  const walletNameInputRef = useRef<HTMLDivElement>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const check = useKnowledgeCheck(KNOWLEDGE_QUESTIONS, l4, onComplete);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const SLIDE_SETTLE_MS = 620;
  // Phones: the cord rises into the laptop and seats before the device switcher appears
  const CORD_SEAT_MS = 1000;

  const step = STEPS[stepIndex];
  const mentorName = step.kind === 'mentor' && step.mentor === 'andy' ? 'Andy' : 'Maria';
  const portrait = mentorName === 'Andy' ? andyPortrait : mariaPortrait;
  // Maria asks the learner to wait until Cairn has finished starting up, then
  // walks the learner through creating a wallet once the app is on screen.
  const walletBooting = step.kind === 'wallet-intro' && bootPhase !== 'ready';
  const message = nudgeActive
    ? t.common.nudgeLater
    : check.active
      ? check.mentorLine
    : walletBooting
      ? l4.walletWaiting
      : stepMessage(l4, step, stepIndex);
  const bubbleKey = nudgeActive ? 'nudge' : check.active ? check.mentorKey : `${mentorName}-${stepIndex}-${message}`;
  const { displayed, done, skip } = useTypewriter(message, 6, bubbleKey);

  const walletVisible = stepIndex >= WALLET_INTRO_INDEX;
  const spotlight = !walletVisible;
  const mobileCableHalf = isMobile && walletVisible && step.kind === 'device-arrival' && arrivalStarted && !mobileDeviceEntered;
  const showCable = mobileCableHalf || connection === 'plugging' || connection === 'seating' || connection === 'linked';
  const mobileCordEntering = mobileCableHalf && !mobileCordSeated;
  const showMobileSwitch = isMobile && walletVisible && arrivalStarted && (mobileCordSeated || mobileDeviceEntered);
  const arrivalWaiting = step.kind === 'device-arrival' && !arrivalRequested;
  const arrivalAnimating = step.kind === 'device-arrival' && arrivalRequested && !arrivalStarted;
  const connecting = step.kind === 'device-arrival' && arrivalStarted && connection !== 'linked';
  const sliding = arrivalAnimating;

  // Nothing on the laptop, device or phone responds until the mentor has finished talking
  // and Cairn has finished starting up.
  const interactionLocked = !sandbox && (!done || walletBooting || arrivalWaiting || arrivalAnimating || connecting);
  const usbConnectionComplete = connection === 'linked';

  const requestPending = step.kind === 'connect-request' && !connectRequested;
  const confirmPending = step.kind === 'device-prompt' && !connected;
  // Maria asks the learner to open Transactions; the bubble can't be clicked past.
  const tabPending = step.kind === 'open-transactions';
  // The history loads when the learner opens Transactions; finishing waits for it.
  const syncPending = step.kind === 'connected' && syncing;
  // Creating the wallet happens in the app itself: New Wallet, then the name dialog.
  const appPending = step.kind === 'wallet-intro' || step.kind === 'wallet-name';
  const devicePending = requestPending || confirmPending || appPending || tabPending || syncPending;
  // No wallet exists until the name dialog is confirmed. The Settings tab shows
  // until the pairing is confirmed, then the app moves to the Transactions tab.
  const walletCreated = stepIndex > WALLET_NAME_INDEX;
  // After pairing, Settings shows the filled-in keystore; the app moves to
  // Transactions once the learner clicks that tab.
  const activeTab: 'settings' | 'transactions' = stepIndex >= CONNECTED_INDEX ? 'transactions' : 'settings';
  const shownTab: WalletTabId = (sandbox && sandboxTab) || activeTab;
  const trimmedWalletName = walletName.trim();

  const canContinue = nudgeActive || check.active
    ? false
    : arrivalWaiting
      ? done && !walletBooting
      : done && !walletBooting && !sliding && (!devicePending && !connecting);
  const softwareLocked = !sandbox && (interactionLocked || (canContinue && !nudgeActive));
  const deviceLocked = !sandbox && (interactionLocked || (canContinue && !nudgeActive));
  const connectButtonEnabled = step.kind === 'connect-request' && usbConnectionComplete && done && !nudgeActive;

  const expectedAction: ExpectedAction =
    step.kind === 'connect-request'
      ? { type: 'external' }
      : step.kind === 'device-prompt'
        ? { type: 'confirm' }
        : { type: 'none' };

  const portraitRef = useRef<HTMLDivElement>(null);
  const duoSlotRef = useFitScale(0.5);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const laptopRef = useRef<HTMLDivElement>(null);
  const laptopCaptionRef = useRef<HTMLDivElement>(null);
  const deviceStageRef = useRef<HTMLDivElement>(null);
  useLaptopCableAlign(laptopRef, walletVisible);
  useDeviceFit(deviceStageRef, isMobile && mobileDeviceEntered);
  const flipRects = useRef<{ portrait: DOMRect; bubble: DOMRect } | null>(null);

  // The device slides in, the cord plugs into the laptop, then the device meets the cord.
  // The device stays off screen until the learner continues from Maria's explanation;
  // on phones it stays off screen until they tap "Hardware wallet" in the device switcher.
  useEffect(() => {
    if (step.kind !== 'device-arrival' || !arrivalStarted) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (connection !== 'linked') setConnection('linked');
      if (isMobile) {
        setMobileDeviceEntered(true);
        setMobilePanel('device');
      }
      return;
    }

    // On phones the sequence waits until the learner switches to the hardware wallet
    if (isMobile && connection === 'idle') return;

    const order: ConnectionPhase[] = ['idle', 'arriving', 'plugging', 'seating', 'linked'];
    const nextIndex = order.indexOf(connection) + 1;
    if (nextIndex >= order.length) return;

      const timer = setTimeout(() => setConnection(order[nextIndex]), CONNECTION_DELAYS[connection]);
    return () => clearTimeout(timer);
  }, [step.kind, connection, arrivalStarted, isMobile]);

  // While Maria introduces the app the wallet window and its caption are held at
  // screen center. When the plug-in line finishes, both return to the final layout.
  useLayoutEffect(() => {
    const windowEl = laptopRef.current;
    const captionEl = laptopCaptionRef.current;
    if (!windowEl || !walletVisible || arrivalStarted) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const apply = () => {
      windowEl.style.transform = 'none';
      const rect = windowEl.getBoundingClientRect();
      const dx = window.innerWidth / 2 - (rect.left + rect.width / 2);
      const transform = `translateX(${dx}px)`;
      windowEl.style.transform = transform;
      if (captionEl) captionEl.style.transform = transform;
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [walletVisible, arrivalStarted]);

  // Maria finishes the plug-in line: slide the window from center to its final
  // spot, then start the device and cord sequence once the slide has settled.
  useEffect(() => {
    if (step.kind !== 'device-arrival' || !done || !arrivalRequested || arrivalStarted) return;

    const windowEl = laptopRef.current;
    const captionEl = laptopCaptionRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (windowEl && !reduce) {
      const from = windowEl.style.transform || 'translateX(0)';
      windowEl.style.transform = '';
      windowEl.animate(
        [
          { transform: from, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
          { transform: 'translateX(0)', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        ],
        { duration: SLIDE_SETTLE_MS, fill: 'forwards' },
      );
      if (captionEl) {
        const captionFrom = captionEl.style.transform || from;
        captionEl.style.transform = '';
        captionEl.animate(
          [
            { transform: captionFrom, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
            { transform: 'translateX(0)', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
          ],
          { duration: SLIDE_SETTLE_MS, fill: 'forwards' },
        );
      }
    }

    const timer = setTimeout(() => setArrivalStarted(true), reduce ? 0 : SLIDE_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [step.kind, done, arrivalRequested, arrivalStarted]);

  // On phones the cord plugs into the laptop first; only once it has seated does
  // the device switcher appear, inviting the learner over to the hardware wallet.
  useEffect(() => {
    if (!arrivalStarted || mobileCordSeated) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => setMobileCordSeated(true), reduce ? 0 : CORD_SEAT_MS);
    return () => clearTimeout(timer);
  }, [arrivalStarted, mobileCordSeated]);

  // The moment the cord finishes seating, Maria moves on to the pairing request on her own.
  // On phones the linked cord stays visible for a beat before the view returns to the app.
  useEffect(() => {
    if (step.kind !== 'device-arrival' || connection !== 'linked') return;
    const timer = setTimeout(() => {
      setStepIndex((current) => (STEPS[current].kind === 'device-arrival' ? current + 1 : current));
    }, isMobile ? 1400 : 0);
    return () => clearTimeout(timer);
  }, [step.kind, connection, isMobile]);

  // On phones the visible panel follows the story: the app for the pairing
  // request, the sync and the result; the device while the pairing is confirmed on it.
  useEffect(() => {
    if (!isMobile || !mobileDeviceEntered) return;
    if (syncing) {
      setMobilePanel('software');
      return;
    }
    if (step.kind === 'connect-request' || step.kind === 'keystore-details' || step.kind === 'open-transactions' || step.kind === 'connected') setMobilePanel('software');
    else if (step.kind === 'device-prompt') setMobilePanel('device');
  }, [isMobile, mobileDeviceEntered, step.kind, syncing]);

  // While the lesson is about the keystore (connect, confirm, details), keep
  // the Keystores section in view. Short phone windows can't fit the whole
  // Settings tab, so the canvas scrolls just enough; elsewhere nothing moves.
  const keystoresRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (activeTab !== 'settings') return;
    if (step.kind !== 'connect-request' && step.kind !== 'device-prompt' && step.kind !== 'keystore-details') return;
    const section = keystoresRef.current;
    const canvas = section?.closest<HTMLElement>('.wallet-canvas');
    if (!section || !canvas) return;
    const frame = requestAnimationFrame(() => {
      const padding = parseFloat(getComputedStyle(canvas).paddingBottom) || 0;
      const overflow = section.getBoundingClientRect().bottom + padding - canvas.getBoundingClientRect().bottom;
      if (overflow <= 1) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      canvas.scrollBy({ top: overflow, behavior: reduce ? 'auto' : 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTab, step.kind, connected, mobilePanel]);

  // The device has confirmed the pairing and the sync animation has run its course:
  // the balance and history are on screen, so Maria moves to her connected line on her own.
  useEffect(() => {
    if (step.kind !== 'device-prompt' || !connected) return;
    setStepIndex((current) => (STEPS[current].kind === 'device-prompt' ? current + 1 : current));
  }, [step.kind, connected]);

  // The app boots once the wallet window is on screen: brand mark, a short load,
  // then the tabs and history fade in. Leaving the lesson unmounts this component,
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
    // A nudge replaces the mentor's line for a beat; while it is on screen the
    // learner can still fast-forward it, but must not be able to advance the lesson.
    if (nudgeActive) return;
    if (check.active) {
      if (check.answered) check.advance();
      return;
    }
    if (walletBooting) return;
    if (step.kind === 'device-arrival' && !arrivalRequested) {
      setArrivalRequested(true);
      return;
    }
    if (devicePending || connecting || arrivalAnimating) return;
    if (step.kind === 'connected') {
      check.start();
      return;
    }
    if (step.kind === 'mentor' && stepIndex === WALLET_INTRO_INDEX - 1 && portraitRef.current && bubbleRef.current) {
      flipRects.current = {
        portrait: portraitRef.current.getBoundingClientRect(),
        bubble: bubbleRef.current.getBoundingClientRect(),
      };
    }
    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
  }, [done, skip, nudgeActive, check, walletBooting, step, stepIndex, arrivalRequested, arrivalAnimating, devicePending, connecting]);

  // Opening Transactions loads the wallet's history from the device, then Maria
  // points out the withdrawal from Lesson 2.
  const handleOpenTransactions = () => {
    if (step.kind !== 'open-transactions' || softwareLocked) return;
    setSyncing(true);
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => setSyncing(false), 1800);
    setStepIndex((current) => (STEPS[current].kind === 'open-transactions' ? current + 1 : current));
  };

  const handleNewWallet = () => {
    if (step.kind !== 'wallet-intro' || softwareLocked) return;
    setStepIndex((current) => (STEPS[current].kind === 'wallet-intro' ? current + 1 : current));
  };

  const handleCreateWallet = () => {
    if (step.kind !== 'wallet-name' || softwareLocked || !trimmedWalletName) return;
    setWalletName(trimmedWalletName);
    saveWalletName(trimmedWalletName);
    setStepIndex((current) => (STEPS[current].kind === 'wallet-name' ? current + 1 : current));
  };

  // The name field is an uncontrolled contenteditable: read its text, cap the
  // length, and clear the stray <br> browsers leave so the placeholder returns.
  const handleWalletNameInput = (e: React.FormEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    let text = el.textContent ?? '';
    if (text.length > WALLET_NAME_MAX) {
      text = text.slice(0, WALLET_NAME_MAX);
      el.textContent = text;
      const selection = window.getSelection();
      selection?.selectAllChildren(el);
      selection?.collapseToEnd();
    }
    if (!text) el.innerHTML = '';
    // Browsers type non-breaking spaces into contenteditable; store plain ones
    setWalletName(text.replace(/ /g, ' '));
  };

  const handleWalletNamePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain').replace(/\s+/g, ' ');
    document.execCommand('insertText', false, text);
  };

  // The name field takes focus as soon as Maria has finished asking for a name.
  // Not on touch screens: focus would raise the keyboard over what she is saying.
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (step.kind === 'wallet-name' && !softwareLocked) walletNameInputRef.current?.focus();
  }, [step.kind, softwareLocked]);

  const handleRequestConnect = () => {
    if (!connectButtonEnabled || connectRequested) return;
    setConnectRequested(true);
    setStepIndex((current) => (STEPS[current].kind === 'connect-request' ? current + 1 : current));
  };

  const handleMobileSwitch = () => {
    if (!mobileDeviceEntered) {
      setMobileDeviceEntered(true);
      setMobilePanel('device');
      setConnection((current) => (current === 'idle' ? 'arriving' : current));
      return;
    }
    setMobilePanel((current) => (current === 'device' ? 'software' : 'device'));
  };

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
  }, [stepIndex, connection]);

  useEffect(() => () => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
  }, []);

  const handleDeviceConfirm = () => {
    setConnected(true);
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

  const cableClass = [
    'connect-cable',
    showCable ? `is-${connection}` : 'is-dormant',
    syncing ? 'is-syncing' : '',
    mobileCordEntering ? 'is-entering' : '',
  ].filter(Boolean).join(' ');

  const mobileCableVariant = !isMobile
    ? ''
    : mobilePanel === 'device'
      ? ' cable-device-panel'
      : ' cable-under-wallet';

  const cableEl = (
    <div className={`${cableClass}${mobileCableVariant}`} aria-hidden="true">
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
    <main className={`scenario-page scenario-page-fit lesson-fit ${check.active ? 'knowledge-check-scene' : spotlight ? '' : 'scenario-page-connect connect-paged'}`}>
      <div className={`scenario-mentor-layout ${spotlight ? 'spotlight' : ''} ${check.active ? 'knowledge-check-layout' : ''}`}>
        {check.active && <KnowledgeCheckKicker />}
        {walletVisible && !check.active && (
          <div ref={duoSlotRef} className="fit-slot fit-wrap">
          <div className={`connect-duo is-wide ${interactionLocked ? 'is-locked' : ''}${showMobileSwitch ? ' has-device-switcher' : ''}`}>
            <div className={`wallet-laptop laptop-enter${isMobile && mobilePanel === 'device' ? ' mobile-hidden' : ''}`}>
              <div ref={laptopRef} className="wallet-laptop-body">
                <div className="wallet-window">
                  <div className="wallet-window-titlebar">
                    <span className="tl-dot red" />
                    <span className="tl-dot yellow" />
                    <span className="tl-dot green" />
                    {walletCreated && (
                      <span className="wallet-window-title">{walletWindowTitle(WALLET_APP_NAME, walletName)}</span>
                    )}
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
                      {!walletCreated ? (
                        <div className="wallet-welcome">
                          <div className="wallet-welcome-box">
                            <p className="wallet-welcome-lead">No wallet open yet</p>
                            <div className="wallet-welcome-options">
                              <button
                                type="button"
                                className={`wallet-welcome-option${step.kind === 'wallet-intro' && !softwareLocked ? ' attention' : ''}`}
                                onClick={handleNewWallet}
                                disabled={softwareLocked}
                              >
                                <Plus strokeWidth={2.2} />
                                <span>New Wallet</span>
                              </button>
                              <span className="wallet-welcome-or">or</span>
                              <button
                                type="button"
                                className="wallet-welcome-option"
                                onClick={handleUnexpectedAction}
                                disabled={softwareLocked}
                              >
                                <Download strokeWidth={2.2} />
                                <span>Import Wallet</span>
                              </button>
                            </div>
                          </div>

                          {step.kind === 'wallet-name' && (
                            <div className="wallet-dialog-backdrop">
                              <form
                                className="wallet-dialog"
                                role="dialog"
                                aria-label="Wallet Name"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleCreateWallet();
                                }}
                              >
                                <div className="wallet-dialog-title">Wallet Name</div>
                                <div className="wallet-dialog-body">
                                  <span id="connect-wallet-name-label">Enter a name for this wallet:</span>
                                  <Wallet className="wallet-dialog-icon" strokeWidth={1.8} />
                                </div>
                                {/* An editable div, not an <input>: password managers (Bitwarden,
                                    1Password…) attach their autofill menus to text inputs and
                                    ignore opt-out attributes, but never touch contenteditable. */}
                                <div
                                  ref={walletNameInputRef}
                                  className="wallet-dialog-input"
                                  role="textbox"
                                  aria-labelledby="connect-wallet-name-label"
                                  aria-disabled={softwareLocked}
                                  contentEditable={!softwareLocked}
                                  spellCheck={false}
                                  data-placeholder="My Wallet"
                                  onInput={handleWalletNameInput}
                                  onPaste={handleWalletNamePaste}
                                  onKeyDown={(e) => {
                                    if (e.key !== 'Enter') return;
                                    e.preventDefault();
                                    handleCreateWallet();
                                  }}
                                />
                                <div className="wallet-dialog-actions">
                                  <button
                                    type="submit"
                                    className="tx-sim-btn primary wallet-dialog-btn"
                                    disabled={softwareLocked || !trimmedWalletName}
                                  >
                                    Create Wallet
                                  </button>
                                  <button
                                    type="button"
                                    className="tx-sim-btn ghost wallet-dialog-btn"
                                    onClick={handleUnexpectedAction}
                                    disabled={softwareLocked}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            </div>
                          )}
                        </div>
                      ) : (
                      <>
                      <aside className="wallet-sidebar">
                      <button
                        type="button"
                        className={`wallet-nav-item${shownTab === 'transactions' ? ' active' : ''}`}
                        onClick={sandbox
                          ? () => {
                            if (step.kind === 'open-transactions') handleOpenTransactions();
                            setSandboxTab('transactions');
                          }
                          : activeTab === 'transactions' ? () => {} : step.kind === 'open-transactions' ? handleOpenTransactions : handleUnexpectedAction}
                        disabled={softwareLocked}
                        aria-pressed={shownTab === 'transactions'}
                      >
                        <ArrowLeftRight strokeWidth={2.2} />
                        <span className="wallet-nav-label">Transactions</span>
                      </button>
                      <button
                        type="button"
                        className={`wallet-nav-item${shownTab === 'send' ? ' active' : ''}`}
                        onClick={sandbox ? () => setSandboxTab('send') : handleUnexpectedAction}
                        disabled={softwareLocked}
                        aria-pressed={shownTab === 'send'}
                      >
                        <ArrowUpRight strokeWidth={2.2} />
                        <span className="wallet-nav-label">Send</span>
                      </button>
                      <button
                        type="button"
                        className={`wallet-nav-item${shownTab === 'receive' ? ' active' : ''}`}
                        onClick={sandbox ? () => setSandboxTab('receive') : handleUnexpectedAction}
                        disabled={softwareLocked}
                        aria-pressed={shownTab === 'receive'}
                      >
                        <ArrowDownLeft strokeWidth={2.2} />
                        <span className="wallet-nav-label">Receive</span>
                      </button>
                      <button
                        type="button"
                        className={`wallet-nav-item${shownTab === 'settings' ? ' active' : ''}`}
                        onClick={sandbox ? () => setSandboxTab('settings') : activeTab === 'settings' ? () => {} : handleUnexpectedAction}
                        disabled={softwareLocked}
                        aria-pressed={shownTab === 'settings'}
                      >
                        <Settings strokeWidth={2.2} />
                        <span className="wallet-nav-label">Settings</span>
                      </button>
                    </aside>
                    <div className="wallet-canvas">
                      {shownTab === 'send' || shownTab === 'receive' ? (
                        <SandboxWalletTab tab={shownTab} />
                      ) : shownTab === 'settings' ? (
                        <div className="wallet-settings">
                          <div className="wallet-tab-heading">
                            <div className="wallet-tab-title"><Settings strokeWidth={2} /><span>Settings</span></div>
                          </div>
                          <div className="wallet-settings-fields">
                            <div className="wallet-field">
                              <span className="wallet-field-label">Wallet Type</span>
                              <span className="wallet-select">
                                <span>Single Signature</span>
                                <ChevronDown strokeWidth={2.2} />
                              </span>
                            </div>
                            <div className="wallet-field">
                              <span className="wallet-field-label">Address Type</span>
                              <span className="wallet-select">
                                <span>Native SegWit</span>
                                <ChevronDown strokeWidth={2.2} />
                              </span>
                            </div>
                          </div>
                          <section ref={keystoresRef} className="wallet-settings-section wallet-settings-keystores">
                            <h4 className="wallet-section-heading">Keystores</h4>
                            <div className="wallet-keystore">
                              <div className="wallet-keystore-tabs">
                                <span className="wallet-keystore-tab">Keystore 1</span>
                              </div>
                              {connected ? (
                                <div className="wallet-keystore-body is-filled">
                                  {/* Two rows on laptops (Type · Fingerprint, Derivation · xpub);
                                      the xpub is shortened in the middle, full key on hover */}
                                  <dl className="wallet-keystore-details">
                                    <dt className="wallet-field-label">Type</dt>
                                    <dd className="wallet-keystore-type">
                                      <Usb strokeWidth={2} />
                                      <span>Connected Wallet</span>
                                    </dd>
                                    <dt className="wallet-field-label">Master fingerprint</dt>
                                    <dd className="wallet-keystore-mono">{KEYSTORE.fingerprint}</dd>
                                    <dt className="wallet-field-label">Derivation</dt>
                                    <dd className="wallet-keystore-mono">{KEYSTORE.derivation}</dd>
                                    <dt className="wallet-field-label">xpub</dt>
                                    {/* Tall windows show the full key; shorter ones a shortened one */}
                                    <dd className="wallet-keystore-mono wallet-keystore-xpub" title={KEYSTORE.xpub}>
                                      <span className="wallet-keystore-xpub-full">{KEYSTORE.xpub}</span>
                                      <span className="wallet-keystore-xpub-short" aria-hidden="true">
                                        {`${KEYSTORE.xpub.slice(0, 10)}…${KEYSTORE.xpub.slice(-6)}`}
                                      </span>
                                    </dd>
                                  </dl>
                                </div>
                              ) : (
                                <div className="wallet-keystore-body">
                                  <button
                                    type="button"
                                    className={`tx-sim-btn primary wallet-keystore-option${requestPending && connectButtonEnabled ? ' attention' : ''}`}
                                    onClick={handleRequestConnect}
                                    disabled={!connectButtonEnabled}
                                  >
                                    <Usb size={14} strokeWidth={2} />
                                    <span>Connect Hardware Wallet</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </section>
                        </div>
                      ) : (
                      <div className="wallet-transactions">
                        <div className="wallet-tab-heading">
                          <div className="wallet-tab-title"><ArrowLeftRight strokeWidth={2} /><span>Transactions</span></div>
                        </div>
                        <div className="wallet-tx-summary">
                          <div className="wallet-tx-summary-item">
                            <span className="wallet-tx-summary-label">Balance</span>
                            <span className="wallet-tx-summary-value">{syncing ? '—' : `${WALLET_BALANCE} BTC`}</span>
                          </div>
                          <div className="wallet-tx-summary-item">
                            <span className="wallet-tx-summary-label">Transactions</span>
                            <span className="wallet-tx-summary-value">{syncing ? '—' : TRANSACTIONS.length}</span>
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
                              {!syncing && TRANSACTIONS.map((tx) => (
                                <tr key={tx.date} className="fresh">
                                  <td>{tx.date}</td>
                                  <td className={tx.incoming ? 'in' : 'out'}>{tx.value}</td>
                                  <td>{tx.balance}</td>
                                </tr>
                              ))}
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
                      )}
                    </div>
                      </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="wallet-laptop-base" aria-hidden="true">
                  <span className="wallet-laptop-notch" />
                </div>
              </div>

              {isMobile && (mobileCableHalf || showCable) && cableEl}
              <div ref={laptopCaptionRef} className="device-caption">{t.common.captionWalletSoftware}</div>
            </div>

            {!isMobile && cableEl}

            {(isMobile ? mobileDeviceEntered : true) && (
              <div
                ref={deviceStageRef}
                className={`connect-device-stage ${!isMobile && connection === 'idle' ? 'is-dormant' : `phase-${connection}`}${isMobile && mobilePanel !== 'device' ? ' mobile-hidden' : ''}`}
              >
                <div className="connect-device-row">
                  {isMobile && mobilePanel === 'device' && cableEl}
                  <HardwareWallet
                    mode="withdraw"
                    initialPhase="ready-menu"
                    locked={deviceLocked}
                    connectRequest={connectRequested}
                    expectedAction={expectedAction}
                    onUnexpectedAction={handleUnexpectedAction}
                    onConnectConfirm={handleDeviceConfirm}
                    onComplete={() => {}}
                  />
                </div>
              </div>
            )}

            {showMobileSwitch && (
              <DeviceSwitcher
                options={[
                  { id: 'software', label: t.common.captionWalletSoftware },
                  { id: 'device', label: t.common.captionHardwareWallet },
                ]}
                active={mobileDeviceEntered ? mobilePanel : 'software'}
                onSelect={handleMobileSwitch}
                pulseId={mobileCableHalf ? 'device' : null}
              />
            )}
          </div>
          </div>
        )}

        <div className="mentor-row">
          <div
            key={mentorName}
            ref={portraitRef}
            className="mentor-portrait mentor-portrait-enter"
            aria-label={fmt(t.common.mentorAria, { name: mentorName })}
            role="img"
          >
            <div className="mentor-portrait-glow" />
            <div className="mentor-portrait-ring">
              <img className="mentor-portrait-image" src={portrait} alt={fmt(t.common.mentorAria, { name: mentorName })} />
            </div>
            <div className="mentor-portrait-badge">{mentorName}</div>
          </div>
          <div
            ref={bubbleRef}
            className={`mentor-bubble ${canContinue ? 'is-ready' : ''}`}
            onClick={handleContinue}
          >
            <div className="mentor-bubble-content" key={bubbleKey}>
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
