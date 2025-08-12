
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
import Register from "./pages/Register";
import { KeycloakAuthProvider } from "./contexts/KeycloakAuthContext";
import { useSupabaseAuth } from "./hooks/useSupabaseAuth";
import ProtectedRoute from "./components/auth/ProtectedRoute";

import AuthCheck from "./pages/auth-check";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const dashboardPaths = ['/candidate-dashboard', '/client-dashboard', '/admin/resources'];
  const showHeader = !dashboardPaths.includes(location.pathname);

  // Activate Supabase header injection globally (no UI output)
  useSupabaseAuth();

  return (
    <>
      {showHeader && <Header />}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/project/:id" element={<Project />} />
        <Route path="/admin/resources" element={<ProtectedRoute><AdminResources /></ProtectedRoute>} />
          <Route path="/auth-check" element={<AuthCheck />} />

        <Route path="/candidate-dashboard" element={<ProtectedRoute><CandidateDashboard /></ProtectedRoute>} />
        <Route path="/client-dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
        <Route path="/register" element={<Register />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <KeycloakAuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </KeycloakAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
