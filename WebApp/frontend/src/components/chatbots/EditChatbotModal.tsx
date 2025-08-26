import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { X, Upload, Palette, Trash2, FileText, Type, Image, PaletteIcon, File, ToggleLeft, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useChatbots } from '@/contexts/ChatbotContext';
import { Chatbot, Document } from '@/contexts/ChatbotContext';
import { HexColorPicker } from 'react-colorful';
import axios from 'axios';

interface Chatbot {
  id: number;
  slug: string; // NEW: Add slug to interface
  name: string;
  description?: string;
  instructions?: string;
  primaryColor: string;
  logo: string;
  isActive: boolean;
  documents: Document[];
}

interface EditChatbotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatbot: Chatbot;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const EditChatbotModal = ({ open, onOpenChange, chatbot }: EditChatbotModalProps) => {
  const { updateChatbot, deleteDocument } = useChatbots();
  const { toast } = useToast();
  const [name, setName] = useState(chatbot.name);
  const [description, setDescription] = useState(chatbot.description || '');
  const [instructions, setInstructions] = useState(chatbot.instructions || '');
  const [primaryColor, setPrimaryColor] = useState(chatbot.primaryColor || '#3b82f6');
  const [logo, setLogo] = useState(chatbot.logo || '🤖');
  const [isActive, setIsActive] = useState(chatbot.isActive);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<Document[]>([]);
  const [documentsToDelete, setDocumentsToDelete] = useState<number[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  // Validation de l'URL du logo
  const isValidImageUrl = (url: string) => {
    return url && (url.startsWith('http://') || url.startsWith('https://')) && /\.(png|jpg|jpeg)$/i.test(url);
  };
  const isLogoUrl = isValidImageUrl(logo);

  useEffect(() => {
    // Réinitialisation des champs du formulaire et des documents lorsque le modal s'ouvre ou que le chatbot change
    console.log('Resetting form fields for chatbot:', { slug: chatbot.slug, name: chatbot.name, logo: chatbot.logo }); // CHANGED: Log slug
    setName(chatbot.name);
    setDescription(chatbot.description || '');
    setInstructions(chatbot.instructions || '');
    setPrimaryColor(chatbot.primaryColor || '#3b82f6');
    setLogo(chatbot.logo || '🤖');
    setIsActive(chatbot.isActive);
    setLogoFile(null);
    setDocumentFiles([]);
    setDocumentsToDelete([]);
  }, [chatbot, open]);

  useEffect(() => {
    const fetchChatbotForEdit = async () => {
      setIsLoadingDocuments(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error("Aucun token d'authentification trouvé");
        }
        console.log(`Fetching chatbot data for slug: ${chatbot.slug} from ${API_BASE_URL}/api/chatbots/${chatbot.slug}/edit`); // CHANGED: Use slug
        const response = await axios.get(`${API_BASE_URL}/api/chatbots/${chatbot.slug}/edit`, { // CHANGED: Use slug
          headers: { Authorization: `Bearer ${token}` },
        });
        const fetchedChatbot = response.data;
        console.log('Fetched chatbot data:', fetchedChatbot);
        setExistingDocuments(fetchedChatbot.documents || []);
        setName(fetchedChatbot.name);
        setDescription(fetchedChatbot.description || '');
        setInstructions(fetchedChatbot.instructions || '');
        setPrimaryColor(fetchedChatbot.primaryColor || '#3b82f6');
        setLogo(fetchedChatbot.logo || '🤖');
        setIsActive(fetchedChatbot.isActive);
      } catch (error: any) {
        console.error('Failed to fetch chatbot for edit:', error.response?.data || error.message);
        toast({
          title: 'Erreur',
          description: error.response?.data?.message || 'Échec du chargement des données du chatbot',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingDocuments(false);
      }
    };
    if (open) {
      fetchChatbotForEdit();
    } else {
      setExistingDocuments([]);
      setDocumentsToDelete([]);
    }
  }, [open, chatbot.slug, toast]); // CHANGED: Use chatbot.slug in dependency array

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (instructions.length > 1000) {
      toast({
        title: 'Erreur',
        description: 'Les instructions ne doivent pas dépasser 1000 caractères',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);

    try {
      for (const docId of documentsToDelete) {
        await deleteDocument(docId, chatbot.id); // Note: deleteDocument may still use id internally
      }

      const updates: Partial<Chatbot> & { logoFile?: File; documents?: File[] } = {
        name,
        description,
        instructions,
        primaryColor,
        logo,
        isActive,
      };

      if (logoFile) {
        updates.logoFile = logoFile;
      }

      if (documentFiles.length > 0) {
        updates.documents = documentFiles;
      }

      const hasChanges =
        name !== chatbot.name ||
        description !== (chatbot.description || '') ||
        instructions !== (chatbot.instructions || '') ||
        primaryColor !== (chatbot.primaryColor || '#3b82f6') ||
        logo !== (chatbot.logo || '🤖') ||
        isActive !== chatbot.isActive ||
        logoFile !== null ||
        documentFiles.length > 0 ||
        documentsToDelete.length > 0;

      console.log('Submitting updates:', updates, 'Has changes:', hasChanges);
      await updateChatbot(chatbot.slug, updates); // CHANGED: Use slug

      toast({
        title: hasChanges ? 'Chatbot mis à jour' : 'Aucune modification',
        description: hasChanges
          ? `${name} a été mis à jour avec succès.`
          : "Aucune modification n'a été apportée au chatbot.",
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du chatbot:', error.response?.data || error.message);
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Échec de la mise à jour du chatbot',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'documents') => {
    const files = e.target.files;
    if (!files) return;

    if (type === 'logo') {
      const file = files[0];
      if (file && !['image/png', 'image/jpeg'].includes(file.type)) {
        toast({
          title: 'Erreur',
          description: 'Le logo doit être une image PNG ou JPEG',
          variant: 'destructive',
        });
        return;
      }
      setLogoFile(file || null);
      setLogo(file ? URL.createObjectURL(file) : chatbot.logo || '🤖');
      console.log('Logo file selected:', file?.name);
    } else {
      const newFiles = Array.from(files).filter((file) =>
        ['application/pdf', 'text/plain'].includes(file.type)
      );
      if (newFiles.length !== files.length) {
        toast({
          title: 'Erreur',
          description: 'Seuls les fichiers PDF et TXT sont autorisés',
          variant: 'destructive',
        });
      }
      setDocumentFiles((prev) => [...prev, ...newFiles]);
      console.log('Document files selected:', newFiles.map(f => f.name));
    }
  };

  const removeNewDocument = (index: number) => {
    setDocumentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteDocument = (docId: number) => {
    setDocumentsToDelete((prev) => [...prev, docId]);
    setExistingDocuments((prev) => prev.filter((doc) => doc.id !== docId));
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-glass-border max-w-2xl" aria-describedby="edit-chatbot-description">
        <div id="edit-chatbot-description" className="sr-only">
          Modifier les paramètres du chatbot, y compris le nom, la description, les instructions, la couleur principale, le logo, les documents et le statut actif.
        </div>
        <div className="flex">
          <div className="w-48 bg-glass/20 border-r border-glass-border p-4 flex flex-col space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Sections</h3>
            <Button
              variant="ghost"
              className="justify-start text-sm"
              onClick={() => scrollToSection('name-section')}
            >
              <Type className="w-4 h-4 mr-2" />
              Nom
            </Button>
            <Button
              variant="ghost"
              className="justify-start text-sm"
              onClick={() => scrollToSection('description-section')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Msg Bienvenue
            </Button>
            <Button
              variant="ghost"
              className="justify-start text-sm"
              onClick={() => scrollToSection('instructions-section')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Instructions
            </Button>
            <Button
              variant="ghost"
              className="justify-start text-sm"
              onClick={() => scrollToSection('color-section')}
            >
              <PaletteIcon className="w-4 h-4 mr-2" />
              Couleur Principale
            </Button>
            <Button
              variant="ghost"
              className="justify-start text-sm"
              onClick={() => scrollToSection('logo-section')}
            >
              <Image className="w-4 h-4 mr-2" />
              Logo
            </Button>
            <Button
              variant="ghost"
              className="justify-start text-sm"
              onClick={() => scrollToSection('documents-section')}
            >
              <File className="w-4 h-4 mr-2" />
              Documents
            </Button>
            <Button
              variant="ghost"
              className="justify-start text-sm"
              onClick={() => scrollToSection('status-section')}
            >
              <ToggleLeft className="w-4 h-4 mr-2" />
              Statut Actif
            </Button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="gradient-text">Modifier le Chatbot</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div id="name-section" className="space-y-2">
                <Label htmlFor="name">Nom du Chatbot</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Entrez le nom du chatbot"
                  required
                  className="bg-glass/50 border-glass-border"
                />
              </div>

              <div id="description-section" className="space-y-2">
                <Label htmlFor="description">Message de bienvenue</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Modifiez le message de bienvenue"
                  className="bg-glass/50 border-glass-border resize-none"
                  rows={4}
                />
              </div>

              <div id="instructions-section" className="space-y-2">
                <Label htmlFor="instructions">Instructions personnalisées</Label>
                <Textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Entrez des instructions pour personnaliser les réponses du chatbot (ex: 'Réponds toujours en français avec un ton amical.')"
                  className="bg-glass/50 border-glass-border resize-none"
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  {instructions.length}/1000 caractères
                </p>
              </div>

              <div id="color-section" className="space-y-2">
                <Label htmlFor="primaryColor">Couleur Principale</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="primaryColor"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="w-32 bg-glass/50 border-glass-border"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-glass/50 border-glass-border hover:bg-glass/80"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                  >
                    <PaletteIcon className="w-4 h-4 mr-2" />
                    Choisir la Couleur
                  </Button>
                  <div
                    className="w-10 h-10 rounded-full border border-glass-border"
                    style={{ backgroundColor: primaryColor }}
                  />
                </div>
                {showColorPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-2"
                  >
                    <HexColorPicker color={primaryColor} onChange={setPrimaryColor} />
                  </motion.div>
                )}
              </div>

              <div id="logo-section" className="space-y-2">
                <Label htmlFor="logo">Logo</Label>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border border-glass-border overflow-hidden">
                    {isLogoUrl ? (
                      <img
                        src={logo}
                        alt="Logo du Chatbot"
                        className="w-full h-full object-cover rounded-xl"
                        onError={() => {
                          console.warn(`Failed to load logo image: ${logo}`);
                          setLogo('🤖');
                        }}
                      />
                    ) : (
                      <Bot className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(e) => handleFileChange(e, 'logo')}
                      className="bg-glass/50 border-glass-border"
                    />
                  </div>
                </div>
              </div>

              <div id="documents-section" className="space-y-2">
                <Label>Documents Existants</Label>
                {isLoadingDocuments ? (
                  <p className="text-sm text-muted-foreground">Chargement des documents...</p>
                ) : existingDocuments.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {existingDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between bg-glass/30 p-2 rounded-lg"
                      >
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <span className="text-sm truncate max-w-[200px]">{doc.fileName}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({doc.fileType}, {(doc.size / 1024).toFixed(2)} KB)
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun document téléchargé</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="documents">Télécharger de Nouveaux Documents</Label>
                <Input
                  id="documents"
                  type="file"
                  accept="application/pdf,text/plain"
                  multiple
                  onChange={(e) => handleFileChange(e, 'documents')}
                  className="bg-glass/50 border-glass-border"
                />
                {documentFiles.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {documentFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-glass/30 p-2 rounded-lg"
                      >
                        <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNewDocument(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div id="status-section" className="space-y-2">
                <Label htmlFor="isActive">Statut Actif</Label>
                <div className="flex items-center space-x-2">
                  <input
                    id="isActive"
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-glass-border bg-glass/50"
                  />
                  <span>{isActive ? 'Actif' : 'Inactif'}</span>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  className="bg-glass/50 border-glass-border hover:bg-glass/80"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isLoadingDocuments}
                  className="bg-gradient-primary hover:scale-105 transition-transform duration-200"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Mise à jour...' : 'Mettre à jour le Chatbot'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditChatbotModal;