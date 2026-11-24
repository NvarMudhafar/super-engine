import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted, so no request ever leaves for a font CDN. Each file covers one
// script range; the browser only downloads the ones a page actually uses.
import '@fontsource-variable/readex-pro';
import '@fontsource-variable/baloo-bhaijaan-2';
import { App } from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
