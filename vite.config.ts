import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    monkey({
      entry: 'src/main.tsx',
      userscript: {
        name: 'TruyenDrive',
        namespace: 'http://tampermonkey.net/',
        version: '2.0.0',
        description: 'Best Comic Reader for Google Drive',
        author: 'Zennomi',
        match: [
          'https://drive.google.com/drive/*',
          'https://drive.google.com/file/*',
          'https://onedrive.live.com/*',
        ],
        icon: 'https://zennomi.github.io/truyendrive/icon.webp',
        updateURL:
          'https://zennomi.github.io/truyendrive/truyendrive-userscript.meta.js',
        downloadURL:
          'https://zennomi.github.io/truyendrive/truyendrive-userscript.user.js',
      },
      build: {
        metaFileName: true,
      },
    }),
  ],
});
