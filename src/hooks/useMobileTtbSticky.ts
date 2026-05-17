import { useCallback, useEffect, useState, type RefObject } from 'react';

import { getReaderStickyElements, READER_STICKY_CLASS } from '../lib/readerDom';
import type { ReaderSettings } from '../useSettings';

type UpdateSetting = <
  TCategory extends keyof ReaderSettings,
  TKey extends keyof ReaderSettings[TCategory],
>(
  category: TCategory,
  key: TKey,
  value: ReaderSettings[TCategory][TKey],
) => void;

interface UseMobileTtbStickyParams {
  isOpen: boolean;
  isTtb: boolean;
  mainRef: RefObject<HTMLElement | null>;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  settings: ReaderSettings;
  updateSetting: UpdateSetting;
}

const MOBILE_BREAKPOINT_QUERY = '(max-width: 700px)';

function restoreScrollAfterLayout(main: HTMLElement, scrollTop: number) {
  requestAnimationFrame(() => {
    main.scrollTop = scrollTop;
  });
}

export function useMobileTtbSticky({
  isOpen,
  isTtb,
  mainRef,
  scrollContainerRef,
  settings,
  updateSetting,
}: UseMobileTtbStickyParams) {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches,
  );

  const clearStickyElements = useCallback(() => {
    const main = mainRef.current;
    if (!main) {
      return;
    }

    const { buffer, selector } = getReaderStickyElements(main);
    main.classList.remove(READER_STICKY_CLASS);

    if (selector) {
      selector.style.top = '';
    }

    if (buffer) {
      buffer.style.height = '';
    }
  }, [mainRef]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    if (isOpen && isMobile && isTtb) {
      return;
    }

    clearStickyElements();
    if (settings.apr.selPinned) {
      updateSetting('apr', 'selPinned', false);
    }
  }, [
    clearStickyElements,
    isMobile,
    isOpen,
    isTtb,
    settings.apr.selPinned,
    updateSetting,
  ]);

  const handleTtbTap = useCallback(() => {
    const main = mainRef.current;
    if (!main) {
      return;
    }

    const { buffer, header, selector } = getReaderStickyElements(main);
    if (!header || !selector || !buffer) {
      return;
    }

    const scroller = scrollContainerRef?.current ?? main;
    const savedScroll = scroller.scrollTop;
    const nextSelPinned = !settings.apr.selPinned;

    if (nextSelPinned) {
      main.classList.add(READER_STICKY_CLASS);
      updateSetting('apr', 'selPinned', true);

      const headerHeight = header.offsetHeight;
      const selectorHeight = selector.offsetHeight;
      selector.style.top = `${headerHeight}px`;
      buffer.style.height = `${headerHeight + selectorHeight}px`;
      restoreScrollAfterLayout(scroller, savedScroll);
      return;
    }

    main.classList.remove(READER_STICKY_CLASS);
    updateSetting('apr', 'selPinned', false);
    selector.style.top = '';
    buffer.style.height = '';
    restoreScrollAfterLayout(scroller, savedScroll);
  }, [mainRef, scrollContainerRef, settings.apr.selPinned, updateSetting]);

  return {
    handleTtbTap,
    isMobile,
  };
}
