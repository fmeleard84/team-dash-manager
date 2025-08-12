import { createContext, useContext, ReactNode, useEffect, useMemo, useState } from 'react';
import Keycloak from 'keycloak-js';
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

// Initialize Keycloak instance once
const keycloak = new Keycloak({
  url: 'https://keycloak.ialla.fr',
  realm: 'haas',
  clientId: 'react-app',
});

interface KeycloakAuthProviderProps {
  children: ReactNode;
}

export const KeycloakAuthProvider = ({ children }: KeycloakAuthProviderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Init Keycloak on mount with silent SSO
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const authenticated = await keycloak.init({
          onLoad: 'check-sso',
          pkceMethod: 'S256',
          silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
        });
        if (cancelled) return;
        setIsAuthenticated(!!authenticated);

        // Load profile to enrich token data (optional)
        try {
          if (authenticated) {
            await keycloak.loadUserProfile();
          }
        } catch {}

        const tokenParsed: any = keycloak.tokenParsed || {};
        const composedUser = { profile: tokenParsed, keycloakProfile: (keycloak as any).profile };
        setUser(authenticated ? composedUser : null);
      } catch (e) {
        // Silent init error handling
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    // Token refresh success keeps session valid
    keycloak.onTokenExpired = async () => {
      try {
        await keycloak.updateToken(30);
      } catch (e) {
        // Token refresh failed - user will need to login again
      }
    };

    return () => {
      cancelled = true;
    };
  }, []);

  // Sync Keycloak identity to Supabase headers
  useEffect(() => {
    const sub = user?.profile?.sub as string | undefined;
    const email = user?.profile?.email as string | undefined;

    if (isAuthenticated && sub) {
      setKeycloakIdentity(sub, email);
    } else {
      clearKeycloakIdentity();
    }
  }, [isAuthenticated, user]);

  const getUserGroups = (): string[] => {
    const profile = user?.profile as any;
    if (!profile) return [];

    let rawGroups: string[] = [];

    if (Array.isArray(profile.groups) && profile.groups.length > 0) {
      rawGroups = profile.groups as string[];
    } else if (profile?.resource_access?.['react-app']?.roles) {
      rawGroups = profile.resource_access['react-app'].roles as string[];
    } else if (profile?.realm_access?.roles) {
      rawGroups = (profile.realm_access.roles as string[]).filter((role: string) =>
        ['client', 'candidate', 'resource', 'ressources', 'admin'].includes(role)
      );
    }

    const cleanedGroups = rawGroups
      .map((g) => (g.startsWith('/') ? g.substring(1) : g))
      .map((g) => (g === 'ressources' || g === 'ressource' ? 'resource' : g))
      .filter((g) => ['client', 'candidate', 'resource', 'admin'].includes(g));

    return cleanedGroups;
  };

  const hasGroup = (groupName: string): boolean => getUserGroups().includes(groupName);
  const hasAdminRole = (): boolean => hasGroup('admin');

  // Clean up any stale Supabase auth state before redirecting to Keycloak
  const cleanupAuthState = () => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      Object.keys(sessionStorage || {}).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch {}
  };

  const login = () => {
    // Prevent limbo states before redirecting to Keycloak
    cleanupAuthState();
    try {
      const loginUrl = (keycloak as any).createLoginUrl ? (keycloak as any).createLoginUrl() : undefined;
      if (loginUrl) {
        if (window.top) {
          (window.top as Window).location.href = loginUrl;
        } else {
          window.location.href = loginUrl;
        }
        return;
      }
    } catch {}
    keycloak.login();
  };

  const logout = () => {
    cleanupAuthState();
    keycloak.logout({ redirectUri: window.location.origin + '/' });
  };

  const contextValue: KeycloakAuthContextType = useMemo(() => ({
    user,
    login,
    logout,
    isLoading,
    isAuthenticated,
    getUserGroups,
    hasGroup,
    hasAdminRole,
  }), [user, isLoading, isAuthenticated]);

  return (
    <KeycloakAuthContext.Provider value={contextValue}>
      {children}
    </KeycloakAuthContext.Provider>
  );
};

