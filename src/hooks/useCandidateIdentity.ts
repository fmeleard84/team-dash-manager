import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CandidateIdentity {
  candidateId: string | null;
  profileId: string | null;
  email: string | null;
  seniority: string | null;
  status: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook centralisé pour obtenir l'identité du candidat
 * Utilise le cache et partage l'état entre tous les composants
 */
export function useCandidateIdentity(): CandidateIdentity & { refetch: () => void } {
  const { user } = useAuth();
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [seniority, setSeniority] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadCandidateIdentity = useCallback(async () => {
    if (!user?.email) {
      setIsLoading(false);
      setError('No user email found');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // First try to get candidate profile by email
      const { data: candidateProfile, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select('id, profile_id, email, seniority, status')
        .eq('email', user.email)
        .maybeSingle();

      if (candidateError) {
        console.error('Error loading candidate profile:', candidateError);
        setError(candidateError.message);
        
        // Fallback: try to get by user ID if profile_id matches
        if (user.id) {
          const { data: fallbackProfile, error: fallbackError } = await supabase
            .from('candidate_profiles')
            .select('id, profile_id, email, seniority, status')
            .eq('profile_id', user.id)
            .maybeSingle();

          if (!fallbackError && fallbackProfile) {
            setCandidateId(fallbackProfile.id);
            setProfileId(fallbackProfile.profile_id);
            setSeniority(fallbackProfile.seniority);
            setStatus(fallbackProfile.status);
            setError(null);
          }
        }
      } else if (candidateProfile) {
        setCandidateId(candidateProfile.id);
        setProfileId(candidateProfile.profile_id);
        setSeniority(candidateProfile.seniority);
        setStatus(candidateProfile.status);
      } else {
        // No candidate profile found
        setError('No candidate profile found for this user');
      }
    } catch (err) {
      console.error('Unexpected error loading candidate identity:', err);
      setError('Unexpected error loading profile');
    } finally {
      setIsLoading(false);
    }
  }, [user?.email, user?.id]);

  useEffect(() => {
    loadCandidateIdentity();
  }, [loadCandidateIdentity, refreshKey]);

  const refetch = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return {
    candidateId,
    profileId,
    email: user?.email || null,
    seniority,
    status,
    isLoading,
    error,
    refetch
  };
}

// Export a singleton instance to share state
let sharedState: CandidateIdentity | null = null;

/**
 * Hook singleton qui partage l'état entre tous les composants
 * Évite les appels multiples à la base de données
 */
export function useSharedCandidateIdentity(): CandidateIdentity {
  const identity = useCandidateIdentity();
  
  // Store in shared state on first load
  if (!sharedState || !sharedState.isLoading) {
    sharedState = identity;
  }
  
  // Return shared state if available and not loading
  if (sharedState && !identity.isLoading) {
    return sharedState;
  }
  
  return identity;
}