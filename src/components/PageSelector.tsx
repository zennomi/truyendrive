import { pageLabel, type ReaderGroup } from '../lib/readerUtils';

interface PageSelectorProps {
  activeGroupIndex: number;
  activePageNumber: number;
  displayGroups: ReaderGroup[];
  imageIds: string[];
  isSelectorVisible: boolean;
  preloadDistance: number;
  scrollToGroup: (index: number, behavior?: ScrollBehavior) => void;
}

export function PageSelector({
  activeGroupIndex,
  activePageNumber,
  displayGroups,
  imageIds,
  isSelectorVisible,
  preloadDistance,
  scrollToGroup,
}: PageSelectorProps) {
  return (
    <div className={`rdr-page-selector${isSelectorVisible ? ' vis' : ''}`}>
      <div className="rdr-page-selector-counter">
        {activePageNumber} / {imageIds.length}
      </div>
      <div className="rdr-page-selector-keys">
        {displayGroups.map((group, index) => (
          <div
            className={[
              index === activeGroupIndex ? 'shown' : '',
              Math.abs(index - activeGroupIndex) <= preloadDistance
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
  );
}
