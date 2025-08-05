import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import Project from "./pages/Project";
import AdminResources from "./pages/AdminResources";
import Team from "./pages/Team";
import CandidateDashboard from "./pages/CandidateDashboard";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Register from "./pages/Register";
import { KeycloakAuthProvider } from "./contexts/KeycloakAuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <KeycloakAuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/project/:id" element={<Project />} />
            <Route path="/admin/resources" element={<AdminResources />} />
            <Route path="/team" element={<Team />} />
            <Route path="/candidate-dashboard" element={<CandidateDashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Register />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </KeycloakAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
