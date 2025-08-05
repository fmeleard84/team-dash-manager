import { createContext, useContext, ReactNode } from 'react';
import { AuthProvider, useAuth as useOidcAuth } from 'react-oidc-context';

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
  client_id: 'backoffice',
  redirect_uri: `${window.location.origin}/register?tab=login`,
  response_type: 'code',
  scope: 'openid profile email',
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
  
  const getUserGroups = (): string[] => {
    console.log('Getting user groups from profile:', oidcAuth.user?.profile);
    if (!oidcAuth.user?.profile?.groups) {
      console.log('No groups found in profile, checking other locations...');
      // Try different locations where groups might be stored
      const profile = oidcAuth.user?.profile as any;
      if (profile?.resource_access?.backoffice?.roles) {
        console.log('Found roles in resource_access:', profile.resource_access.backoffice.roles);
        return profile.resource_access.backoffice.roles as string[];
      }
      if (profile?.realm_access?.roles) {
        console.log('Found roles in realm_access:', profile.realm_access.roles);
        return (profile.realm_access.roles as string[]).filter((role: string) => 
          ['client', 'candidate', 'resource', 'admin'].includes(role)
        );
      }
      return [];
    }
    return Array.isArray(oidcAuth.user.profile.groups) 
      ? oidcAuth.user.profile.groups as string[]
      : [];
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