import {
  fetchFolderDetails,
  fetchFolderDetailsGuest,
  fetchFolderItems,
  fetchFolderItemsGuest,
  fetchPdfImages as fetchGoogleDrivePdfImages,
  type DriveAccountData,
} from '../../lib/driveApi';
import type {
  Chapter,
  DriveResource,
  DriveProvider,
  FolderDetails,
  FolderPageResult,
  ReaderImage,
} from '../types';
import { getAuthUser, isAuthenticated, loadAccount } from './auth';

type DriveFolderItem = any[];
type FolderDetectionResult = 'chapters' | 'images' | 'mixed' | 'empty';
type PendingInit = {
  authUser: string;
  promise: Promise<void>;
};

const FOLDER_ID_PATTERN = /\/folders\/([^/?#]+)/;
const FILE_ID_PATTERN = /\/file\/d\/([^/?#]+)/;
const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';
const PDF_MIME = 'application/pdf';
const SHORTCUT_MIME = 'application/vnd.google-apps.shortcut';
const PASSWORD_FILE_PATTERN = /^\.password\.(.+)\.truyendrive$/;

function findShortcutDetails(item: DriveFolderItem): any[] | null {
  for (let index = 0; index < item.length; index += 1) {
    const candidate = item[index];

    if (
      Array.isArray(candidate) &&
      typeof candidate[0] === 'string' &&
      candidate[0].length > 0 &&
      typeof candidate[2] === 'string' &&
      candidate[2].startsWith('application/')
    ) {
      return candidate;
    }
  }

  return null;
}

function resolveShortcutItem(item: DriveFolderItem): DriveFolderItem {
  const mimeType = typeof item[3] === 'string' ? item[3] : '';
  if (mimeType !== SHORTCUT_MIME) {
    return item;
  }

  const details = findShortcutDetails(item);
  if (!details) {
    return item;
  }

  const targetItem = Array.isArray(details[4])
    ? (details[4] as DriveFolderItem)
    : null;
  if (targetItem) {
    return resolveShortcutItem(targetItem);
  }

  const patchedItem = [...item] as DriveFolderItem;
  patchedItem[0] = details[0];
  patchedItem[3] = details[2];
  return patchedItem;
}

function resolveShortcuts(items: DriveFolderItem[]) {
  return items.map(resolveShortcutItem);
}

function extractPasswordFromItems(items: DriveFolderItem[]): string | null {
  for (const item of items) {
    const name = typeof item[2] === 'string' ? item[2] : '';
    const match = name.match(PASSWORD_FILE_PATTERN);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function isPasswordFileItem(item: DriveFolderItem) {
  const name = typeof item[2] === 'string' ? item[2] : '';
  return PASSWORD_FILE_PATTERN.test(name);
}

function extractImages(items: DriveFolderItem[]): ReaderImage[] {
  const images: ReaderImage[] = [];

  items.forEach((item) => {
    const id = typeof item[0] === 'string' ? item[0] : '';
    const mimeType = typeof item[3] === 'string' ? item[3] : '';

    if (!id || !mimeType.startsWith('image/')) {
      return;
    }

    const dimensions = Array.isArray(item[26]) ? item[26] : null;
    const width = typeof dimensions?.[1] === 'number' ? dimensions[1] : 0;
    const height = typeof dimensions?.[2] === 'number' ? dimensions[2] : 0;

    images.push({ id, width, height });
  });

  return images;
}

function extractChapters(items: DriveFolderItem[]): Chapter[] {
  const chapters: Chapter[] = [];

  items.forEach((item) => {
    const id = typeof item[0] === 'string' ? item[0] : '';
    const mimeType = typeof item[3] === 'string' ? item[3] : '';

    if (!id || (mimeType !== DRIVE_FOLDER_MIME && mimeType !== PDF_MIME)) {
      return;
    }

    chapters.push({
      creator:
        typeof item[16]?.[7] === 'string' && item[16][7].length > 0
          ? item[16][7]
          : 'Unknown',
      id,
      kind: mimeType === PDF_MIME ? 'pdf' : 'folder',
      name:
        typeof item[2] === 'string' && item[2].length > 0
          ? item[2]
          : 'Untitled',
      updatedAt: typeof item[9] === 'number' ? item[9] : 0,
    });
  });

  return chapters;
}

function classifyItems(items: DriveFolderItem[]): FolderDetectionResult {
  const contentItems = items.filter((item) => !isPasswordFileItem(item));

  if (contentItems.length === 0) {
    return 'empty';
  }

  let allChapters = true;
  let allImages = true;

  contentItems.forEach((item) => {
    const mimeType = typeof item[3] === 'string' ? item[3] : '';

    if (mimeType !== DRIVE_FOLDER_MIME && mimeType !== PDF_MIME) {
      allChapters = false;
    }

    if (!mimeType.startsWith('image/')) {
      allImages = false;
    }
  });

  if (allChapters) {
    return 'chapters';
  }

  if (allImages) {
    return 'images';
  }

  return 'mixed';
}

function toFolderPageResult(items: DriveFolderItem[]): FolderPageResult {
  const classification = classifyItems(items);

  return {
    chapters: extractChapters(items),
    images: extractImages(items),
    isEmpty: classification === 'empty',
    isMixed: classification === 'mixed',
    password: extractPasswordFromItems(items),
  };
}

export class GoogleDriveProvider implements DriveProvider {
  private accountData: DriveAccountData | null = null;
  private authUser = getAuthUser();
  private error: Error | null = null;
  private initGeneration = 0;
  private isGuest = !isAuthenticated();
  private pendingInit: PendingInit | null = null;

  getFolderIdFromUrl() {
    return window.location.href.match(FOLDER_ID_PATTERN)?.[1] ?? null;
  }

  getResourceFromUrl(): DriveResource | null {
    const folderId = this.getFolderIdFromUrl();
    if (folderId) {
      return { id: folderId, kind: 'folder' };
    }

    const fileId = window.location.href.match(FILE_ID_PATTERN)?.[1];
    if (fileId) {
      return { id: fileId, kind: 'pdf' };
    }

    return null;
  }

  getAuthUser() {
    return getAuthUser();
  }

  getImageUrl(image: ReaderImage) {
    if (image.url) {
      return image.url;
    }

    if (this.isGuest) {
      return `https://drive.google.com/u/0/drive-usercontent/${image.id}`;
    }

    return `https://lh3.google.com/u/${this.authUser}/d/${image.id}`;
  }

  buildFetchUrl(image: ReaderImage) {
    if (image.fetchUrl ?? image.url) {
      return image.fetchUrl ?? image.url ?? '';
    }

    const base = this.getContentUrl(image.id);
    const width = image.width ?? 0;
    const height = image.height ?? 0;

    if (
      !base.startsWith('https://drive.google.com/') &&
      !base.startsWith('https://lh3.google.com/')
    ) {
      return base;
    }

    if (!width && !height) {
      return `${base}=w10000`;
    }

    if (width > 1600 || height > 1600) {
      return `${base}=w${width}-h${height}`;
    }

    return base;
  }

  private getContentUrl(id: string) {
    const authUser = this.isGuest ? '0' : this.authUser;
    return `https://drive.google.com/u/${authUser}/drive-usercontent/${id}`;
  }

  getThumbnailUrl(imageId: string) {
    return `${this.getImageUrl({ id: imageId, width: 0, height: 0 })}=s220`;
  }

  async initialize() {
    const nextAuthUser = getAuthUser();

    if (!isAuthenticated()) {
      this.initGeneration += 1;
      this.authUser = nextAuthUser;
      this.accountData = null;
      this.error = null;
      this.isGuest = true;
      this.pendingInit = null;
      return;
    }

    if (!this.isGuest && this.accountData && this.authUser === nextAuthUser) {
      return;
    }

    if (!this.isGuest && this.error && this.authUser === nextAuthUser) {
      return;
    }

    if (this.pendingInit?.authUser === nextAuthUser) {
      return this.pendingInit.promise;
    }

    const requestGeneration = this.initGeneration + 1;
    this.initGeneration = requestGeneration;
    this.authUser = nextAuthUser;
    this.accountData = null;
    this.error = null;
    this.isGuest = false;

    const request = loadAccount(nextAuthUser)
      .then((accountData) => {
        if (this.initGeneration !== requestGeneration) {
          return;
        }

        if (!accountData) {
          throw new Error('Failed to load account');
        }

        this.accountData = accountData;
        this.error = null;
      })
      .catch((error) => {
        if (this.initGeneration !== requestGeneration) {
          return;
        }

        this.accountData = null;
        this.error =
          error instanceof Error ? error : new Error('Failed to load account');
        throw this.error;
      })
      .finally(() => {
        if (this.pendingInit?.promise === request) {
          this.pendingInit = null;
        }
      });

    this.pendingInit = {
      authUser: nextAuthUser,
      promise: request,
    };
    return request;
  }

  isReady() {
    return this.isGuest || this.accountData !== null;
  }

  getInitError() {
    return this.error;
  }

  async fetchFolderPage(
    folderId: string,
    cursor?: string,
  ): Promise<[FolderPageResult, string | undefined]> {
    if (!this.isReady()) {
      await this.initialize();
    }

    if (this.isGuest) {
      const [rawItems, nextCursor] = await fetchFolderItemsGuest(
        folderId,
        cursor,
      );
      const items = resolveShortcuts(rawItems);

      return [toFolderPageResult(items), nextCursor ?? undefined];
    }

    if (!this.accountData) {
      throw this.error ?? new Error('Failed to load account');
    }

    const [rawItems, nextCursor] = await fetchFolderItems(
      folderId,
      cursor,
      this.accountData,
      this.authUser,
    );
    const items = resolveShortcuts(rawItems);

    return [toFolderPageResult(items), nextCursor ?? undefined];
  }

  async fetchPdfImages(pdfId: string) {
    if (!this.isReady()) {
      await this.initialize();
    }

    if (this.isGuest) {
      return fetchGoogleDrivePdfImages(pdfId, 'guest');
    }

    if (!this.accountData) {
      throw this.error ?? new Error('Failed to load account');
    }

    return fetchGoogleDrivePdfImages(pdfId, this.authUser);
  }

  async fetchFolderDetails(folderId: string): Promise<FolderDetails> {
    if (!this.isReady()) {
      await this.initialize();
    }

    if (this.isGuest) {
      return fetchFolderDetailsGuest(folderId);
    }

    if (!this.accountData) {
      throw this.error ?? new Error('Failed to load account');
    }

    return fetchFolderDetails(folderId, this.accountData, this.authUser);
  }
}
