
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// App roles aligned with DB enum public.app_role
type AppRole = 'admin' | 'client' | 'candidate' | 'hr_manager';

type ProfileRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company_name: string | null;
  role: AppRole;
  created_at?: string;
  updated_at?: string;
};

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
  // Compatibility layer for code expecting user.profile.*
  profile: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    companyName?: string;
    role: AppRole;
  };
}

interface AuthContextType {
  user: ContextUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  updateProfile: (data: Partial<Pick<ContextUser, 'firstName' | 'lastName' | 'phone' | 'companyName' | 'role'>>) => Promise<boolean>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  companyName?: string;
  role: 'client' | 'candidate';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<ContextUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Maps DB profile + session to our ContextUser with compatibility user.profile
  const mapToContextUser = (profile: ProfileRow, sessionUserId: string): ContextUser => {
    const email = profile.email ?? '';
    const firstName = profile.first_name ?? '';
    const lastName = profile.last_name ?? '';
    const createdAt = profile.created_at ?? new Date().toISOString();

    const base = {
      id: sessionUserId,
      email,
      firstName,
      lastName,
      phone: profile.phone ?? undefined,
      companyName: profile.company_name ?? undefined,
      role: profile.role ?? 'candidate',
      isActive: true,
      emailVerified: true,
      createdAt,
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
      },
    };
  };

  const fetchProfile = async (uid: string): Promise<ProfileRow | null> => {
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
  };

  // Initialize auth listener and session
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Sync state synchronously as recommended
      if (!session) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Defer DB fetch to avoid deadlocks
      setTimeout(async () => {
        const profile = await fetchProfile(session.user.id);
        if (profile) {
          setUser(mapToContextUser(profile, session.user.id));
        } else {
          // If profile missing (rare), create minimal row
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
          const profile2 = await fetchProfile(session.user.id);
          if (profile2) setUser(mapToContextUser(profile2, session.user.id));
        }
        setIsLoading(false);
      }, 0);
    });

    // Check existing session after registering listener
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session ?? null;
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (profile) {
          setUser(mapToContextUser(profile, session.user.id));
        }
      }
      setIsLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error) {
      console.error('Login failed:', error);
      toast.error('Email ou mot de passe incorrect');
      setIsLoading(false);
      return false;
    }

    // Profile and user state will be set by onAuthStateChange
    toast.success('Connexion réussie');
    setIsLoading(false);
    return !!data.session;
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    // Basic validation
    if (!userData.email || !userData.password || !userData.firstName || !userData.lastName || !userData.role) {
      toast.error('Tous les champs requis doivent être remplis');
      return false;
    }
    if (userData.password.length < 6) {
      toast.error('Le mot de passe doit faire au moins 6 caractères');
      return false;
    }

    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email: userData.email.toLowerCase(),
      password: userData.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role,
          phone: userData.phone ?? undefined,
          company_name: userData.companyName ?? undefined,
        },
      },
    });

    if (error) {
      console.error('Registration failed:', error);
      toast.error("Erreur lors de l'inscription");
      return false;
    }

    toast.success('Inscription réussie ! Vérifiez votre email pour confirmer votre compte.');
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    toast.info('Déconnexion réussie');
    window.location.href = '/';
  };

  const hasRole = (role: string): boolean => {
    return (user?.role ?? '') === role;
  };

  const updateProfile = async (data: Partial<Pick<ContextUser, 'firstName' | 'lastName' | 'phone' | 'companyName' | 'role'>>): Promise<boolean> => {
    if (!user) return false;

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
      .eq('id', user.id);

    if (error) {
      console.error('Profile update failed:', error);
      toast.error('Erreur lors de la mise à jour');
      return false;
    }

    // Refresh local user
    const fresh = await fetchProfile(user.id);
    if (fresh) {
      setUser(mapToContextUser(fresh, user.id));
    }
    toast.success('Profil mis à jour');
    return true;
  };

  const value: AuthContextType = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    hasRole,
    updateProfile,
  }), [user, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
