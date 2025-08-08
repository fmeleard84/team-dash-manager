
import { useEffect } from 'react';
import { useKeycloakAuth } from '@/contexts/KeycloakAuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useSupabaseAuth = () => {
  const { user, isAuthenticated } = useKeycloakAuth();

  useEffect(() => {
    const restHeaders = (supabase as any)?.rest?.headers as Record<string, string> | undefined;
    const fnHeaders = (supabase as any)?.functions?.headers as Record<string, string> | undefined;

    if (isAuthenticated && user) {
      console.log('User authenticated with Keycloak, configuring Supabase headers with Keycloak identity');

      // Always use apikey only (no Supabase JWT)
      if (restHeaders?.Authorization) {
        delete restHeaders.Authorization;
      }

      const sub = user?.profile?.sub as string | undefined;
      const email = user?.profile?.email as string | undefined;

      if (sub) {
        if (restHeaders) restHeaders['x-keycloak-sub'] = sub;
        if (fnHeaders) fnHeaders['x-keycloak-sub'] = sub;
      }
      if (email) {
        if (restHeaders) restHeaders['x-keycloak-email'] = email;
        if (fnHeaders) fnHeaders['x-keycloak-email'] = email;
      }

      console.log('Supabase configured with apikey + Keycloak headers', {
        subSet: !!sub,
        emailSet: !!email,
      });
    } else {
      console.log('User not authenticated, clearing Supabase custom headers');
      if (restHeaders) {
        if (restHeaders.Authorization) delete restHeaders.Authorization;
        if (restHeaders['x-keycloak-sub']) delete restHeaders['x-keycloak-sub'];
        if (restHeaders['x-keycloak-email']) delete restHeaders['x-keycloak-email'];
      }
      if (fnHeaders) {
        if (fnHeaders['x-keycloak-sub']) delete fnHeaders['x-keycloak-sub'];
        if (fnHeaders['x-keycloak-email']) delete fnHeaders['x-keycloak-email'];
      }
    }
  }, [isAuthenticated, user]);

  return { isAuthenticated, user };
};
