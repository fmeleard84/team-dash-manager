import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface EnrichedProject {
  id: string;
  title: string;
  description?: string;
  status: string;
  project_date?: string;
  due_date?: string;
  client_budget?: number;
  archived_at?: string;
  deleted_at?: string;
  owner_id: string;
  resourceAssignments: any[];
  teamProgress: {
    total: number;
    accepted: number;
    percentage: number;
  };
}

/**
 * Hook centralisé pour récupérer tous les projets avec leurs ressources
 * Réduit le nombre de requêtes de N*3 à 2 requêtes totales
 */
export const useProjectsWithResources = (
  userId: string | undefined,
  userRole: 'client' | 'candidate',
  options?: {
    enablePolling?: boolean; // Désactivé par défaut pour performance
    pollingInterval?: number; // En ms, par défaut 30000
    enableRealtime?: boolean; // Activé par défaut
    limit?: number; // Nombre de projets à charger (défaut: 10)
    offset?: number; // Offset pour la pagination
  }
) => {
  const [projects, setProjects] = useState<EnrichedProject[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<EnrichedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fonction pour rafraîchir les données
  const refresh = () => setRefreshTrigger(prev => prev + 1);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const fetchProjectsAndResources = async () => {
      if (!userId) {
        setProjects([]);
        setArchivedProjects([]);
        setLoading(false);
        return;
      }

      try {
        // 1. Récupérer les projets selon le rôle avec pagination
        const limit = options?.limit || 10;
        const offset = options?.offset || 0;

        let projectsQuery = supabase
          .from('projects')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (userRole === 'client') {
          projectsQuery = projectsQuery.eq('owner_id', userId);
        } else {
          // Pour les candidats, on récupère via hr_resource_assignments
          const { data: assignments } = await supabase
            .from('hr_resource_assignments')
            .select('project_id')
            .eq('candidate_id', userId)
            .eq('booking_status', 'accepted');

          if (!assignments || assignments.length === 0) {
            setProjects([]);
            setArchivedProjects([]);
            setLoading(false);
            return;
          }

          const projectIds = [...new Set(assignments.map(a => a.project_id))];
          projectsQuery = projectsQuery.in('id', projectIds);
        }

        // Ajouter les filtres pour les projets actifs
        const activeProjectsQuery = projectsQuery
          .is('deleted_at', null)
          .is('archived_at', null);

        const { data: activeProjectsData, error: projectsError } = await activeProjectsQuery;

        if (projectsError) throw projectsError;

        // 2. Récupérer aussi les projets archivés pour les clients
        let archivedProjectsData: any[] = [];
        if (userRole === 'client') {
          const { data: archived } = await supabase
            .from('projects')
            .select('*')
            .eq('owner_id', userId)
            .not('archived_at', 'is', null)
            .is('deleted_at', null)
            .order('archived_at', { ascending: false });

          archivedProjectsData = archived || [];
        }

        // 3. Récupérer TOUTES les resource assignments en une seule requête
        // avec jointure directe sur hr_profiles
        const allProjectIds = [
          ...(activeProjectsData || []).map(p => p.id),
          ...archivedProjectsData.map(p => p.id)
        ];

        if (allProjectIds.length === 0) {
          setProjects([]);
          setArchivedProjects([]);
          setLoading(false);
          return;
        }

        const { data: allAssignments, error: assignmentsError } = await supabase
          .from('hr_resource_assignments')
          .select(`
            *,
            hr_profiles (
              id,
              name,
              is_ai
            )
          `)
          .in('project_id', allProjectIds);

        if (assignmentsError) throw assignmentsError;

        // 4. Grouper les assignments par projet
        const assignmentsByProject = (allAssignments || []).reduce((acc, assignment) => {
          if (!acc[assignment.project_id]) {
            acc[assignment.project_id] = [];
          }
          acc[assignment.project_id].push(assignment);
          return acc;
        }, {} as Record<string, any[]>);

        // 5. Enrichir les projets avec leurs assignments et calculer la progression
        const enrichProject = (project: any): EnrichedProject => {
          const projectAssignments = assignmentsByProject[project.id] || [];
          const total = projectAssignments.length;
          const accepted = projectAssignments.filter(a => a.booking_status === 'accepted').length;

          return {
            ...project,
            resourceAssignments: projectAssignments,
            teamProgress: {
              total,
              accepted,
              percentage: total > 0 ? Math.round((accepted / total) * 100) : 0
            }
          };
        };

        const enrichedActiveProjects = (activeProjectsData || []).map(enrichProject);
        const enrichedArchivedProjects = archivedProjectsData.map(enrichProject);

        setProjects(enrichedActiveProjects);
        setArchivedProjects(enrichedArchivedProjects);

      } catch (err) {
        console.error('Error fetching projects with resources:', err);
        setError('Erreur lors du chargement des projets');
      } finally {
        setLoading(false);
      }
    };

    // Charger les données initialement
    fetchProjectsAndResources();

    // Configuration du realtime - UN SEUL channel pour tous les projets
    if (userId && options?.enableRealtime !== false) {
      // Écouter les changements sur les projets
      const projectsChannel = supabase
        .channel('all-projects-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'projects'
          },
          () => {
            // Rafraîchir les données quand un projet change
            fetchProjectsAndResources();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hr_resource_assignments'
          },
          () => {
            // Rafraîchir les données quand une assignment change
            fetchProjectsAndResources();
          }
        )
        .subscribe();

      channel = projectsChannel;

      // Polling optionnel (désactivé par défaut pour performance)
      if (options?.enablePolling) {
        pollInterval = setInterval(() => {
          fetchProjectsAndResources();
        }, options.pollingInterval || 30000);
      }
    }

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [userId, userRole, refreshTrigger]);

  // Mémoriser les compteurs pour éviter les recalculs
  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => !p.archived_at && !p.deleted_at);

    return {
      total: activeProjects.length,
      inProgress: activeProjects.filter(p => p.status === 'play').length,
      new: activeProjects.filter(p => p.status === 'pause' &&
        !p.resourceAssignments.some(a => a.booking_status === 'recherche')).length,
      waitingTeam: activeProjects.filter(p => p.status === 'attente-team').length,
      paused: activeProjects.filter(p => p.status === 'pause' &&
        p.resourceAssignments.some(a => a.booking_status === 'recherche')).length,
      completed: activeProjects.filter(p => p.status === 'completed').length,
      archived: archivedProjects.length
    };
  }, [projects, archivedProjects]);

  return {
    projects,
    archivedProjects,
    loading,
    error,
    refresh,
    stats
  };
};