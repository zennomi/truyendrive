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
  getFolderIdFromUrl(): string | null;
  getAuthUser(): string;
  getImageUrl(image: ReaderImage): string;
  buildFetchUrl(image: ReaderImage): string;
  getContentUrl(id: string): string;
  getThumbnailUrl(imageId: string): string | null;
  initialize(): Promise<void>;
  isReady(): boolean;
  getInitError(): Error | null;
  fetchFolderPage(
    folderId: string,
    cursor?: string,
  ): Promise<[FolderPageResult, string | undefined]>;
  fetchFolderDetails(folderId: string): Promise<FolderDetails>;
}
