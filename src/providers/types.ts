export type ReaderImage = {
  id: string;
  width: number;
  height: number;
};

export type FolderDetails = {
  title: string;
  ownerEmail: string;
  thumbnailUrl: string | null;
};

export type Chapter = {
  id: string;
  name: string;
  creator: string;
  updatedAt: number;
};

export type FolderMode = 'chapters' | 'images' | null;

export interface FolderPageResult {
  images: ReaderImage[];
  chapters: Chapter[];
  password: string | null;
  isMixed: boolean;
  isEmpty: boolean;
}

export interface DriveProvider {
  /** Extracts the provider-specific folder identifier from the current page URL. */
  getFolderIdFromUrl(): string | null;

  /** Returns the active provider account key used to detect account switches. */
  getAuthUser(): string;

  /** Builds the URL used by visible reader images and browser-native preloading. */
  getImageUrl(image: ReaderImage): string;

  /**
   * Builds the URL used for image fetch/decrypt requests.
   *
   * This may intentionally differ from `getImageUrl` when a provider has a
   * more reliable raw-content endpoint for programmatic fetches.
   */
  buildFetchUrl(image: ReaderImage): string;

  /** Builds a small preview URL when the provider supports thumbnails. */
  getThumbnailUrl(imageId: string): string | null;

  /** Loads any account/session metadata required before folder requests run. */
  initialize(): Promise<void>;

  /** Returns whether the provider is ready to service folder requests. */
  isReady(): boolean;

  /** Returns the latest initialization failure, if one occurred. */
  getInitError(): Error | null;

  /** Fetches one folder page plus the optional cursor for the next page. */
  fetchFolderPage(
    folderId: string,
    cursor?: string,
  ): Promise<[FolderPageResult, string | undefined]>;

  /** Fetches display metadata for a folder. */
  fetchFolderDetails(folderId: string): Promise<FolderDetails>;
}
