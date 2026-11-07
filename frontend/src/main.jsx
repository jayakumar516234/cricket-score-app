import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { MenuConfigProvider } from './context/MenuConfigContext.jsx';
import './i18n/i18n.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MenuConfigProvider>
          <App />
        </MenuConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        reg.update();
      })
      .catch((err) => {
        console.warn('SW registration failed:', err);
      });
  });
}
