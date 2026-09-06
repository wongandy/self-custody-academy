let sessionMnemonic: string[] | null = null;

export function setSessionMnemonic(words: string[]): void {
  sessionMnemonic = words;
}

export function getSessionMnemonic(): string[] | null {
  return sessionMnemonic;
}

export function clearSessionMnemonic(): void {
  sessionMnemonic = null;
}
