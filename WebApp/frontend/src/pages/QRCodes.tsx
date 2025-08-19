import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query'; // Ajouter useQueryClient
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import QRCard from '@/components/qr-codes/QRCard';
import { User } from '@/types/user';
import { Chatbot } from '@/types/chatbot';
import { useState, useEffect } from 'react'; // Ajouter useEffect

const QRCodes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient(); // Ajouter queryClient
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Fetch user role
  const { data: user, isLoading: userLoading, error: userError } = useQuery<User | null>({
    queryKey: ['user'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token found for user fetch');
        return null;
      }
      try {
        const res = await axios.get<User>(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return res.data;
      } catch (e: any) {
        console.error('Error fetching user:', e.response?.data || e.message);
        throw e;
      }
    },
    retry: false,
  });

  // Fetch QR codes
  const { data: chatbots = [], isLoading, error } = useQuery<Chatbot[]>({
    queryKey: ['chatbots'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');
      const res = await axios.get<Chatbot[]>(`${import.meta.env.VITE_API_BASE_URL}/api/chatbots`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    retry: false,
    enabled: !!user,
  });

  // Mettre à jour la page courante lorsque la liste des chatbots change
  useEffect(() => {
    const totalPages = Math.ceil(chatbots.length / itemsPerPage);
    if (chatbots.length > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages); // Ajuster la page si elle dépasse le total
    }
  }, [chatbots.length, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(chatbots.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedChatbots = chatbots.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Fonction pour naviguer vers la dernière page après ajout
  const handleChatbotAdded = () => {
    const totalPages = Math.ceil(chatbots.length / itemsPerPage);
    setCurrentPage(totalPages); // Aller à la dernière page
  };

  // Écouter les mises à jour du cache des chatbots
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryKey[0] === 'chatbots' && event.type === 'updated') {
        handleChatbotAdded();
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  if (userLoading || isLoading) {
    return (
      <motion.div
        className="text-center py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw className="w-8 h-8 text-white" />
        </motion.div>
        <p className="text-muted-foreground">Loading QR codes...</p>
      </motion.div>
    );
  }

  if (userError || error) {
    const errorMessage = userError?.message || error?.message || 'Failed to load QR codes';
    console.error('Error in QRCodes:', errorMessage);
    toast({
      title: 'Error',
      description: errorMessage,
      variant: 'destructive',
    });
    return (
      <motion.div
        className="text-center py-12 glass-card"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h3 className="text-xl font-semibold mb-2">Error</h3>
        <p className="text-muted-foreground">{errorMessage}</p>
      </motion.div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold gradient-text mb-2">QR Codes</h1>
        <p className="text-muted-foreground">Generate and manage QR codes for your chatbots</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {chatbots.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <AnimatePresence>
                {paginatedChatbots.map((chatbot, index) => (
                  <motion.div
                    key={chatbot.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{
                      duration: 0.3,
                      delay: index * 0.1,
                      type: 'spring',
                      stiffness: 100,
                    }}
                  >
                    <QRCard chatbot={chatbot} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between p-4 glass-card border-glass-border"
              >
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="bg-glass/50 border-glass-border hover:bg-glass/80"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <div className="flex items-center space-x-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      onClick={() => handlePageChange(page)}
                      className={`w-10 h-10 p-0 ${
                        currentPage === page
                          ? 'bg-gradient-primary text-white'
                          : 'bg-glass/50 border-glass-border hover:bg-glass/80'
                      }`}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="bg-glass/50 border-glass-border hover:bg-glass/80"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}
          </div>
        ) : (
          <motion.div
            className="text-center py-12 glass-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-50">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No chatbots yet</h3>
            <p className="text-muted-foreground mb-6">
              {user.role === 'ADMIN'
                ? 'Create a chatbot first to generate QR codes'
                : 'You have no chatbots assigned'}
            </p>
            {user.role === 'ADMIN' && (
              <Button
                className="bg-gradient-primary hover:scale-105 transition-transform duration-200"
                onClick={() => navigate('/chatbots')}
              >
                Create First Chatbot
              </Button>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default QRCodes;