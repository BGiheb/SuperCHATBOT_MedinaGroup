import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  QrCode,
  MessageSquare,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN'] },
  { name: 'Chatbots', href: '/chatbots', icon: Bot, roles: ['ADMIN'] },
  { name: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen, roles: ['ADMIN'] },
  { name: 'QR Codes', href: '/qr-codes', icon: QrCode, roles: ['ADMIN'] },
  { name: 'Chat History', href: '/chat-history', icon: MessageSquare, roles: ['ADMIN'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN'] },
];

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, setUser } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser({ id: 0, name: '', email: '', role: 'USER' });
    setIsOpen(false);
    navigate('/login', { replace: true });
  };

  const sidebarVariants = {
    closed: { x: '-100%' },
    open: { x: 0 },
  };

  const SidebarContent = () => (
    <div className="h-full glass-card border-r border-glass-border">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">QR Chat Studio</h1>
            <p className="text-sm text-muted-foreground">Admin Portal</p>
          </div>
        </div>
      </div>

      <nav className="px-3 pb-4">
        <ul className="space-y-2">
          {navigation
            .filter((item) => item.roles.includes(user.role))
            .map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                      'hover:bg-glass/50 hover:scale-105',
                      isActive
                        ? 'bg-gradient-primary text-white shadow-neon'
                        : 'text-muted-foreground hover:text-foreground'
                    )
                  }
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </NavLink>
              </li>
            ))}
        </ul>
      </nav>

      <div className="p-6 mt-auto">
        <Button
          variant="outline"
          className="w-full flex items-center gap-2"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden glass-card"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      <div className="hidden md:block w-72 min-h-screen">
        <SidebarContent />
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              variants={sidebarVariants}
              initial="closed"
              animate="open"
              exit="closed"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="fixed left-0 top-0 w-72 h-full z-50 md:hidden"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;