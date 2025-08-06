import { useEffect } from 'react';
import { useKeycloakAuth } from '@/contexts/KeycloakAuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useSupabaseAuth = () => {
  const { user, isAuthenticated } = useKeycloakAuth();

  useEffect(() => {
    if (isAuthenticated && user?.access_token) {
      // Set the Authorization header for Supabase requests
      supabase.functions.setAuth(user.access_token);
      
      // For database requests, we need to modify the global headers
      const originalFrom = supabase.from;
      supabase.from = (table: string) => {
        const query = originalFrom.call(supabase, table);
        (query as any).headers = {
          ...((query as any).headers || {}),
          'Authorization': `Bearer ${user.access_token}`,
        };
        return query;
      };
    }
  }, [isAuthenticated, user]);

  return { isAuthenticated, user };
};