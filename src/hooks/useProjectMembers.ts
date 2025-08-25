import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectMember {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'candidate' | 'hr';
  job_title?: string;
}

/**
 * Hook optimisé pour récupérer les membres d'un projet
 * Stratégie : privilégier candidate_id (nouveau système) avec fallback sur profile_id (ancien système)
 * Utilise des requêtes jointes pour de meilleures performances
 */
export const useProjectMembers = (projectId: string | null) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMembers = async () => {
      if (!projectId) {
        setMembers([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const membersList: ProjectMember[] = [];

        // 1. Récupérer le client (propriétaire du projet) avec une seule requête jointe
        const { data: project } = await supabase
          .from('projects')
          .select(`
            owner_id,
            profiles!projects_owner_id_fkey (
              id,
              email,
              first_name
            )
          `)
          .eq('id', projectId)
          .single();

        if (project?.profiles) {
          const owner = project.profiles;
          membersList.push({
            id: owner.id,
            email: owner.email,
            name: owner.first_name || owner.email?.split('@')[0] || 'Client',
            role: 'client',
            job_title: 'Client'
          });
        }

        // 2. Récupérer les candidats assignés avec une seule requête optimisée
        // Privilégier candidate_id (nouveau système) avec fallback sur profile_id (ancien)
        const { data: assignments } = await supabase
          .from('hr_resource_assignments')
          .select(`
            candidate_id,
            profile_id,
            candidate_profiles!hr_resource_assignments_candidate_id_fkey (
              id,
              email,
              job_title,
              profile_id,
              profiles!candidate_profiles_profile_id_fkey (
                first_name
              )
            ),
            hr_profiles!hr_resource_assignments_profile_id_fkey (
              id,
              job_title,
              profile_id,
              profiles!hr_profiles_profile_id_fkey (
                email,
                first_name
              )
            )
          `)
          .eq('project_id', projectId)
          .in('booking_status', ['accepted', 'booké']);

        if (assignments) {
          for (const assignment of assignments) {
            // Priorité 1: Nouveau système avec candidate_id
            if (assignment.candidate_id && assignment.candidate_profiles) {
              const candidate = assignment.candidate_profiles;
              const firstName = candidate.profiles?.first_name || 
                               candidate.email?.split('@')[0] || 
                               'Candidat';
              
              membersList.push({
                id: candidate.id,
                email: candidate.email,
                name: firstName,
                role: 'candidate',
                job_title: candidate.job_title || 'Consultant'
              });
            }
            // Priorité 2: Ancien système avec profile_id (si pas de candidate_id)
            else if (!assignment.candidate_id && assignment.profile_id && assignment.hr_profiles) {
              const hrProfile = assignment.hr_profiles;
              if (hrProfile.profiles) {
                const firstName = hrProfile.profiles.first_name || 
                                 hrProfile.profiles.email?.split('@')[0] || 
                                 'Candidat';
                
                membersList.push({
                  id: hrProfile.id,
                  email: hrProfile.profiles.email,
                  name: firstName,
                  role: 'candidate',
                  job_title: hrProfile.job_title || 'Consultant'
                });
              }
            }
          }
        }

        // Éliminer les doublons basés sur l'email
        const uniqueMembers = membersList.reduce((acc, member) => {
          if (!acc.find(m => m.email === member.email)) {
            acc.push(member);
          }
          return acc;
        }, [] as ProjectMember[]);

        setMembers(uniqueMembers);
      } catch (err) {
        console.error('❌ Error loading members:', err);
        setError('Erreur lors du chargement des membres');
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [projectId]);

  // Formater pour l'affichage (Prénom - Métier)
  const getMemberDisplayNames = () => {
    return members.map(member => {
      if (member.role === 'client') {
        return `${member.name} (Client)`;
      }
      return `${member.name} - ${member.job_title || 'Consultant'}`;
    });
  };

  return {
    members,
    loading,
    error,
    getMemberDisplayNames,
    memberNames: getMemberDisplayNames()
  };
};