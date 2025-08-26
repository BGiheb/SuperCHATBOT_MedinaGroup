import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';

export interface Document {
  id: number;
  fileName: string;
  fileType: string;
  size: number;
  url: string;
  chatbotId: number;
}

export interface Chatbot {
  id: number;
  slug: string; // NEW: Add slug
  name: string;
  description?: string;
  instructions?: string; // NEW: Add instructions
  logo: string;
  primaryColor: string;
  qrUrl: string;
  isActive: boolean;
  documentsCount: number;
  createdAt: string;
  documents?: Document[];
  qrScans: number;
}

interface ChatbotContextType {
  chatbots: Chatbot[];
  selectedChatbot: Chatbot | null;
  addChatbot: (
    chatbot: Omit<Chatbot, 'id' | 'slug' | 'createdAt' | 'qrUrl' | 'documentsCount' | 'documents'>,
    files?: { logo?: File | null; documents?: File[] }
  ) => Promise<void>;
  updateChatbot: (slug: string, updates: Partial<Chatbot> & { logoFile?: File; documents?: File[] }) => Promise<void>;
  deleteChatbot: (slug: string) => Promise<void>;
  selectChatbot: (chatbot: Chatbot | null) => void;
  deleteDocument: (id: number, chatbotId: number) => Promise<void>;
  replaceDocument: (id: number, file: File, chatbotId: number) => Promise<void>;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// Axios interceptor for request logging
axios.interceptors.request.use(
  (config) => {
    console.log('Axios request:', config.method.toUpperCase(), config.url);
    if (config.data instanceof FormData) {
      console.log('FormData contents:');
      for (const [key, value] of config.data.entries()) {
        console.log(`${key}:`, value instanceof File ? value.name : value);
      }
    } else {
      console.log('Request body:', config.data);
    }
    return config;
  },
  (error) => {
    console.error('Axios request error:', error);
    return Promise.reject(error);
  }
);

export function ChatbotProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useUser();
  const [selectedChatbot, setSelectedChatbot] = useState<Chatbot | null>(null);

