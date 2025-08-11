import { createContext, useContext, ReactNode, useEffect } from 'react';
import { AuthProvider, useAuth as useOidcAuth } from 'react-oidc-context';
import { setKeycloakIdentity, clearKeycloakIdentity } from '@/integrations/supabase/client';

interface KeycloakAuthContextType {
  user: any;
  login: () => void;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  getUserGroups: () => string[];
  hasGroup: (groupName: string) => boolean;
  hasAdminRole: () => boolean;
}

const KeycloakAuthContext = createContext<KeycloakAuthContextType | undefined>(undefined);

export const useKeycloakAuth = () => {
  const context = useContext(KeycloakAuthContext);
  if (context === undefined) {
    throw new Error('useKeycloakAuth must be used within a KeycloakAuthProvider');
  }
  return context;
};

const keycloakConfig = {
  authority: 'https://keycloak.ialla.fr/realms/haas',
  client_id: 'react-app',
  redirect_uri: `${window.location.origin}/register?tab=login`,
  response_type: 'code',
  scope: 'openid profile email groups',
  automaticSilentRenew: true,
  includeIdTokenInSilentRenew: true,
  onSigninCallback: () => {
    // Clean up the URL after successful login
    window.history.replaceState({}, document.title, '/register?tab=login');
  },
};

interface KeycloakAuthProviderProps {
  children: ReactNode;
}

const KeycloakAuthWrapper = ({ children }: KeycloakAuthProviderProps) => {
  const oidcAuth = useOidcAuth();

  // Synchronize Keycloak identity to Supabase global fetch headers
  useEffect(() => {
    const sub = oidcAuth.user?.profile?.sub as string | undefined;
    const email = oidcAuth.user?.profile?.email as string | undefined;

    if (oidcAuth.isAuthenticated && sub) {
      setKeycloakIdentity(sub, email);
      console.log('[Keycloak] Synced identity to Supabase headers', { sub });
    } else {
      clearKeycloakIdentity();
      console.log('[Keycloak] Cleared identity from Supabase headers');
    }
  }, [oidcAuth.isAuthenticated, oidcAuth.user]);

  const getUserGroups = (): string[] => {
    console.log('=== DEBUG: Getting user groups ===');
    console.log('Full user object:', oidcAuth.user);
    console.log('User profile:', oidcAuth.user?.profile);
    
    let rawGroups: string[] = [];
    
    if (!oidcAuth.user?.profile?.groups) {
      console.log('No groups found in profile.groups, checking other locations...');
      const profile = oidcAuth.user?.profile as any;
      
      console.log('Checking resource_access:', profile?.resource_access);
      if (profile?.resource_access?.['react-app']?.roles) {
        console.log('Found roles in resource_access.react-app:', profile.resource_access['react-app'].roles);
        rawGroups = profile.resource_access['react-app'].roles as string[];
      } else {
        console.log('Checking realm_access:', profile?.realm_access);
        if (profile?.realm_access?.roles) {
           console.log('Found roles in realm_access:', profile.realm_access.roles);
           rawGroups = (profile.realm_access.roles as string[]).filter((role: string) => 
             ['client', 'candidate', 'resource', 'ressources', 'admin'].includes(role)
           );
        }
      }
      
      if (rawGroups.length === 0) {
        console.log('No groups found anywhere in token');
        return [];
      }
    } else {
      console.log('Found groups in profile.groups:', oidcAuth.user.profile.groups);
      rawGroups = Array.isArray(oidcAuth.user.profile.groups) 
        ? oidcAuth.user.profile.groups as string[]
        : [];
    }
    
    const cleanedGroups = rawGroups
      .map(group => group.startsWith('/') ? group.substring(1) : group)
      .map(group => (group === 'ressources' || group === 'ressource') ? 'resource' : group)
      .filter(group => ['client', 'candidate', 'resource', 'admin'].includes(group));
    
    console.log('Raw groups:', rawGroups);
    console.log('Cleaned groups:', cleanedGroups);
    
    return cleanedGroups;
  };

  const hasGroup = (groupName: string): boolean => {
    return getUserGroups().includes(groupName);
  };

  const hasAdminRole = (): boolean => {
    return hasGroup('admin');
  };

  const login = () => {
    oidcAuth.signinRedirect();
  };

  const logout = () => {
    oidcAuth.signoutRedirect();
  };

  const contextValue: KeycloakAuthContextType = {
    user: oidcAuth.user,
    login,
    logout,
    isLoading: oidcAuth.isLoading,
    isAuthenticated: oidcAuth.isAuthenticated,
    getUserGroups,
    hasGroup,
    hasAdminRole,
  };

  return (
    <KeycloakAuthContext.Provider value={contextValue}>
      {children}
    </KeycloakAuthContext.Provider>
  );
};

export const KeycloakAuthProvider = ({ children }: KeycloakAuthProviderProps) => {
  return (
    <AuthProvider {...keycloakConfig}>
      <KeycloakAuthWrapper>
        {children}
      </KeycloakAuthWrapper>
    </AuthProvider>
  );
};
