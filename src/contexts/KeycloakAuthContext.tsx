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
  redirect_uri: window.location.origin,
  response_type: 'code',
  scope: 'openid profile email',
  automaticSilentRenew: true,
  includeIdTokenInSilentRenew: true,
  onSigninCallback: () => {
    // Clean up the URL after successful login and redirect to appropriate dashboard
    window.history.replaceState({}, document.title, window.location.pathname);
    // The redirect will be handled by the Register component based on user groups
  },
};

interface KeycloakAuthProviderProps {
  children: ReactNode;
}

const KeycloakAuthWrapper = ({ children }: KeycloakAuthProviderProps) => {
  const oidcAuth = useOidcAuth();
  
  const getUserGroups = (): string[] => {
    if (!oidcAuth.user?.profile?.groups) return [];
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