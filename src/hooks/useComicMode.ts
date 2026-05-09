import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';

import { useAuth } from '../contexts/AuthContext';
import { fetchFolderItems, getAuthUser } from '../lib/driveApi';

interface UseComicModeParams {
  beginReaderSession: () => void;
  historyDepthRef: MutableRefObject<number>;
  onResetUi: () => void;
  resetHistoryState: (restoreHistoryUrl: boolean) => void;
}

type DriveFolderItem = any[];
type FolderDetectionResult = 'chapters' | 'images' | 'mixed' | 'empty';
type FirstPageCache = {
  folderId: string;
  items: DriveFolderItem[];
  nextCursor?: string;
};

export type FolderMode = 'chapters' | 'images' | null;
export type Chapter = {
  id: string;
  name: string;
  creator: string;
  updatedAt: number;
};

const FOLDER_ID_PATTERN = /\/folders\/([^/?#]+)/;
const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';

function getFolderIdFromUrl() {
  return window.location.href.match(FOLDER_ID_PATTERN)?.[1] ?? null;
}

function extractImageIds(items: DriveFolderItem[]) {
  const ids: string[] = [];

  items.forEach((item) => {
    const id = typeof item[0] === 'string' ? item[0] : '';
    const mimeType = typeof item[3] === 'string' ? item[3] : '';

    if (id && mimeType.startsWith('image/')) {
      ids.push(id);
    }
  });

  return ids;
}

function classifyItems(items: DriveFolderItem[]): FolderDetectionResult {
  if (items.length === 0) {
    return 'empty';
  }

  let allFolders = true;
  let allImages = true;

  items.forEach((item) => {
    const mimeType = typeof item[3] === 'string' ? item[3] : '';

    if (mimeType !== DRIVE_FOLDER_MIME) {
      allFolders = false;
    }

    if (!mimeType.startsWith('image/')) {
      allImages = false;
    }
  });

  if (allFolders) {
    return 'chapters';
  }

  if (allImages) {
    return 'images';
  }

  return 'mixed';
}

function extractChapters(items: DriveFolderItem[]): Chapter[] {
  const chapters: Chapter[] = [];

  items.forEach((item) => {
    const id = typeof item[0] === 'string' ? item[0] : '';
    const mimeType = typeof item[3] === 'string' ? item[3] : '';

    if (!id || mimeType !== DRIVE_FOLDER_MIME) {
      return;
    }

    chapters.push({
      creator:
        typeof item[16]?.[7] === 'string' && item[16][7].length > 0
          ? item[16][7]
          : 'Unknown',
      id,
      name: typeof item[2] === 'string' && item[2].length > 0 ? item[2] : 'Untitled',
      updatedAt: typeof item[9] === 'number' ? item[9] : 0,
    });
  });

  return chapters;
}

function mergeImageIds(currentIds: string[], nextIds: string[]) {
  if (nextIds.length === 0) {
    return currentIds;
  }

  const knownIds = new Set(currentIds);
  const mergedIds = [...currentIds];

  nextIds.forEach((id) => {
    if (!knownIds.has(id)) {
      knownIds.add(id);
      mergedIds.push(id);
    }
  });

  return mergedIds.length === currentIds.length ? currentIds : mergedIds;
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
  historyDepthRef,
  onResetUi,
  resetHistoryState,
}: UseComicModeParams) {
  const { accountData, error: authError, isLoading: isAuthLoading } = useAuth();
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeAuthUser, setActiveAuthUser] = useState<string | null>(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [folderMode, setFolderMode] = useState<FolderMode>(null);
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [isModePickerOpen, setIsModePickerOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [parentChapters, setParentChapters] = useState<Chapter[]>([]);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const activeFetchIdRef = useRef(0);
  const chaptersRef = useRef<Chapter[]>([]);
  const firstPageCacheRef = useRef<FirstPageCache | null>(null);
  const imageIdsRef = useRef<string[]>([]);

  const cancelFetchLoop = useCallback(() => {
    activeFetchIdRef.current += 1;
  }, []);

  const replaceImageIds = useCallback((nextImageIds: string[]) => {
    imageIdsRef.current = nextImageIds;
    setImageIds(nextImageIds);
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
      onResetUi();
      setActiveAuthUser(null);
      setActiveFolderId(null);
      resetParentChapterState();
      replaceChapters([]);
      setFolderMode(null);
      setIsModePickerOpen(false);
      replaceImageIds([]);
      setIsOpen(false);
      setStatusMessage('Reader closed');
      resetHistoryState(restoreHistoryUrl);
    },
    [
      cancelFetchLoop,
      onResetUi,
      replaceChapters,
      replaceImageIds,
      resetHistoryState,
      resetParentChapterState,
    ],
  );

  const closeComicMode = useCallback(() => {
    if (historyDepthRef.current > 0) {
      window.history.go(-historyDepthRef.current);
      return;
    }

    resetReaderState(false);
  }, [historyDepthRef, resetReaderState]);

  const openComicMode = useCallback(() => {
    const folderId = getFolderIdFromUrl();
    if (!folderId) {
      window.alert('No Google Drive folder ID found in the current URL.');
      return;
    }

    beginReaderSession();
    cancelFetchLoop();
    firstPageCacheRef.current = null;
    setActiveAuthUser(getAuthUser());
    setActiveFolderId(folderId);
    resetParentChapterState();
    replaceChapters([]);
    setFolderMode(null);
    setIsModePickerOpen(false);
    replaceImageIds([]);
    setIsOpen(false);
    setStatusMessage(
      isAuthLoading
        ? 'Loading account...'
        : accountData
          ? 'Detecting folder contents...'
          : authError?.message ?? 'Loading account...',
    );
  }, [
    accountData,
    authError,
    beginReaderSession,
    cancelFetchLoop,
    isAuthLoading,
    replaceChapters,
    replaceImageIds,
    resetParentChapterState,
  ]);

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
      setIsModePickerOpen(false);
      replaceImageIds([]);
      setIsOpen(true);
      setStatusMessage('Loading pages...');
    },
    [cancelFetchLoop, replaceChapters, replaceImageIds],
  );

  const goToChapterAtIndex = useCallback(
    (index: number) => {
      if (parentChapters.length === 0) {
        return;
      }

      const nextIndex = Math.min(
        Math.max(index, 0),
        parentChapters.length - 1,
      );
      const targetChapter = parentChapters[nextIndex];
      if (!targetChapter) {
        return;
      }

      if (targetChapter.id === activeFolderId && nextIndex === activeChapterIndex) {
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
      replaceImageIds([]);
      setFolderMode(mode);
      setIsModePickerOpen(false);
      setIsOpen(false);
      setStatusMessage(
        mode === 'chapters' ? 'Loading chapters...' : 'Loading pages...',
      );
    },
    [activeFolderId, replaceChapters, replaceImageIds, resetParentChapterState],
  );

  useEffect(() => {
    if (!activeFolderId || !activeAuthUser) {
      return;
    }

    if (isAuthLoading) {
      setStatusMessage('Loading account...');
      return;
    }

    if (!accountData) {
      setStatusMessage(authError?.message ?? 'Failed to load account');
      return;
    }

    const fetchId = activeFetchIdRef.current + 1;
    activeFetchIdRef.current = fetchId;
    let isCancelled = false;

    const processImages = async (
      initialItems: DriveFolderItem[],
      initialCursor?: string,
    ) => {
      let items = initialItems;
      let cursor = initialCursor;

      setIsOpen(true);

      while (!isCancelled && activeFetchIdRef.current === fetchId) {
        const mergedIds = mergeImageIds(
          imageIdsRef.current,
          extractImageIds(items),
        );

        if (mergedIds !== imageIdsRef.current) {
          replaceImageIds(mergedIds);
        }

        const pageCount = mergedIds.length;
        if (!cursor) {
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

        const [nextItems, nextCursor] = await fetchFolderItems(
          activeFolderId,
          cursor,
          accountData,
          activeAuthUser,
        );

        if (isCancelled || activeFetchIdRef.current !== fetchId) {
          return;
        }

        items = nextItems;
        cursor = nextCursor ?? undefined;
      }
    };

    const processChapters = async (
      initialItems: DriveFolderItem[],
      initialCursor?: string,
    ) => {
      let items = initialItems;
      let cursor = initialCursor;

      setIsOpen(false);

      while (!isCancelled && activeFetchIdRef.current === fetchId) {
        const mergedChapters = mergeChapters(
          chaptersRef.current,
          extractChapters(items),
        );

        if (mergedChapters !== chaptersRef.current) {
          replaceChapters(mergedChapters);
        }

        const chapterCount = mergedChapters.length;
        if (!cursor) {
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

        const [nextItems, nextCursor] = await fetchFolderItems(
          activeFolderId,
          cursor,
          accountData,
          activeAuthUser,
        );

        if (isCancelled || activeFetchIdRef.current !== fetchId) {
          return;
        }

        items = nextItems;
        cursor = nextCursor ?? undefined;
      }
    };

    const loadItems = async () => {
      try {
        const cachedFirstPage = firstPageCacheRef.current;

        if (folderMode && cachedFirstPage?.folderId === activeFolderId) {
          firstPageCacheRef.current = null;

          if (folderMode === 'chapters') {
            await processChapters(cachedFirstPage.items, cachedFirstPage.nextCursor);
          } else {
            await processImages(cachedFirstPage.items, cachedFirstPage.nextCursor);
          }

          return;
        }

        const [items, nextCursor] = await fetchFolderItems(
          activeFolderId,
          undefined,
          accountData,
          activeAuthUser,
        );

        if (isCancelled || activeFetchIdRef.current !== fetchId) {
          return;
        }

        if (folderMode === null) {
          const classification = classifyItems(items);

          if (classification === 'empty') {
            firstPageCacheRef.current = null;
            setStatusMessage('No files found in this folder');
            return;
          }

          firstPageCacheRef.current = {
            folderId: activeFolderId,
            items,
            nextCursor: nextCursor ?? undefined,
          };

          if (classification === 'mixed') {
            setIsModePickerOpen(true);
            setStatusMessage('Choose how to open this folder');
            return;
          }

          setIsModePickerOpen(false);
          setFolderMode(classification);
          setStatusMessage(
            classification === 'chapters'
              ? 'Loading chapters...'
              : 'Loading pages...',
          );
          return;
        }

        if (folderMode === 'chapters') {
          await processChapters(items, nextCursor ?? undefined);
        } else {
          await processImages(items, nextCursor ?? undefined);
        }
      } catch (error) {
        if (isCancelled || activeFetchIdRef.current !== fetchId) {
          return;
        }

        setStatusMessage(
          error instanceof Error ? error.message : 'Failed to load folder items',
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
    accountData,
    activeAuthUser,
    activeFolderId,
    authError,
    folderMode,
    isAuthLoading,
    replaceChapters,
    replaceImageIds,
  ]);

  useEffect(
    () => () => {
      cancelFetchLoop();
    },
    [cancelFetchLoop],
  );

  return {
    activeChapterIndex,
    chapters,
    closeComicMode,
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
  };
}
