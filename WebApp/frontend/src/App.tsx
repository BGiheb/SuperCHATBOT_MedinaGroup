import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ChatbotProvider } from "@/contexts/ChatbotContext";
import { UserProvider } from "@/contexts/UserContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useUser } from "@/contexts/UserContext";
import { useChatbots } from "@/contexts/ChatbotContext";

// Pages
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Chatbots from "@/pages/Chatbots";
import KnowledgeBase from "@/pages/KnowledgeBase";
import QRCodes from "@/pages/QRCodes";
import ChatHistory from "@/pages/ChatHistory";
import Settings from "@/pages/Settings";
import PublicChat from "@/pages/PublicChat";
import AdminLayout from "@/layouts/AdminLayout";
import NotFound from "@/pages/NotFound";
import NotAuthorized from "@/pages/NotAuthorized";

const queryClient = new QueryClient();

const Router = () => {
  const { user } = useUser();
  const { chatbots } = useChatbots();
  const token = localStorage.getItem('token');
  const redirectPath = token
    ? user.role === 'ADMIN'
      ? '/dashboard'
      : chatbots && chatbots.length > 0
      ? `/c/${chatbots[0].id}`
      : '/not-authorized'
    : '/login';

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={token ? <Navigate to={redirectPath} replace /> : <Login />}
      />
      <Route path="/c/:chatbotId" element={<PublicChat />} />

      {/* Protected Routes (ADMIN only) */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Navigate to={redirectPath} replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="chatbots" element={<Chatbots />} />
          <Route path="knowledge-base" element={<KnowledgeBase />} />
          <Route path="chat-history" element={<ChatHistory />} />
          <Route path="qr-codes" element={<QRCodes />} />
          <Route path="settings" element={<Settings />} />

        </Route>
      </Route>

      {/* Not Authorized Route for non-admins */}
      <Route path="/not-authorized" element={<NotAuthorized />} />

      {/* Catch all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <UserProvider>
        <ChatbotProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Router />
            </BrowserRouter>
          </TooltipProvider>
        </ChatbotProvider>
      </UserProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;