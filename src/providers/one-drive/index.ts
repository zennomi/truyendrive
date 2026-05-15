import type {
  Chapter,
  DriveProvider,
  FolderDetails,
  FolderPageResult,
  ReaderImage,
} from '../types';

type OneDriveFieldValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | OneDriveFieldValue[]
  | { [key: string]: OneDriveFieldValue };

type OneDriveRow = Record<string, OneDriveFieldValue>;

type OneDriveListSchema = {
  '.driveUrl'?: string;
  PageContextInfo?: {
    userEmail?: string;
  };
  userEmail?: string;
  ViewMetadata?: {
    Id?: string;
    ListViewXml?: string;
  };
};

type OneDriveListData = {
  ListSchema?: OneDriveListSchema;
  NextHref?: string;
  Row?: OneDriveRow[];
};

type OneDriveListResponse = {
  ListData?: OneDriveListData;
  ListSchema?: OneDriveListSchema;
  NextHref?: string;
  Row?: OneDriveRow[];
};

type OneDriveWrappedListResponse = OneDriveListResponse & {
  d?:
    | OneDriveListResponse
    | {
        RenderListDataAsStream?: OneDriveListResponse;
      };
};

type FolderParts = {
  cid: string;
  listUrl: string;
  rootFolder: string;
};

const IMAGE_EXTENSIONS = new Set(['avif', 'gif', 'jpeg', 'jpg', 'png', 'webp']);
const ONEDRIVE_ORIGIN = 'https://onedrive.live.com';
const PASSWORD_FILE_PATTERN = /^\.password\.(.+)\.truyendrive$/;
const FIRST_PAGE_RENDER_OPTIONS = 1496871;
const PAGED_RENDER_OPTIONS = 1232931;

function decodeFolderId(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getString(value: OneDriveFieldValue): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return '';
}

function cleanLookupValue(value: OneDriveFieldValue) {
  const rawValue = getString(value);
  const separatorIndex = rawValue.lastIndexOf(';#');
  return separatorIndex === -1 ? rawValue : rawValue.slice(separatorIndex + 2);
}

function getFileName(row: OneDriveRow) {
  return (
    cleanLookupValue(row.FileLeafRef) ||
    cleanLookupValue(row.LinkFilename) ||
    cleanLookupValue(row.FileRef).split('/').pop() ||
    'Untitled'
  );
}

function getExtension(name: string) {
  const extension = name.split('.').pop();
  return extension ? extension.toLowerCase() : '';
}

function isImageRow(row: OneDriveRow) {
  return (
    getString(row.FSObjType) === '0' &&
    IMAGE_EXTENSIONS.has(getExtension(getFileName(row)))
  );
}

function isFolderRow(row: OneDriveRow) {
  return getString(row.FSObjType) === '1';
}

