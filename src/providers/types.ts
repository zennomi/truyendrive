export type ReaderImage = {
  id: string;
  width: number;
  height: number;
  url?: string;
  fetchUrl?: string;
  thumbnailUrl?: string;
  requiresDecryption?: boolean;
};

export type FolderDetails = {
  title: string;
  ownerEmail: string;
  thumbnailUrl: string | null;
};

export type DriveResource = {
  id: string;
  kind: 'folder' | 'pdf';
};

export type Chapter = {
  id: string;
  kind: DriveResource['kind'];
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

  /** Extracts the provider-specific resource from the current page URL. */
  getResourceFromUrl(): DriveResource | null;

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

  /** Fetches PDF pages as reader images when the provider supports PDFs. */
  fetchPdfImages(pdfId: string): Promise<ReaderImage[]>;

  /** Fetches display metadata for a folder or file. */
  fetchFolderDetails(resourceId: string): Promise<FolderDetails>;
}
