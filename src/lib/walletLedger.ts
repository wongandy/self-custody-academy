// The payments the learner makes in the simulated wallet, in story order:
//   receive  — Lesson 3, sending the receive address in the chat
//   withdraw — Lesson 5, confirming the exchange withdrawal
//   send     — Lesson 6, approving the payment on the hardware wallet
//
// Each payment is stamped with the moment the learner made it and keeps its
// amount, fee and resulting balance. The list lives in localStorage (so the
// lessons can read it synchronously) and, for signed-in learners, in
// `learning_progress.wallet_transactions`.

import { supabase } from '@/lib/supabase';

export type TxKind = 'receive' | 'withdraw' | 'send';

export type WalletTx = {
  kind: TxKind;
  /** ISO time the learner made the payment. */
  at: string;
  /** Signed: positive for incoming, negative for the send (fee included). */
  amount_sats: number;
  fee_sats: number;
  /** The fee rate the learner picked, e.g. '8 sats/vB' (send only). */
  fee_rate?: string;
  /** Wallet balance after this payment. */
  balance_sats: number;
  address: string;
};

/** A payment as a lesson records it; the time and balance are filled in. */
export type NewTx = Omit<WalletTx, 'at' | 'balance_sats'>;

export const TX_ORDER: TxKind[] = ['receive', 'withdraw', 'send'];

export const SATS_PER_BTC = 100_000_000;
export const toSats = (btc: string) => Math.round(Number(btc) * SATS_PER_BTC);

/** The addresses in the lesson story. */
export const STORY_ADDRESSES = {
  /** The wallet's first receive address (Lesson 3, and the sandbox). */
  receive: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu',
  /** The wallet address the exchange withdraws to (Lesson 5). */
  withdraw: 'bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g',
  /** Maria's address, where Lesson 6 sends. */
  maria: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
} as const;

// What each payment is when the learner hasn't made it here (an earlier lesson
// done before this was saved, or storage blocked).
const DEFAULTS: Record<TxKind, NewTx> = {
  receive: { kind: 'receive', amount_sats: 10_000_000, fee_sats: 0, address: STORY_ADDRESSES.receive },
  withdraw: { kind: 'withdraw', amount_sats: 4_998_000, fee_sats: 0, address: STORY_ADDRESSES.withdraw },
  send: { kind: 'send', amount_sats: -1_000_480, fee_sats: 480, fee_rate: '8 sats/vB', address: STORY_ADDRESSES.maria },
};

// Days between payments, used to estimate the date of one that wasn't saved.
const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_BEFORE_NEXT: Record<TxKind, number> = { receive: 29, withdraw: 15, send: 0 };

const STORAGE_KEY = 'sca_wallet_transactions';

const isKind = (v: unknown): v is TxKind => TX_ORDER.includes(v as TxKind);

/** Keep only well-formed entries, at most one per kind, in story order. */
export function normalizeLedger(value: unknown): WalletTx[] {
  if (!Array.isArray(value)) return [];
  const byKind = new Map<TxKind, WalletTx>();
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const tx = raw as Record<string, unknown>;
    if (!isKind(tx.kind) || typeof tx.at !== 'string' || Number.isNaN(Date.parse(tx.at))) continue;
    if (![tx.amount_sats, tx.fee_sats, tx.balance_sats].every((n) => typeof n === 'number' && Number.isFinite(n))) continue;
    byKind.set(tx.kind, {
      kind: tx.kind,
      at: tx.at,
      amount_sats: tx.amount_sats as number,
      fee_sats: tx.fee_sats as number,
      ...(typeof tx.fee_rate === 'string' ? { fee_rate: tx.fee_rate } : {}),
      balance_sats: tx.balance_sats as number,
      address: typeof tx.address === 'string' ? tx.address : DEFAULTS[tx.kind].address,
    });
  }
  return TX_ORDER.flatMap((k) => byKind.get(k) ?? []);
}

