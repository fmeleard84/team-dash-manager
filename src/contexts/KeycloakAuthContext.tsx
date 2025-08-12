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

    const initKeycloak = async () => {
      try {
        console.log('[DEBUG] Initializing Keycloak with config:', {
          url: 'https://keycloak.ialla.fr',
          realm: 'haas',
          clientId: 'react-app'
        });
        
        const authenticated = await keycloak.init({
          onLoad: 'check-sso',
          pkceMethod: 'S256',
          silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
        });
        
        console.log('[DEBUG] Keycloak init result:', { authenticated, cancelled });
        
        if (cancelled) return;
        setIsAuthenticated(!!authenticated);

        // Load profile to enrich token data (optional)
        try {
          if (authenticated && !keycloak.profile) {
            console.log('[DEBUG] Loading user profile...');
            await keycloak.loadUserProfile();
            console.log('[DEBUG] User profile loaded:', keycloak.profile);
          }
        } catch (profileError) {
          console.error('[DEBUG] Failed to load profile:', profileError);
        }

        const tokenParsed: any = keycloak.tokenParsed || {};
        console.log('[DEBUG] Current Keycloak state:', {
          authenticated,
          sub: tokenParsed.sub,
          email: tokenParsed.email,
          groups: tokenParsed.groups,
          hasProfile: !!keycloak.profile,
          tokenExists: !!keycloak.token
        });
        
        const composedUser = { profile: tokenParsed, keycloakProfile: (keycloak as any).profile };
        setUser(authenticated ? composedUser : null);
        
        console.log('[DEBUG] Auth state synced:', { 
          authenticated, 
          hasUser: !!composedUser, 
          userGroups: tokenParsed.groups || [] 
        });
      } catch (e) {
        console.error('[DEBUG] Error syncing Keycloak state:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    initKeycloak();

    // Token refresh success keeps session valid
    keycloak.onTokenExpired = async () => {
      console.log('[DEBUG] Token expired, attempting refresh...');
      try {
        const refreshed = await keycloak.updateToken(30);
        console.log('[DEBUG] Token refresh result:', refreshed);
      } catch (e) {
        console.error('[DEBUG] Token refresh failed:', e);
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

    console.log('[DEBUG] Sync effect triggered:', { 
      isAuthenticated, 
      hasSub: !!sub, 
      hasEmail: !!email 
    });

    if (isAuthenticated && sub) {
      setKeycloakIdentity(sub, email);
      console.log('[DEBUG] Keycloak identity synced to Supabase');
    } else {
      clearKeycloakIdentity();
      console.log('[DEBUG] Keycloak identity cleared from Supabase');
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
    console.log('[DEBUG] Login initiated');
    // Prevent limbo states before redirecting to Keycloak
    cleanupAuthState();
    console.log('[DEBUG] Auth state cleaned up');
    
    try {
      const loginUrl = (keycloak as any).createLoginUrl ? (keycloak as any).createLoginUrl() : undefined;
      console.log('[DEBUG] Login URL created:', !!loginUrl);
      
      if (loginUrl) {
        console.log('[DEBUG] Using direct URL redirection');
        if (window.top) {
          (window.top as Window).location.href = loginUrl;
        } else {
          window.location.href = loginUrl;
        }
        return;
      }
    } catch (urlError) {
      console.error('[DEBUG] Error creating login URL:', urlError);
    }
    
    console.log('[DEBUG] Falling back to keycloak.login()');
    keycloak.login();
  };

  const logout = () => {
    console.log('[DEBUG] Logout initiated');
    cleanupAuthState();
    console.log('[DEBUG] Auth state cleaned up for logout');
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

