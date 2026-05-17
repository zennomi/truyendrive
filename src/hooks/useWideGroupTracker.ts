import {
  useEffect,
  useEffectEvent,
  useState,
  type MutableRefObject,
} from 'react';

import type { ReaderGroup } from '../lib/readerUtils';
import type { ReaderSettings } from '../useSettings';

interface UseWideGroupTrackerParams {
  displayGroups: ReaderGroup[];
  groupRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  imageLoadVersion: number;
  isOpen: boolean;
  settings: ReaderSettings;
}

export function useWideGroupTracker({
  displayGroups,
  groupRefs,
  imageLoadVersion,
  isOpen,
  settings,
}: UseWideGroupTrackerParams) {
  const [tooWideGroups, setTooWideGroups] = useState<Record<string, true>>({});

  const syncWideGroupState = useEffectEvent(() => {
    if (
      !isOpen ||
      (settings.lyt.fit !== 'height' && settings.lyt.fit !== 'height_limit')
    ) {
      setTooWideGroups((current) =>
        Object.keys(current).length === 0 ? current : {},
      );
      return;
    }

    const nextGroups: Record<string, true> = {};

    displayGroups.forEach((group, index) => {
      const wrapper = groupRefs.current[index];
      if (!wrapper) {
        return;
      }

      if (wrapper.scrollWidth > wrapper.clientWidth + 1) {
        nextGroups[group.id] = true;
      }
    });

    setTooWideGroups((current) => {
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(nextGroups);

      if (
        currentKeys.length === nextKeys.length &&
        currentKeys.every((key) => key in nextGroups)
      ) {
        return current;
      }

      return nextGroups;
    });
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      syncWideGroupState();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [
    displayGroups,
    imageLoadVersion,
    isOpen,
    settings.lyt.direction,
    settings.lyt.fit,
    settings.lyt.spread,
    settings.lyt.zoom,
    syncWideGroupState,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleResize = () => {
      syncWideGroupState();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, syncWideGroupState]);

  return { tooWideGroups };
}
