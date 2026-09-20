import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Power,
  X,
} from 'lucide-react';
import { BIP39_WORDLIST, generateMnemonic } from '@/lib/bip39';
import { setSessionMnemonic } from '@/lib/walletSession';

export type WalletPhase =
  | 'off'
  | 'booting'
  | 'menu'
  | 'create-intro'
  | 'create-words'
  | 'create-quiz'
  | 'create-done'
  | 'recover-intro'
  | 'recover-quiz'
  | 'recover-done'
  | 'receive-address'
  | 'send-blocked'
  | 'settings'
  | 'ready-menu';

type MenuPhase = WalletPhase | 'recover-soon';

type HardwareWalletProps = {
  onComplete: () => void;
  onPowerChange?: (isOn: boolean) => void;
  onPhaseChange?: (phase: WalletPhase) => void;
  onMenuSelectionChange?: (phase: 'create-intro' | 'recover-intro' | 'receive-address' | 'send-blocked') => void;
  onCopyAddress?: () => void;
  onReadyMenuSelect?: (label: string) => void;
  onFactoryResetAttempt?: () => void;
  advanceToReadyMenu?: boolean;
  startAtMenu?: boolean;
  mode?: 'setup' | 'recover' | 'withdraw';
  expectedMnemonic?: string[];
};

export const RECEIVE_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

const BOOT_STEPS = [
  'BOOTING...',
  'Loading secure chip...',
  'Initializing...',
  'READY',
];

