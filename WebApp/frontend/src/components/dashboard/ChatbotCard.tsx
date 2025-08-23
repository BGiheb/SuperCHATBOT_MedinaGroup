import { motion } from 'framer-motion';
import { QrCode, Edit, MoreHorizontal, FileText, Calendar, ScanLine, Code, Copy, User, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import EditChatbotModal from '@/components/chatbots/EditChatbotModal';

interface Chatbot {
  id: number;
  name: string;
  description?: string;
  primaryColor: string;
  logo: string;
  qrUrl?: string;
  isActive: boolean;
  createdAt: string;
  documentsCount: number;
  qrScans: number;
  conversationsCount: number; // Added conversationsCount
  createdBy?: string; // Nom du créateur (admin ou utilisateur)
}

interface ChatbotCardProps {
  chatbot: Chatbot;
}

const ChatbotCard = ({ chatbot }: ChatbotCardProps) => {
  console.log(`Chatbot ${chatbot.id} - qrScans:`, chatbot.qrScans); // Log pour débogage
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
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

  // Code HTML du widget avec l'ID du chatbot dynamique
  const widgetCode = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Chatbot Widget</title>
<style>
  /* Widget global */
  #chat-widget {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    font-family: 'Arial', sans-serif;
  }

  /* Bulle flottante */
  #chat-bubble {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${chatbot.primaryColor || '#6a11cb'}, ${
    chatbot.primaryColor ? `${chatbot.primaryColor}CC` : '#2575fc'
  });
    cursor: grab;
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    font-weight: bold;
    font-size: 20px;
    box-shadow: 0 8px 15px rgba(0,0,0,0.4);
    transition: transform 0.3s, box-shadow 0.3s;
  }

  #chat-bubble:hover {
    transform: scale(1.2);
    box-shadow: 0 12px 20px rgba(0,0,0,0.5);
  }

  /* Boîte de chat */
  #chat-box {
    display: none;
    flex-direction: column;
    width: 350px;
    height: 450px;
    background: #1f1f2e;
    border-radius: 20px;
    box-shadow: 0 15px 35px rgba(0,0,0,0.4);
    margin-top: 10px;
    overflow: hidden;
    color: white;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.4s, transform 0.4s;
  }

  #chat-box.active {
    display: flex;
    opacity: 1;
    transform: translateY(0);
  }

  /* Messages */
  #messages {
    flex: 1;
    padding: 15px;
    overflow-y: auto;
    font-size: 14px;
  }

  .message-user, .message-bot {
    display: inline-block;
    padding: 10px 15px;
    margin: 5px 0;
    border-radius: 20px;
    max-width: 70%;
    word-wrap: break-word;
    animation: fadeIn 0.3s;
  }

  .message-user {
    background: ${chatbot.primaryColor || '#2575fc'};
    color: white;
    margin-left: auto;
    text-align: right;
  }

  .message-bot {
    background: #44475a;
    color: #f8f8f2;
    margin-right: auto;
    text-align: left;
  }

  @keyframes fadeIn {
    from {opacity:0; transform: translateY(5px);}
    to {opacity:1; transform: translateY(0);}
  }

  /* Input */
  #chat-input {
    width: 100%;
    padding: 12px;
    border: none;
    border-top: 1px solid #444;
    background: #2c2c3e;
    color: white;
    font-size: 14px;
    outline: none;
  }

</style>
</head>
<body>

<div id="chat-widget">
  <div id="chat-bubble">💬</div>
  <div id="chat-box">
    <div id="messages"></div>
    <input type="text" id="chat-input" placeholder="Écrire un message..." />
  </div>
</div>

<script>
const chatbot_id = ${chatbot.id}; // ID du chatbot dynamique
const bubble = document.getElementById('chat-bubble');
const chatBox = document.getElementById('chat-box');
const messages = document.getElementById('messages');
const input = document.getElementById('chat-input');

// Toggle chat avec animation
bubble.addEventListener('click', () => {
  chatBox.classList.toggle('active');
});

