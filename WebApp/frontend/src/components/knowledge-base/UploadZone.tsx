import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface UploadZoneProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatbotId: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const UploadZone = ({ open, onOpenChange, chatbotId }: UploadZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const acceptedTypes = ['.txt', '.pdf', '.docx', '.xlsx'];

  const uploadFileToBackend = async (file: File, fileId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const formData = new FormData();
    formData.append('document', file);
    formData.append('chatbotId', chatbotId.toString());

    let progress = 0;
    const interval = setInterval(() => {
      progress = Math.min(progress + 10, 90);
      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, progress, status: 'uploading' } : f
        )
      );
    }, 200);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/documents`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      clearInterval(interval);
      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, progress: 100, status: 'success' } : f
        )
      );
      return res.data;
    } catch (e: any) {
      clearInterval(interval);
      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                progress: 0,
                status: 'error',
                error: e.response?.data?.message || 'Upload failed',
              }
            : f
        )
      );
      throw e;
    }
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter((file) =>
      acceptedTypes.some((ext) => file.name.toLowerCase().endsWith(ext))
    );

    if (validFiles.length !== files.length) {
      toast({
        title: 'Invalid files',
        description: 'Some files were not uploaded. Only TXT, PDF, DOCX, and XLSX are allowed.',
        variant: 'destructive',
      });
    }

    const newFiles: UploadFile[] = validFiles.map((file) => ({
      id: Date.now().toString() + Math.random(),
      file,
      status: 'pending', // Files are queued, not uploaded yet
      progress: 0,
    }));

    setUploadFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (id: string) => {
    setUploadFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDone = async () => {
    if (uploadFiles.some((f) => f.status === 'uploading')) {
      return; // Prevent multiple uploads
    }

    let allSuccessful = true;
    for (const uploadFile of uploadFiles) {
      if (uploadFile.status !== 'pending') continue; // Skip already processed files
      try {
        await uploadFileToBackend(uploadFile.file, uploadFile.id);
        toast({
          title: 'Upload Successful',
          description: `${uploadFile.file.name} uploaded successfully.`,
        });
      } catch (e: any) {
        console.error('Upload error:', e.response?.data || e.message);
        toast({
          title: 'Upload Error',
          description: e.response?.data?.message || `Failed to upload ${uploadFile.file.name}`,
          variant: 'destructive',
        });
        allSuccessful = false;
      }
    }

    if (allSuccessful) {
      queryClient.invalidateQueries({ queryKey: ['documents', chatbotId] });
      setUploadFiles([]);
      onOpenChange(false); // Close modal on success
    }
  };

  const handleClose = () => {
    setUploadFiles([]);
    onOpenChange(false); // Close modal without uploading
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.toLowerCase().endsWith('.pdf')) return '📄';
    if (fileName.toLowerCase().endsWith('.docx')) return '📝';
    if (fileName.toLowerCase().endsWith('.xlsx')) return '📊';
    if (fileName.toLowerCase().endsWith('.txt')) return '📄';
    return '📄';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-glass-border p-0 gap-0 max-w-2xl">
        <VisuallyHidden>
          <DialogTitle>Upload Documents</DialogTitle>
        </VisuallyHidden>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold gradient-text">Upload Documents</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="hover:bg-glass/50"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-glass-border hover:border-primary/50'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
          >
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Drag and drop files here</h3>
            <p className="text-muted-foreground mb-4">or click to browse files</p>
            <input
              type="file"
              multiple
              accept={acceptedTypes.join(',')}
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <Button
              variant="outline"
              className="bg-glass/50 border-glass-border hover:bg-glass/80"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Browse Files
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Supported formats: {acceptedTypes.join(', ')}
            </p>
          </div>
          <AnimatePresence>
            {uploadFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 space-y-3"
              >
                <h3 className="font-semibold">Selected Files</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {uploadFiles.map((uploadFile) => (
                    <motion.div
                      key={uploadFile.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center space-x-3 p-3 bg-glass/30 rounded-lg"
                    >
                      <span className="text-xl">{getFileIcon(uploadFile.file.name)}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Progress value={uploadFile.progress} className="flex-1 h-2" />
                          <span className="text-xs text-muted-foreground">
                            {uploadFile.progress}%
                          </span>
                        </div>
                        {uploadFile.status === 'error' && (
                          <p className="text-xs text-red-500 mt-1">{uploadFile.error}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {uploadFile.status === 'success' && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {uploadFile.status === 'error' && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6"
                          onClick={() => removeFile(uploadFile.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={handleClose}
              className="bg-glass/50 border-glass-border hover:bg-glass/80"
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-primary hover:scale-105 transition-transform duration-200 text-white"
              onClick={handleDone}
              disabled={uploadFiles.length === 0 || uploadFiles.some((f) => f.status === 'uploading')}
            >
              Done
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadZone;