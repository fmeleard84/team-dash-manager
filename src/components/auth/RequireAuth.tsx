import { ReactNode } from "react";
import { useKeycloakAuth } from "@/contexts/KeycloakAuthContext";

interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component wrapper that requires authentication
 * Uses the requireAuth pattern from the micro-brief
 */
const RequireAuth = ({ children, fallback }: RequireAuthProps) => {
  const { isAuthenticated, login, isLoading } = useKeycloakAuth();

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
    
    // Auto-redirect to Keycloak
    login();
    
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Redirection vers Keycloak…</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
};

export default RequireAuth;