
import { createContext, useContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { userManager, getCurrentUser, loginRedirect, logoutRedirect } from '@/lib/oidc';
import type { User } from 'oidc-client-ts';
import { setKeycloakIdentity, clearKeycloakIdentity } from '@/integrations/supabase/client';

interface KeycloakAuthContextType {
  user: any; // Keep "any" to preserve public API usage (expects .profile)
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

interface KeycloakAuthProviderProps {
  children: ReactNode;
}

export const KeycloakAuthProvider = ({ children }: KeycloakAuthProviderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Initialize from oidc-client-ts
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const u = await getCurrentUser();
        if (!mounted) return;
        setUser(u);
        setIsAuthenticated(!!u);
      } catch (e) {
        console.warn('[OIDC] Failed to fetch current user:', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();

    // Subscribe to OIDC user events
    const onLoaded = (u: User) => {
      setUser(u);
      setIsAuthenticated(true);
    };
    const onUnloaded = () => {
      setUser(null);
      setIsAuthenticated(false);
    };
    const onExpired = async () => {
      // Access token expired – keep user until manager unloads; UI may trigger login when needed
      const u = await getCurrentUser();
      setUser(u);
      setIsAuthenticated(!!u);
    };

    userManager.events.addUserLoaded(onLoaded);
    userManager.events.addUserUnloaded(onUnloaded);
    userManager.events.addAccessTokenExpired(onExpired);

    return () => {
      mounted = false;
      userManager.events.removeUserLoaded(onLoaded);
      userManager.events.removeUserUnloaded(onUnloaded);
      userManager.events.removeAccessTokenExpired(onExpired);
    };
  }, []);

  // Sync identity to Supabase headers
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
    const profile: any = user?.profile;
    if (!profile) return [];

    let rawGroups: string[] = [];

    if (Array.isArray(profile.groups) && profile.groups.length > 0) {
      rawGroups = profile.groups as string[];
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

  const login = () => {
    const current = window.location.pathname + window.location.search + window.location.hash;
    loginRedirect(current).catch((e) => console.error('[OIDC] signinRedirect failed:', e));
  };

  const logout = () => {
    clearKeycloakIdentity();
    logoutRedirect().catch((e) => console.error('[OIDC] signoutRedirect failed:', e));
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
