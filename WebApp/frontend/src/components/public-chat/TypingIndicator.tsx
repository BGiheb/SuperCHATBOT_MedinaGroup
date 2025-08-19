import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';

interface TypingIndicatorProps {
  chatbotLogo: string;
}

const TypingIndicator = ({ chatbotLogo }: TypingIndicatorProps) => {
  const isLogoUrl = chatbotLogo && chatbotLogo.startsWith('http');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="flex justify-start mb-4"
    >
      <div className="flex items-end space-x-2 max-w-xs">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 text-white text-sm">
          {isLogoUrl ? (
            <img
              src={chatbotLogo}
              alt="Chatbot logo"
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            chatbotLogo || <Bot className="w-4 h-4" />
          )}
        </div>

        {/* Typing Bubble */}
        <div className="bg-glass/80 backdrop-blur-sm border border-glass-border px-4 py-3 rounded-2xl">
          <div className="flex items-center space-x-1">
            <motion.div
              className="w-2 h-2 bg-muted-foreground rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-2 h-2 bg-muted-foreground rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-2 h-2 bg-muted-foreground rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TypingIndicator;