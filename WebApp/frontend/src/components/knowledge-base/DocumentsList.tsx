import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Trash2, RefreshCw, MoreHorizontal, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useToast } from '@/hooks/use-toast';
import { useChatbots } from '@/contexts/ChatbotContext';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import axios from 'axios';

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
}

interface DocumentsListProps {
  chatbotId: number;
  searchQuery: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const DocumentsList = ({ chatbotId, searchQuery }: DocumentsListProps) => {
  const { toast } = useToast();
  const { deleteDocument, replaceDocument } = useChatbots();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const { data: documents = [], isLoading, error } = useQuery<Document[]>({
    queryKey: ['documents', chatbotId],
    queryFn: async () => {
      console.log('Fetching documents for chatbotId:', chatbotId);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found in localStorage');
        throw new Error('No token');
      }
      try {
        const res = await axios.get(`${API_BASE_URL}/api/documents?chatbotId=${chatbotId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('API response:', res.data);
        if (!Array.isArray(res.data)) {
          console.error('Expected an array, received:', res.data);
          throw new Error('Invalid response: Expected an array of documents');
        }
        return res.data.map((doc: any) => ({
          id: doc.id.toString(),
          name: doc.fileName,
          type: doc.fileType.toUpperCase(),
          size: formatFileSize(doc.size || 0),
          uploadDate: new Date(doc.createdAt).toLocaleDateString(),
        }));
      } catch (e: any) {
        console.error('Error fetching documents:', e.response?.data || e.message);
        throw new Error(e.response?.data?.message || 'Failed to fetch documents');
      }
    },
    enabled: !!chatbotId,
  });

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, startIndex + itemsPerPage);

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      await deleteDocument(id, chatbotId);
      toast({
        title: 'Document deleted',
        description: 'The document has been removed from the knowledge base.',
      });
      // Adjust current page if it becomes empty
      if (paginatedDocuments.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }
    } catch (e: any) {
      console.error('Delete error:', e.response?.data || e.message);
      toast({
        title: 'Error',
        description: e.response?.data?.message || 'Failed to delete document',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (documentToDelete) {
      await handleDelete(documentToDelete);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handleOpenDeleteDialog = (id: string) => {
    console.log(`Opening delete dialog for document id: ${id}`);
    setDocumentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const handleReplace = async (id: string) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.docx,.xlsx,.txt';
      input.onchange = async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          toast({
            title: 'Error',
            description: 'No file selected',
            variant: 'destructive',
          });
          return;
        }
        await replaceDocument(id, file, chatbotId);
        toast({
          title: 'Document replaced',
          description: 'The document has been replaced successfully.',
        });
      };
      input.click();
    } catch (e: any) {
      console.error('Replace error:', e.response?.data || e.message);
      toast({
        title: 'Error',
        description: e.response?.data?.message || 'Failed to replace document',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');
      const res = await axios.get(`${API_BASE_URL}/api/documents/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      window.location.href = res.data.url;
    } catch (e: any) {
      console.error('Download error:', e.response?.data || e.message);
      toast({
        title: 'Error',
        description: e.response?.data?.message || 'Failed to download document',
        variant: 'destructive',
      });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf': return '📄';
      case 'docx': return '📝';
      case 'xlsx': return '📊';
      case 'txt': return '📄';
      default: return '📄';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (isLoading) return <div>Loading documents...</div>;
  if (error) return <div>Error loading documents: {(error as Error).message}</div>;

  return (
    <div className="space-y-4">
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="glass-card border-glass-border p-6 max-w-md">
          <VisuallyHidden>
            <DialogTitle>Confirm Delete</DialogTitle>
          </VisuallyHidden>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            {isDeleting ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground mt-4">Deleting document...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-2 mb-4">
                  <Trash2 className="w-6 h-6 text-red-500" />
                  <h2 className="text-xl font-bold gradient-text">Delete Document</h2>
                </div>
                <DialogDescription className="text-muted-foreground mb-6">
                  Are you sure you want to delete this document? This action cannot be undone.
                </DialogDescription>
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={handleCloseDeleteDialog}
                    className="bg-glass/50 border-glass-border hover:bg-glass/80"
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleConfirmDelete}
                    className="bg-red-500 hover:bg-red-600 text-white"
                    disabled={isDeleting}
                  >
                    Delete
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </DialogContent>
      </Dialog>
      {filteredDocuments.length > 0 ? (
        <div className="space-y-4">
          <div className="glass-card">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-glass-border font-medium text-sm text-muted-foreground">
              <div className="col-span-5">Document</div>
              <div className="col-span-2 hidden md:block">Type</div>
              <div className="col-span-2 hidden lg:block">Size</div>
              <div className="col-span-2 hidden lg:block">Date</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
            <AnimatePresence>
              {paginatedDocuments.map((document, index) => (
                <motion.div
                  key={document.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="grid grid-cols-12 gap-4 p-4 hover:bg-glass/30 transition-colors border-b border-glass-border/50 last:border-b-0"
                >
                  <div className="col-span-5 flex items-center space-x-3">
                    <span className="text-2xl">{getFileIcon(document.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{document.name}</p>
                      <span className="text-xs text-muted-foreground md:hidden">
                        {document.type} • {document.size}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2 hidden md:flex items-center">
                    <Badge variant="outline" className="bg-glass/50 border-glass-border">
                      {document.type}
                    </Badge>
                  </div>
                  <div className="col-span-2 hidden lg:flex items-center text-sm text-muted-foreground">
                    {document.size}
                  </div>
                  <div className="col-span-2 hidden lg:flex items-center text-sm text-muted-foreground">
                    {document.uploadDate}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8" disabled={isDeleting}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-card border-glass-border">
                        <DropdownMenuItem onClick={() => handleReplace(document.id)}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Replace
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(document.id)}>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenDeleteDialog(document.id)}
                          className="text-red-500 focus:text-red-500"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between p-4 glass-card border-glass-border"
            >
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isDeleting}
                className="bg-glass/50 border-glass-border hover:bg-glass/80"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <div className="flex items-center space-x-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    onClick={() => handlePageChange(page)}
                    className={`w-10 h-10 p-0 ${
                      currentPage === page
                        ? 'bg-gradient-primary text-white'
                        : 'bg-glass/50 border-glass-border hover:bg-glass/80'
                    }`}
                    disabled={isDeleting}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isDeleting}
                className="bg-glass/50 border-glass-border hover:bg-glass/80"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}
        </div>
      ) : (
        <motion.div
          className="text-center py-12 glass-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-50">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {searchQuery ? 'No documents found' : 'No documents yet'}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery
              ? `No documents match "${searchQuery}"`
              : 'Upload documents to start training your chatbot'}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default DocumentsList;