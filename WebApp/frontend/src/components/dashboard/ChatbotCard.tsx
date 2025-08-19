import { motion } from 'framer-motion';
import { QrCode, Edit, MoreHorizontal, FileText, Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Chatbot } from '@/contexts/ChatbotContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import EditChatbotModal from '@/components/chatbots/EditChatbotModal';

interface ChatbotCardProps {
  chatbot: Chatbot;
}

const ChatbotCard = ({ chatbot }: ChatbotCardProps) => {
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();

  const qrUrl = `${import.meta.env.VITE_BASE_URL || window.location.origin}/c/${chatbot.id}`;

  const handleViewQR = () => {
    if (!chatbot.qrUrl) {
      console.error('No QR code available for chatbot:', chatbot.id);
      toast({
        title: 'Error',
        description: 'No QR code available for this chatbot',
        variant: 'destructive',
      });
      return;
    }
    setIsQRModalOpen(true);
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  // Check if logo is a URL or fallback to a default
  const isLogoUrl = chatbot.logo?.startsWith('http');
  const logoContent = isLogoUrl ? (
    <img
      src={chatbot.logo}
      alt={`${chatbot.name} logo`}
      className="w-full h-full object-cover rounded-xl"
      onError={(e) => {
        e.currentTarget.src = '/default-logo.png'; // Fallback image
        console.warn(`Failed to load logo for chatbot ${chatbot.id}`);
      }}
    />
  ) : (
    chatbot.logo || '🤖' // Fallback emoji if no logo
  );

  return (
    <>
      <motion.div
        className="group hover-lift hover-glow"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card className="glass-card p-6 h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${chatbot.primaryColor || '#000000'}20` }}
              >
                {logoContent}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{chatbot.name || 'Unnamed Chatbot'}</h3>
                <Badge
                  variant={chatbot.isActive ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {chatbot.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-card border-glass-border">
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleViewQR}>
                  <QrCode className="w-4 h-4 mr-2" />
                  View QR
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {chatbot.description || 'No description provided'}
          </p>

          <div className="mb-4 p-3 bg-glass/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Chat URL:</p>
            <p className="text-sm font-mono break-all">
              <a
                href={qrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {qrUrl}
              </a>
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-muted-foreground">
                <FileText className="w-4 h-4 mr-2" />
                Documents
              </div>
              <span className="font-medium">{chatbot.documentsCount || 0}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-muted-foreground">
                <Calendar className="w-4 h-4 mr-2" />
                Created
              </div>
              <span className="font-medium">
                {chatbot.createdAt
                  ? new Date(chatbot.createdAt).toLocaleDateString()
                  : 'Unknown'}
              </span>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-glass/50 border-glass-border hover:bg-glass/80"
              onClick={handleViewQR}
            >
              <QrCode className="w-4 h-4 mr-2" />
              View QR
            </Button>
            <Button
              size="sm"
              className="flex-1 hover:scale-105 transition-transform duration-200"
              style={{
                background: `linear-gradient(135deg, ${chatbot.primaryColor || '#000000'}, ${chatbot.primaryColor || '#000000'}CC)`,
                color: 'white',
              }}
              onClick={handleEdit}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>

          <div
            className="absolute top-0 left-0 w-full h-1 rounded-t-2xl"
            style={{ backgroundColor: chatbot.primaryColor || '#000000' }}
          />
        </Card>
      </motion.div>

      <Dialog open={isQRModalOpen} onOpenChange={setIsQRModalOpen}>
        <DialogContent className="glass-card border-glass-border p-6 max-w-sm">
          <DialogTitle>
            <h2 className="text-xl font-bold gradient-text">
              QR Code for {chatbot.name || 'Unnamed Chatbot'}
            </h2>
          </DialogTitle>
          <div className="flex flex-col items-center space-y-4">
            {chatbot.qrUrl ? (
              <div className="bg-white rounded-xl p-6 flex items-center justify-center">
                <motion.div
                  className="w-48 h-48 rounded-lg flex items-center justify-center"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <img
                    src={chatbot.qrUrl}
                    alt={`QR Code for ${chatbot.name}`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = '/default-qr.png'; // Fallback QR image
                      console.warn(`Failed to load QR code for chatbot ${chatbot.id}`);
                    }}
                  />
                </motion.div>
              </div>
            ) : (
              <p className="text-muted-foreground">QR code not available</p>
            )}
            <p className="text-sm text-muted-foreground text-center">
              Scan this QR code to access the chatbot at{' '}
              <a
                href={qrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {qrUrl}
              </a>
            </p>
            <Button
              variant="outline"
              className="bg-glass/50 border-glass-border hover:bg-glass/80"
              onClick={() => setIsQRModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EditChatbotModal open={isEditModalOpen} onOpenChange={setIsEditModalOpen} chatbot={chatbot} />
    </>
  );
};

export default ChatbotCard;