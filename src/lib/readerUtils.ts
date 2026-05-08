import type { DirectionMode, ReaderSettings } from '../useSettings';

export type ReaderPage = {
  id: string;
  index: number;
};

export type ReaderGroup = {
  id: string;
  pages: ReaderPage[];
};

export type ReaderHistoryState = {
  page: number;
  truyendriveReader: true;
};

export type PointerGestureState = {
  active: boolean;
  dragged: boolean;
  initialScrollLeft: number;
  pointerType: string;
  startX: number;
  startY: number;
  wrapper: HTMLDivElement | null;
};

export const READER_HISTORY_HASH = 'truyendrive-page';

export function extractImageIds() {
  const displayModeDiv = document.querySelector('div[data-display-mode]');
  const displayMode = displayModeDiv?.getAttribute('data-display-mode');

  const items =
    displayMode === '1'
      ? document.querySelectorAll('tr[data-id][role="row"]')
      : document.querySelectorAll('div[data-id][role="gridcell"]');
  const ids: string[] = [];

  items.forEach((item) => {
    let fileName = '';

    const elements = Array.from(item.querySelectorAll('*'));
    for (const element of elements) {
      if (element.children.length !== 0) {
        continue;
      }

      const text = element.textContent?.trim() ?? '';
      if (/\.(jpg|jpeg|png|webp|gif|bmp|heic)$/i.test(text)) {
        fileName = text;
        break;
      }
    }

    if (!fileName) {
      const labelElement = item.hasAttribute('aria-label')
        ? item
        : item.querySelector('[aria-label]');
      const label = labelElement?.getAttribute('aria-label') ?? '';
      const match = label.match(/^(.+?\.(?:jpg|jpeg|png|webp|gif|bmp|heic))/i);
      if (match) {
        fileName = match[1];
      }
    }

    const id = item.getAttribute('data-id');
    if (id && fileName && !ids.includes(id)) {
      ids.push(id);
    }
  });

  return ids;
}

export function buildPageGroups(
  imageIds: string[],
  spread: ReaderSettings['lyt']['spread'],
  direction: DirectionMode,
) {
  const groupSize = spread === '1' ? 1 : 2;
  const oddOffset = spread === '2-odd' ? 1 : 0;
  const groups: ReaderGroup[] = [];

  let startIndex = 0;
  if (oddOffset === 1 && imageIds.length > 0) {
    groups.push({
      id: 'group-0',
      pages: [{ id: imageIds[0], index: 0 }],
    });
    startIndex = 1;
  }

  for (let index = startIndex; index < imageIds.length; index += groupSize) {
    const pages = imageIds
      .slice(index, index + groupSize)
      .map((id, offset) => ({
        id,
        index: index + offset,
      }));

    groups.push({
      id: `group-${index}`,
      pages,
    });
  }

  return direction === 'rtl' ? [...groups].reverse() : groups;
}

export function getReaderTitle() {
  return (
    document.title.replace(/\s*-\s*Google Drive$/i, '').trim() ||
    'Google Drive Comic Reader'
  );
}

export function getImageUrl(id: string) {
  return `https://lh3.google.com/u/0/d/${id}`;
}

export function getRootClasses(settings: ReaderSettings) {
  return [
    `direction-${settings.lyt.direction}`,
    `fit-${settings.lyt.fit}`,
    `gap-${settings.lyt.gap}`,
    `spread-${settings.lyt.spread}`,
    `selectorAnchor-${settings.apr.selectorAnchor}`,
    `selPinned-${settings.apr.selPinned}`,
    `selNum-${settings.apr.selNum}`,
    `hoverinos-${settings.apr.hoverinos}`,
    `sidebar-${settings.apr.sidebar}`,
    `previews-${settings.apr.previews}`,
    `zoom-${settings.lyt.zoom}`,
    'loaded',
  ].join(' ');
}

export function pageLabel(group: ReaderGroup) {
  if (group.pages.length === 1) {
    return `${group.pages[0].index + 1}`;
  }

  return `${group.pages[0].index + 1}-${group.pages[group.pages.length - 1].index + 1}`;
}

export function clampIndex(value: number, max: number) {
  return Math.max(0, Math.min(max, value));
}

export function findGroupIndexForPage(
  groups: ReaderGroup[],
  pageIndex: number,
) {
  return groups.findIndex((group) =>
    group.pages.some((page) => page.index === pageIndex),
  );
}

export function buildPageTitle(title: string, pageIndex: number) {
  return `${title} • Page ${pageIndex + 1}`;
}

export function buildReaderHistoryUrl(baseUrl: string, pageIndex: number) {
  const url = new URL(baseUrl);
  url.hash = `${READER_HISTORY_HASH}-${pageIndex + 1}`;
  return url.toString();
}

export function isReaderHistoryState(
  value: unknown,
): value is ReaderHistoryState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'truyendriveReader' in value &&
    'page' in value &&
    (value as ReaderHistoryState).truyendriveReader === true &&
    typeof (value as ReaderHistoryState).page === 'number'
  );
}
