# Additional Conventions Beyond the Built-in Functions

As this project's AI coding tool, you must follow the additional conventions below, in addition to the built-in functions.

## Project overview

This repository is a Vite + React + TypeScript userscript built with `vite-plugin-monkey`.

The app injects a comic-reader UI into live cloud-storage pages instead of running as a standalone SPA:

- `vite.config.ts` builds the userscript bundle from `src/main.tsx`.
- The userscript currently matches both `https://drive.google.com/drive/*` and `https://onedrive.live.com/*`.
- Production output is emitted to `dist/*.user.js`, with a companion metadata file for userscript updates.

## Common commands

- Install dependencies: `pnpm install`
- Start the Vite dev server: `pnpm dev`
- Build the userscript bundle: `pnpm build`
- Preview the Vite build output: `pnpm preview`
- Run TypeScript project checks only: `pnpm exec tsc -b`
- Format the repo: `pnpm format`
- Check formatting only: `pnpm format:check`

## Testing and linting

- There is currently no automated test runner configured in `package.json`.
- There is currently no single-test command because no test framework is set up.
- There is currently no lint script configured in `package.json`.

## Architecture

### Build and mount model

- `vite.config.ts` owns userscript metadata such as `match`, `icon`, `updateURL`, and `downloadURL`.
- `src/main.tsx` chooses the active provider from `window.location.hostname`, injects font-face CSS into `document.head`, creates a host element on the live page, attaches a shadow root, and mounts React into that shadow tree.
- `src/assets/styles/index.css` is injected into the shadow root with `?inline`, while `src/assets/styles/font.css` is injected globally so the custom fonts remain available inside the reader UI.
- UI changes must account for both the shadow DOM boundary and the surrounding host page.

### Provider abstraction

- `src/providers/types.ts` defines the `DriveProvider` interface used by the rest of the app. Provider-specific logic is meant to stay behind this boundary.
- `src/contexts/ProviderContext.tsx` owns provider initialization and readiness state. It also watches for account/context changes and re-runs provider initialization when the active user changes.
- `src/providers/google-drive/index.ts` adapts Google Drive’s internal protojson item responses into the app’s `Chapter`, `ReaderImage`, and `FolderDetails` shapes. It supports both authenticated and guest access.
- `src/providers/one-drive/index.ts` adapts OneDrive `RenderListDataAsStream` responses into the same app-level shapes and caches per-CID metadata such as API base URLs, owner email, and view XML.
- `provider.getImageUrl()` and `provider.buildFetchUrl()` intentionally serve different consumers: visible/preloaded images use the display URL, while decrypt/fetch flows use the fetch URL.

### App and reader state flow

- `src/App.tsx` is the orchestration layer. It wires together provider access, persisted settings, folder/chapter loading, reader session/history state, scroll/navigation state, image decryption, preload, and overlay visibility.
- `src/hooks/useComicMode.ts` is the main content-loading state machine. It asks the current provider for paginated folder data, classifies folders as `chapters`, `images`, `mixed`, or `empty`, merges paginated results, and manages the transitions between launcher, mode picker, chapter list, and reader.
- Mixed folders are handled in two phases: the first fetched page is cached, the user chooses between chapter mode and image mode, and the chosen flow resumes without refetching that first page.
- Chapter-to-chapter transitions are coordinated across `App.tsx`, `useComicMode.ts`, `ReaderSidebar.tsx`, and `ReaderArea.tsx` rather than living in one isolated component.

### Reader layout, navigation, and history

- `src/lib/readerUtils.ts` contains the core page-grouping and URL/history helpers. `buildPageGroups()` is the central place for spread logic (`1`, `2`, `2-odd`) and direction handling (`ltr`, `rtl`, `ttb`).
- `src/hooks/useReaderControls.ts` splits behavior between page/group navigation and top-to-bottom scroll navigation.
- `src/hooks/useReaderHistory.ts` synchronizes browser history and document title while the reader is open.
- `src/hooks/useReaderSession.ts` snapshots the pre-reader URL/title and restores them when the reader closes.
- Reader state is encoded in URL query params, primarily `truyendrive-chap` and `truyendrive-page`, with hash parsing kept for older links.

### Settings, preload, and password-protected images

- `src/useSettings.ts` defines the full `ReaderSettings` schema, default values, theme presets, validation/hydration logic, and localStorage persistence.
- Settings are stored under `truyendrive-reader-settings`, with fallback support for the older `settings` key.
- `src/hooks/useReaderPreload.ts` preloads nearby groups based on the current group; a preload value of `100` means preload all groups.
- Password-protected folders are detected from files named `.password.<value>.truyendrive`, and the app also accepts a `?password=` query param.
- `src/hooks/useImageDecryptor.ts` and `src/lib/imageCrypto.ts` only decrypt the active/preloaded image window, so changes to fetch behavior, preload behavior, or provider image URLs need to stay aligned.

## Notes for future changes

- If you change where the userscript runs or how it mounts, inspect `vite.config.ts` and `src/main.tsx` together.
- If you change provider behavior or host compatibility, inspect `src/providers/types.ts`, `src/contexts/ProviderContext.tsx`, and the relevant provider implementation together.
- If you change folder scanning or item classification, inspect `src/hooks/useComicMode.ts` together with the provider that produces the folder page result.
- If you change navigation behavior, verify all three reading directions (`ltr`, `rtl`, `ttb`) and both single-page and spread layouts.
- If you change image fetching or decryption, verify `getImageUrl()`, `buildFetchUrl()`, preload behavior, and password mode together.
- Because the reader runs inside a live Google Drive or OneDrive page, UI changes that touch keyboard handling, body overflow, scrolling, or layout should be tested on an actual host page rather than only in isolated Vite preview output.
