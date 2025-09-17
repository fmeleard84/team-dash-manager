import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./ui/hooks/useTheme";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Header from "./components/Header";

// Lazy load des pages principales
const HomePage = lazy(() => import("./pages/HomePage").then(m => ({ default: m.HomePage })));
const Login = lazy(() => import("./pages/Login").then(m => ({ default: m.Login })));
const Register = lazy(() => import("./pages/Register").then(m => ({ default: m.Register })));
const EmailConfirmation = lazy(() => import("./pages/EmailConfirmation").then(m => ({ default: m.EmailConfirmation })));
const Index = lazy(() => import("./pages/Index"));
const Project = lazy(() => import("./pages/Project"));
const AdminResources = lazy(() => import("./pages/AdminResources"));
const TemplateFlowSimple = lazy(() => import("./pages/TemplateFlowSimple"));
const CandidateDashboard = lazy(() => import("./pages/CandidateDashboard"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const CandidateSkillTestNew = lazy(() => import("./pages/CandidateSkillTestNew"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const KanbanPage = lazy(() => import("./pages/KanbanPage"));
const MessagingDemo = lazy(() => import("./pages/MessagingDemo"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const AuthDebug = lazy(() => import("./pages/AuthDebug"));
const LLMDashboard = lazy(() => import("./pages/llm/LLMDashboard"));
const DesignSystem = lazy(() => import("./pages/DesignSystem"));
const AdminAssistant = lazy(() => import("./pages/AdminAssistant"));

const queryClient = new QueryClient();

// Composant de chargement
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">Chargement...</p>
    </div>
  </div>
);

const AppContent = () => {
  const location = useLocation();
  const noHeaderPaths = ['/', '/login', '/register', '/email-confirmation', '/candidate-dashboard', '/client-dashboard', '/admin/resources', '/kanban', '/template-flow'];
  
  // Also exclude project paths dynamically
  const showHeader = !noHeaderPaths.includes(location.pathname) && !location.pathname.startsWith('/project/');

  return (
    <ErrorBoundary>
      {showHeader && <Header />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/email-confirmation" element={<EmailConfirmation />} />
          <Route path="/old-index" element={<Index />} />
          <Route path="/project/:id" element={<Project />} />
          <Route path="/template-flow" element={<AdminRoute><TemplateFlowSimple /></AdminRoute>} />
          <Route path="/admin/resources" element={<AdminRoute><AdminResources /></AdminRoute>} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/debug" element={<AuthDebug />} />
          <Route path="/auth" element={<Login />} />
          
          <Route path="/candidate-dashboard" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <CandidateDashboard />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/candidate/skill-test" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <CandidateSkillTestNew />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/client-dashboard" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <ClientDashboard />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <NotificationsPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/kanban" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <KanbanPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/kanban/:projectId" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <KanbanPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/messaging-demo" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <MessagingDemo />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/llm" element={
            <AdminRoute>
              <Suspense fallback={<PageLoader />}>
                <LLMDashboard />
              </Suspense>
            </AdminRoute>
          } />
          <Route path="/design-system" element={
            <Suspense fallback={<PageLoader />}>
              <DesignSystem />
            </Suspense>
          } />
          <Route path="/admin/assistant" element={
            <AdminRoute>
              <Suspense fallback={<PageLoader />}>
                <AdminAssistant />
              </Suspense>
            </AdminRoute>
          } />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AuthProvider>
                <AppContent />
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
  );
}

export default App;