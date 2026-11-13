/**
 * TEMPORARY — Lesson 7 "Device playground".
 *
 * A review sandbox, not a real lesson: the phone (exchange app), the wallet
 * software (laptop) and the hardware wallet all on one screen, every tab and
 * screen unlocked, so the device content can be checked at phone width.
 * Phone-width screens show one device at a time with the device switcher,
 * like the real lessons. Nothing here is saved as progress. The header's
 * Lessons menu also plays any real lesson in sandbox mode (src/lib/sandbox.ts),
 * where the mentor no longer locks any device. It has no link
 * anywhere in the app: open it by going to /test.
 *
 * To remove: delete this file, the `.playground-*` block at the end of
 * index.css and the 'scenario-7' screen + '/test' path in App.tsx (plus the
 * `export`s added to PhoneClock).
 */
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  ReceiptText,
  RotateCcw,
  Settings,
  ShieldCheck,
  Smartphone,
  Usb,
  Wifi,
} from 'lucide-react';
import HardwareWallet, { type WalletPhase } from '@/components/HardwareWallet';
import { DeviceSwitcher } from '@/components/DeviceSwitcher';
import { PhoneClock } from '@/components/WithdrawScenario';
import { ReceiveQrCode } from '@/components/ReceiveQrCode';
import andyPortrait from '@/components/Andy.webp';
import ScenarioBriefing from '@/components/ScenarioBriefing';
import WithdrawScenario from '@/components/WithdrawScenario';
import RecoverScenario from '@/components/RecoverScenario';
import ConnectScenario from '@/components/ConnectScenario';
import ReceiveScenario from '@/components/ReceiveScenario';
import SendScenario from '@/components/SendScenario';
import { SandboxContext } from '@/lib/sandbox';
import { fmt, useI18n } from '@/lib/i18n';
import { getWalletName, walletWindowTitle } from '@/lib/walletName';

type DeviceId = 'exchange' | 'software' | 'hardware';
type LaptopTab = 'transactions' | 'send' | 'receive' | 'settings';
type SendStep = 'form' | 'review' | 'sent';
type PhoneScreen = 'form' | 'confirm' | 'success';

// Filler lines so the mentor bubble takes up its usual room while reviewing.
const MENTOR_LINES = [
  "Welcome to the device playground. Everything is unlocked here, so tap around as much as you like.",
  "On a phone, use the switcher under the device to move between the exchange, the wallet software and the hardware wallet.",
  "The wallet software has four tabs: Transactions, Send, Receive and Settings. Each one is open to explore.",
  "Try sending from the wallet software, then approve it on the hardware wallet. The same goes for verifying a receive address.",
  "Nothing you do here is saved, so feel free to break things. The reset button puts every device back to the start.",
];

const AVAILABLE_BALANCE = 0.05;
const NETWORK_FEE = 0.0002;
const WALLET_BALANCE = '0.14998';
const LAPTOP_RECEIVE_ADDRESS = 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu';
const MARIA_ADDRESS = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
const SEND_AMOUNT = '0.01';
const FEE_OPTIONS = [
  { id: 'low', label: 'Low', rate: '2 sats/vB', fee: '0.00000120' },
  { id: 'medium', label: 'Medium', rate: '8 sats/vB', fee: '0.00000480' },
  { id: 'high', label: 'High', rate: '18 sats/vB', fee: '0.00001080' },
] as const;
const TRANSACTIONS = [
  { date: '2026-10-20 14:32', value: '+0.04998 BTC', balance: '0.14998 BTC', incoming: true },
  { date: '2026-09-21 09:48', value: '+0.10000 BTC', balance: '0.10000 BTC', incoming: true },
];
const KEYSTORE = {
  fingerprint: '3442193e',
  derivation: "m/84'/0'/0'",
  xpub: 'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz',
};

function useTypewriter(text: string, speed = 6) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let i = 0;
    setDisplayed('');
    setDone(false);
    timer.current = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        setDone(true);
        if (timer.current) clearInterval(timer.current);
      }
    }, speed);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [text, speed]);

  const skip = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    setDisplayed(text);
    setDone(true);
  }, [text]);

  return { displayed, done, skip };
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 600px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

