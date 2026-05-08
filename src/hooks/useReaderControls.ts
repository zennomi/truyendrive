import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

import { clampIndex, type ReaderGroup } from '../lib/readerUtils';
import type { ReaderSettings } from '../useSettings';

interface UseReaderControlsParams {
  activeGroupIndex: number;
  displayGroups: ReaderGroup[];
  groupRefs: RefObject<Array<HTMLDivElement | null>>;
  imageWrapRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  setActiveGroupIndex: (index: number) => void;
  settings: ReaderSettings;
  supportsZoomOverlay: boolean;
}

export function useReaderControls({
  activeGroupIndex,
  displayGroups,
  groupRefs,
  imageWrapRef,
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

  const scrollToGroup = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const target = groupRefs.current[index];
      if (!target) {
        return;
      }

      setActiveGroupIndex(index);

      if (settings.lyt.direction === 'ttb') {
        target.scrollIntoView({ behavior, block: 'start' });
        return;
      }

      target.scrollIntoView({ behavior, block: 'nearest', inline: 'start' });
      if (settings.bhv.resetScroll) {
        target.scrollTop = 0;
      }
    },
    [
      groupRefs,
      setActiveGroupIndex,
      settings.bhv.resetScroll,
      settings.lyt.direction,
    ],
  );

  const syncActiveGroupFromScroll = useCallback(() => {
    const scroller = imageWrapRef.current;
    if (!scroller || displayGroups.length === 0) {
      return;
    }

    if (settings.lyt.direction === 'ttb') {
      const targetY = scroller.scrollTop + scroller.clientHeight * 0.35;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      groupRefs.current.forEach((group, index) => {
        if (!group) {
          return;
        }

        const distance = Math.abs(group.offsetTop - targetY);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveGroupIndex(closestIndex);
      return;
    }

    const nextIndex = Math.round(
      scroller.scrollLeft / Math.max(scroller.clientWidth, 1),
    );
    setActiveGroupIndex(clampIndex(nextIndex, displayGroups.length - 1));
  }, [
    displayGroups.length,
    groupRefs,
    imageWrapRef,
    setActiveGroupIndex,
    settings.lyt.direction,
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
