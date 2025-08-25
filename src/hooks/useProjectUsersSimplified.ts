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
 * Hook SIMPLIFIÉ pour récupérer les utilisateurs d'un projet
 * Utilise la nouvelle table unifiée project_members
 * 
 * AVANTAGES:
 * - Une seule requête simple
 * - Pas de jointures complexes
 * - Pas de logique dupliquée
 * - Performance optimale
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
        // UNE SEULE REQUÊTE SIMPLE !
        const { data, error: fetchError } = await supabase
          .from('project_members')
          .select('*')
          .eq('project_id', projectId)
          .in('status', ['active', 'pending']); // On inclut pending pour voir tous les membres

        if (fetchError) {
          console.error('❌ Error fetching project members:', fetchError);
          setError('Erreur lors du chargement des membres');
          
          // FALLBACK vers l'ancienne méthode si la table n'existe pas encore
          await loadUsersOldWay();
          return;
        }

        // Transformer en format ProjectUser
        const usersList: ProjectUser[] = (data || []).map(member => ({
          user_id: member.user_id,
          email: member.user_email,
          display_name: member.display_name,
          job_title: member.job_title || 'Consultant',
          role: member.user_type as 'client' | 'candidate',
          joined_at: member.joined_at
        }));

        console.log(`✅ Loaded ${usersList.length} project members`);
        setUsers(usersList);
      } catch (err) {
        console.error('❌ Error:', err);
        setError('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    // Fallback vers l'ancienne méthode (temporaire)
    const loadUsersOldWay = async () => {
      if (!projectId) return;

      try {
        const usersList: ProjectUser[] = [];
        
        // 1. Client
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

        // 2. Candidats (sans filtre sur booking_status pour debug)
        const { data: assignments } = await supabase
          .from('hr_resource_assignments')
          .select(`
            *,
            candidate_profiles (id, email, first_name, last_name, job_title)
          `)
          .eq('project_id', projectId);

        if (assignments) {
          for (const assignment of assignments) {
            if (assignment.candidate_id && assignment.candidate_profiles) {
              const candidate = assignment.candidate_profiles;
              const firstName = candidate.first_name || 
                               candidate.email?.split('@')[0]?.split('.')[0] || 
                               'Candidat';
              const jobTitle = assignment.job_title || 
                              candidate.job_title || 
                              'Consultant';

              usersList.push({
                user_id: candidate.id,
                email: candidate.email,
                display_name: firstName,
                job_title: jobTitle,
                role: 'candidate',
                joined_at: assignment.created_at
              });
            }
          }
        }

        console.log('📌 Fallback: Loaded users the old way:', usersList);
        setUsers(usersList);
      } catch (err) {
        console.error('❌ Fallback error:', err);
      }
    };

    // Setup realtime subscription
    const setupRealtimeSubscription = () => {
      if (!projectId) return;

      // S'abonner aux changements sur project_members
      channel = supabase
        .channel(`project-members-${projectId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'project_members',
            filter: `project_id=eq.${projectId}`
          },
          () => {
            loadUsers();
          }
        )
        .subscribe();
    };

    loadUsers();
    setupRealtimeSubscription();

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
      return `${user.display_name} - ${user.job_title}`;
    });
  };

  // Helper functions
  const getUserByEmail = (email: string) => {
    return users.find(u => u.email === email);
  };

  const getCandidates = () => {
    return users.filter(u => u.role === 'candidate');
  };

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