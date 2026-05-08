import { useEffect, useEffectEvent, type MutableRefObject } from 'react';

import {
  buildPageTitle,
  buildReaderHistoryUrl,
  clampIndex,
  findGroupIndexForPage,
  isReaderHistoryState,
  type ReaderGroup,
  type ReaderHistoryState,
} from '../lib/readerUtils';
import type { ReaderSettings } from '../useSettings';

interface UseReaderHistoryParams {
  activePage: number;
  currentPageRef: MutableRefObject<number>;
  displayGroups: ReaderGroup[];
  historyDepthRef: MutableRefObject<number>;
  historyPageRef: MutableRefObject<number | null>;
  imageIds: string[];
  isHandlingPopStateRef: MutableRefObject<boolean>;
  isOpen: boolean;
  previousUrlRef: MutableRefObject<string | null>;
  readerTitle: string;
  resetReaderState: (restoreHistoryUrl: boolean) => void;
  scrollToGroup: (index: number, behavior?: ScrollBehavior) => void;
  settings: ReaderSettings;
}

export function useReaderHistory({
  activePage,
  currentPageRef,
  displayGroups,
  historyDepthRef,
  historyPageRef,
  imageIds,
  isHandlingPopStateRef,
  isOpen,
  previousUrlRef,
  readerTitle,
  resetReaderState,
  scrollToGroup,
  settings,
}: UseReaderHistoryParams) {
  const handlePopState = useEffectEvent((event: PopStateEvent) => {
    if (isReaderHistoryState(event.state)) {
      if (!isOpen || displayGroups.length === 0) {
        return;
      }

      const targetPage = clampIndex(event.state.page, imageIds.length - 1);
      const targetGroupIndex = findGroupIndexForPage(displayGroups, targetPage);

      isHandlingPopStateRef.current = true;
      currentPageRef.current = targetPage;
      historyPageRef.current = targetPage;
      document.title = buildPageTitle(readerTitle, targetPage);
      scrollToGroup(targetGroupIndex === -1 ? 0 : targetGroupIndex, 'auto');
      requestAnimationFrame(() => {
        isHandlingPopStateRef.current = false;
      });
      return;
    }

    if (isOpen) {
      resetReaderState(false);
    }
  });

  useEffect(() => {
    if (!isOpen || displayGroups.length === 0) {
      return;
    }

    if (settings.bhv.historyUpdate === 'none') {
      return;
    }

    const title = buildPageTitle(readerTitle, activePage);
    if (isHandlingPopStateRef.current) {
      document.title = title;
      historyPageRef.current = activePage;
      return;
    }

    const baseUrl = previousUrlRef.current ?? window.location.href;
    const nextState: ReaderHistoryState = {
      page: activePage,
      truyendriveReader: true,
    };
    const nextUrl = buildReaderHistoryUrl(baseUrl, activePage);

    if (historyDepthRef.current === 0) {
      window.history.pushState(nextState, '', nextUrl);
      historyDepthRef.current = 1;
      historyPageRef.current = activePage;
      document.title = title;
      return;
    }

    const previousPage = historyPageRef.current;
    switch (settings.bhv.historyUpdate) {
      case 'replace':
      case 'chap':
        window.history.replaceState(nextState, '', nextUrl);
        break;
      case 'jump':
        if (previousPage === null || Math.abs(previousPage - activePage) > 2) {
          window.history.pushState(nextState, '', nextUrl);
          historyDepthRef.current += 1;
        } else {
          window.history.replaceState(nextState, '', nextUrl);
        }
        break;
      case 'all':
        if (previousPage !== activePage) {
          window.history.pushState(nextState, '', nextUrl);
          historyDepthRef.current += 1;
        } else {
          window.history.replaceState(nextState, '', nextUrl);
        }
        break;
      default:
        break;
    }

    historyPageRef.current = activePage;
    document.title = title;
  }, [
    activePage,
    displayGroups,
    historyDepthRef,
    historyPageRef,
    isHandlingPopStateRef,
    isOpen,
    previousUrlRef,
    readerTitle,
    settings.bhv.historyUpdate,
  ]);

  return { handlePopState };
}
