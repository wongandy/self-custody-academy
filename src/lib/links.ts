import type { MouseEvent } from 'react';

/**
 * Click handler for an in-app `<a href>`: a plain click navigates without reloading,
 * while ctrl/cmd/shift/middle-click keep the browser's own behaviour (new tab, etc.).
 * Real links let search engines find the pages; the href is what they follow.
 */
export function inAppClick(go: () => void) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    go();
  };
}
