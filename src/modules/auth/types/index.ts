/**
 * Module AUTH - Types TypeScript
 *
 * Définit tous les types nécessaires pour le système d'authentification modulaire.
 * Base sur l'implémentation existante dans AuthContext.tsx et Auth.tsx.
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

import { ReactNode } from 'react';

// ==========================================
// TYPES DE BASE
// ==========================================

/**
 * Rôles d'application alignés avec l'enum DB public.app_role
 */
export type AppRole = 'admin' | 'client' | 'candidate' | 'hr_manager';

/**
 * Statuts d'authentification
 */
export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';

/**
 * Types d'erreur d'authentification
 */
export type AuthErrorType =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'user_not_found'
  | 'weak_password'
  | 'email_already_exists'
  | 'rate_limit_exceeded'
  | 'network_error'
  | 'validation_error'
  | 'unknown_error';

/**
 * Modes d'authentification
 */
export type AuthMode = 'login' | 'register' | 'forgot_password' | 'reset_password';

// ==========================================
// INTERFACES UTILISATEUR
// ==========================================

/**
 * Profil utilisateur depuis la base de données
 */
export interface ProfileRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company_name: string | null;
  role: AppRole;
  created_at?: string;
  updated_at?: string;
}

/**
 * Utilisateur context avec compatibilité legacy
 */
export interface ContextUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  companyName?: string;
  role: AppRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;

  // Compatibilité avec composants legacy
  user_metadata?: {
    role: AppRole;
    firstName: string;
    lastName: string;
    companyName?: string;
  };

  // Compatibilité pour code attendant user.profile.*
  profile: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    companyName?: string;
    role: AppRole;
    sub?: string;
  };
}

/**
 * Session utilisateur Supabase
 */
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: {
    id: string;
    email?: string;
    email_confirmed_at?: string;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
  };
}

// ==========================================
// INTERFACES DE DONNÉES
// ==========================================

/**
 * Données d'inscription
 */
export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  companyName?: string;
  role: 'client' | 'candidate';
}

/**
 * Données de connexion
 */
export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Données de réinitialisation de mot de passe
 */
export interface ForgotPasswordData {
  email: string;
}

/**
 * Données de nouveau mot de passe
 */
export interface ResetPasswordData {
  password: string;
  confirmPassword: string;
  token?: string;
}

/**
 * Données de mise à jour de profil
 */
export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  companyName?: string;
  role?: AppRole;
}

// ==========================================
// INTERFACES DE RÉPONSE
// ==========================================

/**
 * Réponse générique d'authentification
 */
export interface AuthResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AuthError;
  message?: string;
}

/**
 * Erreur d'authentification
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
  code?: string;
  details?: Record<string, any>;
}

/**
 * Réponse de connexion
 */
export interface LoginResponse extends AuthResponse<ContextUser> {
  redirectUrl?: string;
  requiresEmailConfirmation?: boolean;
}

/**
 * Réponse d'inscription
 */
export interface RegisterResponse extends AuthResponse<ContextUser> {
  requiresEmailConfirmation: boolean;
  confirmationEmailSent: boolean;
}

/**
 * Réponse de mot de passe oublié
 */
export interface ForgotPasswordResponse extends AuthResponse {
  emailSent: boolean;
}

/**
 * Réponse de réinitialisation de mot de passe
 */
export interface ResetPasswordResponse extends AuthResponse {
  passwordReset: boolean;
}

// ==========================================
// INTERFACES DE CONTEXT
// ==========================================

/**
 * Context d'authentification
 */
export interface AuthContextType {
  // État
  user: ContextUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  status: AuthStatus;
  error: AuthError | null;

  // Actions principales
  login: (data: LoginData) => Promise<LoginResponse>;
  register: (data: RegisterData) => Promise<RegisterResponse>;
  logout: () => Promise<void>;

  // Actions secondaires
  forgotPassword: (data: ForgotPasswordData) => Promise<ForgotPasswordResponse>;
  resetPassword: (data: ResetPasswordData) => Promise<ResetPasswordResponse>;
  updateProfile: (data: UpdateProfileData) => Promise<AuthResponse<ContextUser>>;
  refreshSession: () => Promise<void>;

  // Utilitaires
  hasRole: (role: AppRole) => boolean;
  hasRoles: (roles: AppRole[]) => boolean;
  canAccess: (resource: string, action: string) => boolean;
  clearError: () => void;
}

/**
 * Props du provider d'authentification
 */
export interface AuthProviderProps {
  children: ReactNode;
  onAuthChange?: (user: ContextUser | null) => void;
  redirectOnLogin?: boolean;
  redirectOnLogout?: boolean;
}

// ==========================================
// INTERFACES DE HOOKS
// ==========================================

/**
 * Configuration du hook useAuth
 */
export interface UseAuthProps {
  autoRefresh?: boolean;
  onError?: (error: AuthError) => void;
  onSuccess?: (user: ContextUser) => void;
}

/**
 * Retour du hook useAuth
 */
export interface UseAuthReturn extends AuthContextType {
  // Getters pratiques
  isAdmin: boolean;
  isClient: boolean;
  isCandidate: boolean;
  isHRManager: boolean;
  displayName: string;
  initials: string;

  // Actions étendues
  loginWithEmail: (email: string, password: string) => Promise<LoginResponse>;
  registerCandidate: (data: Omit<RegisterData, 'role'>) => Promise<RegisterResponse>;
  registerClient: (data: Omit<RegisterData, 'role'>) => Promise<RegisterResponse>;

  // Validation
  validateEmail: (email: string) => boolean;
  validatePassword: (password: string) => { isValid: boolean; errors: string[] };

  // Utilitaires
  getRedirectUrl: (role: AppRole) => string;
  formatUserName: (user?: ContextUser) => string;
}

// ==========================================
// INTERFACES DE COMPOSANTS
// ==========================================

/**
 * Props du composant LoginForm
 */
export interface LoginFormProps {
  onSubmit?: (data: LoginData) => void | Promise<void>;
  onRegisterClick?: () => void;
  onForgotPasswordClick?: () => void;
  initialEmail?: string;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
  showRememberMe?: boolean;
  showForgotPassword?: boolean;
  showRegisterLink?: boolean;
}

/**
 * Props du composant RegisterForm
 */
export interface RegisterFormProps {
  onSubmit?: (data: RegisterData) => void | Promise<void>;
  onLoginClick?: () => void;
  initialData?: Partial<RegisterData>;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
  allowRoleSelection?: boolean;
  defaultRole?: 'client' | 'candidate';
  showLoginLink?: boolean;
}

/**
 * Props du composant ForgotPasswordForm
 */
export interface ForgotPasswordFormProps {
  onSubmit?: (data: ForgotPasswordData) => void | Promise<void>;
  onBackToLogin?: () => void;
  initialEmail?: string;
  isLoading?: boolean;
  error?: string | null;
  success?: boolean;
  className?: string;
  showBackButton?: boolean;
}

/**
 * Props du composant ResetPasswordForm
 */
export interface ResetPasswordFormProps {
  onSubmit?: (data: ResetPasswordData) => void | Promise<void>;
  token?: string;
  isLoading?: boolean;
  error?: string | null;
  success?: boolean;
  className?: string;
}

/**
 * Props du composant LogoutButton
 */
export interface LogoutButtonProps {
  onLogout?: () => void | Promise<void>;
  variant?: 'default' | 'ghost' | 'outline' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: ReactNode;
  confirmLogout?: boolean;
  confirmTitle?: string;
  confirmMessage?: string;
}

/**
 * Props du composant AuthGuard
 */
export interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
  allowedRoles?: AppRole[];
  redirectTo?: string;
  className?: string;
}

/**
 * Props du composant RoleGuard
 */
export interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: AppRole[];
  fallback?: ReactNode;
  currentUserRole?: AppRole;
  strictMode?: boolean;
  className?: string;
}

// ==========================================
// INTERFACES DE CONFIGURATION
// ==========================================

