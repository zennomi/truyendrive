import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';

import { extractImageIds } from '../lib/readerUtils';

interface UseComicModeParams {
  beginReaderSession: () => void;
  historyDepthRef: MutableRefObject<number>;
  onResetUi: () => void;
  resetHistoryState: (restoreHistoryUrl: boolean) => void;
}

export function useComicMode({
  beginReaderSession,
  historyDepthRef,
  onResetUi,
  resetHistoryState,
}: UseComicModeParams) {
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const scrollIntervalRef = useRef<number | null>(null);

  const cleanupAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current !== null) {
      window.clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  const resetReaderState = useCallback(
    (restoreHistoryUrl: boolean) => {
      cleanupAutoScroll();
      onResetUi();
      setImageIds([]);
      setIsOpen(false);
      setStatusMessage('Reader closed');
      resetHistoryState(restoreHistoryUrl);
    },
    [cleanupAutoScroll, onResetUi, resetHistoryState],
  );

  const closeComicMode = useCallback(() => {
    if (historyDepthRef.current > 0) {
      window.history.go(-historyDepthRef.current);
      return;
    }

    resetReaderState(false);
  }, [historyDepthRef, resetReaderState]);

  const openComicMode = useCallback(() => {
    const initialIds = extractImageIds();

    if (initialIds.length === 0) {
      window.alert(
        'No images detected on screen. Make sure image tiles are loaded first.',
      );
      return;
    }

    beginReaderSession();
    setImageIds(initialIds);
    setIsOpen(true);
    setStatusMessage(
      `Loaded ${initialIds.length} page${initialIds.length === 1 ? '' : 's'}`,
    );

    const scrollContainer = document.querySelector('c-wiz[data-parent]');
    if (!scrollContainer) {
      return;
    }

    let lastHeight = 0;
    let sameHeightCount = 0;

    cleanupAutoScroll();
    scrollIntervalRef.current = window.setInterval(() => {
      const currentHeight = scrollContainer.scrollHeight;
      scrollContainer.scrollTop = currentHeight;

      const newIds = extractImageIds();
      setImageIds((currentIds) => {
        let changed = false;
        const mergedIds = [...currentIds];

        newIds.forEach((id) => {
          if (!mergedIds.includes(id)) {
            mergedIds.push(id);
            changed = true;
          }
        });

        if (changed) {
          setStatusMessage(`Loaded ${mergedIds.length}`);
          return mergedIds;
        }

        return currentIds;
      });

      if (currentHeight === lastHeight) {
        sameHeightCount += 1;
        if (sameHeightCount >= 3) {
          cleanupAutoScroll();
          setStatusMessage((message) => `${message}`);
        }
      } else {
        lastHeight = currentHeight;
        sameHeightCount = 0;
      }
    }, 1500);
  }, [beginReaderSession, cleanupAutoScroll]);

  useEffect(
    () => () => {
      cleanupAutoScroll();
    },
    [cleanupAutoScroll],
  );

  return {
    closeComicMode,
    imageIds,
    isOpen,
    openComicMode,
    resetReaderState,
    scrollIntervalRef,
    statusMessage,
  };
}
