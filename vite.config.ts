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
        name: 'Google Drive Comic Reader',
        namespace: 'http://tampermonkey.net/',
        version: '1.0',
        description:
          'Displays images in a Google Drive folder as a long strip comic reader',
        author: 'Gemini',
        match: ['https://drive.google.com/drive/*'],
        icon: 'https://vitejs.dev/logo.svg',
      },
    }),
  ],
});
