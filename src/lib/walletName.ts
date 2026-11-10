// The name the learner gives their wallet in Cairn (lesson 4), shown in the
// wallet software's title bar in every later lesson.

const STORAGE_KEY = 'sca_wallet_name';

export function getWalletName(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setWalletName(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // the title bar just falls back to the app name
  }
}

/** Title bar text: "Cairn — Savings", or just "Cairn" before a wallet is named. */
export function walletWindowTitle(appName: string, walletName: string): string {
  return walletName ? `${appName} — ${walletName}` : appName;
}
