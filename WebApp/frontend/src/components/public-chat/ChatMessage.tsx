import { motion } from 'framer-motion';
import { User, Bot } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot'; // Fixed typo: 'uang' → '|'
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  chatbotColor: string;
  chatbotLogo: string;
}

const ChatMessage = ({ message, chatbotColor, chatbotLogo }: ChatMessageProps) => {
  const isBot = message.sender === 'bot';
  const isLogoUrl = chatbotLogo && chatbotLogo.startsWith('http');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4`}
    >
      <div className={`flex items-end space-x-2 max-w-xs sm:max-w-md ${
        isBot ? 'flex-row' : 'flex-row-reverse space-x-reverse'
      }`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isBot 
            ? 'text-white text-sm'
            : 'bg-gradient-primary text-white'
        }`}
        style={isBot ? { backgroundColor: chatbotColor } : undefined}
        >
          {isBot ? (
            isLogoUrl ? (
              <img
                src={chatbotLogo}
                alt="Chatbot logo"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              chatbotLogo || <Bot className="w-4 h-4" />
            )
          ) : (
            <User className="w-4 h-4" />
          )}
        </div>

        {/* Message Bubble */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className={`px-4 py-3 rounded-2xl ${
            isBot
              ? 'bg-glass/80 backdrop-blur-sm border border-glass-border'
              : 'text-white'
          }`}
          style={!isBot ? { background: `linear-gradient(135deg, ${chatbotColor}, ${chatbotColor}CC)` } : undefined}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
          <p className={`text-xs mt-1 ${
            isBot ? 'text-muted-foreground' : 'text-white/70'
          }`}>
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ChatMessage;