import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component wrapper that requires authentication
 * Uses the requireAuth pattern from the micro-brief
 */
const RequireAuth = ({ children, fallback }: RequireAuthProps) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Rediriger vers la page d'authentification
    if (typeof window !== 'undefined') {
      window.location.href = '/auth';
    }
    
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Redirection vers la connexion…</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
};

export default RequireAuth;