/**
 * Module AUTH - Composant AuthGuard
 *
 * Composant de protection d'authentification basé sur RequireAuth.tsx existant.
 * Conserve EXACTEMENT les mêmes logiques métier.
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '@/lib/utils';
import type { AuthGuardProps, AppRole } from '../types';

/**
 * Composant de garde d'authentification
 * CONSERVE EXACTEMENT la logique de RequireAuth.tsx
 */
export const AuthGuard = ({
  children,
  fallback,
  requireAuth = true,
  allowedRoles = [],
  redirectTo = '/auth',
  className = ''
}: AuthGuardProps) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Chargement (EXACTEMENT comme RequireAuth.tsx)
  if (isLoading) {
    return (
      <main className={cn("min-h-screen flex items-center justify-center bg-background", className)}>
        <p className="text-muted-foreground">Chargement...</p>
      </main>
    );
  }

  // Pas d'authentification requise
  if (!requireAuth) {
    return <>{children}</>;
  }

  // Vérification d'authentification (EXACTEMENT comme RequireAuth.tsx)
  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Rediriger vers la page d'authentification (EXACTEMENT comme RequireAuth.tsx)
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }

    return (
      <main className={cn("min-h-screen flex items-center justify-center bg-background", className)}>
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Redirection vers la connexion…</p>
        </div>
      </main>
    );
  }

  // Vérification des rôles si spécifiés
  if (allowedRoles.length > 0 && user) {
    const hasRequiredRole = allowedRoles.includes(user.role);

    if (!hasRequiredRole) {
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <main className={cn("min-h-screen flex items-center justify-center bg-background", className)}>
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-red-600">Accès refusé</h1>
            <p className="text-muted-foreground">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
            <p className="text-sm text-muted-foreground">
              Rôle requis : {allowedRoles.join(', ')}<br />
              Votre rôle : {user.role}
            </p>
          </div>
        </main>
      );
    }
  }

  return <>{children}</>;
};

export default AuthGuard;