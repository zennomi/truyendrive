import {
  fetchFolderDetails,
  fetchFolderItems,
  type DriveAccountData,
} from '../../lib/driveApi';
import type {
  Chapter,
  DriveProvider,
  FolderDetails,
  FolderPageResult,
  ReaderImage,
} from '../types';
import { getAuthUser, loadAccount } from './auth';

type DriveFolderItem = any[];
type FolderDetectionResult = 'chapters' | 'images' | 'mixed' | 'empty';

const FOLDER_ID_PATTERN = /\/folders\/([^/?#]+)/;
const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';
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

    if (!id || mimeType !== DRIVE_FOLDER_MIME) {
      return;
    }

    chapters.push({
      creator:
        typeof item[16]?.[7] === 'string' && item[16][7].length > 0
          ? item[16][7]
          : 'Unknown',
      id,
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

  let allFolders = true;
  let allImages = true;

  contentItems.forEach((item) => {
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
  private pendingInit: Promise<void> | null = null;
  private pendingInitAuthUser: string | null = null;

  getFolderIdFromUrl() {
    return window.location.href.match(FOLDER_ID_PATTERN)?.[1] ?? null;
  }

  getAuthUser() {
    return getAuthUser();
  }

  getImageUrl(id: string) {
    return `https://lh3.google.com/u/${this.authUser}/d/${id}`;
  }

  getContentUrl(id: string) {
    return `https://drive.google.com/u/${this.authUser}/drive-usercontent/${id}`;
  }

  getThumbnailUrl(_folderId: string, imageId: string) {
    return `${this.getImageUrl(imageId)}=s220`;
  }

  async initialize() {
    const nextAuthUser = getAuthUser();

    if (this.accountData && this.authUser === nextAuthUser) {
      return;
    }

    if (this.pendingInit && this.pendingInitAuthUser === nextAuthUser) {
      return this.pendingInit;
    }

    this.authUser = nextAuthUser;
    this.accountData = null;
    this.error = null;
    this.pendingInitAuthUser = nextAuthUser;

    this.pendingInit = loadAccount(nextAuthUser)
      .then((accountData) => {
        this.accountData = accountData;
        this.error = null;
      })
      .catch((error) => {
        this.accountData = null;
        this.error =
          error instanceof Error ? error : new Error('Failed to load account');
        throw this.error;
      })
      .finally(() => {
        this.pendingInit = null;
        this.pendingInitAuthUser = null;
      });

    return this.pendingInit;
  }

  isReady() {
    return this.accountData !== null;
  }

  getInitError() {
    return this.error;
  }

  async fetchFolderPage(
    folderId: string,
    cursor?: string,
  ): Promise<[FolderPageResult, string | undefined]> {
    if (!this.accountData) {
      await this.initialize();
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

  async fetchFolderDetails(folderId: string): Promise<FolderDetails> {
    if (!this.accountData) {
      await this.initialize();
    }

    if (!this.accountData) {
      throw this.error ?? new Error('Failed to load account');
    }

    return fetchFolderDetails(folderId, this.accountData, this.authUser);
  }
}
