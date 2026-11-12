import { createContext, useContext } from 'react';

/**
 * TEMPORARY — set only by the /test page when it plays a real lesson.
 * In sandbox mode the mentor no longer locks the devices: every hardware
 * wallet button, wallet software tab and phone field can be used at any time.
 * Outside /test it is always false, so the lessons behave as normal.
 */
export const SandboxContext = createContext(false);

export function useSandbox() {
  return useContext(SandboxContext);
}
