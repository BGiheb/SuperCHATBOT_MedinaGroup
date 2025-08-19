import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, Paperclip, Mic, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';
import ChatMessage from '@/components/public-chat/ChatMessage';
import TypingIndicator from '@/components/public-chat/TypingIndicator';

interface Chatbot {
  id: number;
  name: string;
  description?: string;
  primaryColor: string;
  logo: string;
  userId: number;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const PublicChat = () => {
  const { chatbotId } = useParams<{ chatbotId: string }>();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Retrieve or store userId in localStorage for anonymous users
  const [userId, setUserId] = useState<string | null>(
    localStorage.getItem(`chatbot_${chatbotId}_userId`)
  );

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to end the session
  const endSession = async () => {
    if (!chatbotId || !userId) return;
    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/chatbots/${chatbotId}/end-session`,
        {
          chatbotId,
          userId,
        }
      );
      console.log('Session ended successfully');
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  // Handle component unmount or tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      endSession();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      endSession();
    };
  }, [chatbotId, userId]);

  // Fetch chatbot and conversation history
  const fetchChatbotAndConversations = async () => {
    try {
      // Fetch chatbot data
      const chatbotResponse = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/chatbots/${chatbotId}`
      );
      const chatbotData = chatbotResponse.data;
      setChatbot(chatbotData);

      // Store userId if not already stored
      if (!userId) {
        setUserId(chatbotData.userId.toString());
        localStorage.setItem(`chatbot_${chatbotId}_userId`, chatbotData.userId.toString());
      }

      // Fetch conversation history
      const historyResponse = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/chatbots/${chatbotId}/conversations`,
        {
          params: { userId: userId || chatbotData.userId },
        }
      );
      const historyMessages = historyResponse.data.flatMap((conv: any) => [
        {
          id: conv.id.toString(),
          content: conv.question,
          sender: 'user',
          timestamp: new Date(conv.createdAt),
        },
        conv.answer && {
          id: `${conv.id}-response`,
          content: conv.answer,
          sender: 'bot',
          timestamp: new Date(conv.createdAt),
        },
      ]).filter(Boolean);

      // Initialize with welcome message if no history
      if (historyMessages.length === 0) {
        historyMessages.push({
          id: '1',
          content: `Hello! I'm ${chatbotData.name}. ${chatbotData.description || 'How can I help you today?'}`,
          sender: 'bot',
          timestamp: new Date(),
        });
      }
      setMessages(historyMessages);
    } catch (error) {
      console.error('Error fetching chatbot or conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chatbot or conversation history. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChatbotAndConversations();
  }, [chatbotId, userId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !chatbot || !userId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsSending(true);
    setIsTyping(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/chatbots/${chatbotId}/messages`,
        {
          content: userMessage.content,
          userId: parseInt(userId),
        }
      );
      const botMessage: Message = {
        id: response.data.id,
        content: response.data.content,
        sender: 'bot',
        timestamp: new Date(response.data.timestamp),
      };
      setMessages((prev) => [...prev, botMessage]);

      await fetchChatbotAndConversations();
    } catch (error: any) {
      console.error('Error sending message:', error);
      let errorMessage = 'Failed to send message. Please try again.';
      if (error.response?.status === 400) {
        errorMessage = 'Invalid request. Please check your input.';
      } else if (error.response?.status === 500) {
        errorMessage = 'AI service is temporarily unavailable. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  };

  const handleVoiceToggle = () => {
    setIsRecording(!isRecording);
    // Mock voice recording
    if (!isRecording) {
      setTimeout(() => setIsRecording(false), 3000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center glass-card p-8">
          <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Loading Chatbot</h1>
          <p className="text-muted-foreground">Please wait while we load the chatbot...</p>
        </div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center glass-card p-8">
          <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Chatbot Not Found</h1>
          <p className="text-muted-foreground">
            The chatbot you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const isLogoUrl = chatbot.logo && chatbot.logo.startsWith('http');

  return (
    <div
      className="min-h-screen flex flex-col bg-background"
      style={{
        '--chatbot-primary': chatbot.primaryColor,
        background: `linear-gradient(135deg, ${chatbot.primaryColor}05, transparent)`,
      } as React.CSSProperties}
    >
      {/* Header */}
      <motion.header
        className="glass-card border-b border-glass-border p-4 sticky top-0 z-20 backdrop-blur-xl"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center space-x-3">
            <motion.div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl relative"
              style={{ backgroundColor: `${chatbot.primaryColor}20` }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {isLogoUrl ? (
                <img
                  src={chatbot.logo}
                  alt={`${chatbot.name} logo`}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                chatbot.logo || <span>🤖</span>
              )}
              <motion.div
                className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
            <div>
              <h1 className="font-semibold text-lg">{chatbot.name}</h1>
              <motion.p
                className="text-sm text-green-500 flex items-center space-x-1"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Online now</span>
              </motion.p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <motion.button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg glass-card flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ rotate: theme === 'dark' ? 0 : 180 }}
                transition={{ duration: 0.3 }}
                className="text-sm"
              >
                {theme === 'dark' ? '🌙' : '☀️'}
              </motion.div>
            </motion.button>

            <motion.button
              className="w-8 h-8 rounded-lg glass-card flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <MoreVertical className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                chatbotColor={chatbot.primaryColor}
                chatbotLogo={chatbot.logo}
              />
            ))}
          </AnimatePresence>

          {isTyping && <TypingIndicator chatbotLogo={chatbot.logo} />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <motion.div
          className="p-4 glass-card border-t border-glass-border sticky bottom-0 z-20 backdrop-blur-xl"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex items-end space-x-2 max-w-4xl mx-auto">
            {/* Attachment button */}
            <motion.button
              className="w-10 h-10 rounded-xl glass-card flex items-center justify-center mb-2"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              disabled
            >
              <Paperclip className="w-4 h-4 text-muted-foreground" />
            </motion.button>

            {/* Message input */}
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="bg-glass/50 border-glass-border pr-12 h-12 text-base rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all duration-200"
                style={{ paddingRight: '3rem' }}
              />

              {/* Voice input button */}
              <motion.button
                onClick={handleVoiceToggle}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  isRecording
                    ? 'bg-red-500 text-white'
                    : 'glass-card hover:bg-primary/10'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
                transition={isRecording ? { duration: 1, repeat: Infinity } : {}}
              >
                <Mic className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Send button */}
            <motion.div
              className="relative overflow-hidden"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isSending || !userId}
                className="w-12 h-12 rounded-xl p-0 relative overflow-hidden"
                style={{
                  background: chatbot.primaryColor,
                  color: 'white',
                }}
              >
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  initial={{ scale: 0 }}
                  animate={isSending ? { scale: [0, 2, 0] } : { scale: 0 }}
                  transition={{ duration: 0.6, repeat: isSending ? Infinity : 0 }}
                />
                <motion.div
                  animate={isSending ? { rotate: 360 } : { rotate: 0 }}
                  transition={{ duration: 1, repeat: isSending ? Infinity : 0, ease: 'linear' }}
                >
                  <Send className="w-4 h-4" />
                </motion.div>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PublicChat;