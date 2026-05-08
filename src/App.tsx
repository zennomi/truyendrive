import type { CSSProperties } from 'react';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';

import { SettingsModal } from './SettingsModal';
import {
  DIRECTION_OPTIONS,
  FIT_OPTIONS,
  PRELOAD_OPTIONS,
  SPREAD_OPTIONS,
  type DirectionMode,
  type ReaderSettings,
  type SettingsTab,
  getThemeStyle,
  useSettings,
} from './useSettings';

type ReaderPage = {
  id: string;
  index: number;
};

type ReaderGroup = {
  id: string;
  pages: ReaderPage[];
};

type ReaderHistoryState = {
  page: number;
  truyendriveReader: true;
};

type PointerGestureState = {
  active: boolean;
  dragged: boolean;
  initialScrollLeft: number;
  pointerType: string;
  startX: number;
  startY: number;
  wrapper: HTMLDivElement | null;
};

const READER_HISTORY_HASH = 'truyendrive-page';

function extractImageIds() {
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

function buildPageGroups(
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

function getReaderTitle() {
  return (
    document.title.replace(/\s*-\s*Google Drive$/i, '').trim() ||
    'Google Drive Comic Reader'
  );
}

function getImageUrl(id: string) {
  return `https://lh3.google.com/u/0/d/${id}`;
}

function getRootClasses(settings: ReaderSettings) {
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

function pageLabel(group: ReaderGroup) {
  if (group.pages.length === 1) {
    return `${group.pages[0].index + 1}`;
  }

  return `${group.pages[0].index + 1}-${group.pages[group.pages.length - 1].index + 1}`;
}

function clampIndex(value: number, max: number) {
  return Math.max(0, Math.min(max, value));
}

function findGroupIndexForPage(groups: ReaderGroup[], pageIndex: number) {
  return groups.findIndex((group) =>
    group.pages.some((page) => page.index === pageIndex),
  );
}

function buildPageTitle(title: string, pageIndex: number) {
  return `${title} • Page ${pageIndex + 1}`;
}

function buildReaderHistoryUrl(baseUrl: string, pageIndex: number) {
  const url = new URL(baseUrl);
  url.hash = `${READER_HISTORY_HASH}-${pageIndex + 1}`;
  return url.toString();
}

function isReaderHistoryState(value: unknown): value is ReaderHistoryState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'truyendriveReader' in value &&
    'page' in value &&
    (value as ReaderHistoryState).truyendriveReader === true &&
    typeof (value as ReaderHistoryState).page === 'number'
  );
}

function App() {
  console.log('Re-render', new Date());
  const {
    settings,
    cycleSetting,
    resetCustomTheme,
    toggleSetting,
    updateSetting,
  } = useSettings();
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [hoverEdge, setHoverEdge] = useState<'next' | 'prev' | null>(null);
  const [imageLoadVersion, setImageLoadVersion] = useState(0);
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSelectorVisible, setIsSelectorVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isZoomVisible, setIsZoomVisible] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('Reader');
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [tooWideGroups, setTooWideGroups] = useState<Record<string, true>>({});
  const imageWrapRef = useRef<HTMLDivElement | null>(null);
  const groupRefs = useRef<Array<HTMLDivElement | null>>([]);
  const historyDepthRef = useRef(0);
  const historyPageRef = useRef<number | null>(null);
  const isHandlingPopStateRef = useRef(false);
  const pointerGestureRef = useRef<PointerGestureState>({
    active: false,
    dragged: false,
    initialScrollLeft: 0,
    pointerType: '',
    startX: 0,
    startY: 0,
    wrapper: null,
  });
  const preloadCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const preloadImageRefs = useRef<Array<HTMLImageElement | null>>([]);
  const previousTitleRef = useRef<string | null>(null);
  const previousUrlRef = useRef<string | null>(null);
  const readerTitleRef = useRef(getReaderTitle());
  const scrollIntervalRef = useRef<number | null>(null);
  const selectorHideTimeoutRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const zoomHideTimeoutRef = useRef<number | null>(null);
  const currentPageRef = useRef(0);

  const readerTitle = readerTitleRef.current;
  const displayGroups = useMemo(
    () =>
      buildPageGroups(imageIds, settings.lyt.spread, settings.lyt.direction),
    [imageIds, settings.lyt.spread, settings.lyt.direction],
  );
  const themeStyle = useMemo(() => getThemeStyle(settings.thm), [settings.thm]);
  const activePage = displayGroups[activeGroupIndex]?.pages[0]?.index ?? 0;
  const activePageNumber = imageIds.length === 0 ? 0 : activePage + 1;
  const activeGroup = displayGroups[activeGroupIndex];
  const supportsZoomOverlay =
    settings.lyt.fit === 'width' || settings.lyt.fit === 'width_limit';

  currentPageRef.current =
    displayGroups[activeGroupIndex]?.pages[0]?.index ?? currentPageRef.current;

  const cleanupAutoScroll = useEffectEvent(() => {
    if (scrollIntervalRef.current !== null) {
      window.clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  });

  const clearSelectorHideTimer = useEffectEvent(() => {
    if (selectorHideTimeoutRef.current !== null) {
      window.clearTimeout(selectorHideTimeoutRef.current);
      selectorHideTimeoutRef.current = null;
    }
  });

  const clearZoomHideTimer = useEffectEvent(() => {
    if (zoomHideTimeoutRef.current !== null) {
      window.clearTimeout(zoomHideTimeoutRef.current);
      zoomHideTimeoutRef.current = null;
    }
  });

  const showPageSelector = useEffectEvent(() => {
    clearSelectorHideTimer();
    if (settings.apr.selPinned) {
      setIsSelectorVisible(false);
      return;
    }

    setIsSelectorVisible(true);
    selectorHideTimeoutRef.current = window.setTimeout(() => {
      setIsSelectorVisible(false);
      selectorHideTimeoutRef.current = null;
    }, 3000);
  });

  const showZoomControls = useEffectEvent(() => {
    clearZoomHideTimer();
    if (!supportsZoomOverlay) {
      setIsZoomVisible(false);
      return;
    }

    setIsZoomVisible(true);
    zoomHideTimeoutRef.current = window.setTimeout(() => {
      setIsZoomVisible(false);
      zoomHideTimeoutRef.current = null;
    }, 3000);
  });

  const scrollToGroup = useEffectEvent(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const target = groupRefs.current[index];
      if (!target) {
        return;
      }

      setActiveGroupIndex(index);

      if (settings.lyt.direction === 'ttb') {
        target.scrollIntoView({ behavior, block: 'start' });
        return;
      }

      target.scrollIntoView({ behavior, block: 'nearest', inline: 'start' });
      if (settings.bhv.resetScroll) {
        target.scrollTop = 0;
      }
    },
  );

  const syncActiveGroupFromScroll = useEffectEvent(() => {
    const scroller = imageWrapRef.current;
    if (!scroller || displayGroups.length === 0) {
      return;
    }

    if (settings.lyt.direction === 'ttb') {
      const targetY = scroller.scrollTop + scroller.clientHeight * 0.35;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      groupRefs.current.forEach((group, index) => {
        if (!group) {
          return;
        }

        const distance = Math.abs(group.offsetTop - targetY);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveGroupIndex(closestIndex);
      return;
    }

    const nextIndex = Math.round(
      scroller.scrollLeft / Math.max(scroller.clientWidth, 1),
    );
    setActiveGroupIndex(clampIndex(nextIndex, displayGroups.length - 1));
  });

  const goToAdjacentGroup = useEffectEvent((delta: number) => {
    if (displayGroups.length === 0) {
      return;
    }

    const nextIndex = clampIndex(
      activeGroupIndex + delta,
      displayGroups.length - 1,
    );
    scrollToGroup(nextIndex);
  });

  const performVerticalStep = useEffectEvent((direction: 1 | -1) => {
    const scroller = imageWrapRef.current;
    if (!scroller) {
      return;
    }

    scroller.scrollBy({
      behavior: 'smooth',
      top: direction * settings.bhv.scrollYDelta * 8,
    });
  });

  const performVerticalPageTurn = useEffectEvent((direction: 1 | -1) => {
    const scroller = imageWrapRef.current;
    if (!scroller) {
      return;
    }

    scroller.scrollBy({
      behavior: 'smooth',
      top:
        direction *
        Math.max(scroller.clientHeight * 0.9, settings.bhv.scrollYDelta * 8),
    });
  });

  const syncWideGroupState = useEffectEvent(() => {
    if (
      !isOpen ||
      (settings.lyt.fit !== 'height' && settings.lyt.fit !== 'height_limit')
    ) {
      setTooWideGroups((current) =>
        Object.keys(current).length === 0 ? current : {},
      );
      return;
    }

    const nextGroups: Record<string, true> = {};

    displayGroups.forEach((group, index) => {
      const wrapper = groupRefs.current[index];
      if (!wrapper) {
        return;
      }

      if (wrapper.scrollWidth > wrapper.clientWidth + 1) {
        nextGroups[group.id] = true;
      }
    });

    setTooWideGroups((current) => {
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(nextGroups);

      if (
        currentKeys.length === nextKeys.length &&
        currentKeys.every((key) => key in nextGroups)
      ) {
        return current;
      }

      return nextGroups;
    });
  });

  const resetReaderState = useEffectEvent((restoreHistoryUrl: boolean) => {
    clearSelectorHideTimer();
    clearZoomHideTimer();
    cleanupAutoScroll();
    setActiveGroupIndex(0);
    setHoverEdge(null);
    setImageLoadVersion(0);
    setImageIds([]);
    setIsOpen(false);
    setIsSelectorVisible(false);
    setIsSettingsOpen(false);
    setIsZoomVisible(false);
    setStatusMessage('Reader closed');
    setTooWideGroups({});
    preloadCacheRef.current.clear();
    preloadImageRefs.current.forEach((image) => {
      if (image) {
        image.removeAttribute('src');
      }
    });
    historyDepthRef.current = 0;
    historyPageRef.current = null;
    isHandlingPopStateRef.current = false;
    pointerGestureRef.current = {
      active: false,
      dragged: false,
      initialScrollLeft: 0,
      pointerType: '',
      startX: 0,
      startY: 0,
      wrapper: null,
    };
    suppressClickRef.current = false;

    if (previousTitleRef.current) {
      document.title = previousTitleRef.current;
      previousTitleRef.current = null;
    }

    if (restoreHistoryUrl && previousUrlRef.current) {
      window.history.replaceState(
        window.history.state,
        '',
        previousUrlRef.current,
      );
    }

    previousUrlRef.current = null;
  });

  const closeComicMode = useEffectEvent(() => {
    if (historyDepthRef.current > 0) {
      window.history.go(-historyDepthRef.current);
      return;
    }

    resetReaderState(false);
  });

  const openComicMode = useEffectEvent(() => {
    const initialIds = extractImageIds();

    if (initialIds.length === 0) {
      window.alert(
        'No images detected on screen. Make sure image tiles are loaded first.',
      );
      return;
    }

    previousTitleRef.current = document.title;
    previousUrlRef.current = window.location.href;
    readerTitleRef.current = getReaderTitle();
    historyDepthRef.current = 0;
    historyPageRef.current = null;
    isHandlingPopStateRef.current = false;
    setImageIds(initialIds);
    setIsOpen(true);
    setStatusMessage(
      `Loaded ${initialIds.length} page${initialIds.length === 1 ? '' : 's'}`,
    );

    const scrollContainer = document.querySelector('c-wiz[data-parent]');
    if (!scrollContainer) {
      return;
    }

    let lastHeight = 0;
    let sameHeightCount = 0;

    cleanupAutoScroll();
    scrollIntervalRef.current = window.setInterval(() => {
      const currentHeight = scrollContainer.scrollHeight;
      scrollContainer.scrollTop = currentHeight;

      const newIds = extractImageIds();
      setImageIds((currentIds) => {
        let changed = false;
        const mergedIds = [...currentIds];

        newIds.forEach((id) => {
          if (!mergedIds.includes(id)) {
            mergedIds.push(id);
            changed = true;
          }
        });

        if (changed) {
          setStatusMessage(`Loaded ${mergedIds.length}`);
          return mergedIds;
        }

        return currentIds;
      });

      if (currentHeight === lastHeight) {
        sameHeightCount += 1;
        if (sameHeightCount >= 3) {
          cleanupAutoScroll();
          setStatusMessage((message) => `${message}`);
        }
      } else {
        lastHeight = currentHeight;
        sameHeightCount = 0;
      }
    }, 1500);
  });

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!isOpen) {
      return;
    }

    if (event.key === 'Escape') {
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
      } else {
        closeComicMode();
      }
      return;
    }

    if (event.key === 'o' || event.key === 'O') {
      event.preventDefault();
      setIsSettingsOpen((current) => !current);
      return;
    }

    if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      cycleSetting('lyt', 'fit', FIT_OPTIONS);
      return;
    }

    if (event.key === 'd' || event.key === 'D') {
      event.preventDefault();
      cycleSetting('lyt', 'direction', DIRECTION_OPTIONS);
      return;
    }

    if (event.key === 'q' || event.key === 'Q') {
      event.preventDefault();
      cycleSetting('lyt', 'spread', SPREAD_OPTIONS);
      return;
    }

    if (event.key === 'l' || event.key === 'L') {
      event.preventDefault();
      cycleSetting('bhv', 'preload', PRELOAD_OPTIONS);
      return;
    }

    if (event.key === 'n' || event.key === 'N') {
      event.preventDefault();
      toggleSetting('apr', 'selPinned');
      return;
    }

    if (event.key === 's' || event.key === 'S') {
      event.preventDefault();
      toggleSetting('apr', 'sidebar');
      return;
    }

    if (settings.lyt.direction === 'ttb') {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        performVerticalStep(1);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        performVerticalStep(-1);
        return;
      }

      if (settings.bhv.arrowTurnPage && event.key === 'ArrowRight') {
        event.preventDefault();
        goToAdjacentGroup(1);
        return;
      }

      if (settings.bhv.arrowTurnPage && event.key === 'ArrowLeft') {
        event.preventDefault();
        goToAdjacentGroup(-1);
      }

      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToAdjacentGroup(settings.lyt.direction === 'rtl' ? -1 : 1);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToAdjacentGroup(settings.lyt.direction === 'rtl' ? 1 : -1);
    }
  });

  const handlePopState = useEffectEvent((event: PopStateEvent) => {
    if (isReaderHistoryState(event.state)) {
      if (!isOpen || displayGroups.length === 0) {
        return;
      }

      const targetPage = clampIndex(event.state.page, imageIds.length - 1);
      const targetGroupIndex = findGroupIndexForPage(displayGroups, targetPage);

      isHandlingPopStateRef.current = true;
      currentPageRef.current = targetPage;
      historyPageRef.current = targetPage;
      document.title = buildPageTitle(readerTitle, targetPage);
      scrollToGroup(targetGroupIndex === -1 ? 0 : targetGroupIndex, 'auto');
      requestAnimationFrame(() => {
        isHandlingPopStateRef.current = false;
      });
      return;
    }

    if (isOpen) {
      resetReaderState(false);
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handlePopState]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(
    () => () => {
      cleanupAutoScroll();
      clearSelectorHideTimer();
      clearZoomHideTimer();
    },
    [],
  );

  useEffect(() => {
    if (!isOpen || imageIds.length === 0 || displayGroups.length === 0) {
      return;
    }

    const targetPage = currentPageRef.current;
    const matchingIndex = findGroupIndexForPage(displayGroups, targetPage);
    const nextIndex = matchingIndex === -1 ? 0 : matchingIndex;

    setActiveGroupIndex(nextIndex);
    requestAnimationFrame(() => {
      scrollToGroup(nextIndex, 'auto');
    });
  }, [imageIds, isOpen, settings.lyt.fit, settings.lyt.spread]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    showPageSelector();
  }, [activeGroupIndex, isOpen, settings.apr.selPinned]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    showZoomControls();
  }, [activeGroupIndex, isOpen, settings.lyt.fit, settings.lyt.zoom]);

  useEffect(() => {
    if (!isOpen || displayGroups.length === 0) {
      return;
    }

    if (settings.bhv.historyUpdate === 'none') {
      return;
    }

    const title = buildPageTitle(readerTitle, activePage);
    if (isHandlingPopStateRef.current) {
      document.title = title;
      historyPageRef.current = activePage;
      return;
    }

    const baseUrl = previousUrlRef.current ?? window.location.href;
    const nextState: ReaderHistoryState = {
      page: activePage,
      truyendriveReader: true,
    };
    const nextUrl = buildReaderHistoryUrl(baseUrl, activePage);

    if (historyDepthRef.current === 0) {
      window.history.pushState(nextState, '', nextUrl);
      historyDepthRef.current = 1;
      historyPageRef.current = activePage;
      document.title = title;
      return;
    }

    const previousPage = historyPageRef.current;
    switch (settings.bhv.historyUpdate) {
      case 'replace':
      case 'chap':
        window.history.replaceState(nextState, '', nextUrl);
        break;
      case 'jump':
        if (previousPage === null || Math.abs(previousPage - activePage) > 2) {
          window.history.pushState(nextState, '', nextUrl);
          historyDepthRef.current += 1;
        } else {
          window.history.replaceState(nextState, '', nextUrl);
        }
        break;
      case 'all':
        if (previousPage !== activePage) {
          window.history.pushState(nextState, '', nextUrl);
          historyDepthRef.current += 1;
        } else {
          window.history.replaceState(nextState, '', nextUrl);
        }
        break;
      default:
        break;
    }

    historyPageRef.current = activePage;
    document.title = title;
  }, [
    activePage,
    displayGroups,
    isOpen,
    readerTitle,
    settings.bhv.historyUpdate,
  ]);

  useEffect(() => {
    if (!isOpen || displayGroups.length === 0) {
      return;
    }

    const maxDistance =
      settings.bhv.preload === 100
        ? displayGroups.length
        : Math.max(settings.bhv.preload, 1);
    const preloadUrls: string[] = [];

    for (let distance = 1; distance <= maxDistance; distance += 1) {
      [activeGroupIndex + distance, activeGroupIndex - distance].forEach(
        (groupIndex) => {
          const group = displayGroups[groupIndex];
          if (!group) {
            return;
          }

          group.pages.forEach((page) => {
            preloadUrls.push(getImageUrl(page.id));
          });
        },
      );
    }

    preloadUrls.forEach((url) => {
      if (preloadCacheRef.current.has(url)) {
        return;
      }

      const image = new window.Image();
      image.decoding = 'async';
      image.src = url;
      preloadCacheRef.current.set(url, image);
    });

    preloadImageRefs.current.forEach((image, index) => {
      if (!image) {
        return;
      }

      const url = preloadUrls[index];
      if (url) {
        image.src = url;
      } else {
        image.removeAttribute('src');
      }
    });
  }, [activeGroupIndex, displayGroups, isOpen, settings.bhv.preload]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      syncWideGroupState();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [
    displayGroups,
    imageIds,
    imageLoadVersion,
    isOpen,
    settings.lyt.direction,
    settings.lyt.fit,
    settings.lyt.fit,
    settings.lyt.spread,
    settings.lyt.zoom,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleResize = () => {
      syncWideGroupState();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  return (
    <>
      <button
        className="truyendrive-launcher"
        onClick={openComicMode}
        type="button"
      >
        <span>📖</span>
        <span>Comic Mode</span>
      </button>

      {isOpen && (
        <main
          className={getRootClasses(settings)}
          id="rdr-main"
          style={themeStyle as CSSProperties}
          tabIndex={-1}
        >
          <aside className="">
            <div
              className="hide-side UI Button MultiStateButton"
              data-tip="Show/hide sidebar [S]"
              data-tip-align="right"
              {...{ 'data-apr.sidebar': settings.apr.sidebar }}
              onClick={() => toggleSetting('apr', 'sidebar')}
              role="button"
              tabIndex={0}
            >
              <div className="hide-side-actual ico-btn" />
            </div>
            <header>
              <a
                className="ico-btn guya"
                href="/"
                onClick={(event) => {
                  event.preventDefault();
                  closeComicMode();
                }}
              />
              <h1>
                <a href="#" onClick={(event) => event.preventDefault()}>
                  {readerTitle}
                </a>
              </h1>
              <button className="ico-btn" type="button" />
            </header>
            <div className="rdr-aside-buffer" />
            <div className="rdr-aside-content">
              <section className="rdr-selector">
                <div className="rdr-selector-top">
                  <button
                    className="rdr-selector-vol ico-btn prev"
                    data-tip="Next volume [.]"
                    type="button"
                  />
                  <div className="flex-spacer UI MessageBox" id="message-box">
                    {statusMessage}
                  </div>

                  <button
                    className="ico-btn download"
                    data-tip="Download chapter in the background"
                    type="button"
                  />
                  <div className="download-anchor">
                    <div className="download-wrapper hidden">
                      <button
                        className="ico-btn downloading"
                        disabled
                        type="button"
                      />
                      <button
                        className="ico-btn download-cancel"
                        type="button"
                      />
                    </div>
                  </div>
                  <a
                    className="rdr-share ico-btn "
                    data-tip="Copy short link [R]"
                  />
                  <button
                    className="ico-btn jump"
                    data-tip="Jump to chapter... [J]"
                    onClick={() => scrollToGroup(0)}
                    type="button"
                  />
                  <button
                    className="ico-btn search"
                    data-tip="Search the manga... [Ctrl]+[F]"
                    onClick={() => {
                      setSettingsTab('Reader');
                      setIsSettingsOpen(true);
                    }}
                    style={{ display: 'none' }}
                    type="button"
                  />
                </div>
                <div className="rdr-selector-mid">
                  <button
                    className="rdr-selector-chap ico-btn prev"
                    data-tip="Previous chapter [[]"
                    onClick={() => goToAdjacentGroup(-1)}
                    type="button"
                  />
                  <div className="rdr-vol-wrap UI FauxDrop">
                    <label>{activeGroup ? pageLabel(activeGroup) : '0'}</label>
                    <select
                      className="UI List SimpleList"
                      id="rdr-vol"
                      onChange={(event) => {
                        const nextIndex = Number.parseInt(
                          event.target.value,
                          10,
                        );
                        if (!Number.isNaN(nextIndex)) {
                          scrollToGroup(nextIndex);
                        }
                      }}
                      value={String(activeGroupIndex)}
                    >
                      {displayGroups.map((group, index) => (
                        <option
                          className="UI SimpleListItem"
                          key={group.id}
                          value={String(index)}
                        >
                          {pageLabel(group)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rdr-chap-wrap UI FauxDrop">
                    <label>
                      Page {activePageNumber} / {imageIds.length}
                    </label>
                    <select
                      className="UI List SimpleList"
                      id="rdr-chap"
                      onChange={(event) => {
                        const targetPage = Number.parseInt(
                          event.target.value,
                          10,
                        );
                        const targetGroupIndex = findGroupIndexForPage(
                          displayGroups,
                          targetPage,
                        );
                        if (targetGroupIndex !== -1) {
                          scrollToGroup(targetGroupIndex);
                        }
                      }}
                      value={String(activePage)}
                    >
                      {imageIds.map((id, index) => (
                        <option
                          className="UI SimpleListItem"
                          key={id}
                          value={String(index)}
                        >
                          Page {index + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="rdr-selector-chap ico-btn next"
                    data-tip="Next chapter []]"
                    onClick={() => goToAdjacentGroup(1)}
                    type="button"
                  />
                </div>
                <div className="rdr-selector-bot">
                  <button
                    className="rdr-selector-vol ico-btn next"
                    data-tip="Previous volume [,]"
                    type="button"
                  />
                  <div className="flex-spacer" />
                  <button
                    {...{ 'data-bhv.preload': settings.bhv.preload }}
                    className="ico-btn hidden UI Button MultiStateButton"
                    data-tip="Change preload [L]"
                    onClick={() =>
                      cycleSetting('bhv', 'preload', PRELOAD_OPTIONS)
                    }
                    type="button"
                  />
                  <button
                    {...{ 'data-lyt.fit': settings.lyt.fit }}
                    className="ico-btn UI Button MultiStateButton"
                    data-tip="Change fit mode [F]"
                    onClick={() => cycleSetting('lyt', 'fit', FIT_OPTIONS)}
                    type="button"
                  />
                  <button
                    {...{ 'data-lyt.direction': settings.lyt.direction }}
                    className="ico-btn UI Button MultiStateButton"
                    data-tip="Change layout direction [D]"
                    onClick={() =>
                      cycleSetting('lyt', 'direction', DIRECTION_OPTIONS)
                    }
                    type="button"
                  />
                  <button
                    {...{ 'data-lyt.spread': settings.lyt.spread }}
                    className="ico-btn UI Button MultiStateButton"
                    data-tip="Change two-page mode [Q]"
                    onClick={() =>
                      cycleSetting('lyt', 'spread', SPREAD_OPTIONS)
                    }
                    type="button"
                  />
                  <button
                    {...{ 'data-apr.selpinned': settings.apr.selPinned }}
                    className="ico-btn UI Button MultiStateButton"
                    data-tip="Pin page selector [N]"
                    onClick={() => toggleSetting('apr', 'selPinned')}
                    type="button"
                  />
                  <button
                    className="ico-btn"
                    data-bind="settings_button"
                    data-tip="Advanced settings... [O]"
                    onClick={() => {
                      setSettingsTab('Reader');
                      setIsSettingsOpen(true);
                    }}
                    type="button"
                  />
                </div>
              </section>
              <section className="rdr-groups UI List Selector Tabs">
                <div className="UI SimpleListItem">
                  Google Drive folder scan
                </div>
                <div className="is-active UI SimpleListItem">
                  {imageIds.length} image pages detected
                </div>
              </section>

              <section className="rdr-previews">
                <div
                  className="header UI Button MultiStateButton"
                  {...{ 'data-apr.previews': settings.apr.previews }}
                  onClick={() => toggleSetting('apr', 'previews')}
                  role="button"
                  tabIndex={0}
                >
                  <span>Previews</span>
                  <div
                    className="ico-btn expander"
                    data-tip="Show previews [P]"
                  />
                </div>
                <div className="rdr-previews-gallery UI List Selector Tabs">
                  {imageIds.map((id, index) => {
                    const previewGroupIndex = findGroupIndexForPage(
                      displayGroups,
                      index,
                    );

                    return (
                      <img
                        className={
                          previewGroupIndex === activeGroupIndex
                            ? 'is-active'
                            : undefined
                        }
                        key={id}
                        loading="lazy"
                        onClick={() => scrollToGroup(previewGroupIndex)}
                        src={getImageUrl(id)}
                      />
                    );
                  })}
                </div>
              </section>
              <section className="rdr-description">
                <div>
                  {settings.lyt.direction === 'ttb'
                    ? 'Top-to-bottom mode keeps the long-strip Google Drive flow and uses Cubari layout controls.'
                    : 'Horizontal mode uses paged wrappers with Cubari fit, spread, theme, and selector controls.'}
                </div>
              </section>
            </div>
          </aside>

          <div
            className={`rdr-page-selector${isSelectorVisible ? ' vis' : ''}`}
          >
            <div className="rdr-page-selector-counter">
              {activePageNumber} / {imageIds.length}
            </div>
            <div className="rdr-page-selector-keys">
              {displayGroups.map((group, index) => (
                <div
                  className={[
                    index === activeGroupIndex ? 'shown' : '',
                    Math.abs(index - activeGroupIndex) <= settings.bhv.preload
                      ? 'preloaded'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={group.id}
                  onClick={() => scrollToGroup(index)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      scrollToGroup(index);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {pageLabel(group)}
                </div>
              ))}
            </div>
          </div>

          <div
            className="rdr-area"
            onClick={(event) => {
              if (suppressClickRef.current) {
                suppressClickRef.current = false;
                return;
              }

              if (!settings.bhv.clickTurnPage) {
                return;
              }

              const bounds = event.currentTarget.getBoundingClientRect();
              const ratio = (event.clientX - bounds.left) / bounds.width;

              if (settings.lyt.direction === 'ttb') {
                const verticalRatio =
                  (event.clientY - bounds.top) / bounds.height;

                if (verticalRatio < 0.35) {
                  performVerticalPageTurn(-1);
                  return;
                }

                if (verticalRatio > 0.65) {
                  performVerticalPageTurn(1);
                  return;
                }

                showPageSelector();
                return;
              }

              if (ratio < 0.35) {
                goToAdjacentGroup(settings.lyt.direction === 'rtl' ? 1 : -1);
              } else if (ratio > 0.65) {
                goToAdjacentGroup(settings.lyt.direction === 'rtl' ? -1 : 1);
              } else {
                showPageSelector();
              }
            }}
            onMouseLeave={() => setHoverEdge(null)}
            onMouseMove={(event) => {
              if (!settings.apr.hoverinos || settings.lyt.direction === 'ttb') {
                setHoverEdge(null);
                return;
              }

              const bounds = event.currentTarget.getBoundingClientRect();
              const ratio = (event.clientX - bounds.left) / bounds.width;
              if (ratio < 0.25) {
                setHoverEdge('prev');
              } else if (ratio > 0.75) {
                setHoverEdge('next');
              } else {
                setHoverEdge(null);
              }
            }}
          >
            <div className="preload-entity">
              {Array.from({ length: 4 }).map((_, index) => (
                <img
                  key={index}
                  ref={(element) => {
                    preloadImageRefs.current[index] = element;
                  }}
                />
              ))}
            </div>
            <div
              className="rdr-image-wrap"
              onPointerCancel={() => {
                pointerGestureRef.current = {
                  active: false,
                  dragged: false,
                  initialScrollLeft: 0,
                  pointerType: '',
                  startX: 0,
                  startY: 0,
                  wrapper: null,
                };
              }}
              onPointerDown={(event) => {
                const wrapper =
                  event.target instanceof Element
                    ? (event.target.closest(
                        '.ReaderImageWrapper',
                      ) as HTMLDivElement | null)
                    : null;

                pointerGestureRef.current = {
                  active: true,
                  dragged: false,
                  initialScrollLeft: wrapper?.scrollLeft ?? 0,
                  pointerType: event.pointerType,
                  startX: event.clientX,
                  startY: event.clientY,
                  wrapper,
                };
                suppressClickRef.current = false;
              }}
              onPointerMove={(event) => {
                const gesture = pointerGestureRef.current;
                if (!gesture.active) {
                  return;
                }

                const deltaX = event.clientX - gesture.startX;
                const deltaY = event.clientY - gesture.startY;
                if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
                  gesture.dragged = true;
                  suppressClickRef.current = true;
                }

                if (
                  settings.lyt.direction === 'ttb' ||
                  !settings.bhv.swipeGestures ||
                  !gesture.wrapper ||
                  Math.abs(deltaX) <= Math.abs(deltaY)
                ) {
                  return;
                }

                const maxScrollLeft =
                  gesture.wrapper.scrollWidth - gesture.wrapper.clientWidth;
                if (maxScrollLeft <= 0) {
                  return;
                }

                gesture.wrapper.scrollLeft = clampIndex(
                  gesture.initialScrollLeft - deltaX,
                  maxScrollLeft,
                );
              }}
              onPointerUp={(event) => {
                const gesture = pointerGestureRef.current;
                pointerGestureRef.current = {
                  active: false,
                  dragged: false,
                  initialScrollLeft: 0,
                  pointerType: '',
                  startX: 0,
                  startY: 0,
                  wrapper: null,
                };

                if (
                  settings.lyt.direction === 'ttb' ||
                  !settings.bhv.swipeGestures ||
                  (gesture.pointerType !== 'touch' &&
                    gesture.pointerType !== 'pen')
                ) {
                  return;
                }

                const deltaX = event.clientX - gesture.startX;
                const deltaY = event.clientY - gesture.startY;
                const horizontalSwipe =
                  Math.abs(deltaX) >= 60 &&
                  Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
                if (!horizontalSwipe) {
                  return;
                }

                const wrapper = gesture.wrapper;
                if (wrapper) {
                  const maxScrollLeft =
                    wrapper.scrollWidth - wrapper.clientWidth;
                  if (maxScrollLeft > 0) {
                    const atStart = wrapper.scrollLeft <= 1;
                    const atEnd = maxScrollLeft - wrapper.scrollLeft <= 1;
                    if ((deltaX < 0 && !atEnd) || (deltaX > 0 && !atStart)) {
                      return;
                    }
                  }
                }

                if (deltaX < 0) {
                  goToAdjacentGroup(settings.lyt.direction === 'rtl' ? -1 : 1);
                  return;
                }

                goToAdjacentGroup(settings.lyt.direction === 'rtl' ? 1 : -1);
              }}
              onScroll={syncActiveGroupFromScroll}
              ref={imageWrapRef}
              tabIndex={-1}
            >
              {displayGroups.map((group, groupIndex) => (
                <div
                  className={`ReaderImageWrapper UI${group.pages.length > 1 ? ' two-page' : ''}${tooWideGroups[group.id] ? ' too-wide' : ''}`}
                  key={group.id}
                  ref={(element) => {
                    groupRefs.current[groupIndex] = element;
                  }}
                >
                  {group.pages.map((page) => (
                    <img
                      alt={`Page ${page.index + 1}`}
                      decoding="async"
                      key={page.id}
                      loading={
                        Math.abs(groupIndex - activeGroupIndex) <=
                        settings.bhv.preload
                          ? 'eager'
                          : 'lazy'
                      }
                      onLoad={() => {
                        setImageLoadVersion((version) => version + 1);
                      }}
                      src={getImageUrl(page.id)}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div
              className={`hover-prev${hoverEdge === 'prev' ? ' viz nodelay' : ''}`}
            >
              <div className="hover-wrap">
                <div className="hover-arrow"></div>
                <div className="hover-sub" />
              </div>
            </div>
            <div
              className={`hover-next${hoverEdge === 'next' ? ' viz nodelay' : ''}`}
            >
              <div className="hover-wrap">
                <div className="hover-arrow"></div>
                <div className="hover-sub" />
              </div>
            </div>
          </div>

          <div className={`zoom-level${isZoomVisible ? ' vis' : ''}`}>
            <button
              className="ico-btn"
              onClick={() => {
                updateSetting(
                  'lyt',
                  'zoom',
                  Math.min(100, settings.lyt.zoom + 10),
                );
                showZoomControls();
              }}
              type="button"
            >
              
            </button>
            <button
              className="ico-btn"
              onClick={() => {
                updateSetting(
                  'lyt',
                  'zoom',
                  Math.max(10, settings.lyt.zoom - 10),
                );
                showZoomControls();
              }}
              type="button"
            >
              
            </button>
          </div>

          <SettingsModal
            activeTab={settingsTab}
            onClose={() => setIsSettingsOpen(false)}
            onTabChange={setSettingsTab}
            open={isSettingsOpen}
            resetCustomTheme={resetCustomTheme}
            settings={settings}
            updateSetting={updateSetting}
          />
        </main>
      )}
    </>
  );
}

export default App;
