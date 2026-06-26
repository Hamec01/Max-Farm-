import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { LoadingScreen, useAssetPreloader } from './components/LoadingScreen.tsx';
import './index.css';

function Root() {
  const { ready, progress } = useAssetPreloader();
  return (
    <ErrorBoundary>
      <App />
      {!ready && <LoadingScreen progress={progress} />}
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
