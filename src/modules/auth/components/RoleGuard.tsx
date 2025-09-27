/**
 * Module AUTH - Composant RoleGuard
 *
 * Composant de protection basé sur les rôles utilisateur.
 * Permet de conditionner l'affichage selon les permissions.
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '@/lib/utils';
import type { RoleGuardProps, AppRole } from '../types';

/**
 * Composant de garde basé sur les rôles
 */
export const RoleGuard = ({
  children,
  allowedRoles,
  fallback,
  currentUserRole,
  strictMode = false,
  className = ''
}: RoleGuardProps) => {
  const { user } = useAuth();

  // Déterminer le rôle à vérifier
  const roleToCheck = currentUserRole || user?.role;

  // Mode strict : doit avoir un utilisateur authentifié
  if (strictMode && !user) {
    if (fallback) {
      return <div className={className}>{fallback}</div>;
    }
    return null;
  }

  // Vérifier si le rôle est autorisé
  const hasAccess = roleToCheck ? allowedRoles.includes(roleToCheck as AppRole) : false;

  if (!hasAccess) {
    if (fallback) {
      return <div className={className}>{fallback}</div>;
    }
    return null;
  }

  return <div className={className}>{children}</div>;
};

export default RoleGuard;