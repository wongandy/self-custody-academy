import { useState } from 'react';
import { ArrowLeft, CircleDollarSign, ShieldCheck, KeyRound, BookOpen, LockKeyhole } from 'lucide-react';
import HardwareWallet from '@/components/HardwareWallet';

type ScenarioBriefingProps = {
  completed: boolean;
  isLoggedIn: boolean;
  onBack: () => void;
  onComplete: () => void;
};

function ScenarioBriefing({ completed, isLoggedIn, onBack, onComplete }: ScenarioBriefingProps) {
  const [walletActive, setWalletActive] = useState(false);

  return (
    <main className="scenario-page">
      <button className="character-back" type="button" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2.4} />
        <span>Back to roadmap</span>
      </button>

      <section className="scenario-card">
        <div className="scenario-card-topline">
          <span>Mission 01 · Hardware Wallet Setup</span>
          <span><CircleDollarSign size={14} /> Simulation only</span>
        </div>
        <div className="scenario-wallet-layout">
          <div className="scenario-wallet-info">
            <span className="roadmap-label">Your first mission</span>
            <h1>Set up your hardware wallet</h1>
            <p className="scenario-lede">
              Before bitcoin can be truly yours, you need a secure place to keep the keys. In this practice mission, you'll power on a simulated hardware wallet, create a new wallet, and back up your recovery phrase.
            </p>
            <div className="scenario-wallet-tips">
              <div className="scenario-wallet-tip">
                <KeyRound size={16} />
                <span>Press the power button to turn on the device, then use the navigation buttons to move through the setup.</span>
              </div>
              <div className="scenario-wallet-tip">
                <BookOpen size={16} />
                <span>You'll see all 12 words from the BIP39 word list at once — the same standard used by real hardware wallets. Write them down carefully.</span>
              </div>
              <div className="scenario-wallet-tip">
                <LockKeyhole size={16} />
                <span>After writing down your phrase, the wallet will quiz you with multiple-choice questions. Pick the correct word for each position to pass.</span>
              </div>
            </div>
            <div className={walletActive ? 'scenario-wallet-status active' : 'scenario-wallet-status'}>
              <span className="scenario-wallet-status-dot" />
              <span>{completed ? 'Mission completed' : walletActive ? 'Wallet active — follow the screen' : 'Waiting for device power'}</span>
            </div>
            {!isLoggedIn && !completed && (
              <p className="scenario-gate-note">
                <ShieldCheck size={13} strokeWidth={2.2} />
                After this mission, you'll create a free account to save your progress and unlock the rest.
              </p>
            )}
          </div>
          <HardwareWallet onComplete={onComplete} onPowerChange={setWalletActive} />
        </div>
      </section>
    </main>
  );
}

export default ScenarioBriefing;
