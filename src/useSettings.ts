import { useEffect, useState } from 'react';

export const FIT_OPTIONS = [
  'none',
  'all_limit',
  'width_limit',
  'height_limit',
  'all',
  'width',
  'height',
] as const;
export const DIRECTION_OPTIONS = ['ltr', 'ttb', 'rtl'] as const;
export const SPREAD_OPTIONS = ['1', '2', '2-odd'] as const;
export const PRELOAD_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100] as const;
export const ZOOM_OPTIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;
export const SCROLL_SPEED_OPTIONS = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
] as const;
export const SELECTOR_ANCHOR_OPTIONS = ['left', 'bottom'] as const;
export const HISTORY_UPDATE_OPTIONS = [
  'none',
  'replace',
  'chap',
  'jump',
  'all',
] as const;
export const THEME_OPTIONS = [
  'Cubari',
  'Classic',
  'Reaper',
  'Zaibatsu',
  'Light',
  'Custom',
] as const;

export type FitMode = (typeof FIT_OPTIONS)[number];
export type DirectionMode = (typeof DIRECTION_OPTIONS)[number];
export type SpreadMode = (typeof SPREAD_OPTIONS)[number];
export type ThemeName = (typeof THEME_OPTIONS)[number];
export type SelectorAnchor = (typeof SELECTOR_ANCHOR_OPTIONS)[number];
export type HistoryUpdateMode = (typeof HISTORY_UPDATE_OPTIONS)[number];

export interface ReaderSettings {
  lyt: {
    fit: FitMode;
    zoom: number;
    direction: DirectionMode;
    gap: boolean;
    spread: SpreadMode;
  };
  bhv: {
    preload: number;
    scrollYDelta: number;
    resetScroll: boolean;
    clickTurnPage: boolean;
    arrowTurnPage: boolean;
    swipeGestures: boolean;
    historyUpdate: HistoryUpdateMode;
  };
  apr: {
    selectorAnchor: SelectorAnchor;
    selPinned: boolean;
    selNum: boolean;
    hoverinos: boolean;
    sidebar: boolean;
    previews: boolean;
  };
  thm: {
    theme: ThemeName;
    primaryCol: string;
    textCol: string;
    accentCol: string;
    readerBg: string;
  };
  adv: {
    spreadCount: number;
    spreadOffset: number;
    parallelDownloads: number;
  };
}

export type SettingsTab =
  | 'Reader'
  | 'Behavior'
  | 'Layout'
  | 'Themes'
  | 'Advanced'
  | 'About';

export const THEME_PRESETS: Record<
  Exclude<ThemeName, 'Custom'>,
  { sidebar: string; reader: string; accent: string; text: string }
> = {
  Cubari: {
    sidebar: '#28292B',
    reader: '#000000',
    accent: '#B73636',
    text: '#EEEEEE',
  },
  Classic: {
    sidebar: '#3A3F44',
    reader: '#272B30',
    accent: '#B2DFFB',
    text: '#EEEEEE',
  },
  Reaper: {
    sidebar: '#272836',
    reader: '#121223',
    accent: '#487DE4',
    text: '#EEEEEE',
  },
  Zaibatsu: {
    sidebar: '#1D1D1D',
    reader: '#000000',
    accent: '#BA1F1F',
    text: '#EEEEEE',
  },
  Light: {
    sidebar: '#F1F4FF',
    reader: '#FFFFFF',
    accent: '#5889F0',
    text: '#2B2B2B',
  },
};

const STORAGE_KEY = 'truyendrive-reader-settings';
const LEGACY_STORAGE_KEY = 'settings';
const STORAGE_VERSION = 'truyendrive-reader-1';

const CUSTOM_THEME_DEFAULT = {
  primaryCol: THEME_PRESETS.Cubari.sidebar,
  readerBg: THEME_PRESETS.Cubari.reader,
  accentCol: THEME_PRESETS.Cubari.accent,
  textCol: THEME_PRESETS.Cubari.text,
} as const;