/**
 * Configuration d'authentification
 */
export interface AuthConfig {
  // URLs de redirection
  loginRedirect: Record<AppRole, string>;
  logoutRedirect: string;
  defaultRedirect: string;

  // Validation
  passwordMinLength: number;
  emailValidationRegex: RegExp;

  // Comportement
  autoRefreshSession: boolean;
  rememberMeDuration: number; // en jours
  sessionTimeoutWarning: number; // en minutes

  // Sécurité
  maxLoginAttempts: number;
  lockoutDuration: number; // en minutes

  // Messages
  messages: {
    loginSuccess: string;
    logoutSuccess: string;
    registerSuccess: string;
    forgotPasswordSent: string;
    passwordResetSuccess: string;
    invalidCredentials: string;
    emailNotConfirmed: string;
    accountLocked: string;
    sessionExpired: string;
    networkError: string;
  };
}

/**
 * Thème d'authentification
 */
export interface AuthTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
    error: string;
    success: string;
    warning: string;
  };

  spacing: {
    formPadding: string;
    fieldSpacing: string;
    buttonHeight: string;
  };

  typography: {
    titleSize: string;
    bodySize: string;
    labelSize: string;
  };

  animation: {
    transition: string;
    fadeIn: string;
    slideIn: string;
  };
}

// ==========================================
// INTERFACES D'ÉVÉNEMENTS
// ==========================================

/**
 * Types d'événements d'authentification
 */
export type AuthEventType =
  | 'login_attempt'
  | 'login_success'
  | 'login_failure'
  | 'register_attempt'
  | 'register_success'
  | 'register_failure'
  | 'logout'
  | 'password_reset_request'
  | 'password_reset_success'
  | 'session_refresh'
  | 'session_expired'
  | 'profile_update'
  | 'role_change';

/**
 * Données d'événement d'authentification
 */
export interface AuthEventData {
  type: AuthEventType;
  user?: ContextUser;
  timestamp: Date;
  metadata?: Record<string, any>;
  success?: boolean;
  error?: AuthError;
}

/**
 * Listener d'événements d'authentification
 */
export interface AuthEventListener {
  (event: AuthEventData): void;
}

// ==========================================
// TYPES UTILITAIRES
// ==========================================

/**
 * État du formulaire d'authentification
 */
export interface AuthFormState<T = any> {
  data: T;
  isValid: boolean;
  errors: Record<string, string[]>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
}

/**
 * Validation de champ
 */
export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

/**
 * Règles de validation pour formulaires d'auth
 */
export interface AuthValidationRules {
  email: FieldValidation;
  password: FieldValidation;
  firstName: FieldValidation;
  lastName: FieldValidation;
  phone: FieldValidation;
  companyName: FieldValidation;
  confirmPassword: FieldValidation;
}

/**
 * Paramètres de redirection
 */
export interface RedirectParams {
  to?: string;
  replace?: boolean;
  state?: any;
}

/**
 * Options de session
 */
export interface SessionOptions {
  persistSession?: boolean;
  autoRefreshToken?: boolean;
  detectSessionInUrl?: boolean;
  flowType?: 'implicit' | 'pkce';
}

// ==========================================
// TYPES D'EXPORT DEFAULT
// ==========================================

export default {
  // Types de base
  AppRole,
  AuthStatus,
  AuthErrorType,
  AuthMode,

  // Interfaces principales
  ContextUser,
  ProfileRow,
  AuthSession,
  RegisterData,
  LoginData,
  ForgotPasswordData,
  ResetPasswordData,
  UpdateProfileData,

  // Réponses
  AuthResponse,
  AuthError,
  LoginResponse,
  RegisterResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,

  // Context et hooks
  AuthContextType,
  AuthProviderProps,
  UseAuthProps,
  UseAuthReturn,

  // Composants
  LoginFormProps,
  RegisterFormProps,
  ForgotPasswordFormProps,
  ResetPasswordFormProps,
  LogoutButtonProps,
  AuthGuardProps,
  RoleGuardProps,

  // Configuration
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
};