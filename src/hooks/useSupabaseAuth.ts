
import { useEffect } from 'react';
import { useKeycloakAuth } from '@/contexts/KeycloakAuthContext';
import { setKeycloakIdentity, clearKeycloakIdentity } from '@/integrations/supabase/client';

export const useSupabaseAuth = () => {
  const { user, isAuthenticated } = useKeycloakAuth();

  useEffect(() => {
    if (isAuthenticated && user?.profile) {
      console.log('User authenticated with Keycloak, configuring Supabase headers with Keycloak identity');

      const sub = user.profile.sub as string | undefined;
      const email = user.profile.email as string | undefined;

      setKeycloakIdentity(sub, email);

      console.log('🔐 Supabase configured with apikey + Keycloak headers', {
        subSet: !!sub,
        emailSet: !!email,
        sub,
        email
      });
    } else {
      console.log('User not authenticated, clearing Supabase custom headers');
      clearKeycloakIdentity();
    }
  }, [isAuthenticated, user]);

  return { isAuthenticated, user };
};
