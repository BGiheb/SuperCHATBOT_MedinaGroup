import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, MessageSquare, TrendingUp, QrCode, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatbots } from '@/contexts/ChatbotContext';
import ChatbotCard from '@/components/dashboard/ChatbotCard';
import StatsCard from '@/components/dashboard/StatsCard';
import CreateChatbotModal from '@/components/chatbots/CreateChatbotModal';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface UserStats {
  totalMessages: number;
  messagesTrend: string;
  messagesTrendUp: boolean;
  activeSessions: number;
  sessionsTrend: string;
  sessionsTrendUp: boolean;
  qrScans: number;
  qrScansTrend: string;
  qrScansTrendUp: boolean;
}

const Dashboard = () => {
  const { chatbots } = useChatbots();
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const itemsPerPage = 6;

  // Fetch user stats
  const { data: userStats, isLoading } = useQuery<UserStats>({
    queryKey: ['userStats'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');
      const res = await axios.get<UserStats>(
        `${import.meta.env.VITE_API_BASE_URL}/api/chatbots/user-stats`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return res.data;
    },
  });

  const stats = [
    {
      title: 'Total Chatbots',
      value: chatbots.length,
      icon: Users,
      trend: '+0%',
      trendUp: true,
    },
    {
      title: 'Total Messages',
      value: userStats?.totalMessages ?? 0,
      icon: MessageSquare,
      trend: userStats?.messagesTrend ?? '+0%',
      trendUp: userStats?.messagesTrendUp ?? true,
    },
    {
      title: 'Active Sessions',
      value: userStats?.activeSessions ?? 0,
      icon: TrendingUp,
      trend: userStats?.sessionsTrend ?? '+0%',
      trendUp: userStats?.sessionsTrendUp ?? true,
    },
    {
      title: 'QR Scans',
      value: userStats?.qrScans ?? 0,
      icon: QrCode,
      trend: userStats?.qrScansTrend ?? '+0%',
      trendUp: userStats?.qrScansTrendUp ?? true,
    },
  ];

  const totalPages = Math.ceil(chatbots.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedChatbots = chatbots.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold gradient-text mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your chatbots.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
          >
            <StatsCard {...stat} />
          </motion.div>
        ))}
      </motion.div>

      {/* Chatbots Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">Your Chatbots</h2>
            <p className="text-muted-foreground">
              Manage and monitor your AI assistants
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-primary hover:scale-105 transition-transform duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chatbot
          </Button>
        </div>

        {/* Chatbots Grid with Pagination */}
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
                    <ChatbotCard chatbot={chatbot} />
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
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-50">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No chatbots yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first chatbot to get started
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-primary hover:scale-105 transition-transform duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Chatbot
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Create Chatbot Modal */}
      <CreateChatbotModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  );
};

export default Dashboard;