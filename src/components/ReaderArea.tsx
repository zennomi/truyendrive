import {
  memo,
  useRef,
  type MouseEvent,
  type SyntheticEvent,
  type PointerEvent,
  type RefObject,
} from 'react';

import {
  clampIndex,
  getImageUrl,
  type PointerGestureState,
  type ReaderGroup,
} from '../lib/readerUtils';
import type { ReaderSettings } from '../useSettings';

interface ReaderAreaProps {
  displayGroups: ReaderGroup[];
  groupRefs: RefObject<Array<HTMLDivElement | null>>;
  hoverEdge: 'next' | 'prev' | null;
  imageWrapRef: RefObject<HTMLDivElement | null>;
  isGroupPreloaded: (index: number) => boolean;
  isScrollReady: boolean;
  navigateGroupOrChapter: (delta: -1 | 1) => void;
  onPageLoad: (pageId: string) => void;
  performVerticalPageTurnOrChapter: (direction: 1 | -1) => void;
  preloadImageRefs: RefObject<Array<HTMLImageElement | null>>;
  setHoverEdge: (edge: 'next' | 'prev' | null) => void;
  setImageLoadVersion: (fn: (version: number) => number) => void;
  settings: ReaderSettings;
  showPageSelector: () => void;
  showZoomControls: () => void;
  syncActiveGroupFromScroll: () => void;
  tooWideGroups: Record<string, true>;
}

const SELECTOR_PROXIMITY_PX = 72;
const ZOOM_PROXIMITY_PX = 140;

function createIdlePointerGestureState(): PointerGestureState {
  return {
    active: false,
    dragged: false,
    initialScrollLeft: 0,
    pointerType: '',
    startX: 0,
    startY: 0,
    wrapper: null,
  };
}

export const ReaderArea = memo(function ReaderArea({
  displayGroups,
  groupRefs,
  hoverEdge,
  imageWrapRef,
  isGroupPreloaded,
  isScrollReady,
  navigateGroupOrChapter,
  onPageLoad,
  performVerticalPageTurnOrChapter,
  preloadImageRefs,
  setHoverEdge,
  setImageLoadVersion,
  settings,
  showPageSelector,
  showZoomControls,
  syncActiveGroupFromScroll,
  tooWideGroups,
}: ReaderAreaProps) {
  const pointerGestureRef = useRef<PointerGestureState>(
    createIdlePointerGestureState(),
  );
  const suppressClickRef = useRef(false);

  const handleAreaClick = (event: MouseEvent<HTMLDivElement>) => {
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
      const verticalRatio = (event.clientY - bounds.top) / bounds.height;

      if (verticalRatio < 0.35) {
        performVerticalPageTurnOrChapter(-1);
        return;
      }

      if (verticalRatio > 0.65) {
        performVerticalPageTurnOrChapter(1);
        return;
      }

      showPageSelector();
      return;
    }

    if (ratio < 0.35) {
      navigateGroupOrChapter(-1);
    } else if (ratio > 0.65) {
      navigateGroupOrChapter(1);
    } else {
      showPageSelector();
    }
  };

  const handleAreaMouseLeave = () => {
    setHoverEdge(null);
  };

  const handleAreaMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - bounds.left;
    const offsetY = event.clientY - bounds.top;

    const isNearSelector =
      settings.apr.selectorAnchor === 'bottom'
        ? offsetY >= bounds.height - SELECTOR_PROXIMITY_PX
        : offsetX <= SELECTOR_PROXIMITY_PX;

    if (isNearSelector) {
      showPageSelector();
    }

    const isNearZoomControls =
      offsetX >= bounds.width - ZOOM_PROXIMITY_PX &&
      offsetY <= ZOOM_PROXIMITY_PX;

    if (isNearZoomControls) {
      showZoomControls();
    }

    if (!settings.apr.hoverinos || settings.lyt.direction === 'ttb') {
      setHoverEdge(null);
      return;
    }

    const ratio = offsetX / bounds.width;
    if (ratio < 0.25) {
      setHoverEdge('prev');
    } else if (ratio > 0.75) {
      setHoverEdge('next');
    } else {
      setHoverEdge(null);
    }
  };

  const resetPointerGesture = () => {
    pointerGestureRef.current = createIdlePointerGestureState();
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
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
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
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
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = pointerGestureRef.current;
    pointerGestureRef.current = createIdlePointerGestureState();

    if (
      settings.lyt.direction === 'ttb' ||
      !settings.bhv.swipeGestures ||
      (gesture.pointerType !== 'touch' && gesture.pointerType !== 'pen')
    ) {
      return;
    }

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    const horizontalSwipe =
      Math.abs(deltaX) >= 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
    if (!horizontalSwipe) {
      return;
    }

    const wrapper = gesture.wrapper;
    if (wrapper) {
      const maxScrollLeft = wrapper.scrollWidth - wrapper.clientWidth;
      if (maxScrollLeft > 0) {
        const atStart = wrapper.scrollLeft <= 1;
        const atEnd = maxScrollLeft - wrapper.scrollLeft <= 1;
        if ((deltaX < 0 && !atEnd) || (deltaX > 0 && !atStart)) {
          return;
        }
      }
    }

    if (deltaX < 0) {
      navigateGroupOrChapter(settings.lyt.direction === 'rtl' ? -1 : 1);
      return;
    }

    navigateGroupOrChapter(settings.lyt.direction === 'rtl' ? 1 : -1);
  };

  const handlePageImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const pageId = event.currentTarget.dataset.pageId;
    if (!pageId) {
      return;
    }

    onPageLoad(pageId);
    setImageLoadVersion((version) => version + 1);
  };

  return (
    <div
      className="rdr-area"
      onClick={handleAreaClick}
      onMouseLeave={handleAreaMouseLeave}
      onMouseMove={handleAreaMouseMove}
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
        onPointerCancel={resetPointerGesture}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onScroll={syncActiveGroupFromScroll}
        ref={imageWrapRef}
        style={{ visibility: isScrollReady ? 'visible' : 'hidden' }}
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
                data-page-id={page.id}
                decoding="async"
                key={page.id}
                loading={isGroupPreloaded(groupIndex) ? 'eager' : 'lazy'}
                onLoad={handlePageImageLoad}
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
  );
});
