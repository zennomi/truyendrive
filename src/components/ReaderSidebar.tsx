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
  activePage: number;
  activePageNumber: number;
  closeComicMode: () => void;
  cycleSetting: CycleSetting;
  displayGroups: ReaderGroup[];
  goToAdjacentGroup: (delta: number) => void;
  imageIds: string[];
  readerTitle: string;
  scrollToGroup: (index: number, behavior?: ScrollBehavior) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setSettingsTab: (tab: SettingsTab) => void;
  settings: ReaderSettings;
  statusMessage: string;
  toggleSetting: ToggleSetting;
}

export function ReaderSidebar({
  activeGroup,
  activeGroupIndex,
  activePage,
  activePageNumber,
  closeComicMode,
  cycleSetting,
  displayGroups,
  goToAdjacentGroup,
  imageIds,
  readerTitle,
  scrollToGroup,
  setIsSettingsOpen,
  setSettingsTab,
  settings,
  statusMessage,
  toggleSetting,
}: ReaderSidebarProps) {
  return (
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
                <button className="ico-btn download-cancel" type="button" />
              </div>
            </div>
            <a className="rdr-share ico-btn " data-tip="Copy short link [R]" />
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
                  const nextIndex = Number.parseInt(event.target.value, 10);
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
                  const targetPage = Number.parseInt(event.target.value, 10);
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
              onClick={() => cycleSetting('bhv', 'preload', PRELOAD_OPTIONS)}
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
              onClick={() => cycleSetting('lyt', 'spread', SPREAD_OPTIONS)}
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
          <div className="UI SimpleListItem">Google Drive folder scan</div>
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
  );
}
