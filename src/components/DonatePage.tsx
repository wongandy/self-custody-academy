import { useEffect, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import { Bitcoin, Check, Copy, Heart, Zap } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

// Andy's Lightning address. Invoices for the chosen amount are requested from it
// (LNURL-pay), and it's shown on the page for "any amount" donations.
const LIGHTNING_ADDRESS = 'revisedlumen82@walletofsatoshi.com';
// The same address as a bech32 LNURL (of /.well-known/lnurlp/revisedlumen82),
// used for the "any amount" QR because the widest range of wallets can scan it.
const LIGHTNING_LNURL =
  'LNURL1DP68GURN8GHJ7AMPD3KX2AR0VEEKZAR0WD5XJTNRDAKJ7TNHV4KXCTTTDEHHWM30D3H82UNVWQHHYETKD9EK2ERVW4KK2M3CXGQKGMLL';
// Andy's on-chain bitcoin address.
const ONCHAIN_ADDRESS = 'bc1q98prc46ttlk67f6hu9z93d6eqztywm58r4gh70';
// One "coffee" in sats.
const COFFEE_SATS = 5000;
const COFFEE_COUNTS = [1, 3, 5];

type Status = 'idle' | 'loading' | 'invoice' | 'error';
type Method = 'lightning' | 'onchain';

const QR_OPTIONS = { margin: 2, width: 280 };

// Builds a QR image once for a fixed payload.
function useQr(payload: string) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(payload, QR_OPTIONS).then((url) => alive && setSrc(url)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [payload]);
  return src;
}

type LnurlPayParams = {
  callback: string;
  minSendable: number;
  maxSendable: number;
  commentAllowed?: number;
  status?: string;
  reason?: string;
};

async function requestInvoice(address: string, sats: number, comment: string): Promise<string> {
  const [user, domain] = address.split('@');
  if (!user || !domain) throw new Error('bad-address');

  const paramsRes = await fetch(`https://${domain}/.well-known/lnurlp/${user}`);
  const params = (await paramsRes.json()) as LnurlPayParams;
  if (!paramsRes.ok || params.status === 'ERROR') throw new Error(params.reason ?? 'lnurl-error');

  const msats = sats * 1000;
  if (msats < params.minSendable || msats > params.maxSendable) {
    throw new Error(`limits:${Math.ceil(params.minSendable / 1000)}:${Math.floor(params.maxSendable / 1000)}`);
  }

  const url = new URL(params.callback);
  url.searchParams.set('amount', String(msats));
  const maxComment = params.commentAllowed ?? 0;
  if (comment && maxComment > 0) url.searchParams.set('comment', comment.slice(0, maxComment));

  const invoiceRes = await fetch(url.toString());
  const invoice = (await invoiceRes.json()) as { pr?: string; status?: string; reason?: string };
  if (!invoiceRes.ok || invoice.status === 'ERROR' || !invoice.pr) throw new Error(invoice.reason ?? 'invoice-error');
  return invoice.pr;
}

function formatSats(n: number) {
  return n.toLocaleString('en-US');
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1800);
    } catch {
      // Clipboard blocked: the text is still visible to copy by hand.
    }
  };
  return { copied, copy };
}

