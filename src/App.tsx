import { lazy, Suspense, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "./ui/hooks/useTheme";

// Import des nouveaux modules
import { AuthProvider, AuthGuard, LoginForm, RegisterForm, useAuth } from "./modules/auth";
import { ModularCandidateOnboarding } from "./modules/onboarding";

// Composants UI essentiels
import { Toaster } from "@/ui/components/toaster";
import { Toaster as Sonner } from "@/ui/components/sonner";
import { TooltipProvider } from "@/ui/components/tooltip";

// Pages temporaires pour la démonstration
const HomePage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
    <div className="text-center space-y-4">
      <h1 className="text-4xl font-bold text-gray-900">Team Dash Manager</h1>
      <p className="text-xl text-gray-600">Architecture modulaire activée ✅</p>
      <div className="space-y-2">
        <div className="flex justify-center gap-4">
          <a href="/auth" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Connexion
          </a>
          <a href="/candidate-dashboard" className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Dashboard Candidat
          </a>
          <a href="/client-dashboard" className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Dashboard Client
          </a>
        </div>
      </div>
    </div>
  </div>
);

const AuthPage = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Dash Manager</h1>
          <p className="text-gray-600">Nouveau système d'authentification</p>
        </div>

        <div className="mb-4 flex justify-center">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('login')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => setMode('register')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'register'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Inscription
            </button>
          </div>
        </div>

        {mode === 'login' ? (
          <LoginForm
            onRegisterClick={() => setMode('register')}
            showRegisterLink={true}
            showForgotPassword={true}
          />
        ) : (
          <RegisterForm
            onLoginClick={() => setMode('login')}
            showLoginLink={true}
          />
        )}
      </div>
    </div>
  );
};

const CandidateDashboard = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Dashboard Candidat</h1>
              {user && (
                <p className="text-sm text-gray-500">
                  Bienvenue, {user.firstName} {user.lastName}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                Nouveau système modulaire ✅
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Processus d'onboarding</h2>
            <ModularCandidateOnboarding />
          </div>
        </div>
      </main>
    </div>
  );
};

const ClientDashboard = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Dashboard Client</h1>
              {user && (
                <p className="text-sm text-gray-500">
                  Bienvenue, {user.firstName} {user.lastName}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                Nouveau système modulaire ✅
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Paramètres Client</h2>
            <p className="text-gray-600">Module client-settings intégré</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Projets IA</h2>
            <p className="text-gray-600">Module ia-projects intégré</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Notifications</h2>
            <p className="text-gray-600">Module notifications intégré</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Qualification IA</h2>
            <p className="text-gray-600">Module ia-qualification intégré</p>
          </div>
        </div>
      </main>
    </div>
  );
};

const queryClient = new QueryClient();

// Composant de chargement
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">Chargement de l'architecture modulaire...</p>
    </div>
  </div>
);

const AppContent = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />

        <Route path="/candidate-dashboard" element={
          <AuthGuard allowedRoles={['candidate']}>
            <CandidateDashboard />
          </AuthGuard>
        } />

        <Route path="/client-dashboard" element={
          <AuthGuard allowedRoles={['client']}>
            <ClientDashboard />
          </AuthGuard>
        } />

        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
              <p className="text-gray-600 mb-6">Page non trouvée</p>
              <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Retour à l'accueil
              </a>
            </div>
          </div>
        } />
      </Routes>
    </Suspense>
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