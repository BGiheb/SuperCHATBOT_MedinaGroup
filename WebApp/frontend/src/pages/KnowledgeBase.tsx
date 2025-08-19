import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Search, Filter, FileText, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChatbots } from '@/contexts/ChatbotContext';
import UploadZone from '@/components/knowledge-base/UploadZone';
import DocumentsList from '@/components/knowledge-base/DocumentsList';

const KnowledgeBase = () => {
  const { chatbots, selectedChatbot, selectChatbot } = useChatbots();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold gradient-text mb-2">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Manage documents and training data for your chatbots
        </p>
      </motion.div>

      {/* Chatbot Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-card p-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Select Chatbot</label>
            <Select
              value={selectedChatbot?.id.toString() || ''} // Convert to string for Select
              onValueChange={(value) => {
                console.log('Selected chatbot ID:', value); // Debug log
                const chatbot = chatbots.find((c) => c.id === parseInt(value)) || null;
                selectChatbot(chatbot);
              }}
            >
              <SelectTrigger className="bg-glass/50 border-glass-border">
                <SelectValue placeholder="Choose a chatbot to manage..." />
              </SelectTrigger>
              <SelectContent className="glass-card border-glass-border">
                {chatbots.map((chatbot) => {
                  const isLogoUrl = chatbot.logo && chatbot.logo.startsWith('http');
                  return (
                    <SelectItem key={chatbot.id} value={chatbot.id.toString()}>
                      <div className="flex items-center space-x-2">
                        {isLogoUrl ? (
                          <img
                            src={chatbot.logo}
                            alt={`${chatbot.name} logo`}
                            className="w-6 h-6 object-cover rounded-full"
                          />
                        ) : (
                          chatbot.logo || <Bot className="w-6 h-6" />
                        )}
                        <span>{chatbot.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedChatbot && (
            <Button
              onClick={() => setShowUpload(true)}
              className="bg-gradient-primary hover:scale-105 transition-transform duration-200"
            >
              <Upload className="w-4 h-4 mr-2" />
              Add Documents
            </Button>
          )}
        </div>
      </motion.div>

      {selectedChatbot ? (
        <>
          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search documents..."
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

          {/* Documents List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <DocumentsList
              chatbotId={selectedChatbot.id} // Pass as number
              searchQuery={searchQuery}
            />
          </motion.div>

          {/* Upload Modal */}
          <UploadZone
            open={showUpload}
            onOpenChange={setShowUpload}
            chatbotId={selectedChatbot.id}
          />
        </>
      ) : (
        <motion.div
          className="text-center py-12 glass-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-50">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Select a Chatbot</h3>
          <p className="text-muted-foreground mb-6">
            Choose a chatbot to manage its knowledge base
          </p>
        </motion.div>
      )}

      {/* Floating Action Button for Mobile */}
      {selectedChatbot && (
        <div className="fab md:hidden" onClick={() => setShowUpload(true)}>
          <Upload className="w-6 h-6 text-white" />
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;