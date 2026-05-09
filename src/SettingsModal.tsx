import { useState, type MouseEvent, type ReactNode } from 'react';

import {
  DIRECTION_OPTIONS,
  getResolvedTheme,
  HISTORY_UPDATE_OPTIONS,
  PRELOAD_OPTIONS,
  type ReaderSettings,
  SCROLL_SPEED_OPTIONS,
  type SettingsTab,
  SELECTOR_ANCHOR_OPTIONS,
  SPREAD_OPTIONS,
  THEME_OPTIONS,
  type ThemeName,
  ZOOM_OPTIONS,
  isCustomThemeDirty,
} from './useSettings';

interface SettingsModalProps {
  activeTab: SettingsTab;
  onClose: () => void;
  onTabChange: (tab: SettingsTab) => void;
  open: boolean;
  resetCustomTheme: () => void;
  settings: ReaderSettings;
  updateSetting: <
    TCategory extends keyof ReaderSettings,
    TKey extends keyof ReaderSettings[TCategory],
  >(
    category: TCategory,
    key: TKey,
    value: ReaderSettings[TCategory][TKey],
  ) => void;
}

type OptionValue = string | number | boolean;

function startCase(value: string) {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function SettingBlock({
  children,
  compact = false,
  nomobile = false,
  disabled = false,
  title,
}: {
  children: ReactNode;
  compact?: boolean;
  nomobile?: boolean;
  disabled?: boolean;
  title: string;
}) {
  const wrapperClasses = ['setting-wrapper', 'UI', 'SettingUnit'];
  if (compact) wrapperClasses.push('compact');
  if (nomobile) wrapperClasses.push('nomobile');

  const headerClasses = ['setting-header'];
  if (disabled) headerClasses.push('disabled');

  const fieldClasses = ['setting-field', 'UI', 'SettingDisplay'];
  if (disabled) fieldClasses.push('disabled');

  return (
    <div className={wrapperClasses.join(' ')}>
      <header className={headerClasses.join(' ')}>{title}</header>
      <div className={fieldClasses.join(' ')}>{children}</div>
    </div>
  );
}

function ButtonGroup<TValue extends OptionValue>({
  labels,
  onChange,
  selected,
  values,
}: {
  labels?: Partial<Record<`${TValue}`, string>>;
  onChange: (value: TValue) => void;
  selected: TValue;
  values: readonly TValue[];
}) {
  return (
    <div className="t-row UI ButtonGroup">
      <div className="t-1">
        {values.map((value) => (
          <div
            className={`ToggleButton UI Button${selected === value ? ' s' : ''}`}
            key={String(value)}
            onClick={() => onChange(value)}
            role="button"
            tabIndex={0}
          >
            <div className="ico-btn" />
            <span>{labels?.[`${value}`] ?? startCase(String(value))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BooleanGroup({
  falseLabel,
  onChange,
  trueLabel,
  value,
}: {
  falseLabel: string;
  onChange: (value: boolean) => void;
  trueLabel: string;
  value: boolean;
}) {
  return (
    <ButtonGroup
      labels={{ false: falseLabel, true: trueLabel }}
      onChange={onChange}
      selected={value}
      values={[true, false] as const}
    />
  );
}

function SliderGroup<TValue extends number>({
  onChange,
  options,
  ticks,
  value,
}: {
  onChange: (value: TValue) => void;
  options: readonly TValue[];
  ticks: ReactNode[];
  value: TValue;
}) {
  const selectedIndex = Math.max(
    0,
    options.findIndex((opt) => opt === value),
  );

  return (
    <div className="UI Slider">
      <div className="slider-wrap">
        <input
          className="slider-control"
          max={options.length - 1}
          min={0}
          onChange={(e) => onChange(options[Number(e.target.value)])}
          type="range"
          value={selectedIndex}
        />
        <div className="ticks">
          {ticks.map((tick, index) => (
            <i key={index}>{tick}</i>
          ))}
        </div>
      </div>
      <input
        className="slider-value"
        type="text"
        readOnly
        value={value === 100 && options.includes(100 as TValue) ? '∞' : value}
      />
    </div>
  );
}

function ThemeDropdown({
  onChange,
  selected,
  values,
}: {
  onChange: (value: ThemeName) => void;
  selected: ThemeName;
  values: readonly ThemeName[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="dropdown UI InputDropdown" onClick={() => setOpen(!open)}>
      <div className="input-container">
        <input
          type="text"
          placeholder={selected}
          className="dropbtn"
          readOnly
          value={selected}
        />
        <span className="arrd" />
      </div>
      <div
        className={`dropdown-content${open ? '' : ' hidden'}`}
        tabIndex={-1}
        style={{ height: 'unset' }}
      >
        {values.map((value) => (
          <button
            className="opts"
            key={value}
            onClick={(e) => {
              e.stopPropagation();
              onChange(value);
              setOpen(false);
            }}
            type="button"
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsContent({
  resetCustomTheme,
  settings,
  tab,
  updateSetting,
}: Omit<
  SettingsModalProps,
  'activeTab' | 'onClose' | 'onTabChange' | 'open'
> & {
  tab: SettingsTab;
}) {
  const resolvedTheme = getResolvedTheme(settings.thm);

  const themeValues = {
    accentCol:
      settings.thm.theme === 'Custom'
        ? settings.thm.accentCol
        : resolvedTheme.accent.toUpperCase(),
    primaryCol:
      settings.thm.theme === 'Custom'
        ? settings.thm.primaryCol
        : resolvedTheme.sidebar.toUpperCase(),
    readerBg:
      settings.thm.theme === 'Custom'
        ? settings.thm.readerBg
        : resolvedTheme.reader.toUpperCase(),
    textCol:
      settings.thm.theme === 'Custom'
        ? settings.thm.textCol
        : resolvedTheme.text.toUpperCase(),
  };

  const updateThemeColor = (
    key: 'primaryCol' | 'textCol' | 'accentCol' | 'readerBg',
    value: string,
  ) => {
    const normalizedValue = value.toUpperCase();

    if (settings.thm.theme !== 'Custom') {
      updateSetting('thm', 'primaryCol', resolvedTheme.sidebar.toUpperCase());
      updateSetting('thm', 'textCol', resolvedTheme.text.toUpperCase());
      updateSetting('thm', 'accentCol', resolvedTheme.accent.toUpperCase());
      updateSetting('thm', 'readerBg', resolvedTheme.reader.toUpperCase());
      updateSetting('thm', 'theme', 'Custom');
    }

    updateSetting('thm', key, normalizedValue);
  };

  return (
    <>
      <div className={`UI Dummy${tab === 'Reader' ? '' : ' is-hidden'}`}>
        <SettingBlock title="Page fit">
          <div className="UI ButtonGroup">
            <div className="t-row">
              <div className="t-1">
                <div
                  className={`ToggleButton UI Button${settings.lyt.fit === 'none' ? ' s' : ''}`}
                  onClick={() => updateSetting('lyt', 'fit', 'none')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="ico-btn" />
                  <span>Original size</span>
                </div>
              </div>
            </div>
            <div className="t-row">
              <div className="t-tooltip">Limit</div>
              <div className="t-1">
                <div
                  className={`ToggleButton UI Button${settings.lyt.fit === 'all_limit' ? ' s' : ''}`}
                  onClick={() => updateSetting('lyt', 'fit', 'all_limit')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="ico-btn" />
                  <span>All</span>
                </div>
                <div
                  className={`ToggleButton UI Button${settings.lyt.fit === 'width_limit' ? ' s' : ''}`}
                  onClick={() => updateSetting('lyt', 'fit', 'width_limit')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="ico-btn" />
                  <span>Width</span>
                </div>
                <div
                  className={`ToggleButton UI Button${settings.lyt.fit === 'height_limit' ? ' s' : ''}`}
                  onClick={() => updateSetting('lyt', 'fit', 'height_limit')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="ico-btn" />
                  <span>Height</span>
                </div>
              </div>
            </div>
            <div className="t-row">
              <div className="t-tooltip">Stretch</div>
              <div className="t-1">
                <div
                  className={`ToggleButton UI Button${settings.lyt.fit === 'all' ? ' s' : ''}`}
                  onClick={() => updateSetting('lyt', 'fit', 'all')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="ico-btn" />
                  <span>All</span>
                </div>
                <div
                  className={`ToggleButton UI Button${settings.lyt.fit === 'width' ? ' s' : ''}`}
                  onClick={() => updateSetting('lyt', 'fit', 'width')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="ico-btn" />
                  <span>Width</span>
                </div>
                <div
                  className={`ToggleButton UI Button${settings.lyt.fit === 'height' ? ' s' : ''}`}
                  onClick={() => updateSetting('lyt', 'fit', 'height')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="ico-btn" />
                  <span>Height</span>
                </div>
              </div>
            </div>
          </div>
        </SettingBlock>
        <SettingBlock
          nomobile
          disabled={[
            'none',
            'all_limit',
            'height_limit',
            'all',
            'height',
          ].includes(settings.lyt.fit)}
          title="Maximum page width"
        >
          <SliderGroup
            onChange={(value) => updateSetting('lyt', 'zoom', value)}
            options={ZOOM_OPTIONS}
            ticks={ZOOM_OPTIONS.map((val) => `${val}%`)}
            value={settings.lyt.zoom}
          />
        </SettingBlock>
        <SettingBlock title="Reader layout">
          <ButtonGroup
            labels={{
              ltr: 'Left-to-right',
              rtl: 'Right-to-left',
              ttb: 'Top-to-bottom',
            }}
            onChange={(value) => updateSetting('lyt', 'direction', value)}
            selected={settings.lyt.direction}
            values={DIRECTION_OPTIONS}
          />
        </SettingBlock>
        <SettingBlock compact title="Remove gaps in vertical view">
          <BooleanGroup
            falseLabel="Gaps applied"
            onChange={(value) => updateSetting('lyt', 'gap', value)}
            trueLabel="Gaps removed"
            value={settings.lyt.gap}
          />
        </SettingBlock>
        <SettingBlock title="2-page spread">
          <ButtonGroup
            labels={{
              '1': '1-page layout',
              '2': '2-page layout',
              '2-odd': '2-page layout, odd',
            }}
            onChange={(value) => updateSetting('lyt', 'spread', value)}
            selected={settings.lyt.spread}
            values={SPREAD_OPTIONS}
          />
        </SettingBlock>
      </div>

      <div className={`UI Dummy${tab === 'Behavior' ? '' : ' is-hidden'}`}>
        <SettingBlock title="Page preload">
          <SliderGroup
            onChange={(value) => updateSetting('bhv', 'preload', value)}
            options={PRELOAD_OPTIONS}
            ticks={['1', '2', '3', '4', '5', '6', '7', '8', '9', '∞']}
            value={settings.bhv.preload}
          />
        </SettingBlock>
        <SettingBlock
          nomobile
          title="Vertical scroll speed using keyboard arrows"
        >
          <SliderGroup
            onChange={(value) => updateSetting('bhv', 'scrollYDelta', value)}
            options={SCROLL_SPEED_OPTIONS}
            ticks={SCROLL_SPEED_OPTIONS.map((val) => `${val}px`)}
            value={settings.bhv.scrollYDelta}
          />
        </SettingBlock>
        <SettingBlock compact title="Reset page scroll after page flip">
          <BooleanGroup
            falseLabel="Leave it be"
            onChange={(value) => updateSetting('bhv', 'resetScroll', value)}
            trueLabel="Reset"
            value={settings.bhv.resetScroll}
          />
        </SettingBlock>
        <SettingBlock compact title="Turn pages by clicking">
          <BooleanGroup
            falseLabel="Disabled"
            onChange={(value) => updateSetting('bhv', 'clickTurnPage', value)}
            trueLabel="Turn page"
            value={settings.bhv.clickTurnPage}
          />
        </SettingBlock>
        <SettingBlock
          compact
          title="Turn pages with arrow keys in vertical view"
        >
          <BooleanGroup
            falseLabel="Disabled"
            onChange={(value) => updateSetting('bhv', 'arrowTurnPage', value)}
            trueLabel="Turn page"
            value={settings.bhv.arrowTurnPage}
          />
        </SettingBlock>
        <SettingBlock compact title="Enable swipe gestures">
          <BooleanGroup
            falseLabel="Swipe disabled"
            onChange={(value) => updateSetting('bhv', 'swipeGestures', value)}
            trueLabel="Swipe enabled"
            value={settings.bhv.swipeGestures}
          />
        </SettingBlock>
        <SettingBlock title="Browser history/back button behavior">
          <ButtonGroup
            labels={{
              all: 'Add every move to history',
              chap: 'Add every chapter to history',
              jump: 'Add every chapter and page skips',
              none: "Don't touch browser history",
              replace: 'Just change the page title',
            }}
            onChange={(value) => updateSetting('bhv', 'historyUpdate', value)}
            selected={settings.bhv.historyUpdate}
            values={HISTORY_UPDATE_OPTIONS}
          />
        </SettingBlock>
      </div>

      <div className={`UI Dummy${tab === 'Layout' ? '' : ' is-hidden'}`}>
        <SettingBlock nomobile title="Page selector position">
          <ButtonGroup
            labels={{ bottom: 'Bottom', left: 'Left' }}
            onChange={(value) => updateSetting('apr', 'selectorAnchor', value)}
            selected={settings.apr.selectorAnchor}
            values={SELECTOR_ANCHOR_OPTIONS}
          />
        </SettingBlock>
        <SettingBlock compact title="Pin page selector">
          <BooleanGroup
            falseLabel="Shown on hover"
            onChange={(value) => updateSetting('apr', 'selPinned', value)}
            trueLabel="Pinned"
            value={settings.apr.selPinned}
          />
        </SettingBlock>
        <SettingBlock compact title="Page selector: show page number">
          <BooleanGroup
            falseLabel="Hide page number"
            onChange={(value) => updateSetting('apr', 'selNum', value)}
            trueLabel="Show page number"
            value={settings.apr.selNum}
          />
        </SettingBlock>
        <SettingBlock
          compact
          nomobile
          title="Mouseover reader hints (next, prev)"
        >
          <BooleanGroup
            falseLabel="Hidden"
            onChange={(value) => updateSetting('apr', 'hoverinos', value)}
            trueLabel="Visible"
            value={settings.apr.hoverinos}
          />
        </SettingBlock>
        <SettingBlock compact nomobile title="Show sidebar">
          <BooleanGroup
            falseLabel="Hide sidebar"
            onChange={(value) => updateSetting('apr', 'sidebar', value)}
            trueLabel="Show sidebar"
            value={settings.apr.sidebar}
          />
        </SettingBlock>
        <SettingBlock compact nomobile title="Show previews">
          <BooleanGroup
            falseLabel="Hide previews"
            onChange={(value) => updateSetting('apr', 'previews', value)}
            trueLabel="Show previews"
            value={settings.apr.previews}
          />
        </SettingBlock>
      </div>

      <div className={`UI Dummy${tab === 'Themes' ? '' : ' is-hidden'}`}>
        <SettingBlock title="Reader Theme">
          <ThemeDropdown
            onChange={(value) => updateSetting('thm', 'theme', value)}
            selected={settings.thm.theme}
            values={THEME_OPTIONS}
          />
        </SettingBlock>
        <SettingBlock
          compact
          disabled={settings.thm.theme !== 'Custom'}
          title="Interface Color"
        >
          <button
            aria-label="toggle color picker dialog"
            className="UI ColorPicker"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'color';
              input.value = themeValues.primaryCol;
              input.oninput = (e) =>
                updateThemeColor(
                  'primaryCol',
                  (e.target as HTMLInputElement).value,
                );
              input.click();
            }}
            role="button"
            style={{ backgroundColor: themeValues.primaryCol }}
            type="button"
          />
        </SettingBlock>
        <SettingBlock
          compact
          disabled={settings.thm.theme !== 'Custom'}
          title="Text Color"
        >
          <button
            aria-label="toggle color picker dialog"
            className="UI ColorPicker"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'color';
              input.value = themeValues.textCol;
              input.oninput = (e) =>
                updateThemeColor(
                  'textCol',
                  (e.target as HTMLInputElement).value,
                );
              input.click();
            }}
            role="button"
            style={{ backgroundColor: themeValues.textCol }}
            type="button"
          />
        </SettingBlock>
        <SettingBlock
          compact
          disabled={settings.thm.theme !== 'Custom'}
          title="Accent Color"
        >
          <button
            aria-label="toggle color picker dialog"
            className="UI ColorPicker"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'color';
              input.value = themeValues.accentCol;
              input.oninput = (e) =>
                updateThemeColor(
                  'accentCol',
                  (e.target as HTMLInputElement).value,
                );
              input.click();
            }}
            role="button"
            style={{ backgroundColor: themeValues.accentCol }}
            type="button"
          />
        </SettingBlock>
        <SettingBlock
          compact
          disabled={settings.thm.theme !== 'Custom'}
          title="Reader Background"
        >
          <button
            aria-label="toggle color picker dialog"
            className="UI ColorPicker"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'color';
              input.value = themeValues.readerBg;
              input.oninput = (e) =>
                updateThemeColor(
                  'readerBg',
                  (e.target as HTMLInputElement).value,
                );
              input.click();
            }}
            role="button"
            style={{ backgroundColor: themeValues.readerBg }}
            type="button"
          />
        </SettingBlock>
        <SettingBlock
          compact
          disabled={
            settings.thm.theme !== 'Custom' || !isCustomThemeDirty(settings.thm)
          }
          title=""
        >
          <button
            className="reset-btn UI ResetButton"
            onClick={resetCustomTheme}
            type="button"
          >
            Reset
          </button>
        </SettingBlock>
      </div>

      {settings.adv && (
        <div className={`UI Dummy${tab === 'Advanced' ? '' : ' is-hidden'}`}>
          <SettingBlock title="Spread mode custom page count">
            <SliderGroup
              onChange={(value) => updateSetting('adv', 'spreadCount', value)}
              options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
              ticks={[
                '1p',
                '2p',
                '3p',
                '4p',
                '5p',
                '6p',
                '7p',
                '8p',
                '9p',
                '10p',
              ]}
              value={settings.adv.spreadCount}
            />
          </SettingBlock>
          <SettingBlock disabled title="Spread mode custom page offset">
            <SliderGroup
              onChange={(value) => updateSetting('adv', 'spreadOffset', value)}
              options={[0]}
              ticks={['0p']}
              value={settings.adv.spreadOffset}
            />
          </SettingBlock>
          <SettingBlock title="Number of parallel image downloads">
            <SliderGroup
              onChange={(value) =>
                updateSetting('adv', 'parallelDownloads', value)
              }
              options={[5, 10, 15, 20, 25, 30, 35, 40, 45, 50]}
              ticks={[
                '5',
                '10',
                '15',
                '20',
                '25',
                '30',
                '35',
                '40',
                '45',
                '50',
              ]}
              value={settings.adv.parallelDownloads}
            />
          </SettingBlock>
        </div>
      )}

      <div className={`UI About${tab === 'About' ? '' : ' is-hidden'}`}>
        <p className="muted"> </p>
        <p className="muted"> </p>
        <p className="muted">Powered by</p>
        <div className="cubari">
          <div />
        </div>
        <hr />
        <p>Reader code: Cubari.moe</p>
        <p>Userscript: Zennomi</p>
        <hr />
        <a
          href="https://github.com/zennomi/truyendrive"
          rel="noreferrer"
          target="_blank"
        >
          github
        </a>
        <hr />
        <p style={{ maxWidth: '15em', textAlign: 'center', lineHeight: 1.5 }}>
          TruyenDrive does not host any of the content you are viewing. Just
          like your computer does not store or own all the images you see on the
          internet, TruyenDrive is doing the same thing. We are simply a service
          that lets you view other data on the internet using our custom UI.
        </p>
      </div>
    </>
  );
}

export function SettingsModal({
  activeTab,
  onClose,
  onTabChange,
  open,
  resetCustomTheme,
  settings,
  updateSetting,
}: SettingsModalProps) {
  if (!open) {
    return null;
  }

  const tabs: SettingsTab[] = [
    'Reader',
    'Behavior',
    'Layout',
    'Themes',
    'Advanced',
    'About',
  ];

  return (
    <div
      className="LodaManager"
      onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="Loda-window UI Loda Loda_Settings"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        tabIndex={-1}
      >
        <aside>
          <button className="ico-btn close" onClick={onClose} type="button" />
          <header>Settings</header>
          <div className="settings-tabs UI List Selector Tabs">
            {tabs.map((tab) => (
              <div
                className={`UI Tab IconTab${activeTab === tab ? ' is-active' : ''}`}
                data-name={tab}
                key={tab}
                onClick={() => onTabChange(tab)}
                role="button"
                tabIndex={0}
              >
                <i className="ico-btn" />
                <span>{tab}</span>
                <i />
              </div>
            ))}
          </div>
        </aside>
        {/* @ts-ignore */}
        <content className="UI List Selector ContainerList">
          <SettingsContent
            resetCustomTheme={resetCustomTheme}
            settings={settings}
            tab={activeTab}
            updateSetting={updateSetting}
          />
          {/* @ts-ignore */}
        </content>
      </div>
    </div>
  );
}
