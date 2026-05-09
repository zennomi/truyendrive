import type { Chapter, FolderMode } from '../hooks/useComicMode';
import { memo, useCallback, type ChangeEvent, type MouseEvent } from 'react';
import {
  DIRECTION_OPTIONS,
  FIT_OPTIONS,
  PRELOAD_OPTIONS,
  SPREAD_OPTIONS,
  type ReaderSettings,
  type SettingsTab,
} from '../useSettings';
import {
  findGroupIndexForPage,
  getDisplayGroupIndex,
  getImageUrl,
  pageLabel,
  type ReaderGroup,
} from '../lib/readerUtils';

type CycleSetting = <
  TCategory extends keyof ReaderSettings,
  TKey extends keyof ReaderSettings[TCategory],
>(
  category: TCategory,
  key: TKey,
  options: readonly ReaderSettings[TCategory][TKey][],
) => void;

type ToggleSetting = <
  TCategory extends keyof ReaderSettings,
  TKey extends keyof ReaderSettings[TCategory],
>(
  category: TCategory,
  key: TKey,
) => void;

interface ReaderSidebarProps {
  activeGroup: ReaderGroup | undefined;
  activeGroupIndex: number;
  activeChapterIndex: number;
  activePage: number;
  activePageNumber: number;
  chapterStartGroupIndex: number;
  closeComicMode: () => void;
  cycleSetting: CycleSetting;
  displayGroups: ReaderGroup[];
  folderMode: FolderMode;
  goToAdjacentChapter: (delta: -1 | 1) => void;
  goToAdjacentGroup: (delta: number) => void;
  goToChapterAtIndex: (index: number) => void;
  imageIds: string[];
  logicalActiveGroupIndex: number;
  parentChapters: Chapter[];
  readerTitle: string;
  scrollToGroup: (index: number, behavior?: ScrollBehavior) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setSettingsTab: (tab: SettingsTab) => void;
  settings: ReaderSettings;
  statusMessage: string;
  toggleSetting: ToggleSetting;
}

