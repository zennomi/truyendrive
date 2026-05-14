import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

import { getReaderStickyOffset } from '../lib/readerDom';
import { clampIndex, type ReaderGroup } from '../lib/readerUtils';
import type { ReaderSettings } from '../useSettings';

interface UseReaderControlsParams {
  activeGroupIndex: number;
  displayGroups: ReaderGroup[];
  groupRefs: RefObject<Array<HTMLDivElement | null>>;
  imageWrapRef: RefObject<HTMLDivElement | null>;
  mainRef?: RefObject<HTMLElement | null>;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  isScrollReady: boolean;
  isOpen: boolean;
  setActiveGroupIndex: (index: number) => void;
  settings: ReaderSettings;
  supportsZoomOverlay: boolean;
}

function isScrollableY(element: HTMLElement) {
  const styles = window.getComputedStyle(element);
  return (
    element.scrollHeight > element.clientHeight &&
    /(auto|scroll|overlay)/.test(styles.overflowY)
  );
}

function addUniqueTarget<T extends EventTarget>(
  targets: T[],
  target: T | null | undefined,
) {
  if (target && !targets.includes(target)) {
    targets.push(target);
  }
}

export function useReaderControls({
  activeGroupIndex,
  displayGroups,
  groupRefs,
  imageWrapRef,
  mainRef,
  scrollContainerRef,
  isScrollReady,
  isOpen,
  setActiveGroupIndex,
  settings,
  supportsZoomOverlay,
}: UseReaderControlsParams) {
  const [hoverEdge, setHoverEdge] = useState<'next' | 'prev' | null>(null);
  const [isSelectorVisible, setIsSelectorVisible] = useState(false);
  const [isZoomVisible, setIsZoomVisible] = useState(false);
  const selectorHideTimeoutRef = useRef<number | null>(null);
  const zoomHideTimeoutRef = useRef<number | null>(null);

  const clearSelectorHideTimer = useCallback(() => {
    if (selectorHideTimeoutRef.current !== null) {
      window.clearTimeout(selectorHideTimeoutRef.current);
      selectorHideTimeoutRef.current = null;
    }
  }, []);

  const clearZoomHideTimer = useCallback(() => {
    if (zoomHideTimeoutRef.current !== null) {
      window.clearTimeout(zoomHideTimeoutRef.current);
      zoomHideTimeoutRef.current = null;
    }
  }, []);

  const resetControls = useCallback(() => {
    clearSelectorHideTimer();
    clearZoomHideTimer();
    setHoverEdge(null);
    setIsSelectorVisible(false);
    setIsZoomVisible(false);
  }, [clearSelectorHideTimer, clearZoomHideTimer]);

  const showPageSelector = useCallback(() => {
    clearSelectorHideTimer();
    if (settings.apr.selPinned) {
      setIsSelectorVisible(false);
      return;
    }

    setIsSelectorVisible(true);
    selectorHideTimeoutRef.current = window.setTimeout(() => {
      setIsSelectorVisible(false);
      selectorHideTimeoutRef.current = null;
    }, 3000);
  }, [clearSelectorHideTimer, settings.apr.selPinned]);

  const showZoomControls = useCallback(() => {
    clearZoomHideTimer();
    if (!supportsZoomOverlay) {
      setIsZoomVisible(false);
      return;
    }

    setIsZoomVisible(true);
    zoomHideTimeoutRef.current = window.setTimeout(() => {
      setIsZoomVisible(false);
      zoomHideTimeoutRef.current = null;
    }, 3000);
  }, [clearZoomHideTimer, supportsZoomOverlay]);

  const getTtbScroller = useCallback(() => {
    const candidates = [
      scrollContainerRef?.current,
      mainRef?.current,
      imageWrapRef.current,
    ];

    return (
      candidates.find(
        (candidate): candidate is HTMLElement =>
          candidate !== null &&
          candidate !== undefined &&
          isScrollableY(candidate),
      ) ??
      scrollContainerRef?.current ??
      mainRef?.current ??
      imageWrapRef.current
    );
  }, [imageWrapRef, mainRef, scrollContainerRef]);

  const scrollToGroup = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const target = groupRefs.current[index];
      if (!target) {
        return;
      }

      setActiveGroupIndex(index);

      if (settings.lyt.direction === 'ttb') {
        const scroller = getTtbScroller();
        if (!scroller) {
          target.scrollIntoView({ behavior, block: 'start' });
          return;
        }

        const scrollerBounds = scroller.getBoundingClientRect();
        const targetBounds = target.getBoundingClientRect();
        const stickyOffset = getReaderStickyOffset(mainRef?.current);

        scroller.scrollTo({
          behavior,
          top:
            scroller.scrollTop +
            targetBounds.top -
            scrollerBounds.top -
            stickyOffset,
        });
        return;
      }

      target.scrollIntoView({ behavior, block: 'nearest', inline: 'start' });
      if (settings.bhv.resetScroll) {
        target.scrollTop = 0;
      }
    },
    [
      getTtbScroller,
      groupRefs,
      mainRef,
      setActiveGroupIndex,
      settings.bhv.resetScroll,
      settings.lyt.direction,
    ],
  );

  const syncActiveGroupFromScroll = useCallback(() => {
    const scroller =
      settings.lyt.direction === 'ttb'
        ? getTtbScroller()
        : imageWrapRef.current;
    if (!isScrollReady || !scroller || displayGroups.length === 0) {
      return;
    }

    if (settings.lyt.direction === 'ttb') {
      const scrollerBounds = scroller.getBoundingClientRect();
      const targetY =
        scrollerBounds.top + getReaderStickyOffset(mainRef?.current) + 1;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      groupRefs.current.forEach((group, index) => {
        if (!group) {
          return;
        }

        const groupBounds = group.getBoundingClientRect();
        if (groupBounds.top <= targetY && groupBounds.bottom > targetY) {
          closestIndex = index;
          closestDistance = 0;
          return;
        }

        const distance = Math.abs(groupBounds.top - targetY);
        if (closestDistance !== 0 && distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      if (closestIndex !== activeGroupIndex) {
        setActiveGroupIndex(closestIndex);
      }
      return;
    }

    const nextIndex = clampIndex(
      Math.round(scroller.scrollLeft / Math.max(scroller.clientWidth, 1)),
      displayGroups.length - 1,
    );
    if (nextIndex !== activeGroupIndex) {
      setActiveGroupIndex(nextIndex);
    }
  }, [
    activeGroupIndex,
    displayGroups.length,
    getTtbScroller,
    groupRefs,
    imageWrapRef,
    isScrollReady,
    mainRef,
    setActiveGroupIndex,
    settings.lyt.direction,
  ]);

  useEffect(() => {
    if (
      !isOpen ||
      !isScrollReady ||
      settings.lyt.direction !== 'ttb' ||
      displayGroups.length === 0
    ) {
      return;
    }

    const targets: Array<HTMLElement | Window> = [];
    addUniqueTarget(targets, scrollContainerRef?.current);
    addUniqueTarget(targets, mainRef?.current);
    addUniqueTarget(targets, imageWrapRef.current);

    let ancestor =
      groupRefs.current.find((group): group is HTMLDivElement => group !== null)
        ?.parentElement ?? null;
    while (ancestor) {
      if (isScrollableY(ancestor)) {
        addUniqueTarget(targets, ancestor);
      }
      ancestor = ancestor.parentElement;
    }
    addUniqueTarget(targets, window);

    const handleScroll = () => {
      syncActiveGroupFromScroll();
    };

    targets.forEach((target) => {
      target.addEventListener('scroll', handleScroll, { passive: true });
    });
    handleScroll();

    return () => {
      targets.forEach((target) => {
        target.removeEventListener('scroll', handleScroll);
      });
    };
  }, [
    displayGroups.length,
    groupRefs,
    imageWrapRef,
    isOpen,
    isScrollReady,
    mainRef,
    scrollContainerRef,
    settings.lyt.direction,
    syncActiveGroupFromScroll,
  ]);

  const goToAdjacentGroup = useCallback(
    (delta: number) => {
      if (displayGroups.length === 0) {
        return;
      }

      const nextIndex = clampIndex(
        activeGroupIndex + delta,
        displayGroups.length - 1,
      );
      scrollToGroup(nextIndex);
    },
    [activeGroupIndex, displayGroups.length, scrollToGroup],
  );

  const performVerticalStep = useCallback(
    (direction: 1 | -1) => {
      const scroller = imageWrapRef.current;
      if (!scroller) {
        return;
      }

      scroller.scrollBy({
        behavior: 'smooth',
        top: direction * settings.bhv.scrollYDelta * 8,
      });
    },
    [imageWrapRef, settings.bhv.scrollYDelta],
  );

  const performVerticalPageTurn = useCallback(
    (direction: 1 | -1) => {
      const scroller = imageWrapRef.current;
      if (!scroller) {
        return;
      }

      scroller.scrollBy({
        behavior: 'smooth',
        top:
          direction *
          Math.max(scroller.clientHeight * 0.9, settings.bhv.scrollYDelta * 8),
      });
    },
    [imageWrapRef, settings.bhv.scrollYDelta],
  );

  useEffect(() => {
    if (!isOpen) {
      resetControls();
    }
  }, [isOpen, resetControls]);

  useEffect(
    () => () => {
      clearSelectorHideTimer();
      clearZoomHideTimer();
    },
    [clearSelectorHideTimer, clearZoomHideTimer],
  );

  return {
    goToAdjacentGroup,
    hoverEdge,
    isSelectorVisible,
    isZoomVisible,
    performVerticalPageTurn,
    performVerticalStep,
    scrollToGroup,
    setHoverEdge,
    showPageSelector,
    showZoomControls,
    syncActiveGroupFromScroll,
  };
}