function parseModifiedAt(row: OneDriveRow) {
  const rawModified = getString(row['Modified.']) || getString(row.Modified);
  const timestamp = Date.parse(rawModified);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getCreator(row: OneDriveRow) {
  const editor = row.Editor;

  if (Array.isArray(editor)) {
    const firstEditor = editor[0];
    if (
      firstEditor &&
      typeof firstEditor === 'object' &&
      !Array.isArray(firstEditor)
    ) {
      const email = getString(firstEditor.email);
      if (email) {
        return email;
      }
    }
  }

  return getString(row.Editor) || 'Unknown';
}

function parseFastMetadata(row: OneDriveRow) {
  const rawMetadata = getString(row.MediaServiceFastMetadata);
  if (!rawMetadata) {
    return { height: 0, width: 0 };
  }

  try {
    const metadata = JSON.parse(rawMetadata) as {
      photo?: {
        height?: number | string;
        width?: number | string;
      };
    };
    const width = Number(metadata.photo?.width ?? 0);
    const height = Number(metadata.photo?.height ?? 0);

    return {
      height: Number.isFinite(height) ? height : 0,
      width: Number.isFinite(width) ? width : 0,
    };
  } catch {
    return { height: 0, width: 0 };
  }
}

function getItemIdFromApiUrl(row: OneDriveRow) {
  const url = getString(row['.spItemUrl']);
  const match = url.match(/\/items\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function getDriveApiBaseFromRows(rows: OneDriveRow[]) {
  for (const row of rows) {
    const url = getString(row['.spItemUrl']);
    const match = url.match(
      /^(https:\/\/onedrive\.live\.com(?::443)?\/_api\/v2\.0\/drives\/[^/]+)/,
    );

    if (match) {
      return match[1];
    }
  }

  return null;
}

function getImageId(row: OneDriveRow) {
  return (
    getString(row['name.FileSystemItemId']) ||
    getString(row.UniqueId) ||
    getItemIdFromApiUrl(row) ||
    getString(row.ID)
  );
}

function getFolderPath(row: OneDriveRow, parentFolderId: string) {
  const fileRef = cleanLookupValue(row.FileRef);
  if (fileRef) {
    return fileRef;
  }

  const encodedUrl = cleanLookupValue(row.EncodedAbsUrl);
  if (encodedUrl) {
    try {
      return decodeURIComponent(new URL(encodedUrl).pathname);
    } catch {
      return encodedUrl;
    }
  }

  const folderName = getFileName(row);
  return `${parentFolderId.replace(/\/+$/, '')}/${folderName}`;
}

function toFolderPageResult(
  rows: OneDriveRow[],
  folderId: string,
): FolderPageResult {
  const chapters: Chapter[] = [];
  const images: ReaderImage[] = [];
  let hasChapters = false;
  let hasImages = false;
  let hasOther = false;
  let password: string | null = null;

  rows.forEach((row) => {
    const fileName = getFileName(row);
    const passwordMatch = fileName.match(PASSWORD_FILE_PATTERN);

    if (passwordMatch) {
      password ??= passwordMatch[1];
      return;
    }

    if (isFolderRow(row)) {
      hasChapters = true;
      chapters.push({
        creator: getCreator(row),
        id: getFolderPath(row, folderId),
        name: fileName,
        updatedAt: parseModifiedAt(row),
      });
      return;
    }

    if (isImageRow(row)) {
      hasImages = true;
      const id = getImageId(row);
      if (!id) {
        return;
      }

      images.push({
        id,
        ...parseFastMetadata(row),
      });
      return;
    }

    hasOther = true;
  });

  const isEmpty = !hasChapters && !hasImages && !hasOther;

  return {
    chapters,
    images,
    isEmpty,
    isMixed: !isEmpty && ((hasChapters && hasImages) || hasOther),
    password,
  };
}

function getListData(response: OneDriveListResponse): OneDriveListData {
  return response.ListData ?? response;
}

function unwrapListResponse(
  response: OneDriveWrappedListResponse,
): OneDriveListResponse {
  const data = response.d;

  if (!data) {
    return response;
  }

  if ('RenderListDataAsStream' in data && data.RenderListDataAsStream) {
    return data.RenderListDataAsStream;
  }

  return data as OneDriveListResponse;
}

function getListSchema(response: OneDriveListResponse) {
  const listData = getListData(response);
  return response.ListSchema ?? listData.ListSchema ?? null;
}

function getNextHref(response: OneDriveListResponse) {
  const nextHref = getListData(response).NextHref ?? response.NextHref;
  return nextHref ? nextHref.replace(/&amp;/g, '&') : undefined;
}

function getRows(response: OneDriveListResponse) {
  const rows = getListData(response).Row ?? response.Row ?? [];
  return Array.isArray(rows) ? rows : [];
}

function parseFolderParts(folderId: string): FolderParts {
  const cid = folderId.match(/^\/personal\/([^/]+)/)?.[1];
  if (!cid) {
    throw new Error('Invalid OneDrive folder URL');
  }

  const pathParts = folderId.split('/').filter(Boolean);
  const documentsIndex = pathParts.findIndex((part) => part === 'Documents');
  const listParts =
    documentsIndex === -1
      ? pathParts.slice(0, Math.min(pathParts.length, 3))
      : pathParts.slice(0, documentsIndex + 1);

  return {
    cid,
    listUrl: `/${listParts.join('/')}`,
    rootFolder: folderId,
  };
}

function parseFolderPartsForRequest(folderId: string): FolderParts {
  try {
    return parseFolderParts(folderId);
  } catch {
    throw new Error(
      'Unsupported OneDrive folder URL. Open a personal OneDrive folder and try again.',
    );
  }
}

function buildListEndpoint(cid: string) {
  return `${ONEDRIVE_ORIGIN}/personal/${encodeURIComponent(
    cid,
  )}/_api/web/GetListUsingPath(DecodedUrl=@a1)/RenderListDataAsStream`;
}

function buildFirstPageUrl(
  { cid, listUrl, rootFolder }: FolderParts,
  viewId?: string,
) {
  const query = [
    `@a1=${encodeURIComponent(`'${listUrl}'`)}`,
    `RootFolder=${encodeURIComponent(rootFolder)}`,
    ...(viewId ? [`View=${viewId}`] : []),
    'SortField=LinkFilename',
    'SortDir=Asc',
    'TryNewExperienceSingle=TRUE',
  ].join('&');

  return `${buildListEndpoint(cid)}?${query}`;
}

function buildPagedUrl({ cid, listUrl }: FolderParts, cursor: string) {
  const queryPrefix = `@a1=${encodeURIComponent(`'${listUrl}'`)}&TryNewExperienceSingle=TRUE&`;
  const normalizedCursor = cursor.startsWith('?') ? cursor.slice(1) : cursor;
  return `${buildListEndpoint(cid)}?${queryPrefix}${normalizedCursor}`;
}

function buildRequestBody(renderOptions: number, viewXml?: string) {
  return JSON.stringify({
    parameters: {
      __metadata: {
        type: 'SP.RenderListDataParameters',
      },
      RenderOptions: renderOptions,
      ...(viewXml ? { ViewXml: viewXml } : {}),
      AddRequiredFields: true,
      AllowMultipleValueFilterForTaxonomyFields: true,
      RequireFolderColoringFields: true,
    },
  });
}

function requestJson<TResponse>(url: string, body: string, listUrl?: string) {
  return new Promise<TResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader('accept', 'application/json;odata=verbose');
    xhr.setRequestHeader('content-type', 'application/json;odata=verbose');
    xhr.setRequestHeader('application', 'onedrive web consumer');
    xhr.setRequestHeader('authorization', 'Bearer');
    xhr.setRequestHeader('scenario', 'ViewList');
    xhr.setRequestHeader('scenariotype', 'AUO');
    
    if (listUrl) {
      xhr.setRequestHeader(
        'x-sp-requestresources',
        `listUrl=${encodeURIComponent(listUrl)}`,
      );
    }

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`OneDrive request failed with status ${xhr.status}`));
        return;
      }

      try {
        resolve(JSON.parse(xhr.responseText) as TResponse);
      } catch (error) {
        reject(error);
      }
    };

    xhr.onerror = () =>
      reject(new Error('Network error while requesting OneDrive data'));

    xhr.send(body);
  });
}

