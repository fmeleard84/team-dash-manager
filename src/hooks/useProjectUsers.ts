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
        // Note: Cette requête génère une erreur 404 normale si project_members n'existe pas
        const { data, error: fetchError } = await supabase
          .from('project_members')
          .select('*')
          .eq('project_id', projectId)
          .in('status', ['active', 'pending']); // On inclut pending pour voir tous les membres

        if (fetchError) {
          // C'est normal si la table n'existe pas encore, on utilise le fallback
          // console.log('📌 Table project_members not found, using fallback');
          
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

        // 2. Candidats - requête simple sans jointure pour éviter l'erreur 400
        const { data: assignments, error: assignError } = await supabase
          .from('hr_resource_assignments')
          .select('*')
          .eq('project_id', projectId);
        
        // Log simplifié
        if (assignError) {
          console.error('Error loading assignments:', assignError);
        }

        if (assignments) {
          for (const assignment of assignments) {
            // Debug temporaire pour voir l'expertise
            console.log('Assignment job_title:', assignment.job_title, 'pour candidat:', assignment.candidate_id);
            
            // Récupérer les infos du candidat séparément si candidate_id existe
            if (assignment.candidate_id) {
              const { data: candidate, error: candError } = await supabase
                .from('candidate_profiles')
                .select('*')  // Utiliser * pour éviter les problèmes de syntaxe
                .eq('id', assignment.candidate_id)
                .single();
              
              if (candError) {
                // FALLBACK: Si le candidate n'existe pas, créer un utilisateur temporaire
                const tempEmail = `user_${assignment.candidate_id.substring(0, 8)}@temp.com`;
                const tempName = assignment.job_title || 'Assistant';
                
                usersList.push({
                  user_id: assignment.candidate_id,
                  email: tempEmail,
                  display_name: tempName,
                  job_title: assignment.job_title || 'Assistant comptable',
                  role: 'candidate',
                  joined_at: assignment.created_at
                });
              } else if (candidate) {
                const firstName = candidate.first_name || 
                                 candidate.email?.split('@')[0]?.split('.')[0] || 
                                 'Candidat';
                // Priorité: job_title de l'assignment, puis du candidat, puis expertise par défaut
                const jobTitle = assignment.job_title || 
                                candidate.job_title || 
                                'Assistant comptable'; // Défaut plus logique

                usersList.push({
                  user_id: candidate.id,
                  email: candidate.email,
                  display_name: firstName,
                  job_title: jobTitle,
                  role: 'candidate',
                  joined_at: assignment.created_at
                });
                
                // Candidat ajouté avec succès
              }
            }
            // Si pas de candidate_id mais un profile_id (ancien système)
            else if (assignment.profile_id) {
              const { data: hrProfile, error: hrError } = await supabase
                .from('hr_profiles')
                .select('*')  // Utiliser * pour éviter les problèmes de syntaxe
                .eq('id', assignment.profile_id)
                .single();
              
              if (hrError) {
                console.error('Error fetching hr_profile:', hrError);
              }

              if (hrProfile) {
                const displayName = hrProfile.name?.split(' ')[0] || 'Ressource';
                const jobTitle = assignment.job_title || 
                                hrProfile.job_title || 
                                'Assistant comptable';

                usersList.push({
                  user_id: assignment.profile_id,
                  email: `${displayName.toLowerCase()}@temp.com`,
                  display_name: displayName,
                  job_title: jobTitle,
                  role: 'candidate',
                  joined_at: assignment.created_at
                });
                
                // Profil HR ajouté (ancien système)
              }
            }
          }
        }

        // Membres chargés via fallback
        setUsers(usersList);
      } catch (err) {
        console.error('Fallback error:', err);
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