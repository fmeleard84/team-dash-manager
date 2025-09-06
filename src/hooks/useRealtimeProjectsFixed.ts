import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseRealtimeProjectsFixedOptions {
  // État projects
  setProjects: (updater: (prev: any[]) => any[]) => void;
  setResourceAssignments: (updater: (prev: any[]) => any[]) => void;
  
  // Données utilisateur pour filtrer
  userId?: string;
  userType: 'client' | 'candidate';
  candidateProfile?: { id?: string; profile_id: string; seniority: string } | null;
}

// Fixed realtime hook for projects
export const useRealtimeProjectsFixed = ({
  setProjects,
  setResourceAssignments,
  userId,
  userType,
  candidateProfile
}: UseRealtimeProjectsFixedOptions) => {
  const channelsRef = useRef<any[]>([]);
  
  // Use refs to avoid stale closures
  const setProjectsRef = useRef(setProjects);
  const setResourceAssignmentsRef = useRef(setResourceAssignments);
  const userTypeRef = useRef(userType);
  
  // Update refs when values change
  setProjectsRef.current = setProjects;
  setResourceAssignmentsRef.current = setResourceAssignments;
  userTypeRef.current = userType;

  const handleProjectUpdate = useCallback(async (payload: any) => {
    // // console.log('🔄 REALTIME PROJECTS FIXED: Project event:', payload.eventType, payload.new || payload.old);
    
    const updatedProject = payload.new || payload.old;
    if (!updatedProject) return;

    // Update projects state directly
    setProjectsRef.current!(prev => {
      const exists = prev.some(p => p.id === updatedProject.id);
      
      if (payload.eventType === 'DELETE') {
        return prev.filter(p => p.id !== updatedProject.id);
      }
      
      if (payload.eventType === 'INSERT' && !exists) {
        // Ne pas ajouter si le projet est archivé ou supprimé
        if (updatedProject.archived_at || updatedProject.deleted_at) {
          return prev;
        }
        return [...prev, { ...updatedProject, _realtimeUpdated: Date.now() }];
      }
      
      if (payload.eventType === 'UPDATE') {
        // Si le projet vient d'être archivé ou supprimé, le retirer de la liste des projets actifs
        if (updatedProject.archived_at || updatedProject.deleted_at) {
          return prev.filter(p => p.id !== updatedProject.id);
        }
        
        // Si le projet n'existe pas dans la liste et n'est pas archivé/supprimé, l'ajouter
        if (!exists && !updatedProject.archived_at && !updatedProject.deleted_at) {
          return [...prev, { ...updatedProject, _realtimeUpdated: Date.now() }];
        }
        
        // Sinon, mettre à jour normalement
        return prev.map(p => 
          p.id === updatedProject.id 
            ? { ...p, ...updatedProject, _realtimeUpdated: Date.now() }
            : p
        );
      }
      
      return prev;
    });
    
    // For candidates, also update the projects in assignments
    if (userTypeRef.current === 'candidate') {
      console.log('📝 [REALTIME] Updating project in assignments for candidate. Project:', updatedProject.title, 'Status:', updatedProject.status);
      setResourceAssignmentsRef.current!(prev => {
        console.log('📝 [REALTIME] Current assignments:', prev.length);
        return prev.map(a => {
          if (a.project_id === updatedProject.id || a.projects?.id === updatedProject.id) {
            console.log('📝 [REALTIME] Found matching assignment, updating project status to:', updatedProject.status);
            return { ...a, projects: updatedProject, _realtimeUpdated: Date.now() };
          }
          return a;
        });
      });
    }
  }, []);

  const handleAssignmentUpdate = useCallback(async (payload: any) => {
    // // console.log('👥 REALTIME ASSIGNMENTS FIXED: Assignment event:', payload.eventType, payload.new || payload.old);
    
    const updatedAssignment = payload.new || payload.old;
    if (!updatedAssignment) return;

    // Pour les candidats, on doit fetch le projet associé car il n'est pas dans le payload
    if (updatedAssignment.project_id) {
      try {
        const { data: project } = await supabase
          .from('projects')
          .select('*')
          .eq('id', updatedAssignment.project_id)
          .single();
        
        // Ajouter les données du projet à l'assignment
        updatedAssignment.projects = project;
      } catch (error) {
        console.error('Error fetching project for assignment:', error);
      }
    }

    // Update resource assignments state directly
    setResourceAssignmentsRef.current!(prev => {
      const exists = prev.some(a => a.id === updatedAssignment.id);
      
      if (payload.eventType === 'DELETE') {
        return prev.filter(a => a.id !== updatedAssignment.id);
      }
      
      if (payload.eventType === 'INSERT' && !exists) {
        return [...prev, { ...updatedAssignment, _realtimeUpdated: Date.now() }];
      }
      
      if (payload.eventType === 'UPDATE') {
        return prev.map(a => 
          a.id === updatedAssignment.id 
            ? { ...a, ...updatedAssignment, _realtimeUpdated: Date.now() }
            : a
        );
      }
      
      return prev;
    });

    // Si un assignment change de statut, ça peut changer le statut du projet
    // On va fetch et update le projet correspondant
    if (updatedAssignment.project_id && payload.eventType === 'UPDATE') {
      try {
        const { data: project, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', updatedAssignment.project_id)
          .single();
        
        if (!error && project) {
          setProjectsRef.current!(prev => 
            prev.map(p => 
              p.id === project.id 
                ? { ...p, ...project, _realtimeUpdated: Date.now() }
                : p
            )
          );
        }
      } catch (error) {
        console.error('Error fetching updated project:', error);
      }
    }
  }, []);

  useEffect(() => {
    // console.log('🔄 REALTIME PROJECTS FIXED: useEffect triggered with:', {
    //   userId,
    //   userType,
    //   candidateId: candidateProfile?.id,
    //   profileId: candidateProfile?.profile_id,
    //   seniority: candidateProfile?.seniority
    // });
    
    const setupChannels = async () => {
      if (!userId) {
        // console.log('❌ REALTIME PROJECTS FIXED: No userId provided');
        return;
      }

      // console.log('🔄 REALTIME PROJECTS FIXED: Setting up subscriptions for:', userType, userId);

      // Clean up existing channels properly
      if (channelsRef.current.length > 0) {
        channelsRef.current.forEach(channel => {
          if (channel) {
            supabase.removeChannel(channel);
          }
        });
        channelsRef.current = [];
        // Wait a bit to avoid channel conflicts
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    // Projects channel - filter by user if client
    // For candidates: listen to ALL projects (we'll filter client-side based on assignments)
    const projectsChannelName = `realtime-projects-${userType}-${userId}`;
    const projectsChannel = supabase
      .channel(projectsChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          ...(userType === 'client' ? { filter: `owner_id=eq.${userId}` } : {})
        },
        async (payload) => {
          // For candidates, only process updates for projects they're assigned to
          if (userType === 'candidate') {
            const project = payload.new || payload.old;
            if (!project) return;
            
            // Check if candidate is assigned to this project
            const { data: assignments } = await supabase
              .from('hr_resource_assignments')
              .select('id')
              .eq('project_id', project.id)
              .eq('candidate_id', candidateProfile?.id)
              .limit(1);
            
            // Only update if candidate is assigned to this project
            if (assignments && assignments.length > 0) {
              await handleProjectUpdate(payload);
            }
          } else {
            // For clients, process all their projects
            await handleProjectUpdate(payload);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Projects channel:', status, 'for', userType);
      });

    // Assignments channel - filter appropriately
    const assignmentsChannelName = `realtime-assignments-${userType}-${userId}`;
    let assignmentsChannel;
    
    if (userType === 'candidate' && candidateProfile) {
      // Pour candidat: écouter les assignments qui correspondent à son profil OU son candidate_id
      // On ne peut pas faire un OR dans le filter, donc on écoute tout et on filtre côté client
      assignmentsChannel = supabase
        .channel(assignmentsChannelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hr_resource_assignments'
            // Pas de filter - on va filtrer dans le handler
          },
          async (payload) => {
            const assignment = payload.new || payload.old;
            // Filter: soit c'est notre profile_id ET seniority, soit c'est notre candidate_id
            if (assignment && (
              (assignment.profile_id === candidateProfile.profile_id && 
               assignment.seniority === candidateProfile.seniority) ||
              assignment.candidate_id === candidateProfile.id
            )) {
              await handleAssignmentUpdate(payload);
            }
          }
        )
        .subscribe((status) => {
          // console.log('👥 Assignments channel (candidate):', status);
        });
    } else {
      // Pour client: écouter tous les assignments (on filtrera côté client)
      assignmentsChannel = supabase
        .channel(assignmentsChannelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hr_resource_assignments'
          },
          handleAssignmentUpdate
        )
        .subscribe((status) => {
          // console.log('👥 Assignments channel (client):', status);
        });
    }

    // 3. Écouter les notifications pour les candidats
    let notificationsChannel = null;
    if (userType === 'candidate' && candidateProfile?.id) {
      const notificationsChannelName = `notifications-${candidateProfile.id}`;
      notificationsChannel = supabase
        .channel(notificationsChannelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'candidate_notifications',
            filter: `candidate_id=eq.${candidateProfile.id}`
          },
          (payload) => {
            // console.log('🔔 New notification received:', payload);
            // Trigger assignment update to refresh the projects
            handleAssignmentUpdate(payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'candidate_notifications',
            filter: `candidate_id=eq.${candidateProfile.id}`
          },
          (payload) => {
            // console.log('🔔 Notification updated:', payload);
            handleAssignmentUpdate(payload);
          }
        )
        .subscribe((status) => {
          // console.log('🔔 Notifications channel:', status);
        });
    }

    // Store channels for cleanup
    channelsRef.current = notificationsChannel 
      ? [projectsChannel, assignmentsChannel, notificationsChannel]
      : [projectsChannel, assignmentsChannel];

    };

    setupChannels();

    return () => {
      // console.log('🛑 REALTIME PROJECTS FIXED: Cleaning up channels');
      channelsRef.current.forEach(channel => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
      channelsRef.current = [];
    };
  }, [userId, userType, candidateProfile?.id, candidateProfile?.profile_id, candidateProfile?.seniority]); // Remove callbacks from dependencies

  return {
    // Utility function to force refresh if needed
    forceRefresh: () => {
      // console.log('🔄 REALTIME PROJECTS FIXED: Force refresh requested');
      // This could trigger refetch if needed, but ideally shouldn't be necessary
    }
  };
};