/* ── Phone: BitExchange withdraw flow (Lesson 5) ── */

function ExchangePhone() {
  const [screen, setScreen] = useState<PhoneScreen>('form');
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const displayAddress = address.trim() || LAPTOP_RECEIVE_ADDRESS;
  const half = Math.ceil(displayAddress.length / 2);
  const numericAmount = Number.parseFloat(amount) || 0;
  const received = Math.max(0, numericAmount - NETWORK_FEE);

  const addressBlock = (
    <strong className="withdraw-confirm-addr" aria-label={displayAddress} title={displayAddress}>
      <span>{displayAddress.slice(0, half)}</span>
      <span>{displayAddress.slice(half)}</span>
    </strong>
  );

  return (
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
          {screen === 'form' && (
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
                <label>Send to address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Paste wallet receive address"
                  className="withdraw-addr-input"
                />
              </div>
              <div className="withdraw-phone-section">
                <div className="withdraw-phone-label-row">
                  <label>Withdraw amount</label>
                  <button className="withdraw-max-btn" type="button" onClick={() => setAmount(String(AVAILABLE_BALANCE))}>
                    MAX
                  </button>
                </div>
                <div className="withdraw-amount-input-wrap">
                  <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                  <span className="withdraw-amount-unit">BTC</span>
                </div>
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
                  <strong>{received > 0 ? received.toFixed(8) : '—'} BTC</strong>
                </div>
              </div>
              <button className="withdraw-btn" type="button" onClick={() => setScreen('confirm')}>
                Withdraw
              </button>
            </>
          )}

          {screen === 'confirm' && (
            <>
              <div className="withdraw-phone-app-header">
                <button className="withdraw-confirm-back" type="button" onClick={() => setScreen('form')}>
                  <ArrowLeft size={14} strokeWidth={2} />
                </button>
                <span>Confirm order</span>
              </div>
              <div className="withdraw-confirm-info">
                <div className="withdraw-confirm-receive">
                  <span className="withdraw-confirm-receive-label">Receive amount</span>
                  <span className="withdraw-confirm-receive-value">{received.toFixed(8)} BTC</span>
                </div>
                <div className="withdraw-confirm-detail">
                  <span>Network</span>
                  <strong>Bitcoin</strong>
                </div>
                <div className="withdraw-confirm-detail withdraw-confirm-address-detail">
                  <span>Address</span>
                  {addressBlock}
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
              <button className="withdraw-confirm-btn" type="button" onClick={() => setScreen('success')}>
                Confirm
              </button>
            </>
          )}

          {screen === 'success' && (
            <>
              <div className="withdraw-phone-app-header">
                <button className="withdraw-confirm-back" type="button" onClick={() => setScreen('form')} aria-label="Back to form (playground only)">
                  <ArrowLeft size={14} strokeWidth={2} />
                </button>
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
                    <strong className="withdraw-success-received">{received.toFixed(8)} BTC</strong>
                  </div>
                  <div className="withdraw-confirm-detail withdraw-confirm-address-detail">
                    <span>Address</span>
                    {addressBlock}
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
  );
}

/* ── Playground ── */

type PlaygroundProps = {
  connected: boolean;
  setConnected: Dispatch<SetStateAction<boolean>>;
};

function Playground({ connected, setConnected }: PlaygroundProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [windowTitle] = useState(() => walletWindowTitle('Cairn', getWalletName()));
  const [activeDevice, setActiveDevice] = useState<DeviceId>('software');
  const [lineIndex, setLineIndex] = useState(0);

  // Wallet software state
  const [tab, setTab] = useState<LaptopTab>('transactions');
  const [sendStep, setSendStep] = useState<SendStep>('form');
  const [recipient, setRecipient] = useState('');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [feeId, setFeeId] = useState<(typeof FEE_OPTIONS)[number]['id']>('medium');
  const [addrCopied, setAddrCopied] = useState(false);
  const [addrVerified, setAddrVerified] = useState(false);

  // Requests from the wallet software to the hardware wallet. Each one is
  // cleared once the device answers, so it can be sent again.
  const [verifyRequest, setVerifyRequest] = useState(false);
  const [sendRequest, setSendRequest] = useState(false);
  const [connectRequest, setConnectRequest] = useState(false);

  const fee = FEE_OPTIONS.find((o) => o.id === feeId) ?? FEE_OPTIONS[1];
  const message = MENTOR_LINES[lineIndex];
  const { displayed, done, skip } = useTypewriter(message);

  const handleContinue = useCallback(() => {
    if (!done) {
      skip();
      return;
    }
    setLineIndex((i) => (i + 1) % MENTOR_LINES.length);
  }, [done, skip]);

  // On a phone, asking the device to do something jumps to it, as in the lessons.
  const requestOnDevice = useCallback((send: () => void) => {
    send();
    if (isMobile) setActiveDevice('hardware');
  }, [isMobile]);

  // Must be stable: HardwareWallet reports 'menu' from an effect keyed on it.
  // X on a request screen drops back to the menu, which ends the request.
  const handlePhaseChange = useCallback((phase: WalletPhase) => {
    if (phase === 'menu') {
      setVerifyRequest(false);
      setSendRequest(false);
      setConnectRequest(false);
    }
  }, []);

  const hidden = (id: DeviceId) => (isMobile && activeDevice !== id ? ' playground-hidden' : '');

  return (
    <main className="scenario-page scenario-page-connect playground-page">
      <div className="scenario-mentor-layout">
        <div className={`playground-stage${isMobile ? ' has-device-switcher' : ''}`}>
          <div className="playground-trio">
            {/* ── Phone ── */}
            <div className={`withdraw-phone-wrap playground-device${hidden('exchange')}`}>
              <ExchangePhone />
              <div className="device-caption">{t.common.captionPhone}</div>
            </div>

            {/* ── Wallet software ── */}
            <div className={`wallet-laptop playground-device${hidden('software')}`}>
              <div className="wallet-laptop-body">
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
                        {([
                          ['transactions', ArrowLeftRight, 'Transactions'],
                          ['send', ArrowUpRight, 'Send'],
                          ['receive', ArrowDownLeft, 'Receive'],
                          ['settings', Settings, 'Settings'],
                        ] as const).map(([id, Icon, name]) => (
                          <button
                            key={id}
                            type="button"
                            className={`wallet-nav-item${tab === id ? ' active' : ''}`}
                            onClick={() => setTab(id)}
                            aria-pressed={tab === id}
                          >
                            <Icon strokeWidth={2.2} />
                            <span className="wallet-nav-label">{name}</span>
                          </button>
                        ))}
                      </aside>
                      <div className="wallet-canvas">
                        {tab === 'transactions' && (
                          <div className="wallet-transactions">
                            <div className="wallet-tab-heading">
                              <div className="wallet-tab-title"><ArrowLeftRight strokeWidth={2} /><span>Transactions</span></div>
                            </div>
                            <div className="wallet-tx-summary">
                              <div className="wallet-tx-summary-item">
                                <span className="wallet-tx-summary-label">Balance</span>
                                <span className="wallet-tx-summary-value">{WALLET_BALANCE} BTC</span>
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
                                    <tr key={tx.date}>
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

                        {tab === 'send' && sendStep === 'form' && (
                          <div className="send-form-screen">
                            <div className="send-form-heading wallet-tab-heading">
                              <div className="wallet-tab-title"><ArrowUpRight strokeWidth={2} /><span>Send Bitcoin</span></div>
                              <span className="send-form-balance">Balance {WALLET_BALANCE} BTC</span>
                            </div>
                            <div className="send-form-fields">
                              <label className="tx-sim-field">
                                <span>Pay to</span>
                                <input className="tx-sim-addr" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="bc1…" />
                              </label>
                              <label className="tx-sim-field">
                                <span>Label</span>
                                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Add a label…" />
                              </label>
                              <label className="tx-sim-field">
                                <span>Amount</span>
                                <div className="send-amount-field">
                                  <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                                  <span>BTC</span>
                                  <button className="withdraw-max-btn" type="button" onClick={() => setAmount('0.14997520')}>MAX</button>
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
                            <button className="tx-sim-btn primary" type="button" onClick={() => setSendStep('review')}>
                              <span>Review transaction</span><ArrowRight size={16} strokeWidth={2.4} />
                            </button>
                          </div>
                        )}

                        {tab === 'send' && sendStep === 'review' && (
                          <div className="send-review-screen">
                            <div className="send-form-heading wallet-tab-heading">
                              <div className="wallet-tab-title"><ReceiptText strokeWidth={2} /><span>Review transaction</span></div>
                              <span className="send-review-status">Ready to sign</span>
                            </div>
                            <div className="tx-sim-confirm-box">
                              <div className="tx-confirm-row tx-confirm-row-address">
                                <span>Recipient</span>
                                <strong className="tx-confirm-addr">{MARIA_ADDRESS.match(/.{1,4}/g)?.join(' ')}</strong>
                              </div>
                              <div className="tx-confirm-row"><span>Amount</span><strong>{SEND_AMOUNT} BTC</strong></div>
                              <div className="tx-confirm-row"><span>Network fee</span><strong>{fee.fee} BTC</strong></div>
                              <div className="tx-confirm-row total">
                                <span>Total</span>
                                <strong>{(Number(SEND_AMOUNT) + Number(fee.fee)).toFixed(8)} BTC</strong>
                              </div>
                            </div>
                            <button
                              className="tx-sim-btn primary"
                              type="button"
                              onClick={() => requestOnDevice(() => setSendRequest(true))}
                              disabled={sendRequest}
                            >
                              <ShieldCheck size={16} strokeWidth={2.2} />
                              <span>Review on hardware wallet</span>
                            </button>
                          </div>
                        )}

                        {tab === 'send' && sendStep === 'sent' && (
                          <div className="tx-sim-screen tx-sim-success-screen send-success-screen">
                            <CheckCircle2 size={38} strokeWidth={1.6} />
                            <span className="tx-sim-success-title">Payment sent</span>
                            <p className="tx-sim-success-body">{SEND_AMOUNT} BTC was approved by the hardware wallet and broadcast to Andy's address.</p>
                            <button className="tx-sim-btn ghost" type="button" onClick={() => setSendStep('form')}>
                              <span>New payment (playground only)</span>
                            </button>
                          </div>
                        )}

                        {tab === 'receive' && (
                          <div className="rx-panel">
                            <div className="wallet-tab-heading">
                              <div className="wallet-tab-title"><ArrowDownLeft strokeWidth={2} /><span>Receive Bitcoin</span></div>
                            </div>
                            <div className="rx-qr-frame" aria-hidden="true">
                              <ReceiveQrCode address={LAPTOP_RECEIVE_ADDRESS} />
                            </div>
                            <span className="wallet-field-label">Receive address</span>
                            <p className="rx-addr">{LAPTOP_RECEIVE_ADDRESS}</p>
                            {addrVerified ? (
                              <div className="tx-addr-verified">
                                <CheckCircle2 size={16} />
                                <span>Address verified on device</span>
                              </div>
                            ) : (
                              <button
                                className="tx-sim-btn primary rx-btn"
                                type="button"
                                onClick={() => requestOnDevice(() => setVerifyRequest(true))}
                                disabled={verifyRequest}
                              >
                                <Eye size={14} strokeWidth={2} />
                                <span>{verifyRequest ? 'Verifying…' : 'Verify address on device'}</span>
                              </button>
                            )}
                            <button
                              className={`tx-sim-btn ${addrVerified ? 'primary' : 'ghost'} rx-btn`}
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(LAPTOP_RECEIVE_ADDRESS).catch(() => {});
                                setAddrCopied(true);
                                setTimeout(() => setAddrCopied(false), 2000);
                              }}
                            >
                              {addrCopied ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} strokeWidth={2} />}
                              <span>{addrCopied ? 'Copied' : 'Copy address'}</span>
                            </button>
                          </div>
                        )}

                        {tab === 'settings' && (
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
                            <section className="wallet-settings-section wallet-settings-keystores">
                              <h4 className="wallet-section-heading">Keystores</h4>
                              <div className="wallet-keystore">
                                <div className="wallet-keystore-tabs">
                                  <span className="wallet-keystore-tab">Keystore 1</span>
                                </div>
                                {connected ? (
                                  <div className="wallet-keystore-body is-filled">
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
                                      className="tx-sim-btn primary wallet-keystore-option"
                                      onClick={() => requestOnDevice(() => setConnectRequest(true))}
                                      disabled={connectRequest}
                                    >
                                      <Usb size={14} strokeWidth={2} />
                                      <span>Connect Hardware Wallet</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </section>
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
              <div className="device-caption">{t.common.captionWalletSoftware}</div>
            </div>

            {/* ── Hardware wallet ── */}
            <div className={`connect-device-stage phase-linked playground-device${hidden('hardware')}`}>
              <div className="connect-device-row">
                <HardwareWallet
                  mode="withdraw"
                  startAtMenu
                  explicitReset
                  connectRequest={connectRequest}
                  verifyRequest={verifyRequest}
                  verifyAddress={LAPTOP_RECEIVE_ADDRESS}
                  sendRequest={sendRequest}
                  sendAddress={MARIA_ADDRESS}
                  sendAmount={SEND_AMOUNT}
                  sendFee={fee.fee}
                  onConnectConfirm={() => {
                    setConnectRequest(false);
                    setConnected(true);
                  }}
                  onVerifyConfirm={() => {
                    setVerifyRequest(false);
                    setAddrVerified(true);
                  }}
                  onSendConfirm={() => {
                    setSendRequest(false);
                    setSendStep('sent');
                  }}
                  onPhaseChange={handlePhaseChange}
                  onComplete={() => {}}
                />
              </div>
            </div>
          </div>

          {isMobile && (
            <DeviceSwitcher
              options={[
                { id: 'exchange', label: t.common.captionPhone },
                { id: 'software', label: 'Software' },
                { id: 'hardware', label: 'Hardware' },
              ]}
              active={activeDevice}
              onSelect={setActiveDevice}
            />
          )}
        </div>

        <div className="mentor-row">
          <div className="mentor-portrait" aria-label={fmt(t.common.mentorAria, { name: 'Andy' })} role="img">
            <div className="mentor-portrait-glow" />
            <div className="mentor-portrait-ring">
              <img className="mentor-portrait-image" src={andyPortrait} alt={fmt(t.common.mentorAria, { name: 'Andy' })} />
            </div>
            <div className="mentor-portrait-badge">Andy</div>
          </div>
          <div className={`mentor-bubble ${done ? 'is-ready' : ''}`} onClick={handleContinue}>
            <div className="mentor-bubble-content" key={lineIndex}>
              <span className="mentor-bubble-name">Andy</span>
              <div className="mentor-bubble-text-wrap">
                <p className="mentor-bubble-text-ghost">{message}</p>
                <p className="mentor-bubble-text">
                  {displayed}
                  {!done && <span className="typewriter-cursor" />}
                </p>
              </div>
            </div>
            <button
              className={`bubble-next ${done ? 'ready' : ''}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleContinue();
              }}
              aria-label={t.common.continue}
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ── /test page: the playground, or any lesson in sandbox mode ── */

type View = 'playground' | 1 | 2 | 3 | 4 | 5 | 6;
const LESSON_NUMBERS = [1, 2, 3, 4, 5, 6] as const;

function SandboxLesson({ lesson, onExit }: { lesson: Exclude<View, 'playground'>; onExit: () => void }) {
  switch (lesson) {
    case 1:
      return <ScenarioBriefing onComplete={onExit} />;
    case 2:
      return <ConnectScenario completed={false} onComplete={onExit} />;
    case 3:
      return <ReceiveScenario onBack={onExit} onComplete={() => {}} />;
    case 4:
      return <RecoverScenario completed={false} onClose={onExit} onBack={onExit} onComplete={onExit} />;
    case 5:
      return <WithdrawScenario completed={false} onBack={onExit} onComplete={onExit} />;
    case 6:
      return <SendScenario completed={false} onBack={onExit} onComplete={() => {}} />;
  }
}

export default function DevicePlayground() {
  const { t } = useI18n();
  const [view, setView] = useState<View>('playground');
  const [resetKey, setResetKey] = useState(0);
  const [connected, setConnected] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const choose = useCallback((next: View) => {
    setView(next);
    setResetKey((k) => k + 1);
    setConnected(true);
    setMenuOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const reset = useCallback(() => {
    setResetKey((k) => k + 1);
    setConnected(true);
  }, []);

  // Close the lessons menu on an outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // The dev controls sit in the site header, next to the language and theme
  // buttons, so the page itself holds only the devices and the mentor.
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHeaderSlot(document.getElementById('playground-header-slot'));
  }, []);

  const headerControls = headerSlot && createPortal(
    <>
      <div className="playground-lessons" ref={menuRef}>
        <button
          type="button"
          className={`playground-header-btn${menuOpen ? ' is-open' : ''}`}
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="Open a lesson with every device unlocked"
        >
          <BookOpen size={14} strokeWidth={2.2} />
          <span className="playground-header-btn-label">Lessons</span>
          {view !== 'playground' && <span className="playground-lessons-current">{view}</span>}
          <ChevronDown size={14} strokeWidth={2.2} className="playground-lessons-chevron" />
        </button>
        {menuOpen && (
          <div className="playground-lessons-menu" role="menu">
            <button
              type="button"
              role="menuitemradio"
              aria-checked={view === 'playground'}
              className={`playground-lessons-item${view === 'playground' ? ' is-active' : ''}`}
              onClick={() => choose('playground')}
            >
              <span className="playground-lessons-num">·</span>
              <span className="playground-lessons-title">Playground (all devices)</span>
              {view === 'playground' && <Check size={14} strokeWidth={2.4} />}
            </button>
            {LESSON_NUMBERS.map((n) => (
              <button
                key={n}
                type="button"
                role="menuitemradio"
                aria-checked={view === n}
                className={`playground-lessons-item${view === n ? ' is-active' : ''}`}
                onClick={() => choose(n)}
              >
                <span className="playground-lessons-num">{n}</span>
                <span className="playground-lessons-title">{t.roadmap.titles[n - 1]}</span>
                {view === n && <Check size={14} strokeWidth={2.4} />}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        className="playground-header-btn"
        onClick={reset}
        title={view === 'playground' ? 'Reset every device' : `Restart lesson ${view}`}
      >
        <RotateCcw size={14} strokeWidth={2.2} />
        <span className="playground-header-btn-label">Reset</span>
      </button>
      {view === 'playground' && (
        <button
          type="button"
          className="playground-header-btn"
          onClick={() => setConnected((c) => !c)}
          title="Switch the Settings keystore between connected and empty"
        >
          <Usb size={14} strokeWidth={2.2} />
          <span className="playground-header-btn-label">{connected ? 'Keystore: connected' : 'Keystore: empty'}</span>
        </button>
      )}
    </>,
    headerSlot,
  );

  return (
    <>
      {headerControls}
      {view === 'playground' ? (
        <Playground key={resetKey} connected={connected} setConnected={setConnected} />
      ) : (
        // Finishing a lesson here saves nothing; it just comes back to the playground.
        <SandboxContext.Provider value>
          <SandboxLesson key={`${view}-${resetKey}`} lesson={view} onExit={() => choose('playground')} />
        </SandboxContext.Provider>
      )}
    </>
  );
}
