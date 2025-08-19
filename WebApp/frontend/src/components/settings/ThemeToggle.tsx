import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/contexts/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <Sun className="w-4 h-4 text-muted-foreground" />
        <Switch
          checked={theme === 'dark'}
          onCheckedChange={toggleTheme}
          className="data-[state=checked]:bg-gradient-primary"
        />
        <Moon className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <motion.div
        key={theme}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="text-sm font-medium capitalize"
      >
        {theme} Mode
      </motion.div>
    </div>
  );
};

export default ThemeToggle;