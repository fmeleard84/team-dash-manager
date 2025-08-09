
import { useEffect, useRef } from 'react';
import { useKeycloakAuth } from '@/contexts/KeycloakAuthContext';
import { setKeycloakIdentity, clearKeycloakIdentity } from '@/integrations/supabase/client';

export const useSupabaseAuth = () => {
  const { user, isAuthenticated } = useKeycloakAuth();
  const headersAppliedRef = useRef(false);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Guard against multiple applications during StrictMode double renders
    if (!isInitialized.current) {
      isInitialized.current = true;
      return;
    }

    const applyHeaders = () => {
      if (!isAuthenticated || !user?.profile || headersAppliedRef.current) {
        return;
      }

      console.log('User authenticated with Keycloak, configuring Supabase headers with Keycloak identity');

      const sub = user.profile.sub as string | undefined;
      const email = user.profile.email as string | undefined;

      setKeycloakIdentity(sub, email);
      headersAppliedRef.current = true;

      console.log('🔐 Supabase configured with apikey + Keycloak headers', {
        subSet: !!sub,
        emailSet: !!email,
        sub,
        email
      });
    };

    const clearHeaders = () => {
      if (!headersAppliedRef.current) {
        return;
      }

      console.log('User logged out, clearing Supabase custom headers');
      clearKeycloakIdentity();
      headersAppliedRef.current = false;
    };

    // Only clear on explicit logout, not on mount
    if (isAuthenticated && user?.profile) {
      applyHeaders();
    } else if (!isAuthenticated && headersAppliedRef.current) {
      clearHeaders();
    }
  }, [isAuthenticated, user]);

  return { isAuthenticated, user };
};
