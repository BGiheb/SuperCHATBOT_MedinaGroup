import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { PlatformNameProvider } from './contexts/PlatformNameContext';
import { PlatformLogoProvider } from './contexts/PlatformLogoContext'; // Import the new context
import './index.css';
import FaviconUpdater from './components/FaviconUpdater'; // Import the new favicon updater component

createRoot(document.getElementById('root')!).render(
  <PlatformNameProvider>
    <PlatformLogoProvider>
      <FaviconUpdater /> {/* Add the favicon updater */}
      <App />
    </PlatformLogoProvider>
  </PlatformNameProvider>
);