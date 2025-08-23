// components/CreateChatbotModal.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Palette, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useChatbots } from '@/contexts/ChatbotContext';
import { useToast } from '@/hooks/use-toast';

interface CreateChatbotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const colorOptions = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
];

const CreateChatbotModal = ({ open, onOpenChange }: CreateChatbotModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState('🤖');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<File[]>([]);
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [isLoading, setIsLoading] = useState(false);

  const { addChatbot } = useChatbots();
  const { toast } = useToast();

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        toast({
          title: 'Error',
          description: 'Logo must be a PNG or JPEG image',
          variant: 'destructive',
        });
        return;
      }
      console.log('Logo file selected:', file.name);
      setLogoFile(file);
      setLogo(URL.createObjectURL(file));
    }
  };

  const handleDocumentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const validFiles = Array.from(files).filter((file) =>
        ['application/pdf', 'text/plain', 'image/png', 'image/jpeg'].includes(file.type)
      );
      if (validFiles.length !== files.length) {
        toast({
          title: 'Error',
          description: 'Only PDF, TXT, PNG, or JPEG files are allowed',
          variant: 'destructive',
        });
      }
      console.log('New documents selected:', validFiles.map((f) => f.name));
      setDocuments((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        const newFiles = validFiles.filter((f) => !existingNames.has(f.name));
        return [...prev, ...newFiles];
      });
      e.target.value = '';
    }
  };

  const handleRemoveDocument = (fileName: string) => {
    setDocuments((prev) => prev.filter((file) => file.name !== fileName));
    console.log('Document removed:', fileName);
    toast({
      title: 'Document Removed',
      description: `${fileName} has been removed from the selection`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast({
        title: 'Error',
        description: 'Chatbot name is required',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);

    try {
      const files = {
        logo: logoFile,
        documents,
      };
      console.log('Submitting chatbot with files:', {
        logo: logoFile?.name,
        documents: documents.map((f) => f.name),
      });
      await addChatbot(
        {
          name,
          description,
          logo: logoFile ? '' : logo,
          primaryColor,
          isActive: true,
        },
        files
      );

      toast({
        title: 'Chatbot created!',
        description: `${name} has been successfully created with ${documents.length} document(s).`,
      });

      setName('');
      setDescription('');
      setLogo('🤖');
      setLogoFile(null);
      setDocuments([]);
      setPrimaryColor('#3B82F6');
      onOpenChange(false);
    } catch (e: any) {
      console.error('Error creating chatbot:', e.response?.data || e.message);
      toast({
        title: 'Error',
        description: e.response?.data?.message || 'Failed to create chatbot',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-glass-border p-0 gap-0 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="p-6"
        >
          <DialogTitle>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold gradient-text">Create New Chatbot</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="hover:bg-glass/50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logo Selection */}
            <div className="space-y-3">
              <Label>Logo</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {['🤖', '💼', '🎯', '⚡', '🚀', '💡', '🔧', '📱'].map((emoji) => (
                  <Button
                    key={emoji}
                    type="button"
                    variant={logo === emoji && !logoFile ? 'default' : 'outline'}
                    className={`w-12 h-12 text-xl ${
                      logo === emoji && !logoFile
                        ? 'bg-gradient-primary text-white'
                        : 'bg-glass/50 border-glass-border hover:bg-glass/80'
                    }`}
                    onClick={() => {
                      setLogo(emoji);
                      setLogoFile(null);
                    }}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
              <div>
                <Label htmlFor="logo-upload">Upload Custom Logo (PNG/JPEG)</Label>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleLogoChange}
                  className="bg-glass/50 border-glass-border"
                />
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Customer Support Bot"
                className="bg-glass/50 border-glass-border"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Message de bienvenue</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Personaliser votre message de bienvenue..."
                className="bg-glass/50 border-glass-border resize-none"
                rows={3}
              />
            </div>

            {/* Document Upload */}
            <div className="space-y-2">
              <Label htmlFor="documents">Documents (PDF, TXT, PNG, JPEG)</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="documents"
                  type="file"
                  accept="application/pdf,text/plain,image/png,image/jpeg"
                  multiple
                  onChange={handleDocumentsChange}
                  className="bg-glass/50 border-glass-border"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-glass/50 border-glass-border hover:bg-glass/80"
                  onClick={() => document.getElementById('documents')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Add More
                </Button>
              </div>
              {documents.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {documents.length} file(s) selected:
                  </p>
                  <ul className="text-sm text-muted-foreground">
                    <AnimatePresence>
                      {documents.map((file) => (
                        <motion.li
                          key={file.name}
                          className="flex items-center justify-between bg-glass/30 p-2 rounded-md"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <span>{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="hover:bg-red-500/20"
                            onClick={() => handleRemoveDocument(file.name)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>
              )}
            </div>

            {/* Color Selection */}
            <div className="space-y-3">
              <Label className="flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                Primary Color
              </Label>
              <div className="grid grid-cols-6 gap-2">
                {colorOptions.map((color) => (
                  <Button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      primaryColor === color
                        ? 'border-white shadow-neon scale-110'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setPrimaryColor(color)}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="glass-card p-4 border border-glass-border">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${primaryColor}20` }}
                  >
                    {logoFile ? <img src={logo} alt="Logo" className="w-full h-full object-cover rounded-xl" /> : logo}
                  </div>
                  <div>
                    <h3 className="font-semibold">{name || 'Chatbot Name'}</h3>
                    <p className="text-sm text-muted-foreground">
                      {description || 'Chatbot description...'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {documents.length} document(s) attached
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 bg-glass/50 border-glass-border hover:bg-glass/80"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-primary hover:scale-105 transition-transform duration-200 text-white"
              >
                {isLoading ? (
                  <motion.div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  'Create Chatbot'
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateChatbotModal;