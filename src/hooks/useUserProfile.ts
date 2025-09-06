import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CandidateProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  seniority: string;
  daily_rate: number;
  status: string;
  profile_type: string;
}

interface ClientProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  company_name?: string;
  user_id: string;
}

export const useUserProfile = () => {
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Only try to fetch candidate profile if user role is candidate
        if (user.role === 'candidate') {
          const { data: candidate, error: candidateError } = await supabase
            .from('candidate_profiles')
            .select('id, email, first_name, last_name, phone, seniority, daily_rate, status, profile_type')
            .eq('id', user.id)
            .maybeSingle();

          if (!candidateError && candidate) {
            setCandidateProfile(candidate);
          }
        }

        // Only try to fetch client profile if user role is client
        if (user.role === 'client') {
          const { data: client, error: clientError } = await supabase
            .from('client_profiles')
            .select('id, email, first_name, last_name, phone, company_name, user_id')
            .eq('id', user.id)
            .maybeSingle();

          if (!clientError && client) {
            setClientProfile(client);
          }
        }
      } catch (error) {
        console.error('Error fetching user profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [user?.id, user?.role]);

  return {
    candidateProfile,
    clientProfile,
    loading,
    userRole: user?.role,
    isCandidate: user?.role === 'candidate',
    isClient: user?.role === 'client',
    isAdmin: user?.role === 'admin',
  };
};