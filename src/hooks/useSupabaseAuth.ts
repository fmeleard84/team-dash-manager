import { useKeycloakAuth } from '@/contexts/KeycloakAuthContext';

export const useSupabaseAuth = () => {
  const { user, isAuthenticated } = useKeycloakAuth();
  // Supabase headers are managed directly by KeycloakAuthContext now
  return { isAuthenticated, user };
};
