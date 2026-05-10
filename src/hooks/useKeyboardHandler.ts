import {
  useEffect,
  useEffectEvent,
  type Dispatch,
  type SetStateAction,
} from 'react';

import {
  DIRECTION_OPTIONS,
  FIT_OPTIONS,
  PRELOAD_OPTIONS,
  SPREAD_OPTIONS,
  type ReaderSettings,
} from '../useSettings';

type CycleSettingFn = <
  TCategory extends keyof ReaderSettings,
  TKey extends keyof ReaderSettings[TCategory],
>(
  category: TCategory,
  key: TKey,
  options: readonly ReaderSettings[TCategory][TKey][],
) => void;

type ToggleSettingFn = <
  TCategory extends keyof ReaderSettings,
  TKey extends keyof ReaderSettings[TCategory],
>(
  category: TCategory,
  key: TKey,
) => void;

interface UseKeyboardHandlerParams {
  closeComicMode: () => void;
  cycleSetting: CycleSettingFn;
  isComicSurfaceOpen: boolean;
  isOpen: boolean;
  isSettingsOpen: boolean;
  navigateGroupOrChapter: (delta: -1 | 1) => void;
  performVerticalStep: (direction: 1 | -1) => void;
  setIsSettingsOpen: Dispatch<SetStateAction<boolean>>;
  settings: ReaderSettings;
  toggleSetting: ToggleSettingFn;
}

export function useKeyboardHandler({
  closeComicMode,
  cycleSetting,
  isComicSurfaceOpen,
  isOpen,
  isSettingsOpen,
  navigateGroupOrChapter,
  performVerticalStep,
  setIsSettingsOpen,
  settings,
  toggleSetting,
}: UseKeyboardHandlerParams) {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!isComicSurfaceOpen) {
      return;
    }

    if (event.key === 'Escape') {
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
      } else {
        closeComicMode();
      }
      return;
    }

    if (!isOpen) {
      return;
    }

    if (event.key === 'o' || event.key === 'O') {
      event.preventDefault();
      setIsSettingsOpen((current) => !current);
      return;
    }

    if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      cycleSetting('lyt', 'fit', FIT_OPTIONS);
      return;
    }

    if (event.key === 'd' || event.key === 'D') {
      event.preventDefault();
      cycleSetting('lyt', 'direction', DIRECTION_OPTIONS);
      return;
    }

    if (event.key === 'q' || event.key === 'Q') {
      event.preventDefault();
      cycleSetting('lyt', 'spread', SPREAD_OPTIONS);
      return;
    }

    if (event.key === 'l' || event.key === 'L') {
      event.preventDefault();
      cycleSetting('bhv', 'preload', PRELOAD_OPTIONS);
      return;
    }

    if (event.key === 'n' || event.key === 'N') {
      event.preventDefault();
      toggleSetting('apr', 'selPinned');
      return;
    }

    if (event.key === 's' || event.key === 'S') {
      event.preventDefault();
      toggleSetting('apr', 'sidebar');
      return;
    }

    if (settings.lyt.direction === 'ttb') {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        performVerticalStep(1);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        performVerticalStep(-1);
        return;
      }

      if (settings.bhv.arrowTurnPage && event.key === 'ArrowRight') {
        event.preventDefault();
        navigateGroupOrChapter(1);
        return;
      }

      if (settings.bhv.arrowTurnPage && event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateGroupOrChapter(-1);
      }

      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigateGroupOrChapter(1);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigateGroupOrChapter(-1);
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
