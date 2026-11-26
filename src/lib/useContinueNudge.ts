import { useCallback, useRef, type MouseEvent } from 'react';

/**
 * While the mentor waits on Continue, the hardware wallet goes idle (dimmed, inert).
 * A press on it then makes the Continue button jump and flash, pointing the
 * learner at what to click instead. Attach `continueRef` to the `.bubble-next`
 * button and pass `pointToContinue` as the device's `onIdlePress`.
 */
export function useContinueNudge() {
  const continueRef = useRef<HTMLButtonElement>(null);

  const pointToContinue = useCallback((event?: MouseEvent) => {
    // The press is meant for Continue, so the device never sees it.
    event?.stopPropagation();
    event?.preventDefault();
    const button = continueRef.current;
    if (!button) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    button.animate(
      reduceMotion
        ? [
            { boxShadow: '0 0 0 0 rgba(241, 189, 105, 0)' },
            { boxShadow: '0 0 0 8px rgba(241, 189, 105, 0.6)' },
            { boxShadow: '0 0 0 0 rgba(241, 189, 105, 0)' },
          ]
        : [
            { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(241, 189, 105, 0)' },
            { transform: 'scale(1.35)', boxShadow: '0 0 0 10px rgba(241, 189, 105, 0.55)', offset: 0.3 },
            { transform: 'scale(0.95)', offset: 0.6 },
            { transform: 'scale(1.12)', offset: 0.8 },
            { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(241, 189, 105, 0)' },
          ],
      { duration: 650, easing: 'ease-out' },
    );
  }, []);

  return { continueRef, pointToContinue };
}
