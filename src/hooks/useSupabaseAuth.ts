import { useEffect } from 'react';
import { useKeycloakAuth } from '@/contexts/KeycloakAuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useSupabaseAuth = () => {
  const { user, isAuthenticated } = useKeycloakAuth();

  useEffect(() => {
    if (isAuthenticated && user?.access_token) {
      console.log('Setting up Supabase auth with Keycloak token');
      
      // Configure global headers for all Supabase requests
      (supabase as any).rest.headers = {
        ...(supabase as any).rest.headers,
        'Authorization': `Bearer ${user.access_token}`,
      };
      
      // Set auth for Edge Functions
      supabase.functions.setAuth(user.access_token);
      
      console.log('Supabase auth configured with JWT token');
    } else {
      console.log('Clearing Supabase auth - user not authenticated');
      // Clear auth headers when user is not authenticated
      if ((supabase as any).rest.headers) {
        delete (supabase as any).rest.headers['Authorization'];
      }
    }
  }, [isAuthenticated, user?.access_token]);

  return { isAuthenticated, user };
};