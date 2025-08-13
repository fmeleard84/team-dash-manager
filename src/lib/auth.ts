import { useAuth } from '@/contexts/AuthContext';

/**
 * Auth utilities for the application
 */

// Simple guard function for protecting routes
export function requireAuth(fn: () => void) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    if (typeof window !== 'undefined') window.location.href = '/auth';
    return;
  }
  fn();
}
