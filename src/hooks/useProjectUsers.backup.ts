import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ProjectUser {
  user_id: string;
  email: string;
  display_name: string;
  job_title: string;
  role: 'client' | 'candidate';
  joined_at: string;
}

/**
 * Hook unifié pour récupérer les utilisateurs d'un projet
 * Utilise une fonction RPC optimisée côté base de données
 * Gère les changements en temps réel
 */
export const useProjectUsers = (projectId: string | null) => {
  const [users, setUsers] = useState<ProjectUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const loadUsers = async () => {
      if (!projectId) {
        setUsers([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const usersList: ProjectUser[] = [];
        
        // 1. Récupérer le client du projet
        const { data: project } = await supabase
          .from('projects')
          .select('owner_id')
          .eq('id', projectId)
          .single();

        if (project?.owner_id) {
          const { data: owner } = await supabase
            .from('profiles')
            .select('id, email, first_name')
            .eq('id', project.owner_id)
            .single();

          if (owner) {
            usersList.push({
              user_id: owner.id,
              email: owner.email,
              display_name: owner.first_name || owner.email?.split('@')[0] || 'Client',
              job_title: 'Client',
              role: 'client',
              joined_at: new Date().toISOString()
            });
          }
        }

        // 2. Récupérer toutes les assignations du projet (acceptées ou confirmées)
        const { data: assignments, error: assignError } = await supabase
          .from('hr_resource_assignments')
          .select(`
            *,
            candidate_profiles (
              id,
              email,
              first_name,
              last_name,
              job_title
            ),
            hr_profiles (
              id,
              name,
              job_title
            )
          `)
          .eq('project_id', projectId)
          .or('booking_status.eq.accepted,booking_status.eq.booké');

        if (assignError) {
          console.error('❌ Error fetching assignments:', assignError);
        }

        if (assignments && assignments.length > 0) {
          for (const assignment of assignments) {
            // SIMPLIFICATION: On utilise uniquement candidate_id (nouveau système)
            // Si candidate_id existe, on l'utilise directement
            if (assignment.candidate_id && assignment.candidate_profiles) {
              const candidate = assignment.candidate_profiles;
              
              // Construire le nom d'affichage: Prénom ou début d'email
              const firstName = candidate.first_name || 
                               candidate.email?.split('@')[0]?.split('.')[0] || 
                               'Candidat';
              
              // Récupérer le métier depuis l'assignation ou le profil candidat
              const jobTitle = assignment.job_title || 
                              candidate.job_title || 
                              assignment.hr_profiles?.job_title ||
                              'Consultant';

              usersList.push({
                user_id: candidate.id,
                email: candidate.email,
                display_name: firstName,
                job_title: jobTitle,
                role: 'candidate',
                joined_at: assignment.created_at
              });
              
              console.log(`✅ Added: ${firstName} - ${jobTitle}`);
            }
            // FALLBACK: Si seulement profile_id (ancien système à migrer)
            else if (assignment.profile_id && assignment.hr_profiles) {
              const hrProfile = assignment.hr_profiles;
              
              // Pour l'ancien système, utiliser le nom du hr_profile
              const displayName = hrProfile.name?.split(' ')[0] || 'Ressource';
              const jobTitle = assignment.job_title || 
                              hrProfile.job_title || 
                              'Consultant';

              usersList.push({
                user_id: assignment.profile_id,
                email: `${displayName.toLowerCase()}@temp.com`,
                display_name: displayName,
                job_title: jobTitle,
                role: 'candidate',
                joined_at: assignment.created_at
              });
              
              console.log(`⚠️ Legacy profile: ${displayName} - ${jobTitle}`);
            }
          }
        }

        console.log('👥 Project users loaded:', usersList);
        setUsers(usersList);
      } catch (err) {
        console.error('❌ Error loading project users:', err);
        setError('Erreur lors du chargement des utilisateurs');
      } finally {
        setLoading(false);
      }
    };

    const setupRealtimeSubscription = () => {
      if (!projectId) return;

      // S'abonner aux changements sur hr_resource_assignments
      channel = supabase
        .channel(`project-users-${projectId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hr_resource_assignments',
            filter: `project_id=eq.${projectId}`
          },
          () => {
            // Recharger les utilisateurs lors d'un changement
            loadUsers();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'projects',
            filter: `id=eq.${projectId}`
          },
          () => {
            // Recharger si le projet change
            loadUsers();
          }
        )
        .subscribe();
    };

    loadUsers();
    setupRealtimeSubscription();

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [projectId]);

  // Formater pour l'affichage : "Prénom - Métier"
  const getDisplayNames = () => {
    return users.map(user => {
      if (user.role === 'client') {
        return `${user.display_name} (Client)`;
      }
      // Format: "Prénom - Métier"
      return `${user.display_name} - ${user.job_title}`;
    });
  };

  // Obtenir un utilisateur par email
  const getUserByEmail = (email: string) => {
    return users.find(u => u.email === email);
  };

  // Obtenir les candidats uniquement
  const getCandidates = () => {
    return users.filter(u => u.role === 'candidate');
  };

  // Obtenir le client
  const getClient = () => {
    return users.find(u => u.role === 'client');
  };

  return {
    users,
    loading,
    error,
    getDisplayNames,
    getUserByEmail,
    getCandidates,
    getClient,
    displayNames: getDisplayNames(),
    candidateCount: getCandidates().length,
    hasClient: !!getClient()
  };
};