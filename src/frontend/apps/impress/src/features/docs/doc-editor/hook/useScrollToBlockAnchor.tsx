import Router from 'next/router';
import { useEffect } from 'react';

import { getMainContentElement } from '@/layouts/utils';

const SCROLL_MARGIN_TOP = 50;
const OBSERVER_TIMEOUT = 5000;
// The highlight stays 2 seconds, then fades out during 2 seconds
const HIGHLIGHT_HOLD = 2000;
const HIGHLIGHT_FADE = 2000;
const HIGHLIGHT_DURATION = HIGHLIGHT_HOLD + HIGHLIGHT_FADE;

/**
 * Hook that scrolls to a block element based on the URL hash.
 * If the block element doesn't exist yet, it observes the DOM for a limited time
 * to see if it appears, and scrolls to it when it does.
 * If it doesn't appear within that time, it stops observing to avoid memory leaks.
 */
export const useScrollToBlockAnchor = () => {
  useEffect(() => {
    const blockId = window.location.hash.slice(1);

    if (!blockId) {
      return;
    }

    const existingBlockEl = document.getElementById(blockId);
    if (existingBlockEl) {
      scrollToBlock(existingBlockEl);
      return;
    }

    /**
     * Document editor can be a bit slow to render the block elements.
     * If the block element doesn't exist yet, we observe the DOM
     * during the next OBSERVER_TIMEOUT milliseconds to see if it appears,
     * and scroll to it when it does.
     * If it doesn't appear within that time, we stop observing to avoid memory leaks.
     */
    const observer = new MutationObserver(() => {
      const blockEl = document.getElementById(blockId);

      if (blockEl) {
        clearTimeout(timeoutId);
        observer.disconnect();
        scrollToBlock(blockEl);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Disconnect the observer after a timeout to avoid memory leaks if the block never appears
    const timeoutId = setTimeout(() => {
      observer.disconnect();
    }, OBSERVER_TIMEOUT);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  /**
   * A link to a block of the current doc, and the back / forward buttons
   * between such links, only change the hash: the page is not reloaded.
   * Without hash (e.g. back to the doc URL), the page goes back to the top.
   */
  useEffect(() => {
    const onHashChangeStart = () => {
      if (prefersReducedMotion()) {
        return;
      }

      getMainContentElement()?.style.setProperty('scroll-behavior', 'smooth');
    };

    // A canceled navigation never completes
    const onHashChangeError = () => {
      getMainContentElement()?.style.removeProperty('scroll-behavior');
    };

    const onHashChangeComplete = (url: string) => {
      const container = getMainContentElement();
      const blockId = new URL(url, window.location.origin).hash.slice(1);

      if (blockId) {
        const blockEl = document.getElementById(blockId);
        if (blockEl) {
          highlightBlock(blockEl);
        }
      } else {
        container?.scrollTo({ top: 0 });
      }

      // Next.js scrolls to the block in a timeout, once the page re-rendered
      setTimeout(() => container?.style.removeProperty('scroll-behavior'), 0);
    };

    Router.events.on('hashChangeStart', onHashChangeStart);
    Router.events.on('hashChangeComplete', onHashChangeComplete);
    Router.events.on('routeChangeError', onHashChangeError);

    return () => {
      Router.events.off('hashChangeStart', onHashChangeStart);
      Router.events.off('hashChangeComplete', onHashChangeComplete);
      Router.events.off('routeChangeError', onHashChangeError);
      // Unmounted during a hash change, its completion is not listened to
      getMainContentElement()?.style.removeProperty('scroll-behavior');
    };
  }, []);
};

/** The user asked for less animation: the scroll jumps instead of gliding */
const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const scrollToBlock = (blockEl: HTMLElement) => {
  scrollBlockIntoView(blockEl);
  highlightBlock(blockEl);
};

const highlightBlock = (blockEl: HTMLElement) => {
  // Highlight the block so the reader spots it: held, then faded out.
  const color = 'var(--c--contextuals--background--semantic--info--tertiary)';
  blockEl.animate(
    [
      { backgroundColor: color, offset: 0 },
      { backgroundColor: color, offset: HIGHLIGHT_HOLD / HIGHLIGHT_DURATION },
      { backgroundColor: 'transparent', offset: 1 },
    ],
    { duration: HIGHLIGHT_DURATION, easing: 'linear' },
  );
};

// Try to scroll the main content container instead of the block itself
// to avoid the block being hidden behind the header
export const scrollBlockIntoView = (blockEl: HTMLElement) => {
  const container = getMainContentElement();
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth';

  if (container) {
    const top =
      blockEl.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      SCROLL_MARGIN_TOP;

    container.scrollTo({ top, behavior });
  } else {
    blockEl.scrollIntoView({
      behavior,
      inline: 'start',
      block: 'start',
    });
  }
};
