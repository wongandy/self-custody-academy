import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Power,
  RotateCcw,
  X,
} from 'lucide-react';
import { BIP39_WORDLIST, generateMnemonic } from '@/lib/bip39';

type WalletPhase =
  | 'off'
  | 'booting'
  | 'menu'
  | 'create-intro'
  | 'create-words'
  | 'create-quiz'
  | 'create-done'
  | 'recover-soon';

type HardwareWalletProps = {
  onComplete: () => void;
  onPowerChange?: (isOn: boolean) => void;
};

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

export default function HardwareWallet({ onComplete, onPowerChange }: HardwareWalletProps) {
  const [phase, setPhase] = useState<WalletPhase>('off');
  const [bootStep, setBootStep] = useState(0);
  const [menuIndex, setMenuIndex] = useState(0);
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [quizPositions, setQuizPositions] = useState<number[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizSelected, setQuizSelected] = useState(0);
  const [quizWrong, setQuizWrong] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);
  const bootTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const menuItems = useMemo(
    () => [
      { label: 'Create wallet', phase: 'create-intro' as WalletPhase },
      { label: 'Recover wallet', phase: 'recover-soon' as WalletPhase },
    ],
    [],
  );

  const startBoot = useCallback(() => {
    setPhase('booting');
    setBootStep(0);
  }, []);

  useEffect(() => {
    if (phase !== 'booting') return;
    if (bootStep >= BOOT_STEPS.length) {
      setPhase('menu');
      setMenuIndex(0);
      return;
    }
    bootTimer.current = setTimeout(() => {
      setBootStep((s) => s + 1);
    }, bootStep === 0 ? 400 : 700);
    return () => {
      if (bootTimer.current) clearTimeout(bootTimer.current);
    };
  }, [phase, bootStep]);

  const resetWalletState = useCallback(() => {
    setMnemonic([]);
    setQuizPositions([]);
    setQuizIndex(0);
    setQuizOptions([]);
    setQuizSelected(0);
    setQuizWrong(false);
    setQuizPassed(false);
  }, []);

  const handlePower = useCallback(() => {
    if (phase === 'off') {
      startBoot();
      onPowerChange?.(true);
    } else {
      setPhase('off');
      setBootStep(0);
      setMenuIndex(0);
      resetWalletState();
      onPowerChange?.(false);
    }
  }, [phase, startBoot, onPowerChange, resetWalletState]);

  const handleUp = useCallback(() => {
    if (phase === 'menu') {
      setMenuIndex((i) => (i === 0 ? menuItems.length - 1 : i - 1));
    } else if (phase === 'create-quiz') {
      setQuizSelected((s) => (s === 0 ? quizOptions.length - 1 : s - 1));
      setQuizWrong(false);
    }
  }, [phase, menuItems.length, quizOptions.length]);

  const handleDown = useCallback(() => {
    if (phase === 'menu') {
      setMenuIndex((i) => (i === menuItems.length - 1 ? 0 : i + 1));
    } else if (phase === 'create-quiz') {
      setQuizSelected((s) => (s + 1) % quizOptions.length);
      setQuizWrong(false);
    }
  }, [phase, menuItems.length, quizOptions.length]);

  const handleEnter = useCallback(() => {
    if (phase === 'menu') {
      const target = menuItems[menuIndex].phase;
      if (target === 'create-intro') {
        const words = generateMnemonic(12);
        setMnemonic(words);
      }
      setPhase(target);
    } else if (phase === 'create-intro') {
      setPhase('create-words');
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
      setQuizPassed(false);
      const firstCorrect = mnemonic[positions[0]];
      setQuizOptions(buildQuizOptions(firstCorrect));
      setQuizSelected(0);
      setPhase('create-quiz');
    } else if (phase === 'create-quiz') {
      if (quizPassed) {
        onComplete();
        setPhase('create-done');
        return;
      }
      const expectedWord = mnemonic[quizPositions[quizIndex]];
      const answeredWord = quizOptions[quizSelected];
      if (answeredWord === expectedWord) {
        setQuizWrong(false);
        if (quizIndex + 1 >= quizPositions.length) {
          setQuizPassed(true);
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
    } else if (phase === 'recover-soon') {
      setPhase('menu');
      setMenuIndex(0);
    }
  }, [
    phase,
    menuIndex,
    menuItems,
    mnemonic,
    quizPassed,
    quizPositions,
    quizIndex,
    quizOptions,
    quizSelected,
    onComplete,
  ]);

  const handleCancel = useCallback(() => {
    if (phase === 'menu') return;
    resetWalletState();
    setPhase('menu');
    setMenuIndex(0);
  }, [phase, resetWalletState]);

  const isOn = phase !== 'off';
  const isBooting = phase === 'booting';
  const currentQuizPosition = quizPositions[quizIndex];

  return (
    <div className="hw-wallet-stage">
      <div className="hw-wallet-device">
        <div className="hw-wallet-bezel">
          <div className="hw-wallet-screen">
            {!isOn && (
              <div className="hw-screen-off">
                <Power size={20} strokeWidth={1.5} />
                <span>Press power to start</span>
              </div>
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
            {isOn && !isBooting && phase === 'menu' && (
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
                <span className="hw-screen-hint">Press Enter to continue</span>
              </div>
            )}
            {phase === 'create-words' && (
              <div className="hw-screen-text hw-screen-words-all">
                <span className="hw-screen-title">Your recovery phrase</span>
                <div className={`hw-words-grid ${mnemonic.length > 12 ? 'hw-words-grid-24' : ''}`}>
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
                <span className="hw-screen-hint">Check and double-check · Press ✓ when done</span>
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
                <span className="hw-screen-hint">Up/Down to select · Press ✓ to confirm</span>
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
                <span className="hw-screen-hint">Press Enter to finish</span>
              </div>
            )}
            {phase === 'recover-soon' && (
              <div className="hw-screen-text">
                <span className="hw-screen-title">Recover wallet</span>
                <p className="hw-screen-body">
                  Wallet recovery will be available in a future mission. You'll practice restoring a wallet from your 12-word phrase.
                </p>
                <span className="hw-screen-hint">Press Enter or Cancel to return</span>
              </div>
            )}
          </div>
          <div className="hw-wallet-brand">
            <span className="hw-brand-dot" />
            <span className="hw-brand-text">BITCOIN WALLET</span>
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
            <button className="hw-btn hw-btn-nav hw-btn-cancel" type="button" onClick={handleCancel} disabled={!isOn || isBooting || phase === 'menu'} aria-label="Cancel">
              <X size={16} strokeWidth={2.4} />
            </button>
            <button className="hw-btn hw-btn-nav hw-btn-enter" type="button" onClick={handleEnter} disabled={!isOn || isBooting} aria-label="Confirm">
              <Check size={18} strokeWidth={2.6} />
            </button>
          </div>
        </div>
      </div>
      <div className="hw-controls-label">
        <span><Power size={11} /> Power</span>
        <span><ChevronUp size={11} /> / <ChevronDown size={11} /> Navigate</span>
        <span><X size={11} /> Cancel</span>
        <span><Check size={11} /> Confirm</span>
      </div>
      {phase !== 'off' && phase !== 'booting' && phase !== 'menu' && (
        <button
          className="hw-reset-btn"
          type="button"
          onClick={() => {
            setPhase('off');
            setBootStep(0);
            onPowerChange?.(false);
          }}
        >
          <RotateCcw size={13} strokeWidth={2.2} />
          <span>Reset simulation</span>
        </button>
      )}
    </div>
  );
}
