// login.tsx (updated)
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Bot, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '@/contexts/UserContext';
import { usePlatformName } from '@/contexts/PlatformNameContext';
import { usePlatformLogo } from '@/contexts/PlatformLogoContext'; // New context import
import axios from 'axios';
import { LoginResponse } from '@/types/auth';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const { refreshUser } = useUser();
  const { platformName } = usePlatformName();
  const { platformLogo } = usePlatformLogo(); // Use the new context

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const res = await axios.post<LoginResponse>(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login`, {
        email,
        password,
      });
      localStorage.setItem('token', res.data.token);
      await refreshUser();
      setIsLoading(false);
      navigate('/dashboard');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Login failed');
      setIsLoading(false);
      toast({
        title: 'Error',
        description: e.response?.data?.message || 'Login failed',
        variant: 'destructive',
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: (e.clientX - rect.left - rect.width / 2) / 20,
      y: (e.clientY - rect.top - rect.height / 2) / 20,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10"
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      <div className="absolute inset-0 overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-gradient-primary rounded-full opacity-30"
            animate={{
              x: [0, Math.random() * 200 - 100],
              y: [0, Math.random() * 200 - 100],
              scale: [1, Math.random() * 2 + 0.5, 1],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: Math.random() * 15 + 10,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <motion.button
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-10 w-12 h-12 rounded-xl glass-card flex items-center justify-center hover:scale-110 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={{ rotate: theme === 'dark' ? 0 : 180 }}
          transition={{ duration: 0.3 }}
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </motion.div>
      </motion.button>

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        onMouseMove={handleMouseMove}
        style={{
          transform: `perspective(1000px) rotateX(${mousePosition.y}deg) rotateY(${mousePosition.x}deg)`,
        }}
      >
        <motion.div
          className="glass-card p-8 neon-glow relative"
          animate={{
            boxShadow:
              theme === 'dark'
                ? '0 0 50px rgba(139, 92, 246, 0.3)'
                : '0 0 50px rgba(59, 130, 246, 0.3)',
          }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 pulse-glow">
              {platformLogo ? (
                <img src={platformLogo} alt="Platform Logo" className="w-8 h-8 object-contain" />
              ) : (
                <Bot className="w-8 h-8 text-white" />
              )}
            </div>
            <h1 className="text-3xl font-bold gradient-text mb-2">{`Welcome to ${platformName}`}</h1>
            <p className="text-muted-foreground">Sign in to your {platformName}</p>
          </motion.div>

          <motion.form
            onSubmit={handleLogin}
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@example.com"
                  className="bg-glass/50 border-glass-border pl-10 h-12 text-base focus:ring-2 focus:ring-primary/50 transition-all duration-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="bg-glass/50 border-glass-border pl-10 pr-12 h-12 text-base focus:ring-2 focus:ring-primary/50 transition-all duration-200"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <motion.div
                    animate={{ rotate: showPassword ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </motion.div>
                </Button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
              >
                <motion.div animate={{ x: [0, -5, 5, -5, 0] }} transition={{ duration: 0.4 }}>
                  {error}
                </motion.div>
              </motion.div>
            )}

            <motion.div
              className="relative overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-primary text-white font-semibold text-base relative overflow-hidden"
                disabled={isLoading}
              >
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.6 }}
                />
                <span className="relative z-10">
                  {isLoading ? (
                    <motion.div className="flex items-center justify-center space-x-2">
                      <motion.div
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      <span>Signing In...</span>
                    </motion.div>
                  ) : (
                    'Sign In'
                  )}
                </span>
              </Button>
            </motion.div>
          </motion.form>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;