import { useEffect, useMemo, useRef, useState } from 'react';

import { decryptImageBuffer } from '../lib/imageCrypto';
import {
  getGroupsInRange,
  getMaxGroupDistance,
  type ReaderGroup,
} from '../lib/readerUtils';
import type { EncryptionMethod, ReaderImage } from '../providers/types';

function revokeBlobUrls(blobUrls: Map<string, string>) {
  blobUrls.forEach((url) => URL.revokeObjectURL(url));
  blobUrls.clear();
}

function retainImageBlobUrls(
  blobUrls: Map<string, string>,
  imageIds: Set<string>,
) {
  blobUrls.forEach((url, id) => {
    if (!imageIds.has(id)) {
      URL.revokeObjectURL(url);
      blobUrls.delete(id);
    }
  });
}

export function useImageDecryptor(
  images: ReaderImage[],
  password: string | null,
  encryptionMethod: EncryptionMethod,
  displayGroups: ReaderGroup[],
  activeGroupIndex: number,
  initialGroupIndex: number,
  isInitialScrollDone: boolean,
  preloadDistance: number,
  buildFetchUrl: (image: ReaderImage) => string,
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
  const anchorGroupIndex = isInitialScrollDone
    ? activeGroupIndex
    : initialGroupIndex;

  useEffect(() => {
    decryptGenerationRef.current += 1;
    pendingIdsRef.current.clear();
    revokeBlobUrls(blobUrlsRef.current);
    setDecryptedSrcs(new Map());
  }, [encryptionMethod, password]);

  useEffect(() => {
    return () => {
      decryptGenerationRef.current += 1;
      pendingIdsRef.current.clear();
      revokeBlobUrls(blobUrlsRef.current);
    };
  }, []);

  useEffect(() => {
    const validImageIds = new Set(imageIds);

    retainImageBlobUrls(blobUrlsRef.current, validImageIds);
    pendingIdsRef.current.forEach((id) => {
      if (!validImageIds.has(id)) {
        pendingIdsRef.current.delete(id);
      }
    });

    setDecryptedSrcs((previous) => {
      let didRemove = false;
      const next = new Map<string, string>();

      previous.forEach((src, id) => {
        if (validImageIds.has(id)) {
          next.set(id, src);
        } else {
          didRemove = true;
        }
      });

      return didRemove ? next : previous;
    });
  }, [imageIdKey, imageIds]);

  useEffect(() => {
    const decryptRequest = (decryptRequestRef.current += 1);

    if (password === null || displayGroups.length === 0) {
      return;
    }

    const decryptGeneration = decryptGenerationRef.current;
    const maxDistance = getMaxGroupDistance(
      preloadDistance,
      displayGroups.length,
    );
    const windowedImageIds = new Set(
      getGroupsInRange(
        displayGroups,
        anchorGroupIndex,
        maxDistance,
        true,
      ).flatMap((group) => group.pages.map((page) => page.id)),
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

          if (image.requiresDecryption === false) {
            continue;
          }

          const blob = await decryptImageBuffer(
            buildFetchUrl(image),
            password,
            encryptionMethod,
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
          console.error('[truyendrive] Failed to decrypt image', id, error);
        } finally {
          pendingIdsRef.current.delete(id);
        }
      }
    };

    void decryptImages();
  }, [
    anchorGroupIndex,
    displayGroups,
    encryptionMethod,
    imageById,
    buildFetchUrl,
    password,
    preloadDistance,
  ]);

  return { decryptedSrcs };
}
