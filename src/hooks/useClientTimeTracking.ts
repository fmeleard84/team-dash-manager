import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ActiveCandidate {
  candidateId: string;
  candidateName: string;
  projectId: string;
  activityDescription: string;
  startTime: string;
  currentDurationMinutes: number;
  hourlyRate: number;
  currentCost: number;
  status: 'active' | 'paused';
  lastUpdate: string;
}

interface ProjectTracking {
  projectId: string;
  projectTitle: string;
  activeCandidates: ActiveCandidate[];
  totalCostPerMinute: number;
  totalCurrentCost: number;
}

export const useClientTimeTracking = () => {
  const { user } = useAuth();
  const [activeProjects, setActiveProjects] = useState<ProjectTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);

  // Load active tracking sessions for client's projects
  const loadActiveTracking = async () => {
    if (!user?.id) return;

    try {
      // console.log('Loading active tracking for user:', user.id);
      
      // Get client's projects - check both user_id and owner_id
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, title, status')
        .or(`user_id.eq.${user.id},owner_id.eq.${user.id}`);

      // console.log('Projects found:', projects?.length, 'Error:', projectsError);

      if (!projects || projects.length === 0) {
        // console.log('No projects found for this client');
        setActiveProjects([]);
        return;
      }

      // Get active tracking for these projects
      const projectIds = projects.map(p => p.id);
      // console.log('Looking for active tracking in projects:', projectIds);
      
      const { data: trackingData, error: trackingError } = await supabase
        .from('active_time_tracking')
        .select('*')
        .in('project_id', projectIds)
        .in('status', ['active', 'paused']);

      // console.log('Active tracking found:', trackingData?.length, 'Error:', trackingError);

      // Group by project
      const projectMap = new Map<string, ProjectTracking>();

      projects.forEach(project => {
        projectMap.set(project.id, {
          projectId: project.id,
          projectTitle: project.title,
          activeCandidates: [],
          totalCostPerMinute: 0,
          totalCurrentCost: 0
        });
      });

      (trackingData || []).forEach(tracking => {
        const project = projectMap.get(tracking.project_id);
        if (project) {
          const candidate: ActiveCandidate = {
            candidateId: tracking.candidate_id,
            candidateName: tracking.candidate_name,
            projectId: tracking.project_id,
            activityDescription: tracking.activity_description,
            startTime: tracking.start_time,
            currentDurationMinutes: tracking.current_duration_minutes || 0,
            hourlyRate: tracking.hourly_rate,
            currentCost: tracking.current_cost || 0,
            status: tracking.status,
            lastUpdate: tracking.last_update
          };

          project.activeCandidates.push(candidate);
          
          // Only add to total if active (not paused)
          if (tracking.status === 'active') {
            project.totalCostPerMinute += Number(tracking.hourly_rate);
          }
          project.totalCurrentCost += Number(tracking.current_cost || 0);
        }
      });

      const finalProjects = Array.from(projectMap.values()).filter(p => p.activeCandidates.length > 0);
      // console.log('Final active projects:', finalProjects.length, finalProjects);
      setActiveProjects(finalProjects);
    } catch (error) {
      console.error('Error loading active tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription and handle visibility changes
  useEffect(() => {
    if (!user?.id) return;

    // Always load data when effect runs (component becomes visible)
    loadActiveTracking();

    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`client-time-tracking-${Date.now()}`) // Unique channel name
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_time_tracking'
        },
        (payload) => {
          // console.log('Real-time tracking update:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newTracking = payload.new as any;
            
            setActiveProjects(prev => {
              const updated = [...prev];
              let projectIndex = updated.findIndex(p => p.projectId === newTracking.project_id);
              
              // If project doesn't exist, we need to fetch its details
              if (projectIndex === -1) {
                // Fetch project title
                supabase
                  .from('projects')
                  .select('title')
                  .eq('id', newTracking.project_id)
                  .single()
                  .then(({ data }) => {
                    if (data) {
                      setActiveProjects(current => {
                        const newProject: ProjectTracking = {
                          projectId: newTracking.project_id,
                          projectTitle: data.title,
                          activeCandidates: [{
                            candidateId: newTracking.candidate_id,
                            candidateName: newTracking.candidate_name,
                            projectId: newTracking.project_id,
                            activityDescription: newTracking.activity_description,
                            startTime: newTracking.start_time,
                            currentDurationMinutes: newTracking.current_duration_minutes || 0,
                            hourlyRate: newTracking.hourly_rate,
                            currentCost: newTracking.current_cost || 0,
                            status: newTracking.status,
                            lastUpdate: newTracking.last_update
                          }],
                          totalCostPerMinute: newTracking.status === 'active' ? Number(newTracking.hourly_rate) : 0,
                          totalCurrentCost: Number(newTracking.current_cost || 0)
                        };
                        return [...current, newProject];
                      });
                    }
                  });
                return updated;
              }
              
              // Update existing project
              const project = updated[projectIndex];
              const candidateIndex = project.activeCandidates.findIndex(
                c => c.candidateId === newTracking.candidate_id
              );
              
              const candidate: ActiveCandidate = {
                candidateId: newTracking.candidate_id,
                candidateName: newTracking.candidate_name,
                projectId: newTracking.project_id,
                activityDescription: newTracking.activity_description,
                startTime: newTracking.start_time,
                currentDurationMinutes: newTracking.current_duration_minutes || 0,
                hourlyRate: newTracking.hourly_rate,
                currentCost: newTracking.current_cost || 0,
                status: newTracking.status,
                lastUpdate: newTracking.last_update
              };
              
              if (candidateIndex === -1) {
                project.activeCandidates.push(candidate);
              } else {
                project.activeCandidates[candidateIndex] = candidate;
              }
              
              // Recalculate totals
              project.totalCostPerMinute = project.activeCandidates
                .filter(c => c.status === 'active')
                .reduce((sum, c) => sum + Number(c.hourlyRate), 0);
              project.totalCurrentCost = project.activeCandidates
                .reduce((sum, c) => sum + Number(c.currentCost), 0);
              
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            const oldTracking = payload.old as any;
            
            setActiveProjects(prev => {
              const updated = [...prev];
              const projectIndex = updated.findIndex(p => p.projectId === oldTracking.project_id);
              
              if (projectIndex !== -1) {
                const project = updated[projectIndex];
                project.activeCandidates = project.activeCandidates.filter(
                  c => c.candidateId !== oldTracking.candidate_id
                );
                
                // Remove project if no more candidates
                if (project.activeCandidates.length === 0) {
                  updated.splice(projectIndex, 1);
                } else {
                  // Recalculate totals
                  project.totalCostPerMinute = project.activeCandidates
                    .filter(c => c.status === 'active')
                    .reduce((sum, c) => sum + Number(c.hourlyRate), 0);
                  project.totalCurrentCost = project.activeCandidates
                    .reduce((sum, c) => sum + Number(c.currentCost), 0);
                }
              }
              
              return updated;
            });
          }
        }
      )
      .subscribe();
    
    channelRef.current = channel;

    // Also set up interval to refresh data periodically (every 30 seconds)
    const intervalId = setInterval(() => {
      loadActiveTracking();
    }, 30000);

    return () => {
      clearInterval(intervalId);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  // Calculate total cost across all projects
  const getTotalCostPerMinute = () => {
    return activeProjects.reduce((sum, p) => sum + p.totalCostPerMinute, 0);
  };

  const getTotalCurrentCost = () => {
    return activeProjects.reduce((sum, p) => sum + p.totalCurrentCost, 0);
  };

  return {
    activeProjects,
    loading,
    totalCostPerMinute: getTotalCostPerMinute(),
    totalCurrentCost: getTotalCurrentCost(),
    refresh: loadActiveTracking
  };
};