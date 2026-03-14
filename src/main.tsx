import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { ToastProvider } from './components/ui/ToastProvider.tsx';
import { getStoredAuthToken } from './lib/auth-storage.ts';
import './index.css';

const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const token = getStoredAuthToken();

  if (!token || !requestUrl.startsWith('/api/')) {
    return originalFetch(input, init);
  }

  const headers = new Headers(init?.headers ?? {});
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return originalFetch(input, {
    ...init,
    headers,
  });
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
