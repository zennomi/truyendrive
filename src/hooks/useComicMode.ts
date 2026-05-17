import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';

import { useProvider, useProviderStatus } from '../contexts/ProviderContext';
import type {
  Chapter,
  FolderDetails,
  FolderMode,
  FolderPageResult,
  ReaderImage,
} from '../providers/types';

export type { Chapter, FolderMode } from '../providers/types';

interface UseComicModeParams {
  beginReaderSession: (initialPage?: number) => void;
  initialChapterId?: string | null;
  initialPage?: number;
  onResetPassword: () => void;
  onResetUi: () => void;
  resetHistoryState: (restoreHistoryUrl: boolean) => void;
}

type FirstPageCache = {
  folderId: string;
  page: FolderPageResult;
  nextCursor?: string;
};

function logOpenError(message: string, details: Record<string, unknown>) {
  console.error(`[TruyenDrive] ${message}`, {
    href: window.location.href,
    host: window.location.hostname,
    ...details,
  });
}

function mergeImages(currentImages: ReaderImage[], nextImages: ReaderImage[]) {
  if (nextImages.length === 0) {
    return currentImages;
  }

  const knownIds = new Set(currentImages.map((image) => image.id));
  const mergedImages = [...currentImages];

  nextImages.forEach((image) => {
    if (!knownIds.has(image.id)) {
      knownIds.add(image.id);
      mergedImages.push(image);
    }
  });

  return mergedImages.length === currentImages.length
    ? currentImages
    : mergedImages;
}

function mergeChapters(currentChapters: Chapter[], nextChapters: Chapter[]) {
  if (nextChapters.length === 0) {
    return currentChapters;
  }

  const knownIds = new Set(currentChapters.map((chapter) => chapter.id));
  const mergedChapters = [...currentChapters];

  nextChapters.forEach((chapter) => {
    if (!knownIds.has(chapter.id)) {
      knownIds.add(chapter.id);
      mergedChapters.push(chapter);
    }
  });

  return mergedChapters.length === currentChapters.length
    ? currentChapters
    : mergedChapters;
}

