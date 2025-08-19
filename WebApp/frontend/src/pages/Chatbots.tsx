import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChatbots } from '@/contexts/ChatbotContext';
import ChatbotCard from '@/components/dashboard/ChatbotCard';
import CreateChatbotModal from '@/components/chatbots/CreateChatbotModal';
import React from 'react';

const ITEMS_PER_PAGE = 6; // Consistent with Dashboard.tsx

const Chatbots = () => {
  const { chatbots } = useChatbots();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredChatbots = chatbots.filter((chatbot) =>
    chatbot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chatbot.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredChatbots.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedChatbots = filteredChatbots.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top for better UX
  };

  // Reset to page 1 when search query changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-bold gradient-text mb-2">Chatbots</h1>
          <p className="text-muted-foreground">
            Create and manage your AI assistants
          </p>
        </div>
        
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-primary hover:scale-105 transition-transform duration-200 sm:w-auto w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chatbot
        </Button>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search chatbots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-glass/50 border-glass-border"
          />
        </div>
        
        <Button variant="outline" className="bg-glass/50 border-glass-border">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </motion.div>

      {/* Chatbots Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {filteredChatbots.length > 0 ? (
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
                      type: "spring",
                      stiffness: 100,
                    }}
                  >
                    <ChatbotCard chatbot={chatbot} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination Controls (Aligned with Dashboard.tsx) */}
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
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-50">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery ? 'No chatbots found' : 'No chatbots yet'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? `No chatbots match "${searchQuery}"`
                : 'Create your first chatbot to get started'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-primary hover:scale-105 transition-transform duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Chatbot
              </Button>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Floating Action Button for Mobile */}
      <div className="fab md:hidden" onClick={() => setShowCreateModal(true)}>
        <Plus className="w-6 h-6 text-white" />
      </div>

      {/* Create Chatbot Modal */}
      <CreateChatbotModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  );
};

export default Chatbots;