// Ajouter un message
function addMessage(sender, text) {
  const div = document.createElement('div');
  div.className = sender === 'user' ? 'message-user' : 'message-bot';
  div.innerHTML = \`<b>\${sender === 'user' ? 'Vous' : 'Bot'}:</b> \${text}\`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight; // Scroll automatique
}

// Envoyer un message
async function sendMessage(msg) {
  addMessage('user', msg);

  try {
    // Appel FastAPI /process
    await fetch(\`${import.meta.env.VITE_API_BASE_URL}/api/process/${chatbot.id}\`, {method:'POST'});

    // Appel FastAPI /ask
    const res = await fetch(\`${import.meta.env.VITE_API_BASE_URL}/api/ask/${chatbot.id}?question=\${encodeURIComponent(msg)}\`, {method:'POST'});
    if(!res.ok) throw new Error(\`HTTP \${res.status}\`);
    const data = await res.json();
    addMessage('bot', data.answer || 'Réponse vide');

  } catch(err) {
    addMessage('bot', 'Erreur de connexion ou de format');
    console.error(err);
  }
}

// Envoyer message à Enter
input.addEventListener('keypress', e => {
  if(e.key==='Enter' && input.value.trim()!=='') {
    sendMessage(input.value.trim());
    input.value='';
  }
});

// Drag & Drop fluide de la bulle
bubble.onmousedown = function(event) {
  let shiftX = event.clientX - bubble.getBoundingClientRect().left;
  let shiftY = event.clientY - bubble.getBoundingClientRect().top;

  function moveAt(pageX, pageY) {
    bubble.style.left = pageX - shiftX + 'px';
    bubble.style.top = pageY - shiftY + 'px';
  }

  function onMouseMove(event) {
    moveAt(event.pageX, event.pageY);
  }

  document.addEventListener('mousemove', onMouseMove);

  bubble.onmouseup = function() {
    document.removeEventListener('mousemove', onMouseMove);
    bubble.onmouseup = null;
  };
};

bubble.ondragstart = function() { return false; };
</script>

</body>
</html>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(widgetCode).then(() => {
      toast({
        title: 'Code Copied',
        description: 'The chatbot widget code has been copied to your clipboard.',
      });
    }).catch(() => {
      toast({
        title: 'Error',
        description: 'Failed to copy the code to clipboard.',
        variant: 'destructive',
      });
    });
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
                <DropdownMenuItem onClick={() => setIsCodeModalOpen(true)}>
                  <Code className="w-4 h-4 mr-2" />
                  Get Widget Code
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
                <ScanLine className="w-4 h-4 mr-2" />
                QR Scans
              </div>
              <span className="font-medium">{chatbot.qrScans || 0}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-muted-foreground">
                <MessageCircle className="w-4 h-4 mr-2" />
                Conversations
              </div>
              <span className="font-medium">{chatbot.conversationsCount || 0}</span>
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

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-muted-foreground">
                <User className="w-4 h-4 mr-2" />
                Created By
              </div>
              <span className="font-medium">{chatbot.createdBy || 'Unknown'}</span>
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

      {/* Modal pour le QR Code */}
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

      {/* Modal pour afficher le code du widget */}
      <Dialog open={isCodeModalOpen} onOpenChange={setIsCodeModalOpen}>
        <DialogContent className="glass-card border-glass-border max-w-2xl">
          <DialogTitle>
            <h2 className="text-xl font-bold gradient-text">
              Chatbot Widget Code for {chatbot.name || 'Unnamed Chatbot'}
            </h2>
          </DialogTitle>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copy the following code and paste it into your website's HTML to integrate the chatbot.
            </p>
            <Textarea
              value={widgetCode}
              readOnly
              className="h-96 bg-glass/50 border-glass-border font-mono text-sm"
            />
            <DialogFooter>
              <Button
                variant="outline"
                className="bg-glass/50 border-glass-border hover:bg-glass/80"
                onClick={() => setIsCodeModalOpen(false)}
              >
                Close
              </Button>
              <Button
                onClick={handleCopyCode}
                className="bg-gradient-primary text-white"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <EditChatbotModal open={isEditModalOpen} onOpenChange={setIsEditModalOpen} chatbot={chatbot} />
    </>
  );
};

export default ChatbotCard;