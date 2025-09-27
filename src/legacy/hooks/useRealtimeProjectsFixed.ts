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
  const candidateProfileRef = useRef(candidateProfile);
  
  // Update refs when values change
  setProjectsRef.current = setProjects;
  setResourceAssignmentsRef.current = setResourceAssignments;
  userTypeRef.current = userType;
  candidateProfileRef.current = candidateProfile;

  const handleProjectUpdate = useCallback(async (payload: any) => {
    // // console.log('🔄 REALTIME PROJECTS FIXED: Project event:', payload.eventType, payload.new || payload.old);

    // Ne pas mettre à jour si une visio est active
    if ((window as any).__visioActive) {
      console.log('⏸️ Skipping realtime update - Visio is active');
      return;
    }

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
    console.log('👥 REALTIME ASSIGNMENTS: Event:', payload.eventType, 'Assignment ID:', payload.new?.id || payload.old?.id);

    // Ne pas mettre à jour si une visio est active
    if ((window as any).__visioActive) {
      console.log('⏸️ Skipping realtime assignment update - Visio is active');
      return;
    }

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
        console.log('🗑️ REALTIME: Removing assignment from list');
        // Mark state as changed to trigger reload in CandidateDashboard
        return prev.filter(a => a.id !== updatedAssignment.id).map(a => ({ ...a, _realtimeDeleted: Date.now() }));
      }
      
      if (payload.eventType === 'INSERT' && !exists) {
        console.log('➕ REALTIME: Adding new assignment to list');
        return [...prev, { ...updatedAssignment, _realtimeUpdated: Date.now() }];
      }
      
      if (payload.eventType === 'UPDATE') {
        console.log('🔄 REALTIME: Updating assignment', { 
          assignmentId: updatedAssignment.id,
          exists,
          userType: userTypeRef.current 
        });
        
        // For candidates, check if the update makes the assignment incompatible
        if (userTypeRef.current === 'candidate' && candidateProfileRef.current) {
          const newAssignment = payload.new;
          const oldAssignment = payload.old;
          
          // Check if candidate was previously assigned or matching
          const wasMatching = (
            // Either specifically assigned to this candidate
            oldAssignment?.candidate_id === candidateProfileRef.current.id ||
            // Or was in search mode matching this candidate's profile
            (oldAssignment?.booking_status === 'recherche' &&
             !oldAssignment?.candidate_id && // Important: only if no specific candidate yet
             oldAssignment?.profile_id === candidateProfileRef.current.profile_id &&
             oldAssignment?.seniority === candidateProfileRef.current.seniority)
          );
          
          // Check if candidate still matches after the update
          const stillMatches = (
            // Either specifically assigned to this candidate
            newAssignment?.candidate_id === candidateProfileRef.current.id ||
            // Or is in search mode matching this candidate's profile
            (newAssignment?.booking_status === 'recherche' &&
             !newAssignment?.candidate_id && // Important: only if no specific candidate yet
             newAssignment?.profile_id === candidateProfileRef.current.profile_id &&
             newAssignment?.seniority === candidateProfileRef.current.seniority)
          );
          
          // Special case: when candidate accepts, it transitions from generic match to specific assignment
          const isAcceptanceTransition = (
            oldAssignment?.booking_status === 'recherche' &&
            newAssignment?.booking_status === 'accepted' &&
            newAssignment?.candidate_id === candidateProfileRef.current.id
          );
          
          console.log('🔍 REALTIME: Assignment compatibility check', {
            assignmentId: updatedAssignment.id,
            wasMatching,
            stillMatches,
            isAcceptanceTransition,
            exists,
            oldBookingStatus: oldAssignment?.booking_status,
            newBookingStatus: newAssignment?.booking_status,
            oldCandidateId: oldAssignment?.candidate_id,
            newCandidateId: newAssignment?.candidate_id,
            ourCandidateId: candidateProfileRef.current.id
          });
          
          // Case 1: Was matching but no longer matches - REMOVE
          if (wasMatching && !stillMatches) {
            console.log('🚫 REALTIME: Assignment no longer compatible, removing from list');
            return prev.filter(a => a.id !== updatedAssignment.id).map(a => ({ ...a, _realtimeDeleted: Date.now() }));
          }
          
          // Case 2: Wasn't matching but now matches - ADD only if not exists
          if (!wasMatching && stillMatches && !exists) {
            console.log('✅ REALTIME: Assignment now compatible, adding to list');
            return [...prev, { ...updatedAssignment, _realtimeUpdated: Date.now() }];
          }
          
          // Case 3: Was matching and still matches OR acceptance transition - UPDATE
          if ((wasMatching && stillMatches) || isAcceptanceTransition) {
            console.log('🔄 REALTIME: Assignment compatible, updating', {
              bookingStatus: updatedAssignment.booking_status,
              candidateId: updatedAssignment.candidate_id,
              isAcceptanceTransition
            });
            
            // Always update if exists (most common case)
            if (exists) {
              return prev.map(a => 
                a.id === updatedAssignment.id 
                  ? { ...a, ...updatedAssignment, _realtimeUpdated: Date.now() }
                  : a
              );
            }
            // If doesn't exist (shouldn't happen but safety), add it
            return [...prev, { ...updatedAssignment, _realtimeUpdated: Date.now() }];
          }
          
          // Case 4: Wasn't matching and still doesn't match - IGNORE
          if (!wasMatching && !stillMatches) {
            console.log('⏭️ REALTIME: Assignment not relevant, ignoring');
            return prev;
          }
        }
        
        // For clients or fallback: just update if exists
        if (exists) {
          return prev.map(a => 
            a.id === updatedAssignment.id 
              ? { ...a, ...updatedAssignment, _realtimeUpdated: Date.now() }
              : a
          );
        }
        
        // Don't add if doesn't exist (to prevent duplicates)
        return prev;
      }
      
      return prev;
    });

    // Si un assignment est créé ou change de statut, on doit mettre à jour/ajouter le projet
    // Ceci corrige le problème où les candidats ne voient pas les nouveaux projets en temps réel
    if (updatedAssignment.project_id && (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE')) {
      try {
        const { data: project, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', updatedAssignment.project_id)
          .single();
        
        if (!error && project) {
          setProjectsRef.current!(prev => {
            const existingProjectIndex = prev.findIndex(p => p.id === project.id);
            
            // Si le projet n'existe pas encore dans la liste, on l'ajoute
            // Cela peut arriver avec INSERT ou UPDATE (ex: passage de draft à recherche)
            if (existingProjectIndex === -1) {
              console.log('🆕 Nouveau projet détecté via assignment:', project.title, '(Event:', payload.eventType, ')');
              return [...prev, { ...project, _realtimeUpdated: Date.now() }];
            }
            
            // Si le projet existe déjà, on le met à jour
            if (existingProjectIndex !== -1) {
              console.log('🔄 Mise à jour projet existant:', project.title);
              return prev.map(p => 
                p.id === project.id 
                  ? { ...p, ...project, _realtimeUpdated: Date.now() }
                  : p
              );
            }
            
            return prev;
          });
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
            
            // Pour DELETE, on doit vérifier l'ancienne valeur (payload.old)
            // Pour INSERT/UPDATE, on vérifie la nouvelle valeur (payload.new)
            const relevantAssignment = payload.eventType === 'DELETE' ? payload.old : payload.new;
            
            // IMPORTANT: Pour UPDATE/DELETE, on doit traiter si l'assignment était OU est pour nous
            const wasForUs = payload.old && (
              payload.old.candidate_id === candidateProfile.id ||
              (payload.old.booking_status === 'recherche' &&
               !payload.old.candidate_id && // Only if no specific candidate
               payload.old.profile_id === candidateProfile.profile_id &&
               payload.old.seniority === candidateProfile.seniority)
            );
            
            const isForUs = payload.new && (
              payload.new.candidate_id === candidateProfile.id ||
              (payload.new.booking_status === 'recherche' &&
               !payload.new.candidate_id && // Only if no specific candidate
               payload.new.profile_id === candidateProfile.profile_id &&
               payload.new.seniority === candidateProfile.seniority)
            );
            
            // Special: acceptance transition (from generic to specific assignment)
            const isAcceptance = payload.old?.booking_status === 'recherche' &&
                                payload.new?.booking_status === 'accepted' &&
                                payload.new?.candidate_id === candidateProfile.id;
            
            // Process if assignment was for us, is for us, or is an acceptance
            if (wasForUs || isForUs || isAcceptance) {
              console.log('🔔 Realtime assignment event for candidate:', {
                eventType: payload.eventType,
                assignmentId: relevantAssignment.id,
                wasForUs,
                isForUs,
                isAcceptance,
                ourCandidateId: candidateProfile.id,
                bookingStatus: relevantAssignment.booking_status
              });
              await handleAssignmentUpdate(payload);
            }
          }
        )
        .subscribe((status) => {
          console.log('👥 Assignments channel (candidate):', status);
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