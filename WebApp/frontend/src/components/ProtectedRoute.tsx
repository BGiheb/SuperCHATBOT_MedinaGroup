import { useState, useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { useChatbots } from '@/contexts/ChatbotContext';
import { useToast } from '@/components/ui/use-toast';
import { User } from '@/types/user';

interface ProtectedRouteProps {
  allowedRoles: ('ADMIN' | 'SUB_ADMIN' | 'USER')[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { user, setUser } = useUser();
  const { chatbots } = useChatbots();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (!isMounted.current) return;

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsAuthenticated(false);
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Invalid token');
        }

        const data = await response.json();
        setUser({ id: data.id, name: data.name || '', email: data.email || '', role: data.role || 'USER' });
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error verifying token:', error);
        setIsAuthenticated(false);
        // Only update user state if not already in default state to avoid unnecessary re-renders
        if (user.id !== 0 || user.name !== '' || user.email !== '' || user.role !== 'USER') {
          setUser({ id: 0, name: '', email: '', role: 'USER' });
        }
        toast({
          title: 'Authentication Error',
          description: 'Please log in to continue',
          variant: 'destructive',
        });
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    verifyToken();

    return () => {
      isMounted.current = false;
    };
  }, [setUser]); // Removed toast from dependencies to prevent re-runs

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    toast({
      title: 'Access Denied',
      description: 'You do not have permission to access this page',
      variant: 'destructive',
    });
    // Redirect sub-admins to their first chatbot or not-authorized if none exist
    const chatbotId = chatbots && chatbots.length > 0 ? chatbots[0].id : null;
    return <Navigate to={chatbotId ? `/c/${chatbotId}` : '/not-authorized'} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;