export const ReaderSidebar = memo(function ReaderSidebar({
  activeGroup,
  activeGroupIndex,
  activeChapterIndex,
  activePage,
  activePageNumber,
  chapterStartGroupIndex,
  closeComicMode,
  cycleSetting,
  displayGroups,
  folderMode,
  goToAdjacentChapter,
  goToAdjacentGroup,
  goToChapterAtIndex,
  imageIds,
  logicalActiveGroupIndex,
  parentChapters,
  readerTitle,
  scrollToGroup,
  setIsSettingsOpen,
  setSettingsTab,
  settings,
  statusMessage,
  toggleSetting,
}: ReaderSidebarProps) {
  const hasAdjacentChapters = parentChapters.length > 1;
  const isRtl = settings.lyt.direction === 'rtl';
  const isAtFirstGroup = activeGroupIndex === 0;
  const isAtLastGroup =
    displayGroups.length > 0 && activeGroupIndex === displayGroups.length - 1;
  const isAtChapterStart = isRtl ? isAtLastGroup : isAtFirstGroup;
  const isAtChapterEnd = isRtl ? isAtFirstGroup : isAtLastGroup;
  const previousGroupDelta = isRtl ? 1 : -1;
  const nextGroupDelta = isRtl ? -1 : 1;
  const isImagesMode = folderMode === 'images';
  const orderedGroups =
    isRtl ? [...displayGroups].reverse() : displayGroups;
  const chapterSelectorLabel = isImagesMode
    ? parentChapters.length > 0
      ? (parentChapters[activeChapterIndex]?.name ?? 'Unknown chapter')
      : 'Chapter 1'
    : activeGroup
      ? pageLabel(activeGroup)
      : '0';

  const handleToggleSidebar = useCallback(() => {
    toggleSetting('apr', 'sidebar');
  }, [toggleSetting]);

  const handleClose = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      closeComicMode();
    },
    [closeComicMode],
  );

  const handlePreventDefault = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
    },
    [],
  );

  const handleJumpToStart = useCallback(() => {
    scrollToGroup(chapterStartGroupIndex);
  }, [chapterStartGroupIndex, scrollToGroup]);

  const handleOpenSettings = useCallback(() => {
    setSettingsTab('Reader');
    setIsSettingsOpen(true);
  }, [setIsSettingsOpen, setSettingsTab]);

  const handlePrevPage = useCallback(() => {
    if (isAtChapterStart && hasAdjacentChapters) {
      goToAdjacentChapter(-1);
      return;
    }

    goToAdjacentGroup(previousGroupDelta);
  }, [
    goToAdjacentChapter,
    goToAdjacentGroup,
    hasAdjacentChapters,
    isAtChapterStart,
    previousGroupDelta,
  ]);

  const handleNextPage = useCallback(() => {
    if (isAtChapterEnd && hasAdjacentChapters) {
      goToAdjacentChapter(1);
      return;
    }

    goToAdjacentGroup(nextGroupDelta);
  }, [
    goToAdjacentChapter,
    goToAdjacentGroup,
    hasAdjacentChapters,
    isAtChapterEnd,
    nextGroupDelta,
  ]);

  const handlePrevChapter = useCallback(() => {
    goToAdjacentChapter(-1);
  }, [goToAdjacentChapter]);

  const handleNextChapter = useCallback(() => {
    goToAdjacentChapter(1);
  }, [goToAdjacentChapter]);

  const handleChapterSelectChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextIndex = Number.parseInt(event.target.value, 10);
      if (Number.isNaN(nextIndex)) {
        return;
      }

      if (isImagesMode) {
        if (parentChapters.length > 0) {
          goToChapterAtIndex(nextIndex);
        }
        return;
      }

      scrollToGroup(
        getDisplayGroupIndex(
          nextIndex,
          displayGroups.length,
          settings.lyt.direction,
        ),
      );
    },
    [
      displayGroups.length,
      goToChapterAtIndex,
      isImagesMode,
      parentChapters.length,
      scrollToGroup,
      settings.lyt.direction,
    ],
  );

  const handlePageSelectChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const targetPage = Number.parseInt(event.target.value, 10);
      const targetGroupIndex = findGroupIndexForPage(displayGroups, targetPage);
      if (targetGroupIndex !== -1) {
        scrollToGroup(targetGroupIndex);
      }
    },
    [displayGroups, scrollToGroup],
  );

  const handleCyclePreload = useCallback(() => {
    cycleSetting('bhv', 'preload', PRELOAD_OPTIONS);
  }, [cycleSetting]);

  const handleCycleFit = useCallback(() => {
    cycleSetting('lyt', 'fit', FIT_OPTIONS);
  }, [cycleSetting]);

  const handleCycleDirection = useCallback(() => {
    cycleSetting('lyt', 'direction', DIRECTION_OPTIONS);
  }, [cycleSetting]);

  const handleCycleSpread = useCallback(() => {
    cycleSetting('lyt', 'spread', SPREAD_OPTIONS);
  }, [cycleSetting]);

  const handleTogglePinned = useCallback(() => {
    toggleSetting('apr', 'selPinned');
  }, [toggleSetting]);

  const handleTogglePreviews = useCallback(() => {
    toggleSetting('apr', 'previews');
  }, [toggleSetting]);

  const handlePreviewClick = useCallback(
    (event: MouseEvent<HTMLImageElement>) => {
      const groupIndex = Number.parseInt(
        event.currentTarget.dataset.groupIndex ?? '',
        10,
      );
      if (!Number.isNaN(groupIndex)) {
        scrollToGroup(groupIndex);
      }
    },
    [scrollToGroup],
  );

  return (
    <aside className="">
      <div
        className="hide-side UI Button MultiStateButton"
        data-tip="Show/hide sidebar [S]"
        data-tip-align="right"
        {...{ 'data-apr.sidebar': settings.apr.sidebar }}
        onClick={handleToggleSidebar}
        role="button"
        tabIndex={0}
      >
        <div className="hide-side-actual ico-btn" />
      </div>
      <header>
        <a className="ico-btn guya" href="/" onClick={handleClose} />
        <h1>
          <a href="#" onClick={handlePreventDefault}>
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
              onClick={handlePrevPage}
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
                <button className="ico-btn download-cancel" type="button" />
              </div>
            </div>
            <a className="rdr-share ico-btn " data-tip="Copy short link [R]" />
            <button
              className="ico-btn jump"
              data-tip="Jump to chapter... [J]"
              onClick={handleJumpToStart}
              type="button"
            />
            <button
              className="ico-btn search"
              data-tip="Search the manga... [Ctrl]+[F]"
              onClick={handleOpenSettings}
              style={{ display: 'none' }}
              type="button"
            />
          </div>
          <div className="rdr-selector-mid">
            <button
              className="rdr-selector-chap ico-btn prev"
              data-tip="Previous chapter [[]"
              onClick={handlePrevChapter}
              type="button"
            />
            <div className="rdr-vol-wrap UI FauxDrop">
              <label>
                {activePageNumber} / {imageIds.length}
              </label>
              <select
                className="UI List SimpleList"
                id="rdr-vol"
                onChange={handlePageSelectChange}
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
            <div className="rdr-chap-wrap UI FauxDrop">
              <label>{chapterSelectorLabel}</label>
              <select
                className="UI List SimpleList"
                disabled={isImagesMode && parentChapters.length === 0}
                id="rdr-chap"
                onChange={handleChapterSelectChange}
                value={String(
                  isImagesMode ? activeChapterIndex : logicalActiveGroupIndex,
                )}
              >
                {isImagesMode ? (
                  parentChapters.length > 0 ? (
                    parentChapters.map((chapter, index) => (
                      <option
                        className="UI SimpleListItem"
                        key={chapter.id}
                        value={String(index)}
                      >
                        {chapter.name}
                      </option>
                    ))
                  ) : (
                    <option className="UI SimpleListItem" value="0">
                      Chapter 1
                    </option>
                  )
                ) : (
                  orderedGroups.map((group, index) => (
                    <option
                      className="UI SimpleListItem"
                      key={group.id}
                      value={String(index)}
                    >
                      {pageLabel(group)}
                    </option>
                  ))
                )}
              </select>
            </div>
            <button
              className="rdr-selector-chap ico-btn next"
              data-tip="Next chapter []]"
              onClick={handleNextChapter}
              type="button"
            />
          </div>
          <div className="rdr-selector-bot">
            <button
              className="rdr-selector-vol ico-btn next"
              data-tip="Previous volume [,]"
              onClick={handleNextPage}
              type="button"
            />
            <div className="flex-spacer" />
            <button
              {...{ 'data-bhv.preload': settings.bhv.preload }}
              className="ico-btn hidden UI Button MultiStateButton"
              data-tip="Change preload [L]"
              onClick={handleCyclePreload}
              type="button"
            />
            <button
              {...{ 'data-lyt.fit': settings.lyt.fit }}
              className="ico-btn UI Button MultiStateButton"
              data-tip="Change fit mode [F]"
              onClick={handleCycleFit}
              type="button"
            />
            <button
              {...{ 'data-lyt.direction': settings.lyt.direction }}
              className="ico-btn UI Button MultiStateButton"
              data-tip="Change layout direction [D]"
              onClick={handleCycleDirection}
              type="button"
            />
            <button
              {...{ 'data-lyt.spread': settings.lyt.spread }}
              className="ico-btn UI Button MultiStateButton"
              data-tip="Change two-page mode [Q]"
              onClick={handleCycleSpread}
              type="button"
            />
            <button
              {...{ 'data-apr.selpinned': settings.apr.selPinned }}
              className="ico-btn UI Button MultiStateButton"
              data-tip="Pin page selector [N]"
              onClick={handleTogglePinned}
              type="button"
            />
            <button
              className="ico-btn"
              data-bind="settings_button"
              data-tip="Advanced settings... [O]"
              onClick={handleOpenSettings}
              type="button"
            />
          </div>
        </section>
        <section className="rdr-groups UI List Selector Tabs">
          <div className="UI SimpleListItem">Google Drive folder scan</div>
          <div className="is-active UI SimpleListItem">
            {imageIds.length} image pages detected
          </div>
        </section>

        <section className="rdr-previews">
          <div
            className="header UI Button MultiStateButton"
            {...{ 'data-apr.previews': settings.apr.previews }}
            onClick={handleTogglePreviews}
            role="button"
            tabIndex={0}
          >
            <span>Previews</span>
            <div className="ico-btn expander" data-tip="Show previews [P]" />
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
                  data-group-index={String(previewGroupIndex)}
                  key={id}
                  loading="lazy"
                  onClick={handlePreviewClick}
                  src={`${getImageUrl(id)}=w400-h380-p-k-rw-v1-nu-iv1?auditContext=thumbnail`}
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
  );
});
