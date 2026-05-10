import { useEffectEvent, useRef, type MutableRefObject } from 'react';

import {
  clearReaderStateUrl,
  parseReaderStateFromUrl,
} from '../lib/readerUtils';

interface UseReaderSessionParams {
  currentPageRef: MutableRefObject<number>;
  historyPageRef: MutableRefObject<number | null>;
  isHandlingPopStateRef: MutableRefObject<boolean>;
}

export function getInitialReaderState() {
  return parseReaderStateFromUrl(window.location.href);
}

function getReaderBaseUrl(url: string) {
  const readerState = parseReaderStateFromUrl(url);
  if (readerState.page < 0 && !readerState.chapterId) {
    return url;
  }

  return clearReaderStateUrl(url);
}

export function useReaderSession({
  currentPageRef,
  historyPageRef,
  isHandlingPopStateRef,
}: UseReaderSessionParams) {
  const previousTitleRef = useRef<string | null>(null);
  const previousUrlRef = useRef<string | null>(null);

  const beginReaderSession = useEffectEvent((initialPage = -1) => {
    previousTitleRef.current = document.title;
    previousUrlRef.current = getReaderBaseUrl(window.location.href);
    currentPageRef.current = initialPage;
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
