import { motion } from 'framer-motion';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const NotAuthorized = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <ShieldOff className="w-16 h-16 text-red-500 mb-4" />
      <h1 className="text-3xl font-bold text-foreground mb-2">Access Denied</h1>
      <p className="text-muted-foreground mb-6 text-center">
        You do not have permission to access this page. Please contact an administrator or try accessing a public chatbot.
      </p>
      <Button
        onClick={() => navigate('/login')}
        className="bg-gradient-primary hover:scale-105 transition-transform duration-200 text-white"
      >
        Return to Login
      </Button>
    </motion.div>
  );
};

export default NotAuthorized;