import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ProviderProvider } from './contexts/ProviderContext';
import { GoogleDriveProvider } from './providers/google-drive';
import { OneDriveProvider } from './providers/one-drive';
import shadowStyles from './assets/styles/index.css?inline';
import fontStyles from './assets/styles/font.css?inline';

// 1. Extract and inject the font-face globally into the document <head>
const globalStyle = document.createElement('style');
globalStyle.textContent = fontStyles;
document.head.appendChild(globalStyle);

const host = document.createElement('div');
host.id = 'truyendrive-reader-host';
document.body.append(host);

const shadowRoot = host.attachShadow({ mode: 'open' });
const mountNode = document.createElement('div');
shadowRoot.append(mountNode);
const provider =
  window.location.hostname === 'onedrive.live.com'
    ? new OneDriveProvider()
    : new GoogleDriveProvider();

ReactDOM.createRoot(mountNode).render(
  <React.StrictMode>
    <style>{shadowStyles}</style>
    <ProviderProvider provider={provider}>
      <App />
    </ProviderProvider>
  </React.StrictMode>,
);