  const fetchChatbots = async (): Promise<Chatbot[]> => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found in localStorage');
      return [];
    }

    // Use /api/chatbots/my for SUB_ADMIN to fetch only their chatbots
    const endpoint =
      user.role === 'SUB_ADMIN' ? `${API_BASE_URL}/api/chatbots/my` : `${API_BASE_URL}/api/chatbots/qr-codes`;

    try {
      const res = await axios.get<Chatbot[]>(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Chatbots fetched:', res.data.map(bot => ({
        id: bot.id,
        slug: bot.slug, // NEW: Log slug
        name: bot.name,
        qrUrl: bot.qrUrl || 'MISSING',
      })));
      res.data.forEach(bot => {
        if (!bot.qrUrl) {
          console.warn(`Chatbot ${bot.slug} (${bot.name}) has no qrUrl`);
          toast({
            title: 'Warning',
            description: `Chatbot ${bot.name} is missing a QR code`,
            variant: 'destructive',
          });
        }
      });
      return res.data;
    } catch (e: any) {
      console.error('Error fetching chatbots:', e.response?.data || e.message);
      toast({
        title: 'Error',
        description: e.response?.data?.message || 'Failed to fetch chatbots',
        variant: 'destructive',
      });
      throw e;
    }
  };

  const { data: chatbots = [], isLoading, error } = useQuery<Chatbot[]>({
    queryKey: ['chatbots'],
    queryFn: fetchChatbots,
    retry: false,
    enabled: user.id !== 0 && (user.role === 'ADMIN' || user.role === 'SUB_ADMIN'),
  });

  const addChatbot = async (
    chatbot: Omit<Chatbot, 'id' | 'slug' | 'createdAt' | 'qrUrl' | 'documentsCount' | 'documents'>,
    files?: { logo?: File | null; documents?: File[] }
  ) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');

      const formData = new FormData();
      formData.append('name', chatbot.name);
      if (chatbot.description) formData.append('description', chatbot.description);
      if (chatbot.instructions) formData.append('instructions', chatbot.instructions); // NEW: Add instructions
      formData.append('logoUrl', chatbot.logo);
      if (chatbot.primaryColor) formData.append('primaryColor', chatbot.primaryColor);
      if (files?.logo) {
        formData.append('logo', files.logo);
        console.log('Logo file added to FormData:', files.logo.name);
      }
      if (files?.documents && files.documents.length > 0) {
        files.documents.forEach((file, index) => {
          formData.append('documents', file);
          console.log(`Document ${index + 1} added to FormData:`, file.name);
        });
      }

      const res = await axios.post<Chatbot>(`${API_BASE_URL}/api/chatbots`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Chatbot created:', { id: res.data.id, slug: res.data.slug, name: res.data.name, qrUrl: res.data.qrUrl });
      queryClient.setQueryData<Chatbot[]>(['chatbots'], (old = []) => [...old, res.data]);
      queryClient.invalidateQueries({ queryKey: ['chatbots'] });
      toast({
        title: 'Chatbot created',
        description: `Chatbot ${res.data.name} has been created successfully.`,
      });
    } catch (e: any) {
      console.error('Error adding chatbot:', e.response?.data || e.message);
      toast({
        title: 'Error',
        description: e.response?.data?.message || 'Failed to create chatbot',
        variant: 'destructive',
      });
      throw e;
    }
  };

  const updateChatbot = async (
    slug: string,
    updates: Partial<Chatbot> & { logoFile?: File; documents?: File[] }
  ) => {
    try {
      if (!slug) throw new Error(`Invalid chatbot slug: ${slug}`);
      console.log('Updating chatbot slug:', slug);
      console.log('Updates object:', JSON.stringify(updates, null, 2));

      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const formData = new FormData();
      const formDataEntries: { key: string; value: string | File }[] = [];

      if (updates.name) {
        formData.append('name', updates.name);
        formDataEntries.push({ key: 'name', value: updates.name });
      }
      if (updates.description !== undefined) {
        formData.append('description', updates.description);
        formDataEntries.push({ key: 'description', value: updates.description });
      }
      if (updates.instructions !== undefined) { // NEW: Add instructions
        formData.append('instructions', updates.instructions);
        formDataEntries.push({ key: 'instructions', value: updates.instructions });
      }
      if (updates.logoFile) {
        if (!(updates.logoFile instanceof File)) {
          throw new Error('Logo must be a valid file');
        }
        formData.append('logo', updates.logoFile);
        formDataEntries.push({ key: 'logo', value: updates.logoFile });
      }
      if (updates.logo) {
        formData.append('logoUrl', updates.logo);
        formDataEntries.push({ key: 'logoUrl', value: updates.logo });
      }
      if (updates.primaryColor) {
        formData.append('primaryColor', updates.primaryColor);
        formDataEntries.push({ key: 'primaryColor', value: updates.primaryColor });
      }
      if (updates.isActive !== undefined) {
        formData.append('isActive', String(updates.isActive));
        formDataEntries.push({ key: 'isActive', value: String(updates.isActive) });
      }
      if (updates.documents && updates.documents.length > 0) {
        updates.documents.forEach((file, index) => {
          if (!(file instanceof File)) {
            throw new Error(`Document ${index + 1} is not a valid file`);
          }
          formData.append('documents', file);
          formDataEntries.push({ key: `documents[${index}]`, value: file });
        });
      }

      console.log('FormData contents:', JSON.stringify(formDataEntries, null, 2));

      const res = await axios.put<Chatbot & { hasChanges: boolean }>(
        `${API_BASE_URL}/api/chatbots/${slug}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      console.log('API response:', res.data);

      queryClient.setQueryData<Chatbot[]>(['chatbots'], (old = []) =>
        old.map((bot) => (bot.slug === slug ? res.data : bot)) // CHANGED: Use slug
      );
      queryClient.invalidateQueries({ queryKey: ['documents', slug] }); // CHANGED: Use slug

      toast({
        title: 'Chatbot updated',
        description: `Chatbot ${res.data.name} has been updated successfully.`,
      });

      return res.data;
    } catch (e: any) {
      console.error('Error updating chatbot:', e.response?.data || e.message);
      toast({
        title: 'Error',
        description: e.response?.data?.message || 'Failed to update chatbot',
        variant: 'destructive',
      });
      throw e;
    }
  };

  const deleteChatbot = async (slug: string) => {
    try {
      if (!slug) throw new Error('Invalid chatbot slug');
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');
      await axios.delete(`${API_BASE_URL}/api/chatbots/${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.setQueryData<Chatbot[]>(['chatbots'], (old = []) => old.filter((bot) => bot.slug !== slug));
      toast({
        title: 'Chatbot deleted',
        description: 'The chatbot has been deleted successfully.',
      });
    } catch (e: any) {
      console.error('Error deleting chatbot:', e.response?.data || e.message);
      toast({
        title: 'Error',
        description: e.response?.data?.message || 'Failed to delete chatbot',
        variant: 'destructive',
      });
      throw e;
    }
  };

  const deleteDocument = async (id: number, chatbotId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');
      await axios.delete(`${API_BASE_URL}/api/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.setQueryData<Chatbot[]>(['chatbots'], (old = []) =>
        old.map((bot) =>
          bot.id === chatbotId
            ? {
                ...bot,
                documentsCount: bot.documentsCount - 1,
                documents: bot.documents ? bot.documents.filter((doc) => doc.id !== id) : [],
              }
            : bot
        )
      );
      queryClient.invalidateQueries({ queryKey: ['documents', chatbotId] });
      toast({
        title: 'Document deleted',
        description: 'The document has been removed successfully.',
      });
    } catch (e: any) {
      console.error('Error deleting document:', e.response?.data || e.message);
      toast({
        title: 'Error',
        description: e.response?.data?.message || 'Failed to delete document',
        variant: 'destructive',
      });
      throw e;
    }
  };

  const replaceDocument = async (id: number, file: File, chatbotId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');
      const formData = new FormData();
      formData.append('document', file);
      await axios.put(`${API_BASE_URL}/api/documents/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      queryClient.invalidateQueries({ queryKey: ['documents', chatbotId] });
      toast({
        title: 'Document replaced',
        description: 'The document has been replaced successfully.',
      });
    } catch (e: any) {
      console.error('Error replacing document:', e.response?.data || e.message);
      toast({
        title: 'Error',
        description: e.response?.data?.message || 'Failed to replace document',
        variant: 'destructive',
      });
      throw e;
    }
  };

  const selectChatbot = (chatbot: Chatbot | null) => {
    if (chatbot && (!chatbot.slug)) { // CHANGED: Check slug
      console.warn('Invalid chatbot selected:', chatbot);
      return;
    }
    console.log('Selected chatbot:', chatbot);
    setSelectedChatbot(chatbot);
  };

  return (
    <ChatbotContext.Provider
      value={{
        chatbots,
        selectedChatbot,
        addChatbot,
        updateChatbot,
        deleteChatbot,
        selectChatbot,
        deleteDocument,
        replaceDocument,
      }}
    >
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="text-white">Loading chatbots...</div>
        </div>
      )}
      {error && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="text-white">Error loading chatbots: {error.message}</div>
        </div>
      )}
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbots() {
  const context = useContext(ChatbotContext);
  if (context === undefined) {
    throw new Error('useChatbots must be used within a ChatbotProvider');
  }
  return context;
}