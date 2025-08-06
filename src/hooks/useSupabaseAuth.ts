import { useEffect } from 'react';
import { useKeycloakAuth } from '@/contexts/KeycloakAuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useSupabaseAuth = () => {
  const { user, isAuthenticated } = useKeycloakAuth();

  useEffect(() => {
    if (isAuthenticated && user?.access_token) {
      console.log('Setting up Supabase auth with Keycloak token');
      
      // Configure global headers for all Supabase requests with external JWT
      (supabase as any).rest.headers = {
        ...(supabase as any).rest.headers,
        'Authorization': `Bearer ${user.access_token}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U',
      };
      
      // Set auth for Edge Functions
      supabase.functions.setAuth(user.access_token);
      
      console.log('Supabase session configured with Keycloak token');
    } else {
      console.log('Clearing Supabase auth - user not authenticated');
      supabase.auth.signOut();
    }
  }, [isAuthenticated, user?.access_token, user?.refresh_token, user?.expires_in, user?.expires_at, user?.profile]);

  return { isAuthenticated, user };
};