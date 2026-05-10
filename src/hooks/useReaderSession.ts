import { useEffectEvent, useRef, type MutableRefObject } from 'react';

interface UseReaderSessionParams {
  currentPageRef: MutableRefObject<number>;
  historyPageRef: MutableRefObject<number | null>;
  isHandlingPopStateRef: MutableRefObject<boolean>;
}

export function useReaderSession({
  currentPageRef,
  historyPageRef,
  isHandlingPopStateRef,
}: UseReaderSessionParams) {
  const previousTitleRef = useRef<string | null>(null);
  const previousUrlRef = useRef<string | null>(null);

  const beginReaderSession = useEffectEvent(() => {
    previousTitleRef.current = document.title;
    previousUrlRef.current = window.location.href;
    currentPageRef.current = -1;
    historyPageRef.current = null;
    isHandlingPopStateRef.current = false;
  });

  const resetHistoryState = useEffectEvent((restoreHistoryUrl: boolean) => {
    currentPageRef.current = -1;
    historyPageRef.current = null;
    isHandlingPopStateRef.current = false;

    if (previousTitleRef.current) {
      document.title = previousTitleRef.current;
      previousTitleRef.current = null;
    }

    if (restoreHistoryUrl && previousUrlRef.current) {
      window.history.replaceState(
        window.history.state,
        '',
        previousUrlRef.current,
      );
    }

    previousUrlRef.current = null;
  });

  return {
    beginReaderSession,
    resetHistoryState,
  };
}
