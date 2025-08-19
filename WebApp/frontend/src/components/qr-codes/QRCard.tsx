import { motion } from 'framer-motion';
import { Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Chatbot } from '@/types/chatbot';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';

interface QRCardProps {
  chatbot: Chatbot;
}

const QRCard = ({ chatbot }: QRCardProps) => {
  const { toast } = useToast();
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const qrUrl = `${import.meta.env.VITE_BASE_URL || window.location.origin}/c/${chatbot.id}`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = chatbot.qrUrl;
    link.download = `qr-code-${chatbot.name}.png`;
    link.click();
    toast({
      title: `QR Code Downloaded`,
      description: `${chatbot.name} QR code downloaded as PNG`,
    });
  };

  const isLogoUrl = chatbot.logo && chatbot.logo.startsWith('http');

  return (
    <>
      <motion.div
        className="group hover-lift hover-glow"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ backgroundColor: `${chatbot.primaryColor}20` }}
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
              </div>
              <div>
                <h3 className="font-semibold">{chatbot.name}</h3>
                <Badge variant={chatbot.isActive ? 'default' : 'secondary'} className="text-xs">
                  {chatbot.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-8 mb-4 flex items-center justify-center">
            <motion.div
              className="w-32 h-32 rounded-lg flex items-center justify-center relative overflow-hidden cursor-pointer"
              whileHover={{ scale: 1.05 }}
              onClick={() => setIsQRModalOpen(true)}
            >
              <img
                src={chatbot.qrUrl}
                alt={`QR Code for ${chatbot.name}`}
                className="w-full h-full object-contain"
              />
            </motion.div>
          </div>

          <div className="mb-4 p-3 bg-glass/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Chat URL:</p>
            <p className="text-sm font-mono break-all">
              <a href={qrUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                {qrUrl}
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 bg-glass/50 border-glass-border hover:bg-glass/80"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PNG
              </Button>
              <Button
                size="sm"
                className="flex-1 hover:scale-105 transition-transform duration-200"
                style={{
                  background: chatbot.primaryColor || '#3b82f6',
                  color: 'white',
                }}
                onClick={() => window.open(qrUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>

          <div
            className="absolute top-0 left-0 w-full h-1 rounded-t-2xl"
            style={{ backgroundColor: chatbot.primaryColor || '#3b82f6' }}
          />
        </Card>
      </motion.div>

      <Dialog open={isQRModalOpen} onOpenChange={setIsQRModalOpen}>
        <DialogContent className="glass-card border-glass-border p-6 max-w-sm">
          <DialogTitle>
            <h2 className="text-xl font-bold gradient-text">
              QR Code for {chatbot.name}
            </h2>
          </DialogTitle>
          <div className="flex flex-col items-center space-y-4">
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
                />
              </motion.div>
            </div>
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
    </>
  );
};

export default QRCard;