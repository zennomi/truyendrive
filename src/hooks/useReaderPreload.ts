import { useCallback, useEffect, useEffectEvent, useRef } from 'react';

import { getImageUrl, type ReaderGroup } from '../lib/readerUtils';

interface UseReaderPreloadParams {
  activeGroupIndex: number;
  displayGroups: ReaderGroup[];
  isOpen: boolean;
  preloadDistance: number;
}

function getMaxPreloadDistance(preloadDistance: number, groupCount: number) {
  return preloadDistance === 100
    ? groupCount
    : Math.max(preloadDistance, 1);
}

export function useReaderPreload({
  activeGroupIndex,
  displayGroups,
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
    (index: number) =>
      index >= 0 &&
      index < displayGroups.length &&
      index <=
        activeGroupIndex +
          getMaxPreloadDistance(preloadDistance, displayGroups.length),
    [activeGroupIndex, preloadDistance, displayGroups.length],
  );

  useEffect(() => {
    if (!isOpen || displayGroups.length === 0) {
      resetPreloadState();
      return;
    }

    const maxDistance = getMaxPreloadDistance(
      preloadDistance,
      displayGroups.length,
    );
    const preloadUrls: string[] = [];

    for (let distance = 1; distance <= maxDistance; distance += 1) {
      [activeGroupIndex + distance, activeGroupIndex - distance].forEach(
        (groupIndex) => {
          const group = displayGroups[groupIndex];
          if (!group) {
            return;
          }

          group.pages.forEach((page) => {
            preloadUrls.push(getImageUrl(page.id));
          });
        },
      );
    }

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
    isOpen,
    preloadDistance,
    resetPreloadState,
  ]);

  return { isGroupPreloaded, preloadImageRefs };
}
