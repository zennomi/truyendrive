import { useCallback, useEffect, useEffectEvent, useRef } from 'react';

import {
  getGroupsInRange,
  getImageUrl,
  getMaxGroupDistance,
  type ReaderGroup,
} from '../lib/readerUtils';

interface UseReaderPreloadParams {
  activeGroupIndex: number;
  displayGroups: ReaderGroup[];
  initialGroupIndex: number;
  isInitialScrollDone: boolean;
  isPasswordMode: boolean;
  isOpen: boolean;
  preloadDistance: number;
}

export function useReaderPreload({
  activeGroupIndex,
  displayGroups,
  initialGroupIndex,
  isInitialScrollDone,
  isPasswordMode,
  isOpen,
  preloadDistance,
}: UseReaderPreloadParams) {
  const preloadCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const preloadImageRefs = useRef<Array<HTMLImageElement | null>>([]);

  const resetPreloadState = useEffectEvent(() => {
    preloadCacheRef.current.clear();
    preloadImageRefs.current.forEach((image) => {
      if (image) {
        image.removeAttribute('src');
      }
    });
  });

  const isGroupPreloaded = useCallback(
    (index: number) => {
      if (isPasswordMode) {
        return false;
      }

      const maxDistance = getMaxGroupDistance(
        preloadDistance,
        displayGroups.length,
      );
      const anchorGroupIndex = isInitialScrollDone
        ? activeGroupIndex
        : initialGroupIndex;

      return (
        index >= 0 &&
        index < displayGroups.length &&
        Math.abs(index - anchorGroupIndex) <= maxDistance
      );
    },
    [
      activeGroupIndex,
      displayGroups.length,
      initialGroupIndex,
      isInitialScrollDone,
      isPasswordMode,
      preloadDistance,
    ],
  );

  useEffect(() => {
    if (!isOpen || displayGroups.length === 0) {
      resetPreloadState();
      return;
    }
    if (isPasswordMode) {
      // Decrypted images manage their own preload window.
      resetPreloadState();
      return;
    }

    const maxDistance = getMaxGroupDistance(
      preloadDistance,
      displayGroups.length,
    );
    const anchorGroupIndex = isInitialScrollDone
      ? activeGroupIndex
      : initialGroupIndex;
    const preloadUrls: string[] = [];

    getGroupsInRange(displayGroups, anchorGroupIndex, maxDistance, false).forEach(
      (group) => {
        group.pages.forEach((page) => {
          preloadUrls.push(getImageUrl(page.id));
        });
      },
    );

    preloadUrls.forEach((url) => {
      if (preloadCacheRef.current.has(url)) {
        return;
      }

      const image = new window.Image();
      image.decoding = 'async';
      image.src = url;
      preloadCacheRef.current.set(url, image);
    });

    preloadImageRefs.current.forEach((image, index) => {
      if (!image) {
        return;
      }

      const url = preloadUrls[index];
      if (url) {
        image.src = url;
      } else {
        image.removeAttribute('src');
      }
    });
  }, [
    activeGroupIndex,
    displayGroups,
    initialGroupIndex,
    isInitialScrollDone,
    isPasswordMode,
    isOpen,
    preloadDistance,
    resetPreloadState,
  ]);

  return { isGroupPreloaded, preloadImageRefs };
}
