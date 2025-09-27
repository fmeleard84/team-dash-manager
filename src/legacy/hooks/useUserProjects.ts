import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface UserProject {
  project_id: string;
  project_title: string;
  role: 'client' | 'candidate';
  status: string;
  created_at: string;
}

/**
 * Hook unifié pour récupérer les projets accessibles à un utilisateur
 * Gère automatiquement les rôles client et candidat
 * Utilise une fonction RPC optimisée avec cache et temps réel
 */
export const useUserProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const loadProjects = async () => {
      if (!user?.email) {
        setProjects([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Utiliser la fonction RPC optimisée
        const { data, error: rpcError } = await supabase
          .rpc('get_user_projects', { user_email: user.email });

        if (rpcError) throw rpcError;

        setProjects(data || []);
      } catch (err) {
        console.error('❌ Error loading user projects:', err);
        setError('Erreur lors du chargement des projets');
      } finally {
        setLoading(false);
      }
    };

    const setupRealtimeSubscription = () => {
      if (!user?.id) return;

      // S'abonner aux changements de projets
      channel = supabase
        .channel(`user-projects-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'projects',
            filter: `owner_id=eq.${user.id}`
          },
          () => {
            loadProjects();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hr_resource_assignments'
          },
          (payload) => {
            // Vérifier si l'assignation concerne l'utilisateur actuel
            loadProjects();
          }
        )
        .subscribe();
    };

    loadProjects();
    setupRealtimeSubscription();

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.email, user?.id]);

  // Filtrer par rôle
  const getClientProjects = () => {
    return projects.filter(p => p.role === 'client');
  };

  const getCandidateProjects = () => {
    return projects.filter(p => p.role === 'candidate');
  };

  // Filtrer par statut
  const getActiveProjects = () => {
    return projects.filter(p => ['active', 'kickoff', 'planning'].includes(p.status));
  };

  const getCompletedProjects = () => {
    return projects.filter(p => p.status === 'completed');
  };

  // Obtenir le projet le plus récent
  const getMostRecentProject = () => {
    if (projects.length === 0) return null;
    return projects[0]; // Déjà triés par date décroissante
  };

  // Déterminer le rôle principal de l'utilisateur
  const getPrimaryRole = (): 'client' | 'candidate' | null => {
    const clientProjects = getClientProjects();
    const candidateProjects = getCandidateProjects();
    
    if (clientProjects.length > 0) return 'client';
    if (candidateProjects.length > 0) return 'candidate';
    return null;
  };

  return {
    projects,
    loading,
    error,
    getClientProjects,
    getCandidateProjects,
    getActiveProjects,
    getCompletedProjects,
    getMostRecentProject,
    getPrimaryRole,
    projectCount: projects.length,
    hasProjects: projects.length > 0,
    isClient: getClientProjects().length > 0,
    isCandidate: getCandidateProjects().length > 0
  };
};