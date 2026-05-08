import { pageLabel, type ReaderGroup } from '../lib/readerUtils';

interface PageSelectorProps {
  activeGroupIndex: number;
  activePageNumber: number;
  displayGroups: ReaderGroup[];
  imageIds: string[];
  isGroupLoaded: (index: number) => boolean;
  isSelectorVisible: boolean;
  scrollToGroup: (index: number, behavior?: ScrollBehavior) => void;
}

export function PageSelector({
  activeGroupIndex,
  activePageNumber,
  displayGroups,
  imageIds,
  isGroupLoaded,
  isSelectorVisible,
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
              isGroupLoaded(index) ? 'preloaded' : '',
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
