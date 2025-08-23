// ChatHistory.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, MessageSquare, Calendar, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';
import ConversationsList from '@/components/chat-history/ConversationsList';

const ChatHistory = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalConversations: 0,
    todaysConversations: 0,
    activeUsers: 0,
  });
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch conversations and stats
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/conversations`,
          {
            params: { searchQuery },
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }
        );
        setConversations(response.data.conversations);
        setStats(response.data.stats);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        toast({
          title: 'Error',
          description: 'Failed to load conversations. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [searchQuery, toast]);

  // ---- Sorting (newest first) + Pagination ----
  const sortedConversations = [...conversations].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA; // newest first
  });

  const totalPages = Math.ceil(sortedConversations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedConversations = sortedConversations.slice(startIndex, startIndex + itemsPerPage);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center glass-card p-8">
          <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Loading Conversations</h1>
          <p className="text-muted-foreground">Please wait while we load your chat history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-4xl font-bold gradient-text mb-2">Chat History</h1>
        <p className="text-muted-foreground">View and analyze conversations across all your chatbots</p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Total Conversations</p>
            <p className="text-2xl font-bold gradient-text">{stats.totalConversations}</p>
          </div>
          <MessageSquare className="w-8 h-8 text-primary" />
        </div>

        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Today's Chats</p>
            <p className="text-2xl font-bold gradient-text">{stats.todaysConversations}</p>
          </div>
          <Calendar className="w-8 h-8 text-primary" />
        </div>

        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Active Users</p>
            <p className="text-2xl font-bold gradient-text">{stats.activeUsers}</p>
          </div>
          <User className="w-8 h-8 text-primary" />
        </div>
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // reset to first page when searching
            }}
            className="pl-10 bg-glass/50 border-glass-border"
          />
        </div>

        <Button variant="outline" className="bg-glass/50 border-glass-border">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </motion.div>

      {/* Conversations */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
        <ConversationsList searchQuery={searchQuery} conversations={paginatedConversations} />
      </motion.div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
          </Button>

          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;
