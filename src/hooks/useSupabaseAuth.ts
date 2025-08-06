import { useEffect } from 'react';
import { useKeycloakAuth } from '@/contexts/KeycloakAuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useSupabaseAuth = () => {
  const { user, isAuthenticated } = useKeycloakAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('User authenticated with Keycloak, using Supabase with apikey only');
      
      // Clear any external authorization headers - we use only apikey
      if ((supabase as any).rest.headers?.Authorization) {
        delete (supabase as any).rest.headers.Authorization;
      }
      
      console.log('Supabase configured with apikey authentication');
    } else {
      console.log('User not authenticated');
    }
  }, [isAuthenticated, user]);

  return { isAuthenticated, user };
};