/**
 * Module AUTH - Index Principal
 *
 * Module complet d'authentification pour Team Dash Manager.
 * Centralise toutes les fonctionnalités d'auth avec architecture modulaire.
 *
 * Fonctionnalités:
 * - Système d'authentification complet (login, register, logout)
 * - Gestion des mots de passe oubliés et réinitialisation
 * - API complète avec gestion d'erreur et cache
 * - Hook React avec gestion d'état avancée
 * - Composants UI modernes (LoginForm, RegisterForm, etc.)
 * - Gardes d'authentification (AuthGuard, RoleGuard)
 * - Compatibilité totale avec AuthContext.tsx existant
 * - Conservation EXACTE des logiques métier existantes
 * - Support complet des rôles (admin, client, candidate, hr_manager)
 * - Validation et feedback utilisateur
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

// ==========================================
// EXPORTS TYPES
// ==========================================

export type {
  // Types de base
  AppRole,
  AuthStatus,
  AuthErrorType,
  AuthMode,

  // Interfaces utilisateur
  ContextUser,
  ProfileRow,
  AuthSession,

  // Interfaces de données
  RegisterData,
  LoginData,
  ForgotPasswordData,
  ResetPasswordData,
  UpdateProfileData,

  // Interfaces de réponse
  AuthResponse,
  AuthError,
  LoginResponse,
  RegisterResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,

  // Interfaces de context et hooks
  AuthContextType,
  AuthProviderProps,
  UseAuthProps,
  UseAuthReturn,

  // Interfaces de composants
  LoginFormProps,
  RegisterFormProps,
  ForgotPasswordFormProps,
  ResetPasswordFormProps,
  LogoutButtonProps,
  AuthGuardProps,
  RoleGuardProps,

  // Configuration et thème
  AuthConfig,
  AuthTheme,

  // Événements
  AuthEventType,
  AuthEventData,
  AuthEventListener,

  // Utilitaires
  AuthFormState,
  FieldValidation,
  AuthValidationRules,
  RedirectParams,
  SessionOptions
} from './types';

// ==========================================
// EXPORTS SERVICES
// ==========================================

export { AuthAPI } from './services/authAPI';

// ==========================================
// EXPORTS HOOKS
// ==========================================

export { useAuth, useAuthLegacy } from './hooks';

// ==========================================
// EXPORTS COMPOSANTS
// ==========================================

export {
  // Composants principaux
  LoginForm,
  RegisterForm,
  ForgotPasswordForm,
  ResetPasswordForm,
  LogoutButton,
  AuthProvider,

  // Composants de protection
  AuthGuard,
  RoleGuard,

  // Aliases pour compatibilité
  AuthLoginForm,
  AuthRegisterForm,
  AuthForgotPasswordForm,
  AuthResetPasswordForm,
  AuthLogoutButton,
  RequireAuth,

  // Composants par défaut
  LoginFormDefault,
  RegisterFormDefault,
  ForgotPasswordFormDefault,
  ResetPasswordFormDefault,
  LogoutButtonDefault,
  AuthGuardDefault,
  RoleGuardDefault
} from './components';

// ==========================================
// CONSTANTES ET CONFIGURATION
// ==========================================

/**
 * Configuration par défaut d'authentification
 */
export const AUTH_CONSTANTS = {
  // Rôles d'application
  ROLES: {
    ADMIN: 'admin',
    CLIENT: 'client',
    CANDIDATE: 'candidate',
    HR_MANAGER: 'hr_manager'
  } as const,

  // Statuts d'authentification
  STATUS: {
    IDLE: 'idle',
    LOADING: 'loading',
    AUTHENTICATED: 'authenticated',
    UNAUTHENTICATED: 'unauthenticated',
    ERROR: 'error'
  } as const,

  // Types d'erreur
  ERROR_TYPES: {
    INVALID_CREDENTIALS: 'invalid_credentials',
    EMAIL_NOT_CONFIRMED: 'email_not_confirmed',
    USER_NOT_FOUND: 'user_not_found',
    WEAK_PASSWORD: 'weak_password',
    EMAIL_ALREADY_EXISTS: 'email_already_exists',
    RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
    NETWORK_ERROR: 'network_error',
    VALIDATION_ERROR: 'validation_error',
    UNKNOWN_ERROR: 'unknown_error'
  } as const,

  // Configuration UI
  UI: {
    PASSWORD_MIN_LENGTH: 6,
    PASSWORD_RECOMMENDED_LENGTH: 8,
    EMAIL_VALIDATION_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_VALIDATION_REGEX: /^(\+33|0)[1-9](?:[0-9]{8})$/
  },

  // URLs de redirection par défaut (EXACTEMENT comme AuthContext.tsx)
  REDIRECT_URLS: {
    admin: '/dashboard',
    hr_manager: '/dashboard',
    client: '/client-dashboard',
    candidate: '/candidate-dashboard',
    default: '/',
    login: '/auth',
    logout: '/'
  },

  // Messages d'authentification (EXACTEMENT comme AuthContext.tsx)
  MESSAGES: {
    LOGIN_SUCCESS: 'Connexion réussie',
    LOGOUT_SUCCESS: 'Déconnexion réussie',
    REGISTER_SUCCESS: 'Inscription réussie ! Vérifiez votre email pour confirmer votre compte.',
    FORGOT_PASSWORD_SENT: 'Un email de réinitialisation a été envoyé. Vérifiez votre boîte de réception.',
    PASSWORD_RESET_SUCCESS: 'Mot de passe mis à jour avec succès',
    PROFILE_UPDATE_SUCCESS: 'Profil mis à jour',
    INVALID_CREDENTIALS: 'Email non confirmé ou identifiants incorrects',
    EMAIL_NOT_CONFIRMED: 'Veuillez confirmer votre email avant de vous connecter',
    ACCOUNT_LOCKED: 'Compte temporairement verrouillé',
    SESSION_EXPIRED: 'Session expirée, veuillez vous reconnecter',
    NETWORK_ERROR: 'Erreur de connexion. Vérifiez votre connexion internet.',
    VALIDATION_ERROR: 'Veuillez corriger les erreurs dans le formulaire',
    LOADING: 'Chargement...',
    REDIRECTING: 'Redirection en cours...'
  }
};

/**
 * Configuration d'authentification par défaut
 */
export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  loginRedirect: {
    admin: AUTH_CONSTANTS.REDIRECT_URLS.admin,
    hr_manager: AUTH_CONSTANTS.REDIRECT_URLS.hr_manager,
    client: AUTH_CONSTANTS.REDIRECT_URLS.client,
    candidate: AUTH_CONSTANTS.REDIRECT_URLS.candidate
  },
  logoutRedirect: AUTH_CONSTANTS.REDIRECT_URLS.logout,
  defaultRedirect: AUTH_CONSTANTS.REDIRECT_URLS.default,

  passwordMinLength: AUTH_CONSTANTS.UI.PASSWORD_MIN_LENGTH,
  emailValidationRegex: AUTH_CONSTANTS.UI.EMAIL_VALIDATION_REGEX,

  autoRefreshSession: true,
  rememberMeDuration: 30, // 30 jours
  sessionTimeoutWarning: 5, // 5 minutes

  maxLoginAttempts: 5,
  lockoutDuration: 15, // 15 minutes

  messages: AUTH_CONSTANTS.MESSAGES
};

/**
 * Règles de validation par défaut
 */
export const DEFAULT_VALIDATION_RULES: AuthValidationRules = {
  email: {
    required: true,
    pattern: AUTH_CONSTANTS.UI.EMAIL_VALIDATION_REGEX
  },
  password: {
    required: true,
    minLength: AUTH_CONSTANTS.UI.PASSWORD_MIN_LENGTH
  },
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 50
  },
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 50
  },
  phone: {
    required: false,
    pattern: AUTH_CONSTANTS.UI.PHONE_VALIDATION_REGEX
  },
  companyName: {
    required: false,
    minLength: 2,
    maxLength: 100
  },
  confirmPassword: {
    required: true,
    custom: (value: string, data: any) => {
      return value === data.password ? null : 'Les mots de passe ne correspondent pas';
    }
  }
};

/**
 * Helpers et utilitaires d'authentification
 */
export const AUTH_HELPERS = {
  /**
   * Obtient l'URL de redirection selon le rôle (EXACTEMENT comme AuthAPI.getRedirectUrl)
   */
  getRedirectUrl: (role: AppRole): string => {
    return DEFAULT_AUTH_CONFIG.loginRedirect[role] || DEFAULT_AUTH_CONFIG.defaultRedirect;
  },

  /**
   * Valide un email
   */
  validateEmail: (email: string): boolean => {
    return AUTH_CONSTANTS.UI.EMAIL_VALIDATION_REGEX.test(email);
  },

  /**
   * Valide un mot de passe
   */
  validatePassword: (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (password.length < AUTH_CONSTANTS.UI.PASSWORD_MIN_LENGTH) {
      errors.push(`Le mot de passe doit faire au moins ${AUTH_CONSTANTS.UI.PASSWORD_MIN_LENGTH} caractères`);
    }

    if (!/[A-Za-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une lettre');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Formate le nom d'utilisateur pour affichage
   */
  formatUserName: (user?: ContextUser | null): string => {
    if (!user) return '';

    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }

    if (user.firstName) {
      return user.firstName;
    }

    if (user.lastName) {
      return user.lastName;
    }

    return user.email || 'Utilisateur';
  },

  /**
   * Obtient les initiales d'un utilisateur
   */
  getUserInitials: (user?: ContextUser | null): string => {
    if (!user) return '';

    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }

    if (user.firstName) {
      return user.firstName.substring(0, 2).toUpperCase();
    }

    if (user.lastName) {
      return user.lastName.substring(0, 2).toUpperCase();
    }

    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }

    return 'U';
  },

  /**
   * Vérifie si un utilisateur a un rôle spécifique
   */
  hasRole: (user: ContextUser | null, role: AppRole): boolean => {
    return (user?.role ?? '') === role;
  },

  /**
   * Vérifie si un utilisateur a l'un des rôles spécifiés
   */
  hasRoles: (user: ContextUser | null, roles: AppRole[]): boolean => {
    return roles.includes(user?.role as AppRole);
  },

  /**
   * Vérifie si un utilisateur peut accéder à une ressource
   */
  canAccess: (user: ContextUser | null, resource: string, action: string = 'read'): boolean => {
    if (!user) return false;

    // Admin a accès à tout
    if (user.role === 'admin') return true;

    // Logique d'accès basique (à étendre selon les besoins)
    switch (user.role) {
      case 'hr_manager':
        return ['candidates', 'projects', 'resources'].includes(resource);
      case 'client':
        return ['projects', 'candidates'].includes(resource);
      case 'candidate':
        return ['projects', 'profile'].includes(resource);
      default:
        return false;
    }
  },

  /**
   * Génère un token de session simple (pour dev/test)
   */
  generateSessionToken: (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};

// ==========================================
// API QUICK ACCESS
// ==========================================

/**
 * API de raccourci pour les actions courantes d'authentification
 */
export const authAPI = {
  // Authentification de base
  login: AuthAPI.login,
  register: AuthAPI.register,
  logout: AuthAPI.logout,

  // Gestion des mots de passe
  forgotPassword: AuthAPI.forgotPassword,
  resetPassword: AuthAPI.resetPassword,

  // Gestion des profils
  updateProfile: AuthAPI.updateProfile,
  fetchProfile: AuthAPI.fetchProfile,
  getCurrentSession: AuthAPI.getCurrentSession,

  // Utilitaires
  validateEmail: AuthAPI.validateEmail,
  validatePassword: AuthAPI.validatePassword,
  formatUserName: AuthAPI.formatUserName,
  getUserInitials: AuthAPI.getUserInitials,
  hasRole: AuthAPI.hasRole,
  hasRoles: AuthAPI.hasRoles,
  getRedirectUrl: AuthAPI.getRedirectUrl,
  onAuthStateChange: AuthAPI.onAuthStateChange,

  // Nettoyage
  cleanupAuthState: AuthAPI.cleanupAuthState
};

// Export par défaut du module complet
export default {
  AuthAPI,
  useAuth,
  useAuthLegacy,
  LoginForm,
  RegisterForm,
  ForgotPasswordForm,
  ResetPasswordForm,
  LogoutButton,
  AuthGuard,
  RoleGuard,
  AUTH_CONSTANTS,
  DEFAULT_AUTH_CONFIG,
  DEFAULT_VALIDATION_RULES,
  AUTH_HELPERS,
  authAPI
};