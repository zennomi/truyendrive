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

const FOLDER_ID_PATTERN = /\/folders\/([^/?#]+)/;

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

export function useComicMode({
  beginReaderSession,
  historyDepthRef,
  onResetUi,
  resetHistoryState,
}: UseComicModeParams) {
  const { accountData, error: authError, isLoading: isAuthLoading } = useAuth();
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeAuthUser, setActiveAuthUser] = useState<string | null>(null);
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const activeFetchIdRef = useRef(0);
  const imageIdsRef = useRef<string[]>([]);

  const cancelFetchLoop = useCallback(() => {
    activeFetchIdRef.current += 1;
  }, []);

  const replaceImageIds = useCallback((nextImageIds: string[]) => {
    imageIdsRef.current = nextImageIds;
    setImageIds(nextImageIds);
  }, []);

  const resetReaderState = useCallback(
    (restoreHistoryUrl: boolean) => {
      cancelFetchLoop();
      onResetUi();
      setActiveAuthUser(null);
      setActiveFolderId(null);
      replaceImageIds([]);
      setIsOpen(false);
      setStatusMessage('Reader closed');
      resetHistoryState(restoreHistoryUrl);
    },
    [cancelFetchLoop, onResetUi, replaceImageIds, resetHistoryState],
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
    setActiveAuthUser(getAuthUser());
    setActiveFolderId(folderId);
    replaceImageIds([]);
    setIsOpen(true);
    setStatusMessage(
      isAuthLoading || !accountData
        ? 'Loading account...'
        : 'Loading pages...',
    );
  }, [accountData, beginReaderSession, cancelFetchLoop, isAuthLoading, replaceImageIds]);

  useEffect(() => {
    if (!isOpen || !activeFolderId || !activeAuthUser) {
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

    setStatusMessage('Loading pages...');

    const loadItems = async () => {
      let cursor: string | undefined;

      try {
        while (!isCancelled && activeFetchIdRef.current === fetchId) {
          const [items, nextCursor] = await fetchFolderItems(
            activeFolderId,
            cursor,
            accountData,
            activeAuthUser,
          );

          if (isCancelled || activeFetchIdRef.current !== fetchId) {
            return;
          }

          const mergedIds = mergeImageIds(
            imageIdsRef.current,
            extractImageIds(items),
          );

          if (mergedIds !== imageIdsRef.current) {
            replaceImageIds(mergedIds);
          }

          const pageCount = mergedIds.length;
          if (!nextCursor) {
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
          cursor = nextCursor;
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
    isAuthLoading,
    isOpen,
    replaceImageIds,
  ]);

  useEffect(
    () => () => {
      cancelFetchLoop();
    },
    [cancelFetchLoop],
  );

  return {
    closeComicMode,
    imageIds,
    isOpen,
    openComicMode,
    resetReaderState,
    statusMessage,
  };
}
