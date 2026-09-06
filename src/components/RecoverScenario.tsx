import { useState } from 'react';
import { ArrowLeft, CircleDollarSign, KeyRound, BookOpen, ShieldAlert } from 'lucide-react';
import HardwareWallet from '@/components/HardwareWallet';
import { getSessionMnemonic } from '@/lib/walletSession';

type RecoverScenarioProps = {
  completed: boolean;
  onBack: () => void;
  onComplete: () => void;
};

export default function RecoverScenario({ completed, onBack, onComplete }: RecoverScenarioProps) {
  const [walletActive, setWalletActive] = useState(false);
  const expectedMnemonic = getSessionMnemonic() ?? [];

  return (
    <main className="scenario-page">
      <button className="character-back" type="button" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2.4} />
        <span>Back to roadmap</span>
      </button>

      <section className="scenario-card">
        <div className="scenario-card-topline">
          <span>Mission 03 · Recover Hardware Wallet</span>
          <span><CircleDollarSign size={14} /> Simulation only</span>
        </div>
        <div className="scenario-wallet-layout">
          <div className="scenario-wallet-info">
            <span className="roadmap-label">Your third mission</span>
            <h1>Recover your hardware wallet</h1>
            <p className="scenario-lede">
              If your hardware wallet is lost or damaged, your 12-word recovery phrase restores full access to your bitcoin. In this mission, you'll practice entering your recovery phrase using the keypad — just like you would on a real device.
            </p>
            <div className="scenario-wallet-tips">
              <div className="scenario-wallet-tip">
                <KeyRound size={16} />
                <span>Power on the device and choose "Recover wallet." You'll enter the same 12-word phrase you wrote down in Mission 1.</span>
              </div>
              <div className="scenario-wallet-tip">
                <BookOpen size={16} />
                <span>Type the first few letters of each word with the QWERTY keypad. Matching BIP39 words appear — use Up/Down to browse and the → key to select.</span>
              </div>
              <div className="scenario-wallet-tip">
                <ShieldAlert size={16} />
                <span>Use the ← key to delete characters if you make a mistake. Enter all 12 words in the correct order to restore your wallet.</span>
              </div>
            </div>
            <div className={walletActive ? 'scenario-wallet-status active' : 'scenario-wallet-status'}>
              <span className="scenario-wallet-status-dot" />
              <span>{completed ? 'Mission completed' : walletActive ? 'Wallet active — follow the screen' : 'Waiting for device power'}</span>
            </div>
            {expectedMnemonic.length === 0 && (
              <p className="scenario-gate-note">
                <ShieldAlert size={13} strokeWidth={2.2} />
                No practice phrase found from Mission 1. Go back and complete Mission 1 first to generate a recovery phrase.
              </p>
            )}
          </div>
          <HardwareWallet
            onComplete={onComplete}
            onPowerChange={setWalletActive}
            mode="recover"
            expectedMnemonic={expectedMnemonic}
          />
        </div>
      </section>
    </main>
  );
}
