import { useEffect, useMemo, useRef, useState } from 'react';

import { decryptImageBuffer } from '../lib/imageCrypto';
import {
  getDriveUserContentUrl,
  getGroupsInRange,
  getMaxGroupDistance,
  type DriveImage,
  type ReaderGroup,
} from '../lib/readerUtils';

function buildFetchUrl(image: DriveImage): string {
  const base = getDriveUserContentUrl(image.id);
  const width = image.width ?? 0;
  const height = image.height ?? 0;

  if (!width && !height) {
    return `${base}=w10000`;
  }

  if (width > 1600 || height > 1600) {
    return `${base}=w${width}-h${height}`;
  }

  return base;
}

function revokeBlobUrls(blobUrls: Map<string, string>) {
  blobUrls.forEach((url) => URL.revokeObjectURL(url));
  blobUrls.clear();
}

export function useImageDecryptor(
  images: DriveImage[],
  password: string | null,
  displayGroups: ReaderGroup[],
  activeGroupIndex: number,
  initialGroupIndex: number,
  isInitialScrollDone: boolean,
  preloadDistance: number,
) {
  const imageIds = useMemo(() => images.map((image) => image.id), [images]);
  const imageIdKey = useMemo(() => imageIds.join('\n'), [imageIds]);
  const imageById = useMemo(
    () => new Map(images.map((image) => [image.id, image])),
    [images],
  );
  const [decryptedSrcs, setDecryptedSrcs] = useState<Map<string, string>>(
    () => new Map(),
  );
  const blobUrlsRef = useRef<Map<string, string>>(new Map());
  const decryptGenerationRef = useRef(0);
  const decryptRequestRef = useRef(0);
  const pendingIdsRef = useRef(new Set<string>());

  useEffect(() => {
    decryptGenerationRef.current += 1;
    setDecryptedSrcs(new Map());

    return () => {
      decryptGenerationRef.current += 1;
      pendingIdsRef.current.clear();
      revokeBlobUrls(blobUrlsRef.current);
    };
  }, [imageIdKey, password]);

  useEffect(() => {
    const decryptRequest = (decryptRequestRef.current += 1);
    const abortController = new AbortController();

    if (password === null || displayGroups.length === 0) {
      return () => {
        abortController.abort();
      };
    }

    const decryptGeneration = decryptGenerationRef.current;
    const maxDistance = getMaxGroupDistance(
      preloadDistance,
      displayGroups.length,
    );
    const anchorGroupIndex = isInitialScrollDone
      ? activeGroupIndex
      : initialGroupIndex;
    const windowedImageIds = new Set(
      getGroupsInRange(displayGroups, anchorGroupIndex, maxDistance, true).flatMap(
        (group) => group.pages.map((page) => page.id),
      ),
    );

    const decryptImages = async () => {
      for (const id of windowedImageIds) {
        if (
          decryptGenerationRef.current !== decryptGeneration ||
          decryptRequestRef.current !== decryptRequest
        ) {
          return;
        }

        if (blobUrlsRef.current.has(id) || pendingIdsRef.current.has(id)) {
          continue;
        }

        pendingIdsRef.current.add(id);

        try {
          const image = imageById.get(id);
          if (!image) {
            continue;
          }

          const blob = await decryptImageBuffer(
            buildFetchUrl(image),
            password,
            abortController.signal,
          );

          if (decryptGenerationRef.current !== decryptGeneration) {
            return;
          }

          const blobUrl = URL.createObjectURL(blob);
          blobUrlsRef.current.set(id, blobUrl);
          setDecryptedSrcs((previous) => new Map(previous).set(id, blobUrl));

          if (decryptRequestRef.current !== decryptRequest) {
            return;
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }

          console.error('[truyendrive] Failed to decrypt image', id, error);
        } finally {
          pendingIdsRef.current.delete(id);
        }
      }
    };

    void decryptImages();

    return () => {
      abortController.abort();
    };
  }, [
    activeGroupIndex,
    displayGroups,
    imageById,
    initialGroupIndex,
    password,
    preloadDistance,
  ]);

  return { decryptedSrcs };
}
