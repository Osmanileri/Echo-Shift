import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MobileSimulator } from './components/MobileSimulator';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const isEmbed = window.location.search.includes('embed=true');
const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isNarrowScreen = window.innerWidth <= 768;
const isCapacitor = typeof (window as any).Capacitor !== 'undefined';

const shouldShowSimulator = !isEmbed && !isCapacitor && (!isMobileUA && !isNarrowScreen);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      {shouldShowSimulator ? <MobileSimulator /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
);