/**
 * Module AUTH - Hook useAuth
 *
 * Hook React pour l'authentification basé sur l'implémentation existante AuthContext.tsx.
 * Conserve EXACTEMENT les mêmes logiques métier et patterns d'utilisation.
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import AuthAPI from '../services/authAPI';
import type {
  ContextUser,
  LoginData,
  RegisterData,
  ForgotPasswordData,
  ResetPasswordData,
  UpdateProfileData,
  UseAuthProps,
  UseAuthReturn,
  AuthStatus,
  AuthError,
  AppRole
} from '../types';

/**
 * Hook d'authentification modulaire
 * CONSERVE EXACTEMENT la logique et l'interface d'AuthContext.tsx
 */
export const useAuth = (props?: UseAuthProps): UseAuthReturn => {
  // État principal (identique à AuthContext.tsx)
  const [user, setUser] = useState<ContextUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  // État dérivé
  const isAuthenticated = !!user;
  const status: AuthStatus = isLoading ? 'loading' :
                             isAuthenticated ? 'authenticated' :
                             error ? 'error' : 'unauthenticated';

  /**
   * Initialise l'authentification et écoute les changements
   * REPLIQUE EXACTEMENT la logique useEffect d'AuthContext.tsx
   */
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const initAuth = async () => {
      // Vérifier la session existante
      const { user: currentUser, session } = await AuthAPI.getCurrentSession();
      if (currentUser) {
        setUser(currentUser);
        props?.onSuccess?.(currentUser);
      }
      setIsLoading(false);

      // Écouter les changements d'authentification (EXACTEMENT comme AuthContext.tsx)
      const { data: listener } = AuthAPI.onAuthStateChange((user, session) => {
        if (!session) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        if (user) {
          setUser(user);
          props?.onSuccess?.(user);
        }
        setIsLoading(false);
      });

      cleanup = () => {
        listener.subscription.unsubscribe();
      };
    };

    initAuth().catch((err) => {
      console.error('Auth initialization failed:', err);
      setError({
        type: 'unknown_error',
        message: 'Erreur lors de l\'initialisation de l\'authentification'
      });
      setIsLoading(false);
    });

    return () => {
      cleanup?.();
    };
  }, [props?.onSuccess]);

  /**
   * Connexion utilisateur
   * CONSERVE EXACTEMENT la logique de login dans AuthContext.tsx
   */
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    const result = await AuthAPI.login({ email, password });

    if (result.success) {
      toast.success('Connexion réussie');

      // Redirection automatique selon le rôle (EXACTEMENT comme AuthContext.tsx)
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      }
    } else {
      const errorMessage = result.error?.message || "Email non confirmé ou identifiants incorrects";
      toast.error(errorMessage);
      setError(result.error || null);
      props?.onError?.(result.error!);
    }

    setIsLoading(false);
    return result;
  };

  /**
   * Interface de connexion simple (compatibilité legacy)
   */
  const loginWithEmail = async (email: string, password: string) => {
    return login(email, password);
  };

  /**
   * Inscription utilisateur
   * CONSERVE EXACTEMENT la logique de register dans AuthContext.tsx
   */
  const register = async (userData: RegisterData) => {
    setIsLoading(true);
    setError(null);

    const result = await AuthAPI.register(userData);

    if (result.success) {
      toast.success('Inscription réussie ! Vérifiez votre email pour confirmer votre compte.');

      // Tentative d'auto-connexion puis redirection (EXACTEMENT comme Auth.tsx)
      if (result.requiresEmailConfirmation) {
        // Tenter de se connecter automatiquement
        const loginResult = await AuthAPI.login({
          email: userData.email,
          password: userData.password
        });

        if (loginResult.success && loginResult.redirectUrl) {
          window.location.href = loginResult.redirectUrl;
        }
      }
    } else {
      const errorMessage = result.error?.message || "Erreur lors de l'inscription";
      toast.error(errorMessage);
      setError(result.error || null);
      props?.onError?.(result.error!);
    }

    setIsLoading(false);
    return result;
  };

  /**
   * Inscription candidat (helper)
   */
  const registerCandidate = async (data: Omit<RegisterData, 'role'>) => {
    return register({ ...data, role: 'candidate' });
  };

  /**
   * Inscription client (helper)
   */
  const registerClient = async (data: Omit<RegisterData, 'role'>) => {
    return register({ ...data, role: 'client' });
  };

  /**
   * Déconnexion utilisateur
   * CONSERVE EXACTEMENT la logique de logout dans AuthContext.tsx
   */
  const logout = async () => {
    await AuthAPI.logout();
    setUser(null);
    toast.info('Déconnexion réussie');
    window.location.href = '/';
  };

  /**
   * Mot de passe oublié
   */
  const forgotPassword = async (data: ForgotPasswordData) => {
    setIsLoading(true);
    setError(null);

    const result = await AuthAPI.forgotPassword(data);

    if (result.success) {
      toast.success(result.message || 'Email de réinitialisation envoyé');
    } else {
      const errorMessage = result.error?.message || 'Erreur lors de l\'envoi de l\'email';
      toast.error(errorMessage);
      setError(result.error || null);
      props?.onError?.(result.error!);
    }

    setIsLoading(false);
    return result;
  };

  /**
   * Réinitialisation de mot de passe
   */
  const resetPassword = async (data: ResetPasswordData) => {
    setIsLoading(true);
    setError(null);

    const result = await AuthAPI.resetPassword(data);

    if (result.success) {
      toast.success('Mot de passe mis à jour avec succès');
    } else {
      const errorMessage = result.error?.message || 'Erreur lors de la mise à jour';
      toast.error(errorMessage);
      setError(result.error || null);
      props?.onError?.(result.error!);
    }

    setIsLoading(false);
    return result;
  };

  /**
   * Mise à jour du profil utilisateur
   * CONSERVE EXACTEMENT la logique d'updateProfile dans AuthContext.tsx
   */
  const updateProfile = async (data: UpdateProfileData) => {
    if (!user) {
      const error: AuthError = {
        type: 'validation_error',
        message: 'Utilisateur non connecté'
      };
      return { success: false, error };
    }

    setIsLoading(true);
    setError(null);

    const result = await AuthAPI.updateProfile(user.id, data);

    if (result.success && result.data) {
      setUser(result.data);
      toast.success('Profil mis à jour');
    } else {
      const errorMessage = result.error?.message || 'Erreur lors de la mise à jour';
      toast.error(errorMessage);
      setError(result.error || null);
      props?.onError?.(result.error!);
    }

    setIsLoading(false);
    return result;
  };

  /**
   * Actualise la session
   */
  const refreshSession = async () => {
    setIsLoading(true);
    try {
      const { user: refreshedUser } = await AuthAPI.getCurrentSession();
      if (refreshedUser) {
        setUser(refreshedUser);
      }
    } catch (err) {
      console.error('Session refresh failed:', err);
      setError({
        type: 'network_error',
        message: 'Erreur lors de l\'actualisation de la session'
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Vérifie si l'utilisateur a un rôle spécifique
   * CONSERVE EXACTEMENT la logique d'hasRole dans AuthContext.tsx
   */
  const hasRole = (role: AppRole): boolean => {
    return AuthAPI.hasRole(user, role);
  };

  /**
   * Vérifie si l'utilisateur a l'un des rôles spécifiés
   */
  const hasRoles = (roles: AppRole[]): boolean => {
    return AuthAPI.hasRoles(user, roles);
  };

  /**
   * Vérification d'accès (placeholder pour permissions avancées)
   */
  const canAccess = (resource: string, action: string): boolean => {
    if (!user) return false;

    // Logique basique selon les rôles
    if (user.role === 'admin') return true;

    // Ajouter d'autres règles selon les besoins
    return true;
  };

  /**
   * Efface l'erreur courante
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Valide un email
   */
  const validateEmail = (email: string): boolean => {
    return AuthAPI.validateEmail(email);
  };

  /**
   * Valide un mot de passe
   */
  const validatePassword = (password: string) => {
    return AuthAPI.validatePassword(password);
  };

  /**
   * Obtient l'URL de redirection selon le rôle
   */
  const getRedirectUrl = (role: AppRole): string => {
    return AuthAPI.getRedirectUrl(role);
  };

  /**
   * Formate le nom d'utilisateur
   */
  const formatUserName = (targetUser?: ContextUser): string => {
    return AuthAPI.formatUserName(targetUser || user);
  };

  // Propriétés calculées
  const computed = useMemo(() => ({
    isAdmin: hasRole('admin'),
    isClient: hasRole('client'),
    isCandidate: hasRole('candidate'),
    isHRManager: hasRole('hr_manager'),
    displayName: formatUserName(),
    initials: AuthAPI.getUserInitials(user)
  }), [user]);

  return {
    // État
    user,
    isLoading,
    isAuthenticated,
    status,
    error,

    // Actions principales
    login,
    register,
    logout,

    // Actions secondaires
    forgotPassword,
    resetPassword,
    updateProfile,
    refreshSession,

    // Utilitaires
    hasRole,
    hasRoles,
    canAccess,
    clearError,

    // Getters pratiques
    ...computed,

    // Actions étendues
    loginWithEmail,
    registerCandidate,
    registerClient,

    // Validation
    validateEmail,
    validatePassword,

    // Utilitaires avancés
    getRedirectUrl,
    formatUserName
  };
};

/**
 * Hook simplifié pour compatibilité legacy
 * Réplique l'interface exacte d'AuthContext.tsx
 */
export const useAuthLegacy = () => {
  const auth = useAuth();

  return {
    user: auth.user,
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    login: (email: string, password: string) => auth.login(email, password),
    register: (userData: RegisterData) => auth.register(userData),
    logout: auth.logout,
    hasRole: auth.hasRole,
    updateProfile: auth.updateProfile
  };
};

// Export par défaut
export default useAuth;