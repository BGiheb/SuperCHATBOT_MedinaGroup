import { useEffect } from 'react';
import { usePlatformLogo } from '@/contexts/PlatformLogoContext';

const FaviconUpdater = () => {
  const { platformLogo } = usePlatformLogo();

  useEffect(() => {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    if (platformLogo) {
      link.href = platformLogo;
      console.log('Favicon updated to custom logo:', platformLogo);
    } else {
      // Use data URL for default SVG when logo is deleted
      const defaultSvg = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bot w-6 h-6 text-white"%3E%3Cpath d="M12 8V4H8"%3E%3C/path%3E%3Crect width="16" height="12" x="4" y="8" rx="2"%3E%3C/rect%3E%3Cpath d="M2 14h2"%3E%3C/path%3E%3Cpath d="M20 14h2"%3E%3C/path%3E%3Cpath d="M15 13v2"%3E%3C/path%3E%3Cpath d="M9 13v2"%3E%3C/path%3E%3C/svg%3E';
      link.href = defaultSvg;
      console.log('Favicon reverted to default SVG');
    }
  }, [platformLogo]);

  return null;
};

export default FaviconUpdater;