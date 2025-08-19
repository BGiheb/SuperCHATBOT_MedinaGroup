import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, User, Clock, ChevronDown, ChevronRight, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useChatbots } from '@/contexts/ChatbotContext';
import { useToast } from '@/components/ui/use-toast';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

interface Conversation {
  id: string;
  userId: number;
  userName: string;
  userEmail: string | null;
  isAnonymous: boolean;
  chatbotId: number;
  chatbotName: string;
  chatbotLogo: string | null;
  chatbotPrimaryColor: string | null;
  lastMessage: string;
  messageCount: number;
  createdAt: string;
  status: 'active' | 'ended';
  messages: Message[];
  botMessages: Message[];
}

interface ConversationsListProps {
  searchQuery: string;
  conversations: Conversation[];
  setConversations?: (conversations: Conversation[]) => void;
}

const ConversationsList = ({ searchQuery, conversations, setConversations }: ConversationsListProps) => {
  const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());
  const { chatbots } = useChatbots();
  const { toast } = useToast();

  const getChatbotInfo = (chatbotId: number) => {
    return chatbots.find((bot) => bot.id === chatbotId);
  };

  const toggleExpanded = (conversationId: string) => {
    const newExpanded = new Set(expandedConversations);
    if (newExpanded.has(conversationId)) {
      newExpanded.delete(conversationId);
    } else {
      newExpanded.add(conversationId);
    }
    setExpandedConversations(newExpanded);
  };

  return (
    <div className="space-y-4">
      {conversations.length > 0 ? (
        <div className="space-y-3">
          {conversations.map((conversation, index) => {
            const chatbot = getChatbotInfo(conversation.chatbotId);
            const isExpanded = expandedConversations.has(conversation.id);
            const allMessages = [
              ...conversation.messages,
              ...conversation.botMessages,
            ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            const logo = chatbot?.logo || conversation.chatbotLogo;
            const isLogoUrl = logo && logo.startsWith('http');

            return (
              <motion.div
                key={conversation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="glass-card overflow-hidden"
              >
                {/* Conversation Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-glass/30 transition-colors"
                  onClick={() => toggleExpanded(conversation.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      {chatbot && (
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                          style={{ backgroundColor: `${chatbot.primaryColor || conversation.chatbotPrimaryColor || '#000000'}20` }}
                        >
                          {isLogoUrl ? (
                            <img
                              src={logo}
                              alt={`${chatbot?.name || conversation.chatbotName || 'Chatbot'} logo`}
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            logo || <Bot className="w-6 h-6" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold truncate">
                            {chatbot?.name || conversation.chatbotName || 'Unknown Chatbot'}
                          </h3>
                          <Badge
                            variant={conversation.status === 'active' ? 'default' : 'secondary'}
                            className={conversation.status === 'active' ? 'bg-green-500/20 text-green-500' : ''}
                          >
                            {conversation.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span>{conversation.isAnonymous ? 'Anonymous' : conversation.userName || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{conversation.messageCount || 0} messages</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {conversation.createdAt
                                ? new Date(conversation.createdAt).toLocaleString()
                                : 'Unknown'}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 truncate">
                          Last: {conversation.lastMessage || 'No messages'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="icon" className="ml-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Messages */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-glass-border bg-glass/20"
                    >
                      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                        {allMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs px-3 py-2 rounded-lg ${
                                message.sender === 'user'
                                  ? 'bg-primary text-primary-foreground ml-8'
                                  : 'bg-glass/50 mr-8'
                              }`}
                            >
                              <p className="text-sm">{message.content || 'Empty message'}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {message.timestamp
                                  ? new Date(message.timestamp).toLocaleString()
                                  : 'Unknown'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div
          className="text-center py-12 glass-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-50">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery
              ? `No conversations match "${searchQuery}"`
              : 'Conversations will appear here once users start chatting with your bots'}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default ConversationsList;