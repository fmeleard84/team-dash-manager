import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CandidateProject {
  id: string;
  title: string;
  description?: string;
  status: string;
  project_date: string;
  due_date?: string;
  client_budget?: number;
}

export const useCandidateProjects = () => {
  const [projects, setProjects] = useState<CandidateProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const { user } = useAuth();

  // Get candidate ID first
  useEffect(() => {
    const fetchCandidateId = async () => {
      if (!user?.profile?.email) return;

      try {
        const { data: candidate, error } = await supabase
          .from('candidate_profiles')
          .select('id')
          .eq('email', user.profile.email)
          .maybeSingle();

        if (error) {
          console.error('Error fetching candidate:', error);
          return;
        }

        if (candidate) {
          setCandidateId(candidate.id);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchCandidateId();
  }, [user?.profile?.email]);

  // Fetch projects when candidate ID is available
  useEffect(() => {
    const fetchProjects = async () => {
      if (!candidateId) return;

      console.log('DEBUG: Fetching projects for candidate ID:', candidateId);
      console.log('DEBUG: User email from context:', user?.profile?.email);

      setLoading(true);
      try {
        // Get accepted projects via project_bookings
        const { data: bookings, error } = await supabase
          .from('project_bookings')
          .select(`
            project_id,
            projects (
              id,
              title,
              description,
              status,
              project_date,
              due_date,
              client_budget
            )
          `)
          .eq('candidate_id', candidateId)
          .eq('status', 'accepted');

        console.log('DEBUG: Raw bookings data:', bookings);
        console.log('DEBUG: Query error:', error);

        if (error) {
          console.error('Error fetching projects:', error);
          toast.error('Erreur lors du chargement des projets');
          return;
        }

        // Extract projects from bookings
        const candidateProjects = (bookings || [])
          .filter(booking => booking.projects)
          .map(booking => booking.projects)
          .filter(Boolean) as CandidateProject[];

        console.log('DEBUG: Processed candidate projects:', candidateProjects);
        setProjects(candidateProjects);
      } catch (error) {
        console.error('Error:', error);
        toast.error('Erreur de connexion');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [candidateId]);

  return {
    projects,
    loading,
    candidateId,
    refetch: () => {
      if (candidateId) {
        // Re-trigger the useEffect by setting loading state
        setLoading(true);
      }
    }
  };
};