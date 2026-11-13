import { useLayoutEffect, type RefObject } from 'react';

const MIN_FIT = 0.7;
const MAX_FIT = 1.3;
/** Breathing room kept beside and around the scaled device, in px. */
const SIDE_ROOM = 24;
const VERTICAL_ROOM = 8;

/**
 * Phone layout: scales the hardware wallet to fill its panel. Writes `--hw-fit`
 * (a unitless scale) on the stage; CSS applies it to the device and positions
 * the USB cord from it. offsetWidth/offsetHeight are used so the scale itself
 * doesn't skew the measurement.
 */
export function useDeviceFit(stageRef: RefObject<HTMLElement>, enabled = true) {
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const device = stage?.querySelector<HTMLElement>('.hw-wallet-device');
    if (!enabled || !stage || !device) return;

    const update = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      // The hidden panel measures 0; keep the last fit until it is shown again
      if (!width || !height || !device.offsetWidth || !device.offsetHeight) return;
      const fit = Math.min(
        (width - SIDE_ROOM) / device.offsetWidth,
        (height - VERTICAL_ROOM) / device.offsetHeight,
      );
      stage.style.setProperty('--hw-fit', Math.min(MAX_FIT, Math.max(MIN_FIT, fit)).toFixed(3));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    observer.observe(device);
    return () => {
      observer.disconnect();
      stage.style.removeProperty('--hw-fit');
    };
  }, [stageRef, enabled]);
}
