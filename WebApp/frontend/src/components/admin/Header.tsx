import { useState, useEffect } from 'react';
import { Bell, Search, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const [userInitial, setUserInitial] = useState('A'); // Fallback to 'A' if no name

  // Fetch authenticated user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No token found');
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const data = await response.json();
        const name = data.name || '';
        setUserInitial(name.charAt(0).toUpperCase() || 'A'); // Use first letter or fallback to 'A'
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUserInitial('A'); // Fallback on error
      }
    };

    fetchUserData();
  }, []);

  return (
    <motion.header 
      className="h-16 border-b border-glass-border glass-card flex items-center justify-between px-4 md:px-6"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Left side - Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search chatbots, documents..."
            className="pl-10 bg-glass/50 border-glass-border"
          />
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="hover:bg-glass/50"
        >
          <motion.div
            key={theme}
            initial={{ rotate: -180, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </motion.div>
        </Button>

        <Button variant="ghost" size="icon" className="relative hover:bg-glass/50">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-primary rounded-full animate-pulse"></span>
        </Button>

        <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">{userInitial}</span>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;