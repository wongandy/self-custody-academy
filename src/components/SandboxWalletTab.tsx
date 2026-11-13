/**
 * TEMPORARY — wallet software tab content for the /test sandbox.
 *
 * Lessons 4–6 each draw only the tabs their story needs. In sandbox mode every
 * sidebar tab opens, and a tab the lesson doesn't draw shows this stand-in
 * (the same markup the lessons use, with sample data and no device link).
 */
import { useState } from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, Check, ChevronDown, Copy, Eye, Settings, Usb } from 'lucide-react';
import { ReceiveQrCode } from '@/components/ReceiveQrCode';

export type WalletTabId = 'transactions' | 'send' | 'receive' | 'settings';

export const WALLET_TABS = [
  { id: 'transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { id: 'send', icon: ArrowUpRight, label: 'Send' },
  { id: 'receive', icon: ArrowDownLeft, label: 'Receive' },
  { id: 'settings', icon: Settings, label: 'Settings' },
] as const;

const BALANCE = '0.14998';
const RECEIVE_ADDRESS = 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu';
const TRANSACTIONS = [
  { date: '2026-10-20 14:32', value: '+0.04998 BTC', balance: '0.14998 BTC' },
  { date: '2026-09-21 09:48', value: '+0.10000 BTC', balance: '0.10000 BTC' },
];
const FEE_OPTIONS = [
  { id: 'low', label: 'Low', rate: '2 sats/vB', fee: '0.00000120' },
  { id: 'medium', label: 'Medium', rate: '8 sats/vB', fee: '0.00000480' },
  { id: 'high', label: 'High', rate: '18 sats/vB', fee: '0.00001080' },
];
const KEYSTORE = {
  fingerprint: '3442193e',
  derivation: "m/84'/0'/0'",
  xpub: 'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz',
};

export function SandboxWalletTab({ tab }: { tab: WalletTabId }) {
  const [feeId, setFeeId] = useState('medium');
  const [copied, setCopied] = useState(false);
  const fee = FEE_OPTIONS.find((o) => o.id === feeId) ?? FEE_OPTIONS[1];

  if (tab === 'transactions') {
    return (
      <div className="wallet-transactions">
        <div className="wallet-tab-heading">
          <div className="wallet-tab-title"><ArrowLeftRight strokeWidth={2} /><span>Transactions</span></div>
        </div>
        <div className="wallet-tx-summary">
          <div className="wallet-tx-summary-item">
            <span className="wallet-tx-summary-label">Balance</span>
            <span className="wallet-tx-summary-value">{BALANCE} BTC</span>
          </div>
          <div className="wallet-tx-summary-item">
            <span className="wallet-tx-summary-label">Transactions</span>
            <span className="wallet-tx-summary-value">{TRANSACTIONS.length}</span>
          </div>
        </div>
        <div className="wallet-tx-table-wrap">
          <table className="wallet-tx-table">
            <thead>
              <tr><th>Date</th><th>Value</th><th>Balance</th></tr>
            </thead>
            <tbody>
              {TRANSACTIONS.map((tx) => (
                <tr key={tx.date}><td>{tx.date}</td><td className="in">{tx.value}</td><td>{tx.balance}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (tab === 'send') {
    return (
      <div className="send-form-screen">
        <div className="send-form-heading wallet-tab-heading">
          <div className="wallet-tab-title"><ArrowUpRight strokeWidth={2} /><span>Send Bitcoin</span></div>
          <span className="send-form-balance">Balance {BALANCE} BTC</span>
        </div>
        <div className="send-form-fields">
          <label className="tx-sim-field">
            <span>Pay to</span>
            <input className="tx-sim-addr" placeholder="bc1…" />
          </label>
          <label className="tx-sim-field">
            <span>Label</span>
            <input placeholder="Add a label…" />
          </label>
          <label className="tx-sim-field">
            <span>Amount</span>
            <div className="send-amount-field">
              <input placeholder="0.00" />
              <span>BTC</span>
              <button className="withdraw-max-btn" type="button">MAX</button>
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
                className={`tx-fee-btn${feeId === option.id ? ' active' : ''}`}
                onClick={() => setFeeId(option.id)}
              >
                <span>{option.label}</span>
                <small>{option.rate}</small>
              </button>
            ))}
          </div>
          <div className="send-fee-total">
            <span>Estimated fee</span>
            <strong>{fee.fee} BTC</strong>
          </div>
        </div>
        <button className="tx-sim-btn primary" type="button">
          <span>Review transaction</span><ArrowRight size={16} strokeWidth={2.4} />
        </button>
      </div>
    );
  }

  if (tab === 'receive') {
    return (
      <div className="rx-panel">
        <div className="wallet-tab-heading">
          <div className="wallet-tab-title"><ArrowDownLeft strokeWidth={2} /><span>Receive Bitcoin</span></div>
        </div>
        <div className="rx-qr-frame" aria-hidden="true">
          <ReceiveQrCode address={RECEIVE_ADDRESS} />
        </div>
        <span className="wallet-field-label">Receive address</span>
        <p className="rx-addr">{RECEIVE_ADDRESS}</p>
        <button className="tx-sim-btn primary rx-btn" type="button">
          <Eye size={14} strokeWidth={2} />
          <span>Verify address on device</span>
        </button>
        <button
          className="tx-sim-btn ghost rx-btn"
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(RECEIVE_ADDRESS).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} strokeWidth={2} />}
          <span>{copied ? 'Copied' : 'Copy address'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-settings">
      <div className="wallet-tab-heading">
        <div className="wallet-tab-title"><Settings strokeWidth={2} /><span>Settings</span></div>
      </div>
      <div className="wallet-settings-fields">
        <div className="wallet-field">
          <span className="wallet-field-label">Wallet Type</span>
          <span className="wallet-select"><span>Single Signature</span><ChevronDown strokeWidth={2.2} /></span>
        </div>
        <div className="wallet-field">
          <span className="wallet-field-label">Address Type</span>
          <span className="wallet-select"><span>Native SegWit</span><ChevronDown strokeWidth={2.2} /></span>
        </div>
      </div>
      <section className="wallet-settings-section wallet-settings-keystores">
        <h4 className="wallet-section-heading">Keystores</h4>
        <div className="wallet-keystore">
          <div className="wallet-keystore-tabs">
            <span className="wallet-keystore-tab">Keystore 1</span>
          </div>
          <div className="wallet-keystore-body is-filled">
            <dl className="wallet-keystore-details">
              <dt className="wallet-field-label">Type</dt>
              <dd className="wallet-keystore-type"><Usb strokeWidth={2} /><span>Connected Wallet</span></dd>
              <dt className="wallet-field-label">Master fingerprint</dt>
              <dd className="wallet-keystore-mono">{KEYSTORE.fingerprint}</dd>
              <dt className="wallet-field-label">Derivation</dt>
              <dd className="wallet-keystore-mono">{KEYSTORE.derivation}</dd>
              <dt className="wallet-field-label">xpub</dt>
              <dd className="wallet-keystore-mono wallet-keystore-xpub" title={KEYSTORE.xpub}>
                <span className="wallet-keystore-xpub-full">{KEYSTORE.xpub}</span>
                <span className="wallet-keystore-xpub-short" aria-hidden="true">
                  {`${KEYSTORE.xpub.slice(0, 10)}…${KEYSTORE.xpub.slice(-6)}`}
                </span>
              </dd>
            </dl>
          </div>
        </div>
      </section>
    </div>
  );
}
