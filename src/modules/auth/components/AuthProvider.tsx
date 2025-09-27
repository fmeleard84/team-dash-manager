/**
 * Module AUTH - Composant AuthProvider
 *
 * Provider d'authentification compatible avec l'interface legacy AuthContext.
 * Utilise le nouveau hook useAuth en interne tout en gardant la même API.
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { AuthContextType, ContextUser, RegisterData, UpdateProfileData } from '../types';

/**
 * Context d'authentification (compatible avec legacy)
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Hook pour utiliser le context d'authentification
 * EXACTEMENT la même interface que dans AuthContext.tsx
 */
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

/**
 * Props du provider
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provider d'authentification
 * Utilise le nouveau module auth en interne
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const auth = useAuth();

  // Interface compatible avec legacy AuthContext.tsx
  const contextValue: AuthContextType = {
    // État
    user: auth.user,
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    status: auth.status,
    error: auth.error,

    // Actions principales (compatible avec interface legacy)
    login: async (email: string, password: string) => {
      return auth.login(email, password);
    },
    register: async (userData: RegisterData) => {
      return auth.register(userData);
    },
    logout: auth.logout,

    // Actions secondaires
    forgotPassword: auth.forgotPassword,
    resetPassword: auth.resetPassword,
    updateProfile: async (data: UpdateProfileData) => {
      return auth.updateProfile(data);
    },
    refreshSession: auth.refreshSession,

    // Utilitaires
    hasRole: auth.hasRole,
    hasRoles: auth.hasRoles,
    canAccess: auth.canAccess,
    clearError: auth.clearError
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Export par défaut
export default AuthProvider;