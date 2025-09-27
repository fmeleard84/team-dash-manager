/**
 * Module AUTH - Composants Index
 *
 * Centralise l'export de tous les composants du module auth.
 * Fournit des alias pour la compatibilité avec l'architecture existante.
 */

// Composants principaux
export { LoginForm } from './LoginForm';
export { RegisterForm } from './RegisterForm';
export { ForgotPasswordForm } from './ForgotPasswordForm';
export { ResetPasswordForm } from './ResetPasswordForm';
export { LogoutButton } from './LogoutButton';
export { AuthProvider } from './AuthProvider';

// Composants de protection
export { AuthGuard } from './AuthGuard';
export { RoleGuard } from './RoleGuard';

// Aliases pour compatibilité et simplicité d'usage
export { LoginForm as AuthLoginForm } from './LoginForm';
export { RegisterForm as AuthRegisterForm } from './RegisterForm';
export { ForgotPasswordForm as AuthForgotPasswordForm } from './ForgotPasswordForm';
export { ResetPasswordForm as AuthResetPasswordForm } from './ResetPasswordForm';
export { LogoutButton as AuthLogoutButton } from './LogoutButton';
export { AuthGuard as RequireAuth } from './AuthGuard';

// Composants par défaut
export { default as LoginFormDefault } from './LoginForm';
export { default as RegisterFormDefault } from './RegisterForm';
export { default as ForgotPasswordFormDefault } from './ForgotPasswordForm';
export { default as ResetPasswordFormDefault } from './ResetPasswordForm';
export { default as LogoutButtonDefault } from './LogoutButton';
export { default as AuthGuardDefault } from './AuthGuard';
export { default as RoleGuardDefault } from './RoleGuard';