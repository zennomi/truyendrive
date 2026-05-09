import { memo, useCallback, type KeyboardEvent, type MouseEvent } from 'react';

import {
  getDisplayGroupIndex,
  pageLabel,
  type ReaderGroup,
} from '../lib/readerUtils';
import type { DirectionMode } from '../useSettings';

interface PageSelectorProps {
  activeGroupIndex: number;
  activePageNumber: number;
  displayGroups: ReaderGroup[];
  direction: DirectionMode;
  imageIds: string[];
  isGroupLoaded: (index: number) => boolean;
  isSelectorVisible: boolean;
  scrollToGroup: (index: number, behavior?: ScrollBehavior) => void;
}

export const PageSelector = memo(function PageSelector({
  activeGroupIndex,
  activePageNumber,
  displayGroups,
  direction,
  imageIds,
  isGroupLoaded,
  isSelectorVisible,
  scrollToGroup,
}: PageSelectorProps) {
  const orderedGroups =
    direction === 'rtl' ? [...displayGroups].reverse() : displayGroups;
  const getGroupIndex = useCallback((value: string | undefined) => {
    if (!value) {
      return -1;
    }

    const parsedIndex = Number.parseInt(value, 10);
    return Number.isNaN(parsedIndex) ? -1 : parsedIndex;
  }, []);

  const handleGroupClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const groupIndex = getGroupIndex(event.currentTarget.dataset.groupIndex);
      if (groupIndex !== -1) {
        scrollToGroup(groupIndex);
      }
    },
    [getGroupIndex, scrollToGroup],
  );

  const handleGroupKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();

      const groupIndex = getGroupIndex(event.currentTarget.dataset.groupIndex);
      if (groupIndex !== -1) {
        scrollToGroup(groupIndex);
      }
    },
    [getGroupIndex, scrollToGroup],
  );

  return (
    <div className={`rdr-page-selector${isSelectorVisible ? ' vis' : ''}`}>
      <div className="rdr-page-selector-counter">
        {activePageNumber} / {imageIds.length}
      </div>
      <div className="rdr-page-selector-keys">
        {orderedGroups.map((group, logicalIndex) => {
          const displayIndex = getDisplayGroupIndex(
            logicalIndex,
            displayGroups.length,
            direction,
          );

          return (
            <div
              className={[
                displayIndex === activeGroupIndex ? 'shown' : '',
                isGroupLoaded(displayIndex) ? 'preloaded' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-group-index={String(displayIndex)}
              key={group.id}
              onClick={handleGroupClick}
              onKeyDown={handleGroupKeyDown}
              role="button"
              tabIndex={0}
            >
              {pageLabel(group)}
            </div>
          );
        })}
      </div>
    </div>
  );
});
