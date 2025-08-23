export interface Chatbot {
  id: number;
  name: string;
  qrUrl: string;
  logo: string;
  primaryColor: string;
  isActive: boolean;
  description?: string;
  documentsCount: number;
  createdAt: string;
    qrScans: number;

  
}