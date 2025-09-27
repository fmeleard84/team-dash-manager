/**
 * Module AUTH - Service API
 *
 * Service d'authentification basé sur l'implémentation existante AuthContext.tsx.
 * Conserve EXACTEMENT les mêmes logiques métier et mécaniques d'authentification.
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  AppRole,
  ProfileRow,
  ContextUser,
  LoginData,
  RegisterData,
  ForgotPasswordData,
  ResetPasswordData,
  UpdateProfileData,
  AuthResponse,
  LoginResponse,
  RegisterResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
  AuthError,
  AuthErrorType
} from '../types';

/**
 * Service API d'authentification
 * Réplique EXACTEMENT la logique d'AuthContext.tsx
 */
export class AuthAPI {

  /**
   * Maps DB profile + session to ContextUser avec compatibilité user.profile
   * COPIE EXACTE de mapToContextUser dans AuthContext.tsx
   */
  static mapToContextUser(profile: ProfileRow, sessionUserId: string, sessionUser?: any): ContextUser {
    const email = profile.email ?? '';
    const firstName = profile.first_name ?? '';
    const lastName = profile.last_name ?? '';
    const createdAt = profile.created_at ?? new Date().toISOString();
    const role = profile.role ?? 'candidate';

    const base = {
      id: sessionUserId,
      email,
      firstName,
      lastName,
      phone: profile.phone ?? undefined,
      companyName: profile.company_name ?? undefined,
      role,
      isActive: true,
      emailVerified: true,
      createdAt,
      // Add user_metadata for compatibility with components expecting it
      user_metadata: {
        role,
        firstName,
        lastName,
        companyName: profile.company_name ?? undefined,
      }
    };

    return {
      ...base,
      profile: {
        id: sessionUserId,
        email,
        firstName,
        lastName,
        phone: base.phone,
        companyName: base.companyName,
        role: base.role,
        sub: sessionUserId,
      },
    };
  }

  /**
   * Récupère le profil utilisateur depuis la base
   * COPIE EXACTE de fetchProfile dans AuthContext.tsx
   */
  static async fetchProfile(uid: string): Promise<ProfileRow | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, phone, company_name, role, created_at, updated_at')
      .eq('id', uid)
      .maybeSingle();

