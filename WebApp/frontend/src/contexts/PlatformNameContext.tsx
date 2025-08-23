import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PlatformNameContextType {
  platformName: string;
  setPlatformName: (name: string) => void;
}

const PlatformNameContext = createContext<PlatformNameContextType | undefined>(undefined);

export const PlatformNameProvider = ({ children }: { children: ReactNode }) => {
  const [platformName, setPlatformName] = useState<string>('Medina Chatbot');

  // Load platform name from localStorage on mount
  useEffect(() => {
    const storedName = localStorage.getItem('platformName');
    if (storedName) {
      setPlatformName(storedName);
    }
  }, []);

  // Update localStorage when platformName changes
  const handleSetPlatformName = (name: string) => {
    setPlatformName(name);
    localStorage.setItem('platformName', name);
  };

  return (
    <PlatformNameContext.Provider value={{ platformName, setPlatformName: handleSetPlatformName }}>
      {children}
    </PlatformNameContext.Provider>
  );
};

export const usePlatformName = () => {
  const context = useContext(PlatformNameContext);
  if (!context) {
    throw new Error('usePlatformName must be used within a PlatformNameProvider');
  }
  return context;
};