function hasOneDriveAuthCookie() {
  return /(?:^|;\s*)(?:MUID|OIDCAuth_[^=]+)=/.test(document.cookie);
}

export class OneDriveProvider implements DriveProvider {
  private activeCid: string | null = null;
  private driveApiBaseByCid = new Map<string, string>();
  private error: Error | null = null;
  private listViewXmlByFolderId = new Map<string, string>();
  private viewIdByFolderId = new Map<string, string>();
  private metadataLoadedByCid = new Set<string>();
  private ownerEmailByCid = new Map<string, string>();
  private ready = false;

  getFolderIdFromUrl() {
    try {
      return decodeFolderId(
        new URL(window.location.href).searchParams.get('id'),
      );
    } catch {
      return null;
    }
  }

  getAuthUser() {
    return (
      this.getFolderIdFromUrl()?.match(/^\/personal\/([^/]+)/)?.[1] ??
      'onedrive'
    );
  }

  getImageUrl(image: ReaderImage) {
    const driveApiBase = this.getDriveApiBase();

    if (!driveApiBase || (!image.width && !image.height)) {
      return this.getContentUrl(image.id);
    }

    const max = 2560;
    let width = image.width ?? 0;
    let height = image.height ?? 0;

    if (width > max || height > max) {
      if (width >= height) {
        height = Math.round((height / width) * max);
        width = max;
      } else {
        width = Math.round((width / height) * max);
        height = max;
      }
    }

    const thumbnailWidth = width || max;
    const thumbnailHeight = height || max;
    return `${driveApiBase}/items/${encodeURIComponent(
      image.id,
    )}/thumbnails/0/c${thumbnailWidth}x${thumbnailHeight}/content`;
  }

  buildFetchUrl(image: ReaderImage) {
    const driveApiBase = this.getDriveApiBase();

    if (!driveApiBase) {
      return this.getContentUrl(image.id);
    }

    const width = image.width ?? 0;
    const height = image.height ?? 0;
    const max = 2560;

    if (!width || !height || width > max || height > max) {
      return this.getContentUrl(image.id);
    }

    return `${driveApiBase}/items/${encodeURIComponent(
      image.id,
    )}/thumbnails/0/c${width}x${height}/content`;
  }

