import type { DirectionMode, ReaderSettings } from '../useSettings';
import { getAuthUser } from './driveApi';

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

export function getImageUrl(id: string, authUser = getAuthUser()) {
  return `https://lh3.google.com/u/${authUser}/d/${id}`;
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

export function getDisplayGroupIndex(
  logicalIndex: number,
  groupCount: number,
  direction: DirectionMode,
) {
  if (direction !== 'rtl') {
    return logicalIndex;
  }

  return groupCount - 1 - logicalIndex;
}

export function getLogicalGroupIndex(
  displayIndex: number,
  groupCount: number,
  direction: DirectionMode,
) {
  if (direction !== 'rtl') {
    return displayIndex;
  }

  return groupCount - 1 - displayIndex;
}

export function getChapterStartGroupIndex(
  groupCount: number,
  direction: DirectionMode,
) {
  if (groupCount <= 0) {
    return 0;
  }

  return direction === 'rtl' ? groupCount - 1 : 0;
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
