
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Project from "./pages/Project";
import AdminResources from "./pages/AdminResources";
import Header from "./components/Header";

import CandidateDashboard from "./pages/CandidateDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotificationsPage from "./pages/NotificationsPage";
import KanbanPage from "./pages/KanbanPage";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

import AuthCallback from "./pages/AuthCallback";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const dashboardPaths = ['/candidate-dashboard', '/client-dashboard', '/admin/resources', '/kanban'];
  const showHeader = !dashboardPaths.includes(location.pathname) && location.pathname !== '/auth';

  return (
    <>
      {showHeader && <Header />}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/project/:id" element={<Project />} />
        <Route path="/admin/resources" element={<ProtectedRoute><AdminResources /></ProtectedRoute>} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route path="/auth" element={<Auth />} />
        <Route path="/candidate-dashboard" element={<ProtectedRoute><CandidateDashboard /></ProtectedRoute>} />
        <Route path="/client-dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/kanban" element={<ProtectedRoute><KanbanPage /></ProtectedRoute>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