export function useComicMode({
  beginReaderSession,
  initialChapterId = null,
  initialPage = -1,
  onResetPassword,
  onResetUi,
  resetHistoryState,
}: UseComicModeParams) {
  const provider = useProvider();
  const {
    error: providerError,
    isLoading: isProviderLoading,
    isReady: isProviderReady,
  } = useProviderStatus();
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [folderDetails, setFolderDetails] = useState<FolderDetails | null>(
    null,
  );
  const [folderMode, setFolderMode] = useState<FolderMode>(null);
  const [folderPassword, setFolderPassword] = useState<string | null>(null);
  const [images, setImages] = useState<ReaderImage[]>([]);
  const [isAutoOpening, setIsAutoOpening] = useState(
    initialChapterId !== null || initialPage >= 0,
  );
  const [isFolderScanComplete, setIsFolderScanComplete] = useState(false);
  const [isModePickerOpen, setIsModePickerOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [parentChapters, setParentChapters] = useState<Chapter[]>([]);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const activeFetchIdRef = useRef(0);
  const chaptersRef = useRef<Chapter[]>([]);
  const firstPageCacheRef = useRef<FirstPageCache | null>(null);
  const imagesRef = useRef<ReaderImage[]>([]);
  const initialChapterIdRef = useRef(initialChapterId);
  const initialPageRef = useRef(initialPage);
  const initialReaderOpenAttemptedRef = useRef(false);
  const initialChapterOpenAttemptedRef = useRef(false);

  const cancelFetchLoop = useCallback(() => {
    activeFetchIdRef.current += 1;
  }, []);

  const replaceImages = useCallback((nextImages: ReaderImage[]) => {
    imagesRef.current = nextImages;
    setImages(nextImages);
  }, []);

  const replaceChapters = useCallback((nextChapters: Chapter[]) => {
    chaptersRef.current = nextChapters;
    setChapters(nextChapters);
  }, []);

  const resetParentChapterState = useCallback(() => {
    setActiveChapterIndex(0);
    setParentChapters([]);
  }, []);

  const resetReaderState = useCallback(
    (restoreHistoryUrl = false) => {
      cancelFetchLoop();
      firstPageCacheRef.current = null;
      onResetPassword();
      onResetUi();
      setActiveFolderId(null);
      resetParentChapterState();
      replaceChapters([]);
      setFolderDetails(null);
      setFolderMode(null);
      setFolderPassword(null);
      setIsAutoOpening(false);
      setIsFolderScanComplete(false);
      setIsModePickerOpen(false);
      replaceImages([]);
      setIsOpen(false);
      setStatusMessage('Reader closed');
      resetHistoryState(restoreHistoryUrl);
    },
    [
      cancelFetchLoop,
      onResetPassword,
      onResetUi,
      replaceChapters,
      replaceImages,
      resetHistoryState,
      resetParentChapterState,
    ],
  );

  const closeComicMode = useCallback(() => {
    resetReaderState(true);
  }, [resetReaderState]);

  const getOpenStatusMessage = useEffectEvent(() => {
    if (isProviderLoading) {
      return 'Loading account...';
    }

    if (isProviderReady) {
      return 'Detecting folder contents...';
    }

    return providerError?.message ?? 'Loading account...';
  });

  const openComicMode = useCallback(
    (restorePage = -1) => {
      const folderId = provider.getFolderIdFromUrl();
      if (!folderId) {
        logOpenError('Failed to open reader: no folder ID found', {});
        window.alert('Please open a folder first.');
        return;
      }

      beginReaderSession(restorePage);
      cancelFetchLoop();
      firstPageCacheRef.current = null;
      onResetPassword();
      setActiveFolderId(folderId);
      resetParentChapterState();
      replaceChapters([]);
      setFolderDetails(null);
      setFolderMode(null);
      setFolderPassword(null);
      setIsFolderScanComplete(false);
      setIsModePickerOpen(false);
      replaceImages([]);
      setIsOpen(false);
      setStatusMessage(getOpenStatusMessage());
    },
    [
      beginReaderSession,
      cancelFetchLoop,
      getOpenStatusMessage,
      onResetPassword,
      provider,
      replaceChapters,
      replaceImages,
      resetParentChapterState,
    ],
  );

  useEffect(() => {
    if (initialReaderOpenAttemptedRef.current) {
      return;
    }

    if (!initialChapterIdRef.current && initialPageRef.current < 0) {
      setIsAutoOpening(false);
      return;
    }

    if (!provider.getFolderIdFromUrl()) {
      setIsAutoOpening(false);
      return;
    }

    initialReaderOpenAttemptedRef.current = true;
    openComicMode(initialPageRef.current);
  }, [openComicMode, provider]);

  const openChapter = useCallback(
    (
      chapterId: string,
      nextParentChapters: Chapter[] = [],
      nextActiveChapterIndex = 0,
    ) => {
      cancelFetchLoop();
      firstPageCacheRef.current = null;
      setActiveFolderId(chapterId);
      setActiveChapterIndex(nextActiveChapterIndex);
      setParentChapters(nextParentChapters);
      replaceChapters([]);
      setFolderMode('images');
      setIsFolderScanComplete(false);
      setIsModePickerOpen(false);
      replaceImages([]);
      setIsOpen(true);
      setStatusMessage('Loading pages...');
    },
    [cancelFetchLoop, replaceChapters, replaceImages],
  );

  const goToChapterAtIndex = useCallback(
    (index: number) => {
      if (parentChapters.length === 0) {
        return;
      }

      const nextIndex = Math.min(Math.max(index, 0), parentChapters.length - 1);
      const targetChapter = parentChapters[nextIndex];
      if (!targetChapter) {
        return;
      }

      if (
        targetChapter.id === activeFolderId &&
        nextIndex === activeChapterIndex
      ) {
        return;
      }

      openChapter(targetChapter.id, parentChapters, nextIndex);
    },
    [activeChapterIndex, activeFolderId, openChapter, parentChapters],
  );

  const goToAdjacentChapter = useCallback(
    (delta: -1 | 1) => {
      if (parentChapters.length <= 1) {
        return;
      }

      goToChapterAtIndex(activeChapterIndex + delta);
    },
    [activeChapterIndex, goToChapterAtIndex, parentChapters.length],
  );

  const selectMode = useCallback(
    (mode: 'chapters' | 'images') => {
      const cachedPage = firstPageCacheRef.current;
      if (!cachedPage || cachedPage.folderId !== activeFolderId) {
        return;
      }

      resetParentChapterState();
      replaceChapters([]);
      replaceImages([]);
      setFolderMode(mode);
      setIsFolderScanComplete(false);
      setIsModePickerOpen(false);
      setIsOpen(false);
      setStatusMessage(
        mode === 'chapters' ? 'Loading chapters...' : 'Loading pages...',
      );
    },
    [activeFolderId, replaceChapters, replaceImages, resetParentChapterState],
  );

  useEffect(() => {
    if (!activeFolderId) {
      return;
    }

    if (isProviderLoading) {
      setStatusMessage('Loading account...');
      return;
    }

    if (!isProviderReady) {
      logOpenError('Failed to open reader: provider is not ready', {
        activeFolderId,
        error: providerError,
      });
      setIsAutoOpening(false);
      setStatusMessage(providerError?.message ?? 'Failed to load account');
      return;
    }

    const fetchId = activeFetchIdRef.current + 1;
    activeFetchIdRef.current = fetchId;
    let isCancelled = false;

    const processImages = async (
      initialPage: FolderPageResult,
      initialCursor?: string,
    ) => {
      let page = initialPage;
      let cursor = initialCursor;

      setIsOpen(true);
      setIsAutoOpening(false);
      setFolderDetails(null);

      void provider
        .fetchFolderDetails(activeFolderId)
        .then((details) => {
          if (isCancelled || activeFetchIdRef.current !== fetchId) {
            return;
          }

          setFolderDetails(details);
        })
        .catch(() => {
          if (isCancelled || activeFetchIdRef.current !== fetchId) {
            return;
          }

          setFolderDetails(null);
        });

      while (!isCancelled && activeFetchIdRef.current === fetchId) {
        if (page.password !== null) {
          setFolderPassword((current) => current ?? page.password);
        }

        const mergedImages = mergeImages(imagesRef.current, page.images);

        if (mergedImages !== imagesRef.current) {
          replaceImages(mergedImages);
        }

        const pageCount = mergedImages.length;
        if (!cursor) {
          setIsFolderScanComplete(true);
          setStatusMessage(
            pageCount === 0
              ? 'No image files found in this folder'
              : `Loaded ${pageCount} page${pageCount === 1 ? '' : 's'}`,
          );
          return;
        }

        setStatusMessage(
          pageCount === 0
            ? 'Loading pages...'
            : `Loaded ${pageCount} page${pageCount === 1 ? '' : 's'}...`,
        );

        const [nextPage, nextCursor] = await provider.fetchFolderPage(
          activeFolderId,
          cursor,
        );

        if (isCancelled || activeFetchIdRef.current !== fetchId) {
          return;
        }

        page = nextPage;
        cursor = nextCursor ?? undefined;
      }
    };

    const processChapters = async (
      initialPage: FolderPageResult,
      initialCursor?: string,
    ) => {
      let page = initialPage;
      let cursor = initialCursor;

      setIsOpen(false);
      setIsFolderScanComplete(false);
      setFolderDetails(null);

      void provider
        .fetchFolderDetails(activeFolderId)
        .then((details) => {
          if (isCancelled || activeFetchIdRef.current !== fetchId) {
            return;
          }

          setFolderDetails(details);
        })
        .catch(() => {
          if (isCancelled || activeFetchIdRef.current !== fetchId) {
            return;
          }

          setFolderDetails(null);
        });

      while (!isCancelled && activeFetchIdRef.current === fetchId) {
        if (page.password !== null) {
          setFolderPassword((current) => current ?? page.password);
        }

        const mergedChapters = mergeChapters(
          chaptersRef.current,
          page.chapters,
        );

        if (mergedChapters !== chaptersRef.current) {
          replaceChapters(mergedChapters);
        }

        const chapterCount = mergedChapters.length;
        if (!cursor) {
          setIsFolderScanComplete(true);
          setStatusMessage(
            chapterCount === 0
              ? 'No chapter folders found in this folder'
              : `Loaded ${chapterCount} chapter${chapterCount === 1 ? '' : 's'}`,
          );
          return;
        }

        setStatusMessage(
          chapterCount === 0
            ? 'Loading chapters...'
            : `Loaded ${chapterCount} chapter${chapterCount === 1 ? '' : 's'}...`,
        );

        const [nextPage, nextCursor] = await provider.fetchFolderPage(
          activeFolderId,
          cursor,
        );

        if (isCancelled || activeFetchIdRef.current !== fetchId) {
          return;
        }

        page = nextPage;
        cursor = nextCursor ?? undefined;
      }
    };

    const loadItems = async () => {
      try {
        const cachedFirstPage = firstPageCacheRef.current;

        if (folderMode && cachedFirstPage?.folderId === activeFolderId) {
          firstPageCacheRef.current = null;

          if (folderMode === 'chapters') {
            await processChapters(
              cachedFirstPage.page,
              cachedFirstPage.nextCursor,
            );
          } else {
            await processImages(
              cachedFirstPage.page,
              cachedFirstPage.nextCursor,
            );
          }

          return;
        }

        const [page, nextCursor] = await provider.fetchFolderPage(
          activeFolderId,
          undefined,
        );

        if (isCancelled || activeFetchIdRef.current !== fetchId) {
          return;
        }

        if (page.password !== null) {
          setFolderPassword((current) => current ?? page.password);
        }

        if (folderMode === null) {
          if (page.isEmpty) {
            firstPageCacheRef.current = null;
            setIsAutoOpening(false);
            setIsFolderScanComplete(true);
            setStatusMessage('No files found in this folder');
            return;
          }

          firstPageCacheRef.current = {
            folderId: activeFolderId,
            page,
            nextCursor: nextCursor ?? undefined,
          };

          if (page.isMixed) {
            if (initialChapterIdRef.current || initialPageRef.current >= 0) {
              const initialMode =
                initialChapterIdRef.current &&
                initialChapterIdRef.current !== activeFolderId
                  ? 'chapters'
                  : 'images';

              setIsModePickerOpen(false);
              setFolderMode(initialMode);
              setStatusMessage(
                initialMode === 'chapters'
                  ? 'Loading chapters...'
                  : 'Loading pages...',
              );
              return;
            }

            setIsAutoOpening(false);
            setIsFolderScanComplete(true);
            setIsModePickerOpen(true);
            setStatusMessage('Choose how to open this folder');
            return;
          }

          const classification =
            page.chapters.length > 0 ? 'chapters' : 'images';
          setIsModePickerOpen(false);
          setFolderMode(classification);
          setIsFolderScanComplete(false);
          setStatusMessage(
            classification === 'chapters'
              ? 'Loading chapters...'
              : 'Loading pages...',
          );
          return;
        }

        if (folderMode === 'chapters') {
          await processChapters(page, nextCursor ?? undefined);
        } else {
          await processImages(page, nextCursor ?? undefined);
        }
      } catch (error) {
        if (isCancelled || activeFetchIdRef.current !== fetchId) {
          return;
        }

        logOpenError('Failed to load folder items', {
          activeFolderId,
          error,
          folderMode,
        });
        setIsAutoOpening(false);
        setStatusMessage(
          error instanceof Error
            ? error.message
            : 'Failed to load folder items',
        );
      }
    };

    void loadItems();

    return () => {
      isCancelled = true;
      if (activeFetchIdRef.current === fetchId) {
        activeFetchIdRef.current += 1;
      }
    };
  }, [
    activeFolderId,
    folderMode,
    isProviderLoading,
    isProviderReady,
    provider,
    providerError,
    replaceChapters,
    replaceImages,
  ]);

  useEffect(() => {
    const targetChapterId = initialChapterIdRef.current;
    if (
      !targetChapterId ||
      initialChapterOpenAttemptedRef.current ||
      folderMode !== 'chapters' ||
      !isFolderScanComplete ||
      isOpen
    ) {
      return;
    }

    const chapterIndex = chapters.findIndex(
      (chapter) => chapter.id === targetChapterId,
    );

    if (chapterIndex === -1) {
      setIsAutoOpening(false);
      return;
    }

    initialChapterOpenAttemptedRef.current = true;
    setIsAutoOpening(false);
    openChapter(targetChapterId, chapters, chapterIndex);
  }, [chapters, folderMode, isFolderScanComplete, isOpen, openChapter]);

  useEffect(() => {
    if (!isAutoOpening || !isFolderScanComplete || isOpen) {
      return;
    }

    if (!initialChapterIdRef.current || folderMode !== 'chapters') {
      setIsAutoOpening(false);
    }
  }, [folderMode, isAutoOpening, isFolderScanComplete, isOpen]);

  useEffect(
    () => () => {
      cancelFetchLoop();
    },
    [cancelFetchLoop],
  );

  return {
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
  };
}