function buildQuizOptions(correctWord: string): string[] {
  const options = new Set<string>([correctWord]);
  while (options.size < 4) {
    const candidate = BIP39_WORDLIST[Math.floor(Math.random() * BIP39_WORDLIST.length)];
    options.add(candidate);
  }
  const shuffled = Array.from(options);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function HardwareWallet({ onComplete, onPowerChange, onPhaseChange, onMenuSelectionChange, onCopyAddress, onReadyMenuSelect, onFactoryResetAttempt, advanceToReadyMenu = false, startAtMenu = false, mode = 'setup', expectedMnemonic }: HardwareWalletProps) {
  const [phase, setPhase] = useState<WalletPhase>(startAtMenu ? 'menu' : 'off');
  const [bootStep, setBootStep] = useState(0);

  const updatePhase = useCallback((next: WalletPhase) => {
    setPhase(next);
    onPhaseChange?.(next);
  }, [onPhaseChange]);
  const [menuIndex, setMenuIndex] = useState(0);
  const [settingsOrigin, setSettingsOrigin] = useState<'menu' | 'ready-menu'>('menu');
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [quizPositions, setQuizPositions] = useState<number[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizSelected, setQuizSelected] = useState(0);
  const [quizWrong, setQuizWrong] = useState(false);
  const bootTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [recoverIndex, setRecoverIndex] = useState(0);
  const [recoverOptions, setRecoverOptions] = useState<string[]>([]);
  const [recoverSelected, setRecoverSelected] = useState(0);
  const [recoverWrong, setRecoverWrong] = useState(false);
  const [addrCopied, setAddrCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isReadyMenu = phase === 'ready-menu';

  const menuItems = useMemo<{ label: string; phase: MenuPhase }[]>(
    () => {
      if (mode === 'withdraw' || isReadyMenu) {
        return [
          { label: 'Receive Bitcoin', phase: 'receive-address' },
          { label: 'Send Bitcoin', phase: 'send-blocked' },
          { label: 'Settings', phase: 'settings' },
        ];
      }
      return [
        { label: mode === 'recover' ? 'Recover wallet' : 'Create wallet', phase: mode === 'recover' ? 'recover-intro' : 'create-intro' },
        ...(mode === 'setup' ? [{ label: 'Recover wallet', phase: 'recover-soon' as MenuPhase }] : []),
      ];
    },
    [mode, isReadyMenu],
  );

  const notifyMenuSelection = useCallback((next: MenuPhase) => {
    if (next === 'settings') return;
    onMenuSelectionChange?.(
      next === 'create-intro'
        ? 'create-intro'
        : next === 'recover-intro'
          ? 'recover-intro'
          : next === 'receive-address'
            ? 'receive-address'
            : 'send-blocked',
    );
  }, [onMenuSelectionChange]);

  const startBoot = useCallback(() => {
    updatePhase('booting');
    setBootStep(0);
  }, [updatePhase]);

  useEffect(() => {
    if (startAtMenu) onPhaseChange?.('menu');
  }, [startAtMenu, onPhaseChange]);

  useEffect(() => {
    if (phase !== 'booting') return;
    if (bootStep >= BOOT_STEPS.length) {
      updatePhase('menu');
      setMenuIndex(0);
      return;
    }
    bootTimer.current = setTimeout(() => {
      setBootStep((s) => s + 1);
    }, bootStep === 0 ? 400 : 700);
    return () => {
      if (bootTimer.current) clearTimeout(bootTimer.current);
    };
  }, [phase, bootStep, updatePhase]);

  useEffect(() => {
    if (!advanceToReadyMenu || phase !== 'create-done') return;
    updatePhase('ready-menu');
    setMenuIndex(0);
  }, [advanceToReadyMenu, phase, updatePhase]);

  const resetWalletState = useCallback(() => {
    setMnemonic([]);
    setQuizPositions([]);
    setQuizIndex(0);
    setQuizOptions([]);
    setQuizSelected(0);
    setQuizWrong(false);
    setRecoverIndex(0);
    setRecoverOptions([]);
    setRecoverSelected(0);
    setRecoverWrong(false);
  }, []);

  const handlePower = useCallback(() => {
    if (phase === 'off') {
      startBoot();
      onPowerChange?.(true);
    } else {
      updatePhase('off');
      setBootStep(0);
      setMenuIndex(0);
      resetWalletState();
      onPowerChange?.(false);
    }
  }, [phase, startBoot, onPowerChange, resetWalletState, updatePhase]);

  const handleUp = useCallback(() => {
    if (phase === 'menu' || phase === 'ready-menu') {
      const nextIndex = menuIndex === 0 ? menuItems.length - 1 : menuIndex - 1;
      setMenuIndex(nextIndex);
      if (phase === 'menu') {
        notifyMenuSelection(menuItems[nextIndex].phase);
      }
    } else if (phase === 'create-quiz') {
      setQuizSelected((s) => (s === 0 ? quizOptions.length - 1 : s - 1));
      setQuizWrong(false);
    } else if (phase === 'recover-quiz') {
      setRecoverSelected((s) => (s === 0 ? recoverOptions.length - 1 : s - 1));
      setRecoverWrong(false);
    }
  }, [phase, menuIndex, menuItems, notifyMenuSelection, quizOptions.length, recoverOptions.length]);

  const handleDown = useCallback(() => {
    if (phase === 'menu' || phase === 'ready-menu') {
      const nextIndex = menuIndex === menuItems.length - 1 ? 0 : menuIndex + 1;
      setMenuIndex(nextIndex);
      if (phase === 'menu') {
        notifyMenuSelection(menuItems[nextIndex].phase);
      }
    } else if (phase === 'create-quiz') {
      setQuizSelected((s) => (s + 1) % quizOptions.length);
      setQuizWrong(false);
    } else if (phase === 'recover-quiz') {
      setRecoverSelected((s) => (s + 1) % recoverOptions.length);
      setRecoverWrong(false);
    }
  }, [phase, menuIndex, menuItems, notifyMenuSelection, quizOptions.length, recoverOptions.length]);

  const handleEnter = useCallback(() => {
    if (phase === 'settings') {
      onFactoryResetAttempt?.();
      updatePhase(settingsOrigin);
      return;
    }
    if (phase === 'ready-menu') {
      if (menuItems[menuIndex].phase === 'settings') {
        setSettingsOrigin('ready-menu');
        updatePhase('settings');
        return;
      }
      onReadyMenuSelect?.(menuItems[menuIndex].label);
      return;
    }
    if (phase === 'menu') {
      const target: MenuPhase = menuItems[menuIndex].phase;
      if (target === 'settings') {
        setSettingsOrigin('menu');
        updatePhase('settings');
        return;
      }
      if (target === 'recover-soon') {
        onMenuSelectionChange?.('recover-intro');
        return;
      }
      if (target === 'send-blocked') {
        onMenuSelectionChange?.('send-blocked');
        return;
      }
      if (target === 'receive-address') {
        updatePhase('receive-address');
        onMenuSelectionChange?.('receive-address');
        return;
      }
      if (target === 'create-intro') {
        const words = generateMnemonic(12);
        setMnemonic(words);
        setSessionMnemonic(words);
      }
      updatePhase(target);
    } else if (phase === 'receive-address') {
      updatePhase('menu');
      setMenuIndex(0);
    } else if (phase === 'create-intro') {
      updatePhase('create-words');
    } else if (phase === 'create-words') {
      const positions: number[] = [];
      while (positions.length < 3) {
        const pos = Math.floor(Math.random() * 12);
        if (!positions.includes(pos)) positions.push(pos);
      }
      positions.sort((a, b) => a - b);
      setQuizPositions(positions);
      setQuizIndex(0);
      setQuizWrong(false);
      const firstCorrect = mnemonic[positions[0]];
      setQuizOptions(buildQuizOptions(firstCorrect));
      setQuizSelected(0);
      updatePhase('create-quiz');
    } else if (phase === 'create-quiz') {
      const expectedWord = mnemonic[quizPositions[quizIndex]];
      const answeredWord = quizOptions[quizSelected];
      if (answeredWord === expectedWord) {
        setQuizWrong(false);
        if (quizIndex + 1 >= quizPositions.length) {
          onComplete();
          updatePhase('create-done');
        } else {
          const nextIndex = quizIndex + 1;
          setQuizIndex(nextIndex);
          const nextCorrect = mnemonic[quizPositions[nextIndex]];
          setQuizOptions(buildQuizOptions(nextCorrect));
          setQuizSelected(0);
        }
      } else {
        setQuizWrong(true);
      }
    } else if (phase === 'recover-intro') {
      setRecoverIndex(0);
      setRecoverWrong(false);
      const firstCorrect = expectedMnemonic?.[0] ?? '';
      setRecoverOptions(buildQuizOptions(firstCorrect));
      setRecoverSelected(0);
      updatePhase('recover-quiz');
    } else if (phase === 'recover-quiz') {
      const expectedWord = expectedMnemonic?.[recoverIndex] ?? '';
      const answeredWord = recoverOptions[recoverSelected];
      if (answeredWord === expectedWord) {
        setRecoverWrong(false);
        if (recoverIndex + 1 >= 12) {
          updatePhase('recover-done');
        } else {
          const nextIndex = recoverIndex + 1;
          setRecoverIndex(nextIndex);
          const nextCorrect = expectedMnemonic?.[nextIndex] ?? '';
          setRecoverOptions(buildQuizOptions(nextCorrect));
          setRecoverSelected(0);
        }
      } else {
        setRecoverWrong(true);
      }
    } else if (phase === 'recover-done') {
      onComplete();
    }
  }, [
    phase,
    menuIndex,
    menuItems,
    mnemonic,
    quizPositions,
    quizIndex,
    quizOptions,
    quizSelected,
    onComplete,
    recoverIndex,
    recoverOptions,
    recoverSelected,
    expectedMnemonic,
    updatePhase,
    onReadyMenuSelect,
    onMenuSelectionChange,
    onFactoryResetAttempt,
    settingsOrigin,
  ]);

  const handleCopyAddress = useCallback(() => {
    navigator.clipboard?.writeText(RECEIVE_ADDRESS).catch(() => {});
    setAddrCopied(true);
    onCopyAddress?.();
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setAddrCopied(false), 2000);
  }, [onCopyAddress]);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const handleCancel = useCallback(() => {
    if (phase === 'settings') {
      updatePhase(settingsOrigin);
      return;
    }
    if (phase === 'menu') return;
    resetWalletState();
    updatePhase('menu');
    setMenuIndex(0);
  }, [phase, resetWalletState, updatePhase, settingsOrigin]);

  const isOn = phase !== 'off';
  const isBooting = phase === 'booting';
  const currentQuizPosition = quizPositions[quizIndex];

  return (
    <div className="hw-wallet-stage">
      <div className="hw-wallet-device">
        <div className={isOn ? 'hw-power-led on' : 'hw-power-led'} aria-label={isOn ? 'Power on' : 'Power off'} />
        <div className="hw-wallet-bezel">
          <div className="hw-wallet-screen">
            {!isOn && (
              <div className="hw-screen-off" />
            )}
            {isBooting && (
              <div className="hw-screen-boot">
                <span className="hw-boot-logo">B</span>
                <span className="hw-boot-text">{BOOT_STEPS[Math.min(bootStep, BOOT_STEPS.length - 1)]}</span>
                <div className="hw-boot-bar">
                  <span style={{ width: `${Math.min((bootStep / BOOT_STEPS.length) * 100, 100)}%` }} />
                </div>
              </div>
            )}
            {isOn && !isBooting && (phase === 'menu' || phase === 'ready-menu') && (
              <div className="hw-screen-menu">
                <span className="hw-screen-title">Select option</span>
                {menuItems.map((item, i) => (
                  <div key={item.label} className={i === menuIndex ? 'hw-menu-item active' : 'hw-menu-item'}>
                    <span>{item.label}</span>
                    {i === menuIndex && <Check size={12} strokeWidth={2.8} />}
                  </div>
                ))}
              </div>
            )}
            {phase === 'create-intro' && (
              <div className="hw-screen-text">
                <span className="hw-screen-title">Create wallet</span>
                <p className="hw-screen-body">
                  You will receive a 12-word recovery phrase. Write it down on paper — never photograph or type it on a computer.
                </p>
              </div>
            )}
            {phase === 'create-words' && (
              <div className="hw-screen-text hw-screen-words-all">
                <span className="hw-screen-title">Your recovery phrase</span>
                <div className="hw-words-grid">
                  <div className="hw-words-column">
                    {mnemonic.slice(0, Math.ceil(mnemonic.length / 2)).map((word, i) => (
                      <div key={i} className="hw-word-row">
                        <span className="hw-word-num">{i + 1}.</span>
                        <span className="hw-word-text">{word}</span>
                      </div>
                    ))}
                  </div>
                  <div className="hw-words-column">
                    {mnemonic.slice(Math.ceil(mnemonic.length / 2)).map((word, i) => (
                      <div key={i + Math.ceil(mnemonic.length / 2)} className="hw-word-row">
                        <span className="hw-word-num">{i + Math.ceil(mnemonic.length / 2) + 1}.</span>
                        <span className="hw-word-text">{word}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {phase === 'create-quiz' && (
              <div className="hw-screen-text">
                <span className="hw-screen-title">Word {currentQuizPosition + 1}</span>
                <p className="hw-screen-body">Which word is in position {currentQuizPosition + 1}?</p>
                <div className="hw-quiz-options">
                  {quizOptions.map((opt, i) => (
                    <div
                      key={opt}
                      className={
                        i === quizSelected
                          ? quizWrong
                            ? 'hw-quiz-option active wrong'
                            : 'hw-quiz-option active'
                          : 'hw-quiz-option'
                      }
                    >
                      <span className="hw-quiz-option-letter">{String.fromCharCode(65 + i)}</span>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
                {quizWrong && <span className="hw-quiz-wrong">Incorrect — try again</span>}
                <span className="hw-quiz-progress">
                  Check {quizIndex + 1} of {quizPositions.length}
                </span>
              </div>
            )}
            {phase === 'create-done' && (
              <div className="hw-screen-text hw-screen-success">
                <CheckCircle2 size={28} strokeWidth={1.8} />
                <span className="hw-screen-title">Wallet created!</span>
                <p className="hw-screen-body">
                  Your recovery phrase controls your keys. Store it safely — offline and secret.
                </p>
              </div>
            )}
            {phase === 'recover-intro' && (
              <div className="hw-screen-text">
                <span className="hw-screen-title">Recover wallet</span>
                <p className="hw-screen-body">
                  Select each word of your 12-word recovery phrase from the choices below. Use Up/Down to browse and ✓ to confirm.
                </p>
              </div>
            )}
            {phase === 'recover-quiz' && (
              <div className="hw-screen-text">
                <span className="hw-screen-title">Word {recoverIndex + 1} of 12</span>
                <p className="hw-screen-body">Which word is in position {recoverIndex + 1}?</p>
                <div className="hw-quiz-options">
                  {recoverOptions.map((opt, i) => (
                    <div
                      key={opt}
                      className={
                        i === recoverSelected
                          ? recoverWrong
                            ? 'hw-quiz-option active wrong'
                            : 'hw-quiz-option active'
                          : 'hw-quiz-option'
                      }
                    >
                      <span className="hw-quiz-option-letter">{String.fromCharCode(65 + i)}</span>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
                {recoverWrong && <span className="hw-quiz-wrong">Incorrect — try again</span>}
                <span className="hw-quiz-progress">
                  Word {recoverIndex + 1} of 12
                </span>
              </div>
            )}
            {phase === 'recover-done' && (
              <div className="hw-screen-text hw-screen-success">
                <CheckCircle2 size={28} strokeWidth={1.8} />
                <span className="hw-screen-title">Wallet recovered!</span>
                <p className="hw-screen-body">
                  Your wallet has been restored from your recovery phrase. Your keys are back under your control.
                </p>
              </div>
            )}
            {phase === 'settings' && (
              <div className="hw-screen-text">
                <span className="hw-screen-title">Settings</span>
                <div className="hw-settings-list">
                  <div className="hw-menu-item active">
                    <span>Reset to Factory Settings</span>
                    <Check size={12} strokeWidth={2.8} />
                  </div>
                </div>
                <p className="hw-screen-body">Press the checkmark to select, or X to go back.</p>
              </div>
            )}
            {phase === 'receive-address' && (
              <div className="hw-screen-text">
                <span className="hw-screen-title">Receive address</span>
                <div className="hw-receive-addr-box">
                  <button
                    className={addrCopied ? 'hw-copy-btn copied' : 'hw-copy-btn'}
                    type="button"
                    onClick={handleCopyAddress}
                    aria-label={addrCopied ? 'Address copied' : 'Copy address'}
                  >
                    {addrCopied ? <Check size={12} strokeWidth={2.6} /> : <Copy size={12} strokeWidth={2.2} />}
                  </button>
                  <span className="hw-receive-addr">{RECEIVE_ADDRESS}</span>
                </div>
                <p className="hw-screen-body">Use this address to receive Bitcoin. Press the checkmark to go back.</p>
              </div>
            )}
          </div>
        </div>
        <div className="hw-controls">
          <button
            className={phase === 'off' ? 'hw-btn hw-btn-power' : 'hw-btn hw-btn-power on'}
            type="button"
            onClick={handlePower}
            aria-label={phase === 'off' ? 'Power on' : 'Power off'}
          >
            <Power size={16} strokeWidth={2.4} />
          </button>
          <div className="hw-controls-dpad">
            <button className="hw-btn hw-btn-nav" type="button" onClick={handleUp} disabled={!isOn || isBooting} aria-label="Up">
              <ChevronUp size={18} strokeWidth={2.4} />
            </button>
            <button className="hw-btn hw-btn-nav" type="button" onClick={handleDown} disabled={!isOn || isBooting} aria-label="Down">
              <ChevronDown size={18} strokeWidth={2.4} />
            </button>
          </div>
          <div className="hw-controls-actions">
            <button className="hw-btn hw-btn-nav hw-btn-cancel" type="button" onClick={handleCancel} disabled={!isOn || isBooting || phase === 'menu' || phase === 'ready-menu'} aria-label="Cancel">
              <X size={16} strokeWidth={2.4} />
            </button>
            <button className="hw-btn hw-btn-nav hw-btn-enter" type="button" onClick={handleEnter} disabled={!isOn || isBooting} aria-label="Confirm">
              <Check size={18} strokeWidth={2.6} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
