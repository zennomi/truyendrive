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
        version: '1.0.1',
        description: 'Best Comic Reader for Google Drive',
        author: 'Zennomi',
        match: ['https://drive.google.com/drive/*'],
        icon: 'https://raw.githubusercontent.com/zennomi/truyendrive/main/src/assets/truyendrive.webp',
        updateURL:
          'https://raw.githubusercontent.com/zennomi/truyendrive/release/truyendrive-userscript.meta.js',
        downloadURL:
          'https://raw.githubusercontent.com/zennomi/truyendrive/release/truyendrive-userscript.user.js',
      },
      build: {
        metaFileName: true,
      },
    }),
  ],
});
