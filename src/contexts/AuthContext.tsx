import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  companyName?: string;
  role: 'admin' | 'client' | 'candidate' | 'hr_manager';
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
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
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = localStorage.getItem('user_data');
      if (!userData) {
        setIsLoading(false);
        return;
      }

      // For now, use localStorage-based session management
      // In production, you would want server-side session validation
      const user = JSON.parse(userData);
      setUser(user);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('user_data');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Get registered users from localStorage
      const registeredUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
      
      // Demo credentials - replace with real authentication
      const demoUsers = [
        {
          id: '1',
          email: 'admin@example.com',
          password: 'admin123',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin' as const,
          isActive: true,
          emailVerified: true,
          createdAt: new Date().toISOString()
        },
        {
          id: '2', 
          email: 'client@example.com',
          password: 'client123',
          firstName: 'Marie',
          lastName: 'Dupont',
          companyName: 'Entreprise ABC',
          role: 'client' as const,
          isActive: true,
          emailVerified: true,
          createdAt: new Date().toISOString()
        },
        {
          id: '3',
          email: 'candidate@example.com', 
          password: 'candidate123',
          firstName: 'Jean',
          lastName: 'Martin',
          role: 'candidate' as const,
          isActive: true,
          emailVerified: true,
          createdAt: new Date().toISOString()
        }
      ];

      // Combine demo users and registered users
      const allUsers = [...demoUsers, ...registeredUsers];
      const user = allUsers.find(u => u.email === email.toLowerCase() && u.password === password);
      
      if (!user) {
        toast.error('Email ou mot de passe incorrect');
        return false;
      }

      // Store user data in localStorage
      localStorage.setItem('user_data', JSON.stringify(user));
      setUser(user);
      
      toast.success('Connexion réussie');
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Erreur de connexion');
      return false;
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      // Validation
      if (!userData.email || !userData.password || !userData.firstName || !userData.lastName || !userData.role) {
        toast.error('Tous les champs requis doivent être remplis');
        return false;
      }

      if (userData.password.length < 6) {
        toast.error('Le mot de passe doit faire au moins 6 caractères');
        return false;
      }

      // Get existing registered users
      const registeredUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
      
      // Check if email already exists
      const emailExists = registeredUsers.some((user: any) => user.email === userData.email.toLowerCase());
      if (emailExists) {
        toast.error('Cet email est déjà utilisé');
        return false;
      }

      // Create new user object
      const newUser = {
        id: Date.now().toString(), // Simple ID generation
        email: userData.email.toLowerCase(),
        password: userData.password, // In production, this should be hashed
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        companyName: userData.companyName,
        role: userData.role,
        isActive: true,
        emailVerified: false,
        createdAt: new Date().toISOString()
      };

      // Add to registered users
      registeredUsers.push(newUser);
      localStorage.setItem('registered_users', JSON.stringify(registeredUsers));
      
      toast.success('Inscription réussie ! Vous pouvez maintenant vous connecter.');
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error('Erreur lors de l\'inscription');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('user_data');
    setUser(null);
    toast.info('Déconnexion réussie');
    window.location.href = '/';
  };

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const updateProfile = async (data: Partial<User>): Promise<boolean> => {
    if (!user) return false;

    try {
      // Update user data in localStorage (demo implementation)
      const updatedUser = { ...user, ...data };
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      toast.success('Profil mis à jour');
      return true;
    } catch (error) {
      console.error('Profile update failed:', error);
      toast.error('Erreur lors de la mise à jour');
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    hasRole,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};