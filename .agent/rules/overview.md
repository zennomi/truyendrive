---
trigger: always_on
---
## Project overview

This repository is a Vite + React + TypeScript userscript built with `vite-plugin-monkey`.

The app injects a comic-reader UI into Google Drive folder pages rather than running as a normal standalone SPA:

- `vite.config.ts` builds a browser-installable userscript from `src/main.tsx`.
- The userscript currently matches `https://drive.google.com/drive/*`.
- Production output is emitted to `dist/*.user.js`.

## Common commands

- Install dependencies: `pnpm install`
- Start the Vite dev server: `pnpm dev`
- Build the userscript bundle: `pnpm build`
- Preview the Vite build output: `pnpm preview`
- Run TypeScript project checks only: `pnpm exec tsc -b`
- Format the repo: `pnpm format`
- Check formatting only: `pnpm format:check`

## Testing and linting

- There is currently no test runner configured in `package.json`.
- There is currently no lint script configured in `package.json`.
- There is no single-test command yet because no test framework is set up.

## Architecture

### Build and injection model

- `vite.config.ts` uses `vite-plugin-monkey` with `entry: 'src/main.tsx'`; userscript metadata such as `match`, `name`, and `icon` lives there.
- `src/main.tsx` creates a host element on the live Google Drive page, attaches a shadow root, and mounts React into that shadow tree.
- `src/assets/styles/index.css` is injected into the shadow root with `?inline`, while `src/assets/styles/font.css` is injected into `document.head` so the font-face definitions are available globally.
- This means UI changes must account for both the shadow DOM boundary and the surrounding Google Drive page.

### Top-level app flow

- `src/App.tsx` is the orchestration layer for reader state. It combines:
  - `useComicMode` for folder detection, chapter/page loading, and reader open/close state
  - `useSettings` for persisted reader preferences and theme variables
  - `useReaderControls` for scrolling, page/group navigation, and transient overlays
  - `useReaderHistory` for browser title/history synchronization
  - `useReaderPreload` for nearby page preloading
- `src/components/AppErrorBoundary.tsx` is the top-level recovery path; if the reader crashes, it unmounts the reader surface and offers retry/reload actions.

### Google Drive data flow

- `src/lib/driveApi.ts` talks directly to Google Drive internal endpoints using `XMLHttpRequest` with `withCredentials`.
- Auth headers are derived from the page’s `SAPISID` cookie and the Drive build label exposed on `window`.
- Folder contents come back as array-shaped protojson responses, not typed REST objects.
- `src/hooks/useComicMode.ts` is the main loader for Drive data. It:
  - extracts the current folder ID from the Drive URL
  - fetches paginated folder contents using continuation tokens
  - classifies a folder as `chapters`, `images`, `mixed`, or `empty`
  - resolves Google Drive shortcut items recursively before classification
  - builds chapter lists from folder items and page lists from image items
- If a folder contains both subfolders and images, the mode picker is shown and the first fetched page is cached so the user can choose how to open it without refetching.

### Reader layout and navigation model

- `src/lib/readerUtils.ts` contains the core page-grouping and navigation helpers.
- `buildPageGroups` is the central place for spread logic (`1`, `2`, `2-odd`) and direction handling (`ltr`, `rtl`, `ttb`). If page order or grouping changes, inspect this file first.
- `src/components/ReaderArea.tsx` renders the actual image groups and handles click-to-turn, swipe gestures, scroll syncing, and eager vs lazy image loading.
- `src/components/ReaderSidebar.tsx`, `PageSelector.tsx`, `ZoomControls.tsx`, and `SettingsModal.tsx` provide the Cubari-style controls around the reading surface.
- Chapter-to-chapter transitions are coordinated between `App.tsx`, `useComicMode.ts`, and `ReaderSidebar.tsx`; they are not isolated to a single component.

### History, scrolling, and preload behavior

- `src/hooks/useReaderHistory.ts` owns synthetic browser history integration. Reader history state is marked with `truyendriveReader`, and URLs are updated with the `truyendrive-page-*` hash.
- `settings.bhv.historyUpdate` changes whether moves replace history, push every move, or only push larger jumps.
- `src/hooks/useReaderControls.ts` splits behavior between horizontal page/group navigation and top-to-bottom scrolling behavior.
- `src/hooks/useReaderPreload.ts` preloads nearby groups based on the current group and the configured preload distance; a preload value of `100` is treated as preload-all.

### Settings and persistence

- `src/useSettings.ts` defines the full `ReaderSettings` schema, default values, validation/hydration logic, theme presets, and localStorage persistence.
- Settings are stored under `truyendrive-reader-settings`, with fallback support for an older `settings` key.
- Theme colors are converted into CSS custom properties by `getThemeStyle` and applied inline to the reader root.

## Notes for future changes

- If you change where the userscript runs or how it mounts, inspect `vite.config.ts` and `src/main.tsx` together.
- If you change folder scanning or Google Drive compatibility, inspect `src/lib/driveApi.ts` and `src/hooks/useComicMode.ts` together.
- If you change navigation behavior, verify all three reading directions (`ltr`, `rtl`, `ttb`) and both single-page and spread layouts.
- If you change browser history behavior, verify open/close flows and back-button behavior with `settings.bhv.historyUpdate` modes.
- Because the reader runs inside a live Google Drive page, UI changes that touch keyboard handling, body overflow, or layout should be tested on an actual Drive folder page rather than only in isolated build output.