export const DEFAULT_SETTINGS: ReaderSettings = {
  lyt: {
    fit: 'width_limit',
    zoom: 100,
    direction: 'ltr',
    gap: false,
    spread: '1',
  },
  bhv: {
    preload: 3,
    scrollYDelta: 25,
    resetScroll: false,
    clickTurnPage: true,
    arrowTurnPage: false,
    swipeGestures: true,
    historyUpdate: 'replace',
  },
  apr: {
    selectorAnchor: 'left',
    selPinned: false,
    selNum: true,
    hoverinos: true,
    sidebar: true,
    previews: false,
  },
  thm: {
    theme: 'Cubari',
    ...CUSTOM_THEME_DEFAULT,
  },
  adv: {
    spreadCount: 1,
    spreadOffset: 0,
    parallelDownloads: 5,
  },
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function clampToOptions<T extends string | number>(
  value: unknown,
  options: readonly T[],
  fallback: T,
): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeColor(value: unknown, fallback: string) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return /^#[0-9a-f]{6}$/i.test(normalized)
    ? normalized.toUpperCase()
    : fallback;
}

function flattenSettings(settings: ReaderSettings) {
  return {
    'lyt.fit': settings.lyt.fit,
    'lyt.zoom': settings.lyt.zoom,
    'lyt.direction': settings.lyt.direction,
    'lyt.gap': settings.lyt.gap,
    'lyt.spread': settings.lyt.spread,
    'bhv.preload': settings.bhv.preload,
    'bhv.scrollYDelta': settings.bhv.scrollYDelta,
    'bhv.resetScroll': settings.bhv.resetScroll,
    'bhv.clickTurnPage': settings.bhv.clickTurnPage,
    'bhv.arrowTurnPage': settings.bhv.arrowTurnPage,
    'bhv.swipeGestures': settings.bhv.swipeGestures,
    'bhv.historyUpdate': settings.bhv.historyUpdate,
    'apr.selectorAnchor': settings.apr.selectorAnchor,
    'apr.selPinned': settings.apr.selPinned,
    'apr.selNum': settings.apr.selNum,
    'apr.hoverinos': settings.apr.hoverinos,
    'apr.sidebar': settings.apr.sidebar,
    'apr.previews': settings.apr.previews,
    'thm.theme': settings.thm.theme,
    'thm.primaryCol': settings.thm.primaryCol,
    'thm.textCol': settings.thm.textCol,
    'thm.accentCol': settings.thm.accentCol,
    'thm.readerBg': settings.thm.readerBg,
    'adv.spreadCount': settings.adv.spreadCount,
    'adv.spreadOffset': settings.adv.spreadOffset,
    'adv.parallelDownloads': settings.adv.parallelDownloads,
    VER: STORAGE_VERSION,
  };
}

function hydrateSettings(source: unknown): ReaderSettings {
  if (!isObject(source)) {
    return DEFAULT_SETTINGS;
  }

  return {
    lyt: {
      fit: clampToOptions(
        source['lyt.fit'],
        FIT_OPTIONS,
        DEFAULT_SETTINGS.lyt.fit,
      ),
      zoom: clampToOptions(
        source['lyt.zoom'],
        ZOOM_OPTIONS,
        DEFAULT_SETTINGS.lyt.zoom,
      ),
      direction: clampToOptions(
        source['lyt.direction'],
        DIRECTION_OPTIONS,
        DEFAULT_SETTINGS.lyt.direction,
      ),
      gap: asBoolean(source['lyt.gap'], DEFAULT_SETTINGS.lyt.gap),
      spread: clampToOptions(
        source['lyt.spread'],
        SPREAD_OPTIONS,
        DEFAULT_SETTINGS.lyt.spread,
      ),
    },
    bhv: {
      preload: clampToOptions(
        source['bhv.preload'],
        PRELOAD_OPTIONS,
        DEFAULT_SETTINGS.bhv.preload,
      ),
      scrollYDelta: clampToOptions(
        source['bhv.scrollYDelta'],
        SCROLL_SPEED_OPTIONS,
        DEFAULT_SETTINGS.bhv.scrollYDelta,
      ),
      resetScroll: asBoolean(
        source['bhv.resetScroll'],
        DEFAULT_SETTINGS.bhv.resetScroll,
      ),
      clickTurnPage: asBoolean(
        source['bhv.clickTurnPage'],
        DEFAULT_SETTINGS.bhv.clickTurnPage,
      ),
      arrowTurnPage: asBoolean(
        source['bhv.arrowTurnPage'],
        DEFAULT_SETTINGS.bhv.arrowTurnPage,
      ),
      swipeGestures: asBoolean(
        source['bhv.swipeGestures'],
        DEFAULT_SETTINGS.bhv.swipeGestures,
      ),
      historyUpdate: clampToOptions(
        source['bhv.historyUpdate'],
        HISTORY_UPDATE_OPTIONS,
        DEFAULT_SETTINGS.bhv.historyUpdate,
      ),
    },
    apr: {
      selectorAnchor: clampToOptions(
        source['apr.selectorAnchor'],
        SELECTOR_ANCHOR_OPTIONS,
        DEFAULT_SETTINGS.apr.selectorAnchor,
      ),
      selPinned: asBoolean(
        source['apr.selPinned'],
        DEFAULT_SETTINGS.apr.selPinned,
      ),
      selNum: asBoolean(source['apr.selNum'], DEFAULT_SETTINGS.apr.selNum),
      hoverinos: asBoolean(
        source['apr.hoverinos'],
        DEFAULT_SETTINGS.apr.hoverinos,
      ),
      sidebar: asBoolean(source['apr.sidebar'], DEFAULT_SETTINGS.apr.sidebar),
      previews: asBoolean(
        source['apr.previews'],
        DEFAULT_SETTINGS.apr.previews,
      ),
    },
    thm: {
      theme: clampToOptions(
        source['thm.theme'],
        THEME_OPTIONS,
        DEFAULT_SETTINGS.thm.theme,
      ),
      primaryCol: normalizeColor(
        source['thm.primaryCol'],
        DEFAULT_SETTINGS.thm.primaryCol,
      ),
      textCol: normalizeColor(
        source['thm.textCol'],
        DEFAULT_SETTINGS.thm.textCol,
      ),
      accentCol: normalizeColor(
        source['thm.accentCol'],
        DEFAULT_SETTINGS.thm.accentCol,
      ),
      readerBg: normalizeColor(
        source['thm.readerBg'],
        DEFAULT_SETTINGS.thm.readerBg,
      ),
    },
    adv: {
      spreadCount:
        typeof source['adv.spreadCount'] === 'number'
          ? source['adv.spreadCount']
          : DEFAULT_SETTINGS.adv.spreadCount,
      spreadOffset:
        typeof source['adv.spreadOffset'] === 'number'
          ? source['adv.spreadOffset']
          : DEFAULT_SETTINGS.adv.spreadOffset,
      parallelDownloads:
        typeof source['adv.parallelDownloads'] === 'number'
          ? source['adv.parallelDownloads']
          : DEFAULT_SETTINGS.adv.parallelDownloads,
    },
  };
}

function isPersistedSettingsPayload(value: unknown) {
  if (!isObject(value)) {
    return false;
  }

  if (value.VER === STORAGE_VERSION) {
    return true;
  }

  return (
    'lyt.fit' in value ||
    'bhv.preload' in value ||
    'apr.selectorAnchor' in value ||
    'thm.theme' in value
  );
}

function readStoredSettingsFromKey(key: string) {
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw) as unknown;
  return isPersistedSettingsPayload(parsed) ? hydrateSettings(parsed) : null;
}

function readStoredSettings() {
  try {
    const storedSettings = readStoredSettingsFromKey(STORAGE_KEY);
    if (storedSettings) {
      return storedSettings;
    }

    const legacySettings = readStoredSettingsFromKey(LEGACY_STORAGE_KEY);
    return legacySettings ?? DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function hexToRgb(color: string) {
  const cleaned = color.replace('#', '');
  return {
    b: Number.parseInt(cleaned.slice(4, 6), 16),
    g: Number.parseInt(cleaned.slice(2, 4), 16),
    r: Number.parseInt(cleaned.slice(0, 2), 16),
  };
}

function rgbToHex(value: number) {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0');
}

function colManipulate(color: string, delta: number) {
  const { r, g, b } = hexToRgb(color);
  return `#${rgbToHex(r + delta)}${rgbToHex(g + delta)}${rgbToHex(b + delta)}`.toUpperCase();
}

function getLuma(color: string) {
  const { r, g, b } = hexToRgb(color);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

export function getResolvedTheme(settings: ReaderSettings['thm']) {
  if (settings.theme === 'Custom') {
    return {
      accent: settings.accentCol,
      reader: settings.readerBg,
      sidebar: settings.primaryCol,
      text: settings.textCol,
    };
  }

  return THEME_PRESETS[settings.theme];
}

export function getThemeStyle(settings: ReaderSettings['thm']) {
  const resolved = getResolvedTheme(settings);
  const sidebarLuma = getLuma(resolved.sidebar);
  const readerLuma = getLuma(resolved.reader);
  const accentLuma = getLuma(resolved.accent);
  const sidebarRgb = hexToRgb(resolved.sidebar);
  const textRgb = hexToRgb(resolved.text);

  const lowContrast =
    Math.abs(sidebarRgb.r - textRgb.r) < 50 &&
    Math.abs(sidebarRgb.g - textRgb.g) < 50 &&
    Math.abs(sidebarRgb.b - textRgb.b) < 50;

  return {
    '--accentCol': resolved.accent,
    '--accentSelected': accentLuma > 160 ? '#111111' : '#FFFFFF',
    '--accentSelectedInvert': sidebarLuma < 160 ? '#444444' : '#CCCCCC',
    '--blackFlag': readerLuma > 100 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.7)',
    '--blackLight': sidebarLuma > 100 ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.2)',
    '--borderColor': sidebarLuma > 100 ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.7)',
    '--icoCol': resolved.text,
    '--prevCol': colManipulate(resolved.sidebar, -7),
    '--rdr-wb': readerLuma > 100 ? '1px' : '2px',
    '--rdrAncBottomWhite':
      readerLuma > 100 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.35)',
    '--rdrBorderL': readerLuma > 100 ? '3px' : '1px',
    '--readerBg': resolved.reader,
    '--rescueShade': lowContrast
      ? sidebarLuma > 200
        ? '0px 1px 1px rgba(0,0,0,0.6),0px -1px 1px rgba(0,0,0,0.6),-1px 0px 1px rgba(0,0,0,0.6),1px 0px 1px rgba(0,0,0,0.6)'
        : '0px 1px 1px rgba(255,255,255,0.6),0px -1px 1px rgba(255,255,255,0.6),-1px 0px 1px rgba(255,255,255,0.6),1px 0px 1px rgba(255,255,255,0.6)'
      : 'unset',
    '--sidebarCol': resolved.sidebar,
    '--sidebarColDark': colManipulate(resolved.sidebar, -15),
    '--sidebarColDarkA': `${colManipulate(resolved.sidebar, -15)}00`,
    '--sidebarColFocus':
      sidebarLuma > 100
        ? colManipulate(resolved.sidebar, -24)
        : colManipulate(resolved.sidebar, -27),
    '--textCol': resolved.text,
  } as Record<string, string>;
}

export function isCustomThemeDirty(settings: ReaderSettings['thm']) {
  return (
    settings.primaryCol !== CUSTOM_THEME_DEFAULT.primaryCol ||
    settings.readerBg !== CUSTOM_THEME_DEFAULT.readerBg ||
    settings.accentCol !== CUSTOM_THEME_DEFAULT.accentCol ||
    settings.textCol !== CUSTOM_THEME_DEFAULT.textCol
  );
}

export function useSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(readStoredSettings);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(flattenSettings(settings)),
      );
    } catch {
      // Ignore storage failures so the reader can still render.
    }
  }, [settings]);

  function updateSetting<
    TCategory extends keyof ReaderSettings,
    TKey extends keyof ReaderSettings[TCategory],
  >(category: TCategory, key: TKey, value: ReaderSettings[TCategory][TKey]) {
    setSettings((current) => ({
      ...current,
      [category]: {
        ...current[category],
        [key]: value,
      },
    }));
  }

  function cycleSetting<
    TCategory extends keyof ReaderSettings,
    TKey extends keyof ReaderSettings[TCategory],
  >(
    category: TCategory,
    key: TKey,
    options: readonly ReaderSettings[TCategory][TKey][],
  ) {
    setSettings((current) => {
      const currentValue = current[category][key];
      const currentIndex = options.findIndex(
        (option) => option === currentValue,
      );
      const nextIndex =
        currentIndex === -1 ? 0 : (currentIndex + 1) % options.length;

      return {
        ...current,
        [category]: {
          ...current[category],
          [key]: options[nextIndex],
        },
      };
    });
  }

  function toggleSetting<
    TCategory extends keyof ReaderSettings,
    TKey extends keyof ReaderSettings[TCategory],
  >(category: TCategory, key: TKey) {
    setSettings((current) => ({
      ...current,
      [category]: {
        ...current[category],
        [key]: !current[category][key] as ReaderSettings[TCategory][TKey],
      },
    }));
  }

  function resetCustomTheme() {
    setSettings((current) => ({
      ...current,
      thm: {
        ...current.thm,
        theme: 'Custom',
        ...CUSTOM_THEME_DEFAULT,
      },
    }));
  }

  return {
    cycleSetting,
    resetCustomTheme,
    settings,
    toggleSetting,
    updateSetting,
  };
}