export function DonatePage() {
  const { t } = useI18n();
  const d = t.donate;
  const [choice, setChoice] = useState<number | 'custom'>(0);
  const [customSats, setCustomSats] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorText, setErrorText] = useState('');
  const [invoice, setInvoice] = useState('');
  const [qr, setQr] = useState('');
  const [method, setMethod] = useState<Method>('lightning');
  const { copied, copy } = useCopy();
  const lightningQr = useQr(`lightning:${LIGHTNING_LNURL}`);
  const onchainQr = useQr(`bitcoin:${ONCHAIN_ADDRESS}`);

  const sats = choice === 'custom' ? Math.floor(Number(customSats)) || 0 : COFFEE_COUNTS[choice] * COFFEE_SATS;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sats <= 0) return;
    setStatus('loading');
    try {
      const pr = await requestInvoice(LIGHTNING_ADDRESS, sats, message.trim());
      const dataUrl = await QRCode.toDataURL(`lightning:${pr}`, QR_OPTIONS);
      setInvoice(pr);
      setQr(dataUrl);
      setStatus('invoice');
    } catch (err) {
      const reason = err instanceof Error ? err.message : '';
      if (reason.startsWith('limits:')) {
        const [, min, max] = reason.split(':');
        setErrorText(d.errorLimits.replace('{min}', formatSats(Number(min))).replace('{max}', formatSats(Number(max))));
      } else {
        setErrorText(d.errorGeneric);
      }
      setStatus('error');
    }
  }

  function startOver() {
    setStatus('idle');
    setInvoice('');
    setQr('');
  }

  return (
    <main className="info-page donate-page">
      <p className="info-eyebrow">{d.eyebrow}</p>
      <h1 className="info-title">
        {d.titleBefore}<em>{d.titleEm}</em>{d.titleAfter}
      </h1>
      <p className="info-lead">{d.lead}</p>

      <div className="donate-tabs" role="tablist" aria-label={d.methodLabel}>
        <button
          type="button"
          role="tab"
          aria-selected={method === 'lightning'}
          className={`donate-tab${method === 'lightning' ? ' is-active' : ''}`}
          onClick={() => setMethod('lightning')}
        >
          <Zap size={16} strokeWidth={2.4} />
          {d.tabLightning}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={method === 'onchain'}
          className={`donate-tab${method === 'onchain' ? ' is-active' : ''}`}
          onClick={() => setMethod('onchain')}
        >
          <Bitcoin size={16} strokeWidth={2.4} />
          {d.tabOnchain}
        </button>
      </div>

      {method === 'lightning' ? (
        <>
          {status === 'invoice' ? (
            <section className="donate-invoice" aria-live="polite">
              <p className="donate-invoice-amount">
                <Zap size={16} strokeWidth={2.4} />
                {formatSats(sats)} sats
              </p>
              <a className="donate-qr" href={`lightning:${invoice}`} aria-label={d.openWallet}>
                <img src={qr} alt={d.invoiceQrAlt} width={240} height={240} />
              </a>
              <p className="donate-hint">{d.scanHint}</p>
              <div className="donate-actions">
                <button type="button" className="donate-copy" onClick={() => copy('invoice', invoice)}>
                  {copied === 'invoice' ? <Check size={15} strokeWidth={2.4} /> : <Copy size={15} strokeWidth={2.4} />}
                  {copied === 'invoice' ? d.copied : d.copyInvoice}
                </button>
                <a className="donate-copy" href={`lightning:${invoice}`}>
                  <Zap size={15} strokeWidth={2.4} />
                  {d.openWallet}
                </a>
              </div>
              <p className="donate-thanks">
                <Heart size={16} strokeWidth={2.4} />
                {d.paidThanks}
              </p>
              <button type="button" className="contact-again" onClick={startOver}>
                {d.startOver}
              </button>
            </section>
          ) : (
            <form className="donate-form" onSubmit={handleSubmit}>
              <div className="donate-cups" role="radiogroup" aria-label={d.pickLabel}>
                {COFFEE_COUNTS.map((count, i) => (
                  <button
                    key={count}
                    type="button"
                    role="radio"
                    aria-checked={choice === i}
                    className={`donate-cup${choice === i ? ' is-selected' : ''}`}
                    onClick={() => setChoice(i)}
                  >
                    <span className="donate-cup-emoji" aria-hidden="true">
                      {'☕'.repeat(count === 1 ? 1 : count === 3 ? 2 : 3)}
                    </span>
                    <span className="donate-cup-title">{d.cups[i].title}</span>
                    <span className="donate-cup-sats">{formatSats(count * COFFEE_SATS)} sats</span>
                    <span className="donate-cup-caption">{d.cups[i].caption}</span>
                  </button>
                ))}
              </div>

              <label className={`donate-custom${choice === 'custom' ? ' is-selected' : ''}`}>
                <span>{d.customLabel}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  placeholder="2,100"
                  value={customSats}
                  onFocus={() => setChoice('custom')}
                  onChange={(e) => {
                    setChoice('custom');
                    setCustomSats(e.target.value);
                  }}
                />
                <em>sats</em>
              </label>

              <label className="contact-field">
                <span>{d.messageLabel}</span>
                <input
                  type="text"
                  maxLength={140}
                  placeholder={d.messagePlaceholder}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>

              {status === 'error' && <p className="contact-error" role="alert">{errorText}</p>}

              <button className="primary-button donate-submit" type="submit" disabled={status === 'loading' || sats <= 0}>
                <Zap size={16} strokeWidth={2.4} />
                {status === 'loading' ? d.loading : d.submit.replace('{sats}', formatSats(sats))}
              </button>
            </form>
          )}

          <section className="donate-static">
            <img className="donate-static-qr" src={lightningQr} alt={d.staticQrAlt} width={132} height={132} />
            <div>
              <h2>{d.anyAmountTitle}</h2>
              <p>{d.anyAmountBody}</p>
              <button type="button" className="donate-address" onClick={() => copy('address', LIGHTNING_ADDRESS)}>
                <span>{LIGHTNING_ADDRESS}</span>
                {copied === 'address' ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} strokeWidth={2.4} />}
              </button>
            </div>
          </section>
        </>
      ) : (
        <section className="donate-invoice donate-onchain">
          <p className="donate-invoice-amount">
            <Bitcoin size={16} strokeWidth={2.4} />
            {d.onchainTitle}
          </p>
          <a className="donate-qr" href={`bitcoin:${ONCHAIN_ADDRESS}`} aria-label={d.openWallet}>
            {onchainQr && <img src={onchainQr} alt={d.onchainQrAlt} width={240} height={240} />}
          </a>
          <p className="donate-hint">{d.onchainBody}</p>
          <button type="button" className="donate-address" onClick={() => copy('onchain', ONCHAIN_ADDRESS)}>
            <span>{ONCHAIN_ADDRESS}</span>
            {copied === 'onchain' ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} strokeWidth={2.4} />}
          </button>
          <p className="donate-thanks">
            <Heart size={16} strokeWidth={2.4} />
            {d.onchainThanks}
          </p>
        </section>
      )}

      <p className="info-note">{d.note}</p>
    </main>
  );
}
