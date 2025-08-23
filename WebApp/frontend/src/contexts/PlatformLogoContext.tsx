import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PlatformLogoContextType {
  platformLogo: string | null;
  setPlatformLogo: (logo: string | null) => void;
  refreshPlatformLogo: () => Promise<void>;
}

const PlatformLogoContext = createContext<PlatformLogoContextType | undefined>(undefined);

export function PlatformLogoProvider({ children }: { children: ReactNode }) {
  const [platformLogo, setPlatformLogo] = useState<string | null>(null);

  const fetchPlatformLogo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token found, setting platformLogo to null');
        setPlatformLogo(null);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/platform/logo`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched Cloudinary logoUrl:', data.logoUrl);
        setPlatformLogo(data.logoUrl || null);
      } else {
        console.warn(`Failed to fetch platform logo: ${response.statusText}`);
        setPlatformLogo(null);
      }
    } catch (error) {
      console.error('Error fetching platform logo:', error);
      setPlatformLogo(null);
    }
  };

  useEffect(() => {
    fetchPlatformLogo();
  }, []); // Fetch on mount

  const refreshPlatformLogo = async () => {
    console.log('Refreshing platform logo...');
    await fetchPlatformLogo();
  };

  // Débogage pour vérifier les mises à jour
  useEffect(() => {
    console.log('PlatformLogo updated to:', platformLogo);
  }, [platformLogo]);

  return (
    <PlatformLogoContext.Provider value={{ platformLogo, setPlatformLogo, refreshPlatformLogo }}>
      {children}
    </PlatformLogoContext.Provider>
  );
}

export function usePlatformLogo() {
  const context = useContext(PlatformLogoContext);
  if (context === undefined) throw new Error('usePlatformLogo must be used within a PlatformLogoProvider');
  return context;
}