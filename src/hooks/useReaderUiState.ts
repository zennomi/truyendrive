import { useCallback, useEffectEvent, useState } from 'react';

import type { SettingsTab } from '../useSettings';

export function useReaderUiState() {
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [imageLoadVersion, setImageLoadVersion] = useState(0);
  const [isScrollReady, setIsScrollReady] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loadedPageIds, setLoadedPageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('Reader');

  const resetReaderUi = useEffectEvent(() => {
    setActiveGroupIndex(0);
    setImageLoadVersion(0);
    setIsScrollReady(false);
    setIsSettingsOpen(false);
    setLoadedPageIds(new Set());
  });

  const handlePageLoad = useCallback((pageId: string) => {
    setLoadedPageIds((current) => {
      if (current.has(pageId)) {
        return current;
      }

      const next = new Set(current);
      next.add(pageId);
      return next;
    });
  }, []);

  return {
    activeGroupIndex,
    handlePageLoad,
    imageLoadVersion,
    isScrollReady,
    isSettingsOpen,
    loadedPageIds,
    resetReaderUi,
    setActiveGroupIndex,
    setImageLoadVersion,
    setIsScrollReady,
    setIsSettingsOpen,
    setSettingsTab,
    settingsTab,
  };
}
