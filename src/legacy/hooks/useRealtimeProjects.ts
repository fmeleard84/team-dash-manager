import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseRealtimeProjectsOptions {
  onProjectUpdate: (project: any) => void;
  onAssignmentUpdate: (assignment: any) => void;
  userId?: string; // Pour filtrer les projets de l'utilisateur
}

export const useRealtimeProjects = ({
  onProjectUpdate,
  onAssignmentUpdate,
  userId
}: UseRealtimeProjectsOptions) => {
  const channelsRef = useRef<any[]>([]);

  useEffect(() => {
    console.log('🔄 REALTIME PROJECTS: Setting up subscriptions for user:', userId);

    // Clean up existing channels
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Subscription pour les changements de projets (tous les événements)
    const projectChannel = supabase
      .channel('projects-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Écouter tous les événements (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'projects'
          // Pas de filtre pour garantir qu'on reçoit tous les changements
        },
        (payload) => {
          console.log('📊 REALTIME: Project event:', payload.eventType, payload.new);
          onProjectUpdate(payload.new || payload.old);
        }
      )
      .subscribe();

    // Subscription pour les changements d'assignments (tous les événements)
    const assignmentChannel = supabase
      .channel('assignments-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Écouter INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'hr_resource_assignments'
        },
        (payload) => {
          console.log('👥 REALTIME: Assignment event:', payload.eventType, payload.new);
          onAssignmentUpdate(payload.new || payload.old);
        }
      )
      .subscribe();

    channelsRef.current = [projectChannel, assignmentChannel];

    return () => {
      console.log('🔄 REALTIME PROJECTS: Cleaning up subscriptions');
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [userId, onProjectUpdate, onAssignmentUpdate]);

  const unsubscribe = () => {
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];
  };

  return { unsubscribe };
};