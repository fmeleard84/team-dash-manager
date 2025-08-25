import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseRealtimeProjectsFixedOptions {
  // État projects
  setProjects: (updater: (prev: any[]) => any[]) => void;
  setResourceAssignments: (updater: (prev: any[]) => any[]) => void;
  
  // Données utilisateur pour filtrer
  userId?: string;
  userType: 'client' | 'candidate';
  candidateProfile?: { profile_id: string; seniority: string } | null;
}

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
  
  // Update refs when values change
  setProjectsRef.current = setProjects;
  setResourceAssignmentsRef.current = setResourceAssignments;

  const handleProjectUpdate = useCallback(async (payload: any) => {
    console.log('🔄 REALTIME PROJECTS FIXED: Project event:', payload.eventType, payload.new || payload.old);
    
    const updatedProject = payload.new || payload.old;
    if (!updatedProject) return;

    // Update projects state directly
    setProjectsRef.current!(prev => {
      const exists = prev.some(p => p.id === updatedProject.id);
      
      if (payload.eventType === 'DELETE') {
        return prev.filter(p => p.id !== updatedProject.id);
      }
      
      if (payload.eventType === 'INSERT' && !exists) {
        return [...prev, { ...updatedProject, _realtimeUpdated: Date.now() }];
      }
      
      if (payload.eventType === 'UPDATE') {
        return prev.map(p => 
          p.id === updatedProject.id 
            ? { ...p, ...updatedProject, _realtimeUpdated: Date.now() }
            : p
        );
      }
      
      return prev;
    });
  }, []);

  const handleAssignmentUpdate = useCallback(async (payload: any) => {
    console.log('👥 REALTIME ASSIGNMENTS FIXED: Assignment event:', payload.eventType, payload.new || payload.old);
    
    const updatedAssignment = payload.new || payload.old;
    if (!updatedAssignment) return;

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
    if (!userId) {
      console.log('❌ REALTIME PROJECTS FIXED: No userId provided');
      return;
    }

    console.log('🔄 REALTIME PROJECTS FIXED: Setting up subscriptions for:', userType, userId);

    // Clean up existing channels
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Projects channel - filter by user if client
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
        handleProjectUpdate
      )
      .subscribe((status) => {
        console.log('📡 Projects channel:', status);
      });

    // Assignments channel - filter appropriately
    const assignmentsChannelName = `realtime-assignments-${userType}-${userId}`;
    let assignmentsChannel;
    
    if (userType === 'candidate' && candidateProfile) {
      // Pour candidat: écouter les assignments qui correspondent à son profil
      assignmentsChannel = supabase
        .channel(assignmentsChannelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hr_resource_assignments',
            filter: `profile_id=eq.${candidateProfile.profile_id}`
          },
          handleAssignmentUpdate
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
          console.log('👥 Assignments channel (client):', status);
        });
    }

    // Store channels for cleanup
    channelsRef.current = [projectsChannel, assignmentsChannel];

    return () => {
      console.log('🛑 REALTIME PROJECTS FIXED: Cleaning up channels');
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [userId, userType, candidateProfile, handleProjectUpdate, handleAssignmentUpdate]);

  return {
    // Utility function to force refresh if needed
    forceRefresh: () => {
      console.log('🔄 REALTIME PROJECTS FIXED: Force refresh requested');
      // This could trigger refetch if needed, but ideally shouldn't be necessary
    }
  };
};