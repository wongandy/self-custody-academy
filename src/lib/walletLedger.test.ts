import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'));

import { resetSupabaseMock, supabaseMock } from '@/test/supabaseMock';
import {
  STORY_ADDRESSES,
  clearLedger,
  formatBtc,
  getStoredLedger,
  recordTx,
  resolveLedger,
  syncLedger,
  toTxRow,
  type WalletTx,
} from '@/lib/walletLedger';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-11-16T10:00:00Z').getTime();

const receive = () => recordTx({ kind: 'receive', amount_sats: 10_000_000, fee_sats: 0, address: STORY_ADDRESSES.receive });
const withdraw = () => recordTx({ kind: 'withdraw', amount_sats: 4_998_000, fee_sats: 0, address: STORY_ADDRESSES.withdraw });
const send = (fee = 1080) =>
  recordTx({ kind: 'send', amount_sats: -(1_000_000 + fee), fee_sats: fee, fee_rate: '18 sats/vB', address: STORY_ADDRESSES.maria });

const signIn = () =>
  supabaseMock.supabase.auth.getSession.mockImplementation(async () => ({
    data: { session: { user: { id: 'u1' } } as Session },
    error: null,
  }));

beforeEach(() => {
  resetSupabaseMock();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('recordTx', () => {
  it('stamps each payment with the time it was made and chains the balance', () => {
    receive();
    vi.setSystemTime(NOW + 3 * DAY);
    withdraw();
    vi.setSystemTime(NOW + 5 * DAY);
    send();

    const ledger = getStoredLedger();
    expect(ledger.map((tx) => tx.kind)).toEqual(['receive', 'withdraw', 'send']);
    expect(ledger.map((tx) => tx.at)).toEqual([
      new Date(NOW).toISOString(),
      new Date(NOW + 3 * DAY).toISOString(),
      new Date(NOW + 5 * DAY).toISOString(),
    ]);
    expect(ledger.map((tx) => tx.balance_sats)).toEqual([10_000_000, 14_998_000, 13_996_920]);
    expect(ledger[2]).toMatchObject({ fee_sats: 1080, fee_rate: '18 sats/vB', address: STORY_ADDRESSES.maria });
  });

  it('replaying a lesson replaces its payment and drops the later ones', () => {
    receive();
    withdraw();
    send();
    vi.setSystemTime(NOW + DAY);
    withdraw();

    const ledger = getStoredLedger();
    expect(ledger.map((tx) => tx.kind)).toEqual(['receive', 'withdraw']);
    expect(ledger[1].at).toBe(new Date(NOW + DAY).toISOString());
  });

  it('uses the default earlier payments when they were never saved', () => {
    const sent = send(480);
    expect(sent.balance_sats).toBe(14_998_000 - 1_000_480);
  });

  it('saves to the account only when signed in', async () => {
    receive();
    await vi.waitFor(() => expect(supabaseMock.supabase.auth.getSession).toHaveBeenCalled());
    expect(supabaseMock.db.upsert).not.toHaveBeenCalled();

    signIn();
    withdraw();
    await vi.waitFor(() => expect(supabaseMock.db.upsert).toHaveBeenCalledTimes(1));
    const row = supabaseMock.db.upsert.mock.calls[0][0];
    expect(row.user_id).toBe('u1');
    expect((row.wallet_transactions as WalletTx[]).map((tx) => tx.kind)).toEqual(['receive', 'withdraw']);
  });
});

describe('resolveLedger', () => {
  it('estimates dates for payments that were never saved, ending now', () => {
    const ledger = resolveLedger('send');
    expect(ledger.map((tx) => Date.parse(tx.at))).toEqual([NOW - 44 * DAY, NOW - 15 * DAY, NOW]);
    expect(ledger.map((tx) => tx.balance_sats)).toEqual([10_000_000, 14_998_000, 13_997_520]);
  });

  it('never places an estimated payment before a saved one', () => {
    vi.setSystemTime(NOW - 2 * DAY);
    receive();
    vi.setSystemTime(NOW);
    const [rx, wd] = resolveLedger('send');
    expect(rx.at).toBe(new Date(NOW - 2 * DAY).toISOString());
    expect(Date.parse(wd.at)).toBeGreaterThanOrEqual(Date.parse(rx.at));
  });
});

describe('syncLedger', () => {
  it('takes the account copy when it is newer', async () => {
    receive();
    const remote: WalletTx[] = [
      { kind: 'receive', at: new Date(NOW + DAY).toISOString(), amount_sats: 10_000_000, fee_sats: 0, balance_sats: 10_000_000, address: 'x' },
    ];
    await syncLedger('u1', remote);
    expect(getStoredLedger()).toEqual(remote);
    expect(supabaseMock.db.upsert).not.toHaveBeenCalled();
  });

  it('saves the browser copy to the account when it is newer', async () => {
    receive();
    await syncLedger('u1', []);
    expect(supabaseMock.db.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1', wallet_transactions: getStoredLedger() }));
  });

  it('ignores malformed account data', async () => {
    await syncLedger('u1', [{ kind: 'nope' }, 'junk', null]);
    expect(getStoredLedger()).toEqual([]);
  });
});

it('clearLedger forgets the browser copy', () => {
  receive();
  clearLedger();
  expect(getStoredLedger()).toEqual([]);
});

it('formats rows as the wallet shows them', () => {
  expect(formatBtc(10_000_000)).toBe('0.10000');
  expect(formatBtc(-1_000_480)).toBe('-0.01000480');
  const tx: WalletTx = { kind: 'send', at: new Date(2026, 10, 4, 10, 24).toISOString(), amount_sats: -1_000_480, fee_sats: 480, balance_sats: 13_997_520, address: 'x' };
  expect(toTxRow(tx)).toEqual({ date: '2026-11-04 10:24', value: '-0.01000480 BTC', balance: '0.13997520 BTC', incoming: false });
});
