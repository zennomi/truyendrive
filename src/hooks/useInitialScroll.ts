import { useLayoutEffect, useRef, type MutableRefObject } from 'react';

import { findGroupIndexForPage, type ReaderGroup } from '../lib/readerUtils';
import type { ReaderSettings } from '../useSettings';

interface UseInitialScrollParams {
  activeFolderId: string | null;
  activeGroupIndex: number;
  chapterStartGroupIndex: number;
  currentPageRef: MutableRefObject<number>;
  displayGroups: ReaderGroup[];
  groupRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  isOpen: boolean;
  setActiveGroupIndex: (index: number) => void;
  setIsScrollReady: (value: boolean) => void;
  settings: ReaderSettings;
}

export function useInitialScroll({
  activeFolderId,
  activeGroupIndex,
  chapterStartGroupIndex,
  currentPageRef,
  displayGroups,
  groupRefs,
  isOpen,
  setActiveGroupIndex,
  setIsScrollReady,
  settings,
}: UseInitialScrollParams) {
  const initialScrollFolderIdRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !activeFolderId) {
      initialScrollFolderIdRef.current = null;
      return;
    }

    if (
      initialScrollFolderIdRef.current === activeFolderId ||
      displayGroups.length === 0
    ) {
      return;
    }

    const targetPage = currentPageRef.current;
    const matchingIndex =
      targetPage < 0 ? -1 : findGroupIndexForPage(displayGroups, targetPage);
    const nextIndex =
      matchingIndex === -1 ? chapterStartGroupIndex : matchingIndex;
    const targetGroup = groupRefs.current[nextIndex];
    initialScrollFolderIdRef.current = activeFolderId;

    if (activeGroupIndex !== nextIndex) {
      setActiveGroupIndex(nextIndex);
    }

    if (targetGroup) {
      if (settings.lyt.direction === 'ttb') {
        targetGroup.scrollIntoView({ behavior: 'auto', block: 'start' });
      } else {
        targetGroup.scrollIntoView({
          behavior: 'auto',
          block: 'nearest',
          inline: 'start',
        });

        if (settings.bhv.resetScroll) {
          targetGroup.scrollTop = 0;
        }
      }
    }

    setIsScrollReady(true);
  }, [
    activeFolderId,
    displayGroups,
    isOpen,
    chapterStartGroupIndex,
    settings.bhv.resetScroll,
    settings.lyt.fit,
    settings.lyt.direction,
    settings.lyt.spread,
  ]);
}