  private getCurrentCid() {
    const folderId = this.getFolderIdFromUrl();
    if (!folderId) {
      return this.activeCid;
    }

    try {
      return parseFolderParts(folderId).cid;
    } catch {
      return this.activeCid;
    }
  }

  private getDriveApiBase() {
    const cid = this.getCurrentCid();
    return cid ? (this.driveApiBaseByCid.get(cid) ?? null) : null;
  }

  private getContentUrl(id: string) {
    const driveApiBase = this.getDriveApiBase();

    if (!driveApiBase) {
      return '';
    }

    return `${driveApiBase}/items/${encodeURIComponent(id)}/content`;
  }

  getThumbnailUrl(imageId: string) {
    const driveApiBase = this.getDriveApiBase();

    if (!driveApiBase) {
      return null;
    }

    return `${driveApiBase}/items/${encodeURIComponent(
      imageId,
    )}/thumbnails/0/c220x220/content`;
  }

  async initialize() {
    if (hasOneDriveAuthCookie()) {
      this.error = null;
      this.ready = true;
      return;
    }

    this.ready = false;
    this.error = new Error('Not logged in to OneDrive');
    throw this.error;
  }

  isReady() {
    return this.ready;
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

    const folderParts = parseFolderPartsForRequest(folderId);
    this.activeCid = folderParts.cid;

    const rawResponse = await requestJson<OneDriveWrappedListResponse>(
      cursor
        ? buildPagedUrl(folderParts, cursor)
        : buildFirstPageUrl(
            folderParts,
            this.viewIdByFolderId.get(folderParts.rootFolder),
          ),
      buildRequestBody(
        cursor ? PAGED_RENDER_OPTIONS : FIRST_PAGE_RENDER_OPTIONS,
        this.listViewXmlByFolderId.get(folderParts.rootFolder),
      ),
      folderParts.listUrl,
    );
    const response = unwrapListResponse(rawResponse);
    this.updateFolderMetadata(folderParts, response);

    return [
      toFolderPageResult(getRows(response), folderId),
      getNextHref(response),
    ];
  }

  private updateFolderMetadata(
    folderParts: FolderParts,
    response: OneDriveListResponse,
  ) {
    const schema = getListSchema(response);
    const rows = getRows(response);
    const driveApiBase =
      schema?.['.driveUrl']?.replace(/\/+$/, '') ??
      getDriveApiBaseFromRows(rows)?.replace(/\/+$/, '') ??
      null;

    if (driveApiBase) {
      this.driveApiBaseByCid.set(folderParts.cid, driveApiBase);
    }

    if (schema?.ViewMetadata?.ListViewXml) {
      this.listViewXmlByFolderId.set(
        folderParts.rootFolder,
        schema.ViewMetadata.ListViewXml,
      );
    }

    if (schema?.ViewMetadata?.Id) {
      this.viewIdByFolderId.set(folderParts.rootFolder, schema.ViewMetadata.Id);
    }

    const ownerEmail = schema?.userEmail ?? schema?.PageContextInfo?.userEmail;
    if (ownerEmail) {
      this.ownerEmailByCid.set(folderParts.cid, ownerEmail);
    }

    this.metadataLoadedByCid.add(folderParts.cid);
  }

  async fetchFolderDetails(folderId: string): Promise<FolderDetails> {
    if (!this.isReady()) {
      await this.initialize();
    }

    const folderParts = parseFolderPartsForRequest(folderId);
    this.activeCid = folderParts.cid;

    if (!this.metadataLoadedByCid.has(folderParts.cid)) {
      const rawResponse = await requestJson<OneDriveWrappedListResponse>(
        buildFirstPageUrl(
          folderParts,
          this.viewIdByFolderId.get(folderParts.rootFolder),
        ),
        buildRequestBody(
          FIRST_PAGE_RENDER_OPTIONS,
          this.listViewXmlByFolderId.get(folderParts.rootFolder),
        ),
        folderParts.listUrl,
      );
      this.updateFolderMetadata(folderParts, unwrapListResponse(rawResponse));
    }

    const rootFolder = folderParts.rootFolder;
    const title = decodeURIComponent(rootFolder.split('/').pop() ?? '');

    return {
      ownerEmail: this.ownerEmailByCid.get(folderParts.cid) ?? 'Unknown',
      thumbnailUrl: null,
      title: title || 'OneDrive Folder',
    };
  }
}
