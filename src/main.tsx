import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ProfileProvider } from './state/ProfileContext';
import { DesktopLogin } from './screens/DesktopLogin';
import { detectDesktop } from './lib/desktopAuth';
import './index.css';

detectDesktop();

// página de login do app desktop, aberta no navegador do sistema
const desktopLogin = window.location.pathname === '/desktop-login';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {desktopLogin ? (
      <DesktopLogin />
    ) : (
      <ProfileProvider>
        <App />
      </ProfileProvider>
    )}
  </React.StrictMode>,
);