    if (error) {
      console.error('fetchProfile error:', error);
      return null;
    }
    return data as ProfileRow | null;
  }

  /**
   * Nettoie l'état d'authentification précédent
   * COPIE EXACTE de cleanupAuthState dans AuthContext.tsx
   */
  static cleanupAuthState(): void {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) localStorage.removeItem(key);
      });
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) sessionStorage.removeItem(key);
      });
    } catch { /* ignore */ }
  }

  /**
   * Crée une erreur d'authentification typée
   */
  private static createAuthError(message: string, type: AuthErrorType = 'unknown_error', code?: string): AuthError {
    return {
      type,
      message,
      code,
      details: {}
    };
  }

  /**
   * Connexion utilisateur
   * CONSERVE EXACTEMENT la logique de login dans AuthContext.tsx
   */
  static async login(data: LoginData): Promise<LoginResponse> {
    // Cleanup + attempt global sign out before logging in
    this.cleanupAuthState();
    try {
      await supabase.auth.signOut({ scope: 'global' } as any);
    } catch {}

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email.toLowerCase(),
      password: data.password,
    });

    if (error) {
      console.error('Login failed:', error);
      const authError = this.createAuthError(
        "Email non confirmé ou identifiants incorrects",
        'invalid_credentials',
        error.message
      );

      return {
        success: false,
        error: authError,
        message: authError.message
      };
    }

    // Fetch profile to get user role et déterminer redirection
    let redirectUrl = '/';
    let user: ContextUser | undefined;

    if (authData.session?.user) {
      const profile = await this.fetchProfile(authData.session.user.id);
      if (profile) {
        user = this.mapToContextUser(profile, authData.session.user.id, authData.session.user);

        // Redirect based on role (EXACTEMENT comme dans AuthContext.tsx)
        if (profile.role === 'client') {
          redirectUrl = '/client-dashboard';
        } else if (profile.role === 'candidate') {
          redirectUrl = '/candidate-dashboard';
        } else if (profile.role === 'admin') {
          redirectUrl = '/dashboard';
        } else if (profile.role === 'hr_manager') {
          redirectUrl = '/dashboard';
        }
      }
    }

    return {
      success: true,
      data: user,
      message: 'Connexion réussie',
      redirectUrl
    };
  }

  /**
   * Inscription utilisateur
   * CONSERVE EXACTEMENT la logique de register dans AuthContext.tsx
   */
  static async register(userData: RegisterData): Promise<RegisterResponse> {
    // Basic validation (EXACTEMENT comme dans AuthContext.tsx)
    if (!userData.email || !userData.password || !userData.firstName || !userData.lastName || !userData.role) {
      const error = this.createAuthError('Tous les champs requis doivent être remplis', 'validation_error');
      return {
        success: false,
        error,
        requiresEmailConfirmation: false,
        confirmationEmailSent: false
      };
    }

    if (userData.password.length < 6) {
      const error = this.createAuthError('Le mot de passe doit faire au moins 6 caractères', 'weak_password');
      return {
        success: false,
        error,
        requiresEmailConfirmation: false,
        confirmationEmailSent: false
      };
    }

    // Cleanup before sign up to avoid stale sessions
    this.cleanupAuthState();
    try {
      await supabase.auth.signOut({ scope: 'global' } as any);
    } catch {}

    const redirectUrl = `${window.location.origin}/`;

    // EXACTEMENT comme firstName et lastName sont traités dans AuthContext.tsx
    const signUpData = {
      email: userData.email.toLowerCase(),
      password: userData.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone,  // EXACTEMENT comme first_name et last_name
          company_name: userData.companyName,
          role: userData.role,
        },
      },
    };

    console.log('📱 SIGNUP DATA TO SUPABASE:', signUpData);
    console.log('📱 PHONE VALUE:', userData.phone);
    console.log('📱 METADATA:', signUpData.options.data);

    const { error } = await supabase.auth.signUp(signUpData);

    if (error) {
      console.error('Registration failed:', error);
      const authError = this.createAuthError(
        "Erreur lors de l'inscription",
        error.message?.includes('already registered') ? 'email_already_exists' : 'unknown_error',
        error.message
      );

      return {
        success: false,
        error: authError,
        requiresEmailConfirmation: false,
        confirmationEmailSent: false
      };
    }

    return {
      success: true,
      message: 'Inscription réussie ! Vérifiez votre email pour confirmer votre compte.',
      requiresEmailConfirmation: true,
      confirmationEmailSent: true
    };
  }

  /**
   * Déconnexion utilisateur
   * CONSERVE EXACTEMENT la logique de logout dans AuthContext.tsx
   */
  static async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  /**
   * Mot de passe oublié
   * Basé sur l'implémentation de PasswordReset.tsx
   */
  static async forgotPassword(data: ForgotPasswordData): Promise<ForgotPasswordResponse> {
    if (!data.email) {
      const error = this.createAuthError('Email requis', 'validation_error');
      return {
        success: false,
        error,
        emailSent: false
      };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password-confirm`,
      });

      if (error) {
        const authError = this.createAuthError(error.message, 'unknown_error');
        return {
          success: false,
          error: authError,
          emailSent: false
        };
      }

      return {
        success: true,
        message: `Un email de réinitialisation a été envoyé à ${data.email}. Vérifiez votre boîte de réception.`,
        emailSent: true
      };
    } catch (err) {
      const error = this.createAuthError('Une erreur inattendue s\'est produite', 'network_error');
      return {
        success: false,
        error,
        emailSent: false
      };
    }
  }

  /**
   * Réinitialisation de mot de passe
   */
  static async resetPassword(data: ResetPasswordData): Promise<ResetPasswordResponse> {
    if (!data.password || !data.confirmPassword) {
      const error = this.createAuthError('Tous les champs sont requis', 'validation_error');
      return {
        success: false,
        error,
        passwordReset: false
      };
    }

    if (data.password !== data.confirmPassword) {
      const error = this.createAuthError('Les mots de passe ne correspondent pas', 'validation_error');
      return {
        success: false,
        error,
        passwordReset: false
      };
    }

    if (data.password.length < 6) {
      const error = this.createAuthError('Le mot de passe doit faire au moins 6 caractères', 'weak_password');
      return {
        success: false,
        error,
        passwordReset: false
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });

      if (error) {
        const authError = this.createAuthError(error.message, 'unknown_error');
        return {
          success: false,
          error: authError,
          passwordReset: false
        };
      }

      return {
        success: true,
        message: 'Mot de passe mis à jour avec succès',
        passwordReset: true
      };
    } catch (err) {
      const error = this.createAuthError('Une erreur inattendue s\'est produite', 'network_error');
      return {
        success: false,
        error,
        passwordReset: false
      };
    }
  }

  /**
   * Mise à jour du profil utilisateur
   * CONSERVE EXACTEMENT la logique de updateProfile dans AuthContext.tsx
   */
  static async updateProfile(userId: string, data: UpdateProfileData): Promise<AuthResponse<ContextUser>> {
    const payload: Partial<ProfileRow> = {
      first_name: data.firstName ?? undefined,
      last_name: data.lastName ?? undefined,
      phone: data.phone ?? undefined,
      company_name: data.companyName ?? undefined,
      role: (data.role as AppRole | undefined) ?? undefined,
    };

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId);

    if (error) {
      console.error('Profile update failed:', error);
      const authError = this.createAuthError('Erreur lors de la mise à jour', 'unknown_error');
      return {
        success: false,
        error: authError
      };
    }

    // Refresh local user
    const fresh = await this.fetchProfile(userId);
    if (fresh) {
      const { data: { session } } = await supabase.auth.getSession();
      const updatedUser = this.mapToContextUser(fresh, userId, session?.user);

      return {
        success: true,
        data: updatedUser,
        message: 'Profil mis à jour'
      };
    }

    const authError = this.createAuthError('Erreur lors de la récupération du profil mis à jour', 'unknown_error');
    return {
      success: false,
      error: authError
    };
  }

  /**
   * Obtenir la session courante
   */
  static async getCurrentSession(): Promise<{ user: ContextUser | null; session: any }> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return { user: null, session: null };
    }

    const profile = await this.fetchProfile(session.user.id);
    if (!profile) {
      return { user: null, session };
    }

    const user = this.mapToContextUser(profile, session.user.id, session.user);
    return { user, session };
  }

  /**
   * Vérifie si un utilisateur a un rôle spécifique
   */
  static hasRole(user: ContextUser | null, role: AppRole): boolean {
    return (user?.role ?? '') === role;
  }

  /**
   * Vérifie si un utilisateur a l'un des rôles spécifiés
   */
  static hasRoles(user: ContextUser | null, roles: AppRole[]): boolean {
    return roles.includes(user?.role as AppRole);
  }

  /**
   * Obtient l'URL de redirection selon le rôle
   */
  static getRedirectUrl(role: AppRole): string {
    switch (role) {
      case 'client':
        return '/client-dashboard';
      case 'candidate':
        return '/candidate-dashboard';
      case 'admin':
      case 'hr_manager':
        return '/dashboard';
      default:
        return '/';
    }
  }

  /**
   * Valide un email
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valide un mot de passe
   */
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 6) {
      errors.push('Le mot de passe doit faire au moins 6 caractères');
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
  }

  /**
   * Formate le nom d'utilisateur pour affichage
   */
  static formatUserName(user?: ContextUser | null): string {
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
  }

  /**
   * Obtient les initiales d'un utilisateur
   */
  static getUserInitials(user?: ContextUser | null): string {
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
  }

  /**
   * Écouter les changements d'authentification
   * CONSERVE EXACTEMENT la logique d'onAuthStateChange
   */
  static onAuthStateChange(callback: (user: ContextUser | null, session: any) => void) {
    return supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        callback(null, null);
        return;
      }

      // Defer DB fetch to avoid deadlocks (EXACTEMENT comme dans AuthContext.tsx)
      setTimeout(async () => {
        const profile = await this.fetchProfile(session.user.id);
        if (profile) {
          const user = this.mapToContextUser(profile, session.user.id, session.user);
          callback(user, session);
        } else {
          // If profile missing (rare), create minimal row (EXACTEMENT comme dans AuthContext.tsx)
          const { error: upsertErr } = await supabase.from('profiles').upsert({
            id: session.user.id,
            email: session.user.email,
            first_name: session.user.user_metadata?.first_name ?? '',
            last_name: session.user.user_metadata?.last_name ?? '',
            role: (session.user.user_metadata?.role as AppRole) ?? 'candidate',
          });
          if (upsertErr) {
            console.error('profiles upsert failed:', upsertErr);
          }
          const profile2 = await this.fetchProfile(session.user.id);
          if (profile2) {
            const user = this.mapToContextUser(profile2, session.user.id, session.user);
            callback(user, session);
          }
        }
      }, 0);
    });
  }

  /**
   * Créer un profil complet lors de l'upsert
   * (pour la compatibilité avec le webhook handle-new-user-simple)
   */
  static async createFullProfile(session: any): Promise<ContextUser | null> {
    if (!session?.user) return null;

    const profile = await this.fetchProfile(session.user.id);
    if (profile) {
      return this.mapToContextUser(profile, session.user.id, session.user);
    }

    // Créer le profil s'il n'existe pas
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      email: session.user.email,
      first_name: session.user.user_metadata?.first_name ?? '',
      last_name: session.user.user_metadata?.last_name ?? '',
      phone: session.user.user_metadata?.phone ?? null,
      company_name: session.user.user_metadata?.company_name ?? null,
      role: (session.user.user_metadata?.role as AppRole) ?? 'candidate',
    });

    if (error) {
      console.error('Profile creation failed:', error);
      return null;
    }

    const newProfile = await this.fetchProfile(session.user.id);
    return newProfile ? this.mapToContextUser(newProfile, session.user.id, session.user) : null;
  }
}

// Export par défaut
export default AuthAPI;