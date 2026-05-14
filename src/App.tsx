import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useInitialScroll } from './hooks/useInitialScroll';
import { useImageDecryptor } from './hooks/useImageDecryptor';
import { useKeyboardHandler } from './hooks/useKeyboardHandler';
import { useReaderPreload } from './hooks/useReaderPreload';
import { useReaderSession } from './hooks/useReaderSession';
import { useReaderUiState } from './hooks/useReaderUiState';
import { useWideGroupTracker } from './hooks/useWideGroupTracker';
import {
  buildPageGroups,
  getChapterStartGroupIndex,
  getLogicalGroupIndex,
  getRootClasses,
  parseReaderStateFromUrl,
} from './lib/readerUtils';
import { getThemeStyle, useSettings } from './useSettings';
import { AppErrorBoundary } from './components/AppErrorBoundary';

function AppContent() {
  const [initialReaderState] = useState(() =>
    parseReaderStateFromUrl(window.location.href),
  );
  const [urlPassword] = useState(() =>
    new URL(window.location.href).searchParams.get('password'),
  );
  const [manualPassword, setManualPassword] = useState<string | null>(null);
  const {
    settings,
    cycleSetting,
    resetCustomTheme,
    toggleSetting,
    updateSetting,
  } = useSettings();
  const imageWrapRef = useRef<HTMLDivElement | null>(null);
  const groupRefs = useRef<Array<HTMLDivElement | null>>([]);
  const currentPageRef = useRef(-1);
  const historyPageRef = useRef<number | null>(null);
  const isHandlingPopStateRef = useRef(false);
  const {
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
  } = useReaderUiState();
  const { beginReaderSession, resetHistoryState } = useReaderSession({
    currentPageRef,
    historyPageRef,
    isHandlingPopStateRef,
  });
  const handleResetPassword = useCallback(() => {
    setManualPassword(null);
  }, []);

  const {
    activeFolderId,
    activeChapterIndex,
    chapters,
    closeComicMode,
    folderDetails,
    folderMode,
    folderPassword,
    goToAdjacentChapter,
    goToChapterAtIndex,
    images,
    isAutoOpening,
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
    initialChapterId: initialReaderState.chapterId,
    initialPage: initialReaderState.page,
    onResetPassword: handleResetPassword,
    onResetUi: resetReaderUi,
    resetHistoryState,
  });

  const displayGroups = useMemo(
    () => buildPageGroups(images, settings.lyt.spread, settings.lyt.direction),
    [images, settings.lyt.direction, settings.lyt.spread],
  );
  const imageIds = useMemo(() => images.map((image) => image.id), [images]);
  const themeStyle = useMemo(() => getThemeStyle(settings.thm), [settings.thm]);
  const activePage = displayGroups[activeGroupIndex]?.pages[0]?.index ?? 0;
  const activePageNumber = images.length === 0 ? 0 : activePage + 1;
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
  const readerTitle =
    folderDetails?.title ||
    parentChapters[activeChapterIndex]?.name ||
    'Google Drive Comic Reader';
  const activeChapterId =
    parentChapters[activeChapterIndex]?.id ?? activeFolderId;
  const password = manualPassword ?? folderPassword ?? urlPassword;
  const imagePassword = folderMode === 'images' ? password : null;
  const isPasswordMode = imagePassword !== null;
  const { decryptedSrcs } = useImageDecryptor(
    images,
    imagePassword,
    displayGroups,
    activeGroupIndex,
    chapterStartGroupIndex,
    isScrollReady,
    settings.bhv.preload,
  );

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
    activeChapterId,
    activePage,
    currentPageRef,
    displayGroups,
    historyPageRef,
    imageIds,
    isHandlingPopStateRef,
    isOpen,
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
    isPasswordMode,
    isOpen,
    preloadDistance: settings.bhv.preload,
  });
  const { tooWideGroups } = useWideGroupTracker({
    displayGroups,
    groupRefs,
    imageLoadVersion,
    isOpen,
    settings,
  });

  useInitialScroll({
    activeGroupIndex,
    chapterStartGroupIndex,
    currentPageRef,
    displayGroups,
    groupRefs,
    isOpen,
    setActiveGroupIndex,
    setIsScrollReady,
    settings,
  });
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

  const jumpToChapterStart = useCallback(() => {
    scrollToGroup(chapterStartGroupIndex);
  }, [chapterStartGroupIndex, scrollToGroup]);

  const copyShareUrl = useCallback(() => {
    const url = window.location.href.replace(/\/u\/\d+/, '');
    navigator.clipboard.writeText(url).catch((err) => {
      console.error('Failed to copy URL: ', err);
    });
  }, []);

  const requestPassword = useCallback(() => {
    const value = window.prompt('Enter decryption password:', password ?? '');
    setManualPassword(value && value.length > 0 ? value : null);
  }, [password]);

  useKeyboardHandler({
    closeComicMode,
    copyShareUrl,
    cycleSetting,
    goToAdjacentChapter: goToAdjacentChapterFromReader,
    isComicSurfaceOpen,
    isOpen,
    isSettingsOpen,
    jumpToChapterStart,
    navigateGroupOrChapter,
    performVerticalStep,
    requestPassword,
    setIsSettingsOpen,
    settings,
    toggleSetting,
  });

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

  useEffect(() => {
    if (!isOpen || displayGroups.length === 0) {
      return;
    }

    currentPageRef.current = activePage;
  }, [activePage, displayGroups.length, isOpen]);

  return (
    <>
      <button
        className="truyendrive-launcher"
        onClick={() => openComicMode()}
        type="button"
      >
        <span className="launcher-icon">📖</span>
        <span className="launcher-text">TruyenDrive</span>
      </button>

      {folderMode === 'chapters' && !isOpen && !isAutoOpening && (
        <main id="rdr-main" style={themeStyle as CSSProperties} tabIndex={-1}>
          <ChapterList
            chapters={chapters}
            folderDetails={folderDetails}
            onClose={() => resetReaderState(true)}
            onSelectChapter={handleSelectChapter}
            statusMessage={statusMessage}
            title={readerTitle}
          />
        </main>
      )}

      {isModePickerOpen && !isAutoOpening && (
        <ModePickerDialog onSelectMode={selectMode} />
      )}

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
              closeComicMode={closeComicMode}
              copyShareUrl={copyShareUrl}
              cycleSetting={cycleSetting}
              displayGroups={displayGroups}
              folderMode={folderMode}
              goToAdjacentChapter={goToAdjacentChapterFromReader}
              goToAdjacentGroup={goToAdjacentGroup}
              goToChapterAtIndex={goToChapterAtIndexFromReader}
              images={images}
              isPasswordMode={isPasswordMode}
              jumpToChapterStart={jumpToChapterStart}
              parentChapters={parentChapters}
              password={password}
              readerTitle={readerTitle}
              requestPassword={requestPassword}
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
              direction={settings.lyt.direction}
              isGroupLoaded={isGroupLoaded}
              isSelectorVisible={isSelectorVisible}
              pageCount={images.length}
              scrollToGroup={scrollToGroup}
            />

            <ReaderArea
              displayGroups={displayGroups}
              groupRefs={groupRefs}
              hoverEdge={hoverEdge}
              imageWrapRef={imageWrapRef}
              isGroupPreloaded={isGroupPreloaded}
              isPasswordMode={isPasswordMode}
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
              decryptedSrcs={decryptedSrcs}
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