/** The saved payments, exactly as recorded. */
export function getStoredLedger(): WalletTx[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeLedger(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function writeLocal(ledger: WalletTx[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
  } catch {
    // the lessons fall back to estimated payments
  }
}

async function pushRemote(ledger: WalletTx[]): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;
  await supabase.from('learning_progress').upsert({
    user_id: session.user.id,
    wallet_transactions: ledger,
    updated_at: new Date().toISOString(),
  });
}

/**
 * The payments up to and including `through`, oldest first. Saved payments
 * are returned as recorded; any that weren't saved get the story's default
 * amount and an estimated date (`through` itself: now), kept in order.
 */
export function resolveLedger(through: TxKind): WalletTx[] {
  const stored = new Map(getStoredLedger().map((tx) => [tx.kind, tx]));
  const kinds = TX_ORDER.slice(0, TX_ORDER.indexOf(through) + 1);

  // Dates: walk back from now, placing each missing payment a few days before
  // the next one, then forward so a missing one is never before a saved one.
  const times: number[] = [];
  let next = Date.now();
  for (let i = kinds.length - 1; i >= 0; i--) {
    const saved = stored.get(kinds[i]);
    times[i] = saved ? Date.parse(saved.at) : i === kinds.length - 1 ? next : next - DAYS_BEFORE_NEXT[kinds[i]] * DAY_MS;
    next = times[i];
  }
  for (let i = 1; i < kinds.length; i++) {
    if (!stored.has(kinds[i])) times[i] = Math.max(times[i], times[i - 1]);
  }

  let balance = 0;
  return kinds.map((kind, i) => {
    const saved = stored.get(kind);
    const tx = saved ?? { ...DEFAULTS[kind], at: new Date(times[i]).toISOString(), balance_sats: balance + DEFAULTS[kind].amount_sats };
    balance = tx.balance_sats;
    return tx;
  });
}

/**
 * Save a payment the learner just made, stamped with the current time, and
 * sync it for signed-in learners. Replaying a lesson replaces its payment and
 * drops the ones after it, since the story picks up again from there.
 */
export function recordTx(tx: NewTx): WalletTx {
  const before = resolveLedger(tx.kind).slice(0, -1);
  const kept = getStoredLedger().filter((t) => TX_ORDER.indexOf(t.kind) < TX_ORDER.indexOf(tx.kind));
  const prevBalance = before.length ? before[before.length - 1].balance_sats : 0;
  const entry: WalletTx = { ...tx, at: new Date().toISOString(), balance_sats: prevBalance + tx.amount_sats };
  const ledger = [...kept, entry];
  writeLocal(ledger);
  pushRemote(ledger).catch(() => {
    // the browser copy is merged up on the next sign-in
  });
  return entry;
}

const newest = (ledger: WalletTx[]) => Math.max(-Infinity, ...ledger.map((tx) => Date.parse(tx.at)));

/**
 * On sign-in: keep whichever of the account's payments and this browser's is
 * more recent. The account copy replaces the browser's; a newer browser copy
 * (a guest who then signs in) is saved to the account.
 */
export async function syncLedger(userId: string, remoteValue: unknown): Promise<void> {
  const remote = normalizeLedger(remoteValue);
  const local = getStoredLedger();
  if (newest(local) > newest(remote)) {
    await supabase.from('learning_progress').upsert({
      user_id: userId,
      wallet_transactions: local,
      updated_at: new Date().toISOString(),
    });
    return;
  }
  writeLocal(remote);
}

/** Forget this browser's payments (sign-out). */
export function clearLedger(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD HH:MM` in the learner's local time. */
export function formatTxDate(at: string): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** BTC as the wallet shows it: 5 decimals when that's exact (0.10000), else 8 (0.01000480). */
export function formatBtc(sats: number): string {
  const s = (Math.abs(sats) / SATS_PER_BTC).toFixed(sats % 1000 === 0 ? 5 : 8);
  return (sats < 0 ? '-' : '') + s;
}

/** A transaction table row: date, signed value and balance after. */
export type TxRow = { date: string; value: string; balance: string; incoming: boolean };

export function toTxRow(tx: WalletTx): TxRow {
  const incoming = tx.amount_sats >= 0;
  return {
    date: formatTxDate(tx.at),
    value: `${incoming ? '+' : ''}${formatBtc(tx.amount_sats)} BTC`,
    balance: `${formatBtc(tx.balance_sats)} BTC`,
    incoming,
  };
}
