import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';
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

export const useCandidateProjectsOptimized = () => {
  const [projects, setProjects] = useState<CandidateProject[]>([]);
  const [loading, setLoading] = useState(true);
  const { candidateProfile, isCandidate, loading: profileLoading } = useUserProfile();

  useEffect(() => {
    const fetchProjects = async () => {
      // Early return if not a candidate or no candidate profile
      if (!isCandidate || !candidateProfile?.id) {
        setProjects([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Get accepted projects via hr_resource_assignments
        const { data: assignments, error } = await supabase
          .from('hr_resource_assignments')
          .select(`
            *,
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
          .eq('candidate_id', candidateProfile.id)
          .eq('booking_status', 'accepted');

        if (error) {
          console.error('Error fetching projects:', error);
          toast.error('Erreur lors du chargement des projets');
          return;
        }

        // Extract projects from assignments - ONLY include projects with status 'play'
        // This ensures candidates only see planning/kanban/drive/messages for active projects
        const allAcceptedProjects = (assignments || [])
          .filter(assignment => assignment.projects)
          .map(assignment => assignment.projects)
          .filter(Boolean) as CandidateProject[];
        
        const activeProjects = allAcceptedProjects.filter(p => p.status === 'play');
        
        // console.log(`[useCandidateProjectsOptimized] Found ${allAcceptedProjects.length} accepted projects, ${activeProjects.length} are active (status=play)`);
        
        setProjects(activeProjects);
      } catch (error) {
        console.error('Error:', error);
        toast.error('Erreur de connexion');
      } finally {
        setLoading(false);
      }
    };

    // Wait for profile loading to complete
    if (!profileLoading) {
      fetchProjects();
    }
  }, [candidateProfile?.id, isCandidate, profileLoading]);

  return {
    projects,
    loading: loading || profileLoading,
    candidateId: candidateProfile?.id || null,
    refetch: () => {
      if (candidateProfile?.id) {
        setLoading(true);
      }
    }
  };
};