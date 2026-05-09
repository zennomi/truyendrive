import type { CSSProperties } from 'react';
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import readerStyles from './assets/styles/reader.css?inline';
import { ChapterList } from './components/ChapterList';
import { ModePickerDialog } from './components/ModePickerDialog';
import { PageSelector } from './components/PageSelector';
import { ReaderArea } from './components/ReaderArea';
import { ReaderSidebar } from './components/ReaderSidebar';
import { ZoomControls } from './components/ZoomControls';
import { SettingsModal } from './SettingsModal';
import { useComicMode } from './hooks/useComicMode';
import { useReaderControls } from './hooks/useReaderControls';
import { useReaderHistory } from './hooks/useReaderHistory';
import { useReaderPreload } from './hooks/useReaderPreload';
import {
  buildPageGroups,
  findGroupIndexForPage,
  getChapterStartGroupIndex,
  getLogicalGroupIndex,
  getReaderTitle,
  getRootClasses,
} from './lib/readerUtils';
import {
  DIRECTION_OPTIONS,
  FIT_OPTIONS,
  PRELOAD_OPTIONS,
  SPREAD_OPTIONS,
  type SettingsTab,
  getThemeStyle,
  useSettings,
} from './useSettings';
import { AppErrorBoundary } from './components/AppErrorBoundary';

function AppContent() {
  const {
    settings,
    cycleSetting,
    resetCustomTheme,
    toggleSetting,
    updateSetting,
  } = useSettings();
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [imageLoadVersion, setImageLoadVersion] = useState(0);
  const [isScrollReady, setIsScrollReady] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loadedPageIds, setLoadedPageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('Reader');
  const [tooWideGroups, setTooWideGroups] = useState<Record<string, true>>({});
  const imageWrapRef = useRef<HTMLDivElement | null>(null);
  const groupRefs = useRef<Array<HTMLDivElement | null>>([]);
  const currentPageRef = useRef(-1);
  const historyDepthRef = useRef(0);
  const historyPageRef = useRef<number | null>(null);
  const isHandlingPopStateRef = useRef(false);
  const previousTitleRef = useRef<string | null>(null);
  const previousUrlRef = useRef<string | null>(null);
  const readerTitleRef = useRef(getReaderTitle());

  const beginReaderSession = useEffectEvent(() => {
    previousTitleRef.current = document.title;
    previousUrlRef.current = window.location.href;
    readerTitleRef.current = getReaderTitle();
    currentPageRef.current = -1;
    historyDepthRef.current = 0;
    historyPageRef.current = null;
    isHandlingPopStateRef.current = false;
  });

  const resetHistoryState = useEffectEvent((restoreHistoryUrl: boolean) => {
    currentPageRef.current = -1;
    historyDepthRef.current = 0;
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

  const resetReaderUi = useEffectEvent(() => {
    setActiveGroupIndex(0);
    setImageLoadVersion(0);
    setIsScrollReady(false);
    setIsSettingsOpen(false);
    setLoadedPageIds(new Set());
    setTooWideGroups({});
  });

  const {
    activeChapterIndex,
    chapters,
    closeComicMode,
    folderDetails,
    folderMode,
    goToAdjacentChapter,
    goToChapterAtIndex,
    imageIds,
    isModePickerOpen,
    isOpen,
    openChapter,
    openComicMode,
    parentChapters,
    resetReaderState,
    selectMode,
    statusMessage,
  } = useComicMode({
    beginReaderSession,
    historyDepthRef,
    onResetUi: resetReaderUi,
    resetHistoryState,
  });

  const displayGroups = useMemo(
    () =>
      buildPageGroups(imageIds, settings.lyt.spread, settings.lyt.direction),
    [imageIds, settings.lyt.direction, settings.lyt.spread],
  );
  const themeStyle = useMemo(() => getThemeStyle(settings.thm), [settings.thm]);
  const readerTitle = readerTitleRef.current;
  const activePage = displayGroups[activeGroupIndex]?.pages[0]?.index ?? 0;
  const activePageNumber = imageIds.length === 0 ? 0 : activePage + 1;
  const activeGroup = displayGroups[activeGroupIndex];
  const hasAdjacentChapters = parentChapters.length > 1;
  const isRtl = settings.lyt.direction === 'rtl';
  const isAtFirstGroup = activeGroupIndex === 0;
  const isAtLastGroup =
    displayGroups.length > 0 && activeGroupIndex === displayGroups.length - 1;
  const chapterStartGroupIndex = getChapterStartGroupIndex(
    displayGroups.length,
    settings.lyt.direction,
  );
  const logicalActiveGroupIndex = getLogicalGroupIndex(
    activeGroupIndex,
    displayGroups.length,
    settings.lyt.direction,
  );
  const supportsZoomOverlay =
    settings.lyt.fit === 'width' || settings.lyt.fit === 'width_limit';
  const isComicSurfaceOpen =
    isOpen || folderMode === 'chapters' || isModePickerOpen;

  const {
    goToAdjacentGroup,
    hoverEdge,
    isSelectorVisible,
    isZoomVisible,
    performVerticalPageTurn,
    performVerticalStep,
    scrollToGroup,
    setHoverEdge,
    showPageSelector,
    showZoomControls,
    syncActiveGroupFromScroll,
  } = useReaderControls({
    activeGroupIndex,
    displayGroups,
    groupRefs,
    imageWrapRef,
    isScrollReady,
    isOpen,
    setActiveGroupIndex,
    settings,
    supportsZoomOverlay,
  });

  const { handlePopState } = useReaderHistory({
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
  });

  const { isGroupPreloaded, preloadImageRefs } = useReaderPreload({
    activeGroupIndex,
    displayGroups,
    initialGroupIndex: chapterStartGroupIndex,
    isInitialScrollDone: isScrollReady,
    isOpen,
    preloadDistance: settings.bhv.preload,
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

  const isGroupLoaded = useCallback(
    (index: number) => {
      const group = displayGroups[index];
      return group
        ? group.pages.every((page) => loadedPageIds.has(page.id))
        : false;
    },
    [displayGroups, loadedPageIds],
  );

  const goToChapterAtIndexFromReader = useCallback(
    (index: number) => {
      currentPageRef.current = -1;
      goToChapterAtIndex(index);
    },
    [goToChapterAtIndex],
  );

  const goToAdjacentChapterFromReader = useCallback(
    (delta: -1 | 1) => {
      currentPageRef.current = -1;
      goToAdjacentChapter(delta);
    },
    [goToAdjacentChapter],
  );

  const handleSelectChapter = useCallback(
    (chapterId: string, index: number) => {
      currentPageRef.current = -1;
      openChapter(chapterId, chapters, index);
    },
    [chapters, openChapter],
  );

  const handleZoomChange = useCallback(
    (zoom: number) => {
      updateSetting('lyt', 'zoom', zoom);
    },
    [updateSetting],
  );

  const navigateGroupOrChapter = useCallback(
    (delta: -1 | 1) => {
      if (displayGroups.length === 0) {
        return;
      }

      if (delta === -1 && isAtFirstGroup && hasAdjacentChapters) {
        goToAdjacentChapterFromReader(isRtl ? 1 : -1);
        return;
      }

      if (delta === 1 && isAtLastGroup && hasAdjacentChapters) {
        goToAdjacentChapterFromReader(isRtl ? -1 : 1);
        return;
      }

      goToAdjacentGroup(delta);
    },
    [
      displayGroups.length,
      goToAdjacentChapterFromReader,
      goToAdjacentGroup,
      hasAdjacentChapters,
      isAtFirstGroup,
      isAtLastGroup,
      isRtl,
    ],
  );

  const performVerticalPageTurnOrChapter = useCallback(
    (direction: 1 | -1) => {
      const scroller = imageWrapRef.current;
      if (!scroller) {
        return;
      }

      const maxScrollTop = Math.max(
        scroller.scrollHeight - scroller.clientHeight,
        0,
      );
      const isAtTop = scroller.scrollTop <= 1;
      const isAtBottom = maxScrollTop - scroller.scrollTop <= 1;

      if (
        direction === -1 &&
        isAtTop &&
        isAtFirstGroup &&
        hasAdjacentChapters
      ) {
        goToAdjacentChapterFromReader(-1);
        return;
      }

      if (
        direction === 1 &&
        isAtBottom &&
        isAtLastGroup &&
        hasAdjacentChapters
      ) {
        goToAdjacentChapterFromReader(1);
        return;
      }

      performVerticalPageTurn(direction);
    },
    [
      goToAdjacentChapterFromReader,
      hasAdjacentChapters,
      isAtFirstGroup,
      isAtLastGroup,
      performVerticalPageTurn,
    ],
  );

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

  useEffect(() => {
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handlePopState]);

  useEffect(() => {
    if (!isComicSurfaceOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isComicSurfaceOpen]);

  useLayoutEffect(() => {
    if (!isOpen || imageIds.length === 0 || displayGroups.length === 0) {
      return;
    }

    const targetPage = currentPageRef.current;
    const matchingIndex =
      targetPage < 0 ? -1 : findGroupIndexForPage(displayGroups, targetPage);
    const nextIndex =
      matchingIndex === -1 ? chapterStartGroupIndex : matchingIndex;
    const targetGroup = groupRefs.current[nextIndex];

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
    displayGroups,
    isOpen,
    chapterStartGroupIndex,
    settings.bhv.resetScroll,
    settings.lyt.fit,
    settings.lyt.direction,
    settings.lyt.spread,
  ]);

  useEffect(() => {
    if (!isOpen || displayGroups.length === 0) {
      return;
    }

    currentPageRef.current = activePage;
  }, [activePage, displayGroups.length, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      syncWideGroupState();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [
    displayGroups,
    imageIds,
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

  return (
    <>
      <button
        className="truyendrive-launcher"
        onClick={openComicMode}
        type="button"
      >
        <span className="launcher-icon">📖</span>
        <span className="launcher-text">TruyenDrive</span>
      </button>

      {folderMode === 'chapters' && !isOpen && (
        <main id="rdr-main" style={themeStyle as CSSProperties} tabIndex={-1}>
          <ChapterList
            chapters={chapters}
            folderDetails={folderDetails}
            onClose={resetReaderState}
            onSelectChapter={handleSelectChapter}
            statusMessage={statusMessage}
            title={readerTitle}
          />
        </main>
      )}

      {isModePickerOpen && <ModePickerDialog onSelectMode={selectMode} />}

      {isOpen && (
        <>
          <style>{readerStyles}</style>

          <main
            className={getRootClasses(settings)}
            id="rdr-main"
            style={themeStyle as CSSProperties}
            tabIndex={-1}
          >
            <ReaderSidebar
              activeGroup={activeGroup}
              activeChapterIndex={activeChapterIndex}
              activeGroupIndex={activeGroupIndex}
              logicalActiveGroupIndex={logicalActiveGroupIndex}
              activePage={activePage}
              activePageNumber={activePageNumber}
              chapterStartGroupIndex={chapterStartGroupIndex}
              closeComicMode={closeComicMode}
              cycleSetting={cycleSetting}
              displayGroups={displayGroups}
              folderMode={folderMode}
              goToAdjacentChapter={goToAdjacentChapterFromReader}
              goToAdjacentGroup={goToAdjacentGroup}
              goToChapterAtIndex={goToChapterAtIndexFromReader}
              imageIds={imageIds}
              parentChapters={parentChapters}
              readerTitle={readerTitle}
              scrollToGroup={scrollToGroup}
              setIsSettingsOpen={setIsSettingsOpen}
              setSettingsTab={setSettingsTab}
              settings={settings}
              statusMessage={statusMessage}
              toggleSetting={toggleSetting}
            />

            <PageSelector
              activeGroupIndex={activeGroupIndex}
              activePageNumber={activePageNumber}
              displayGroups={displayGroups}
              imageIds={imageIds}
              isGroupLoaded={isGroupLoaded}
              isSelectorVisible={isSelectorVisible}
              direction={settings.lyt.direction}
              scrollToGroup={scrollToGroup}
            />

            <ReaderArea
              displayGroups={displayGroups}
              groupRefs={groupRefs}
              hoverEdge={hoverEdge}
              imageWrapRef={imageWrapRef}
              isGroupPreloaded={isGroupPreloaded}
              isScrollReady={isScrollReady}
              navigateGroupOrChapter={navigateGroupOrChapter}
              onPageLoad={handlePageLoad}
              performVerticalPageTurnOrChapter={
                performVerticalPageTurnOrChapter
              }
              preloadImageRefs={preloadImageRefs}
              setHoverEdge={setHoverEdge}
              setImageLoadVersion={setImageLoadVersion}
              settings={settings}
              showPageSelector={showPageSelector}
              showZoomControls={showZoomControls}
              syncActiveGroupFromScroll={syncActiveGroupFromScroll}
              tooWideGroups={tooWideGroups}
            />

            <ZoomControls
              isVisible={isZoomVisible}
              onZoomChange={handleZoomChange}
              showZoomControls={showZoomControls}
              zoom={settings.lyt.zoom}
            />

            <SettingsModal
              activeTab={settingsTab}
              onClose={() => setIsSettingsOpen(false)}
              onTabChange={setSettingsTab}
              open={isSettingsOpen}
              resetCustomTheme={resetCustomTheme}
              settings={settings}
              updateSetting={updateSetting}
            />
          </main>
        </>
      )}
    </>
  );
}

function App() {
  const [retryKey, setRetryKey] = useState(0);

  return (
    <AppErrorBoundary onReset={() => setRetryKey((current) => current + 1)}>
      <AppContent key={retryKey} />
    </AppErrorBoundary>
  );
}

export default App;
