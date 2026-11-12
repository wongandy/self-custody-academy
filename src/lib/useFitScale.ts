import { useCallback, useLayoutEffect, useState } from 'react';

/**
 * Shrinks a slot's first child so it fits the slot's height, writing the
 * factor to `--fit-scale` on the slot (CSS applies it with `scale`).
 *
 * Used on laptop-sized lesson screens (`.lesson-fit`): the slot (`.fit-slot`)
 * is the flexible area between the header and the mentor bubble, so the
 * device gives up space instead of pushing the bubble below the fold. Never
 * scales up past 1.
 *
 * `scale` doesn't change layout size, so the child's offsetHeight is always
 * its natural height and the measurement can't feed back on itself.
 *
 * Returns a callback ref, so it also works for slots that mount later (e.g.
 * a device that only appears after the intro).
 */
export function useFitScale<T extends HTMLElement = HTMLDivElement>(minScale = 0.6) {
  const [slot, setSlot] = useState<T | null>(null);
  const ref = useCallback((node: T | null) => setSlot(node), []);

  useLayoutEffect(() => {
    if (!slot) return;

    const update = () => {
      const child = slot.firstElementChild as HTMLElement | null;
      if (!child) return;
      const natural = child.offsetHeight;
      const available = slot.clientHeight;
      const scale = natural > 0 && available > 0 ? Math.max(minScale, Math.min(1, available / natural)) : 1;
      slot.style.setProperty('--fit-scale', scale.toFixed(3));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(slot);
    // The child can be swapped (e.g. a mobile-only button appearing first), so
    // watch for that too and re-observe the current first child.
    let observed = slot.firstElementChild;
    if (observed) ro.observe(observed);
    const mo = new MutationObserver(() => {
      if (slot.firstElementChild !== observed) {
        if (observed) ro.unobserve(observed);
        observed = slot.firstElementChild;
        if (observed) ro.observe(observed);
        update();
      }
    });
    mo.observe(slot, { childList: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [slot, minScale]);

  return ref;
}
