import { useLayoutEffect, type RefObject } from 'react';

/**
 * Lines the side-by-side USB cord up with the laptop base. Writes `--cable-y`
 * (the base's vertical center, measured from the top of the laptop body) on the
 * enclosing `.connect-duo`. CSS uses it only in the wide side-by-side layout.
 * offsetTop is used rather than bounding rects so the entry and slide
 * transforms don't skew the measurement.
 */
export function useLaptopCableAlign(bodyRef: RefObject<HTMLElement>, enabled = true) {
  useLayoutEffect(() => {
    const body = bodyRef.current;
    const duo = body?.closest<HTMLElement>('.connect-duo');
    const base = body?.querySelector<HTMLElement>('.wallet-laptop-base');
    if (!enabled || !body || !duo || !base) return;

    const update = () => {
      duo.style.setProperty('--cable-y', `${base.offsetTop + base.offsetHeight / 2}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(body);
    return () => {
      observer.disconnect();
      duo.style.removeProperty('--cable-y');
    };
  }, [bodyRef, enabled]);
}
