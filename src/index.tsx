// src/index.tsx

// --- ДОБАВЬТЕ ЭТУ СТРОКУ В САМОМ ВЕРХУ ---
import './utils/telegram-mock.ts';
// ------------------------------------------

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LocalizationProvider } from './core/context/LocalizationContext.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LocalizationProvider>
      <App />
    </LocalizationProvider>
  </React.StrictMode>
);