import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardMetrics {
  // Real-time metrics
  currentCostPerMinute: number;
  activeCandidatesCount: number;
  pausedCandidatesCount: number;
  totalCurrentCost: number;
  
  // Period metrics
  totalTimeThisWeek: number; // in minutes
  totalCostThisWeek: number;
  activeProjectsCount: number;
  pendingProjectsCount: number;
  
  // Historical data for charts
  costHistory: Array<{
    time: string;
    cost: number;
    candidatesCount: number;
  }>;
  
  // Project breakdown
  projectCosts: Array<{
    projectId: string;
    projectName: string;
    totalCost: number;
    totalTime: number;
    percentage: number;
  }>;
  
  // Recent activities
  recentActivities: Array<{
    id: string;
    candidateId?: string;
    candidateName: string;
    projectId?: string;
    projectName: string;
    activity: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    cost?: number;
    status: 'active' | 'paused' | 'completed';
  }>;
  
  // Active candidates details
  activeCandidates: Array<{
    id: string;
    name: string;
    projectId: string;
    projectName: string;
    activity: string;
    startTime: string;
    currentDuration: number;
    currentCost: number;
    hourlyRate: number;
    status: 'active' | 'paused';
  }>;
}

export const useDashboardMetrics = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    currentCostPerMinute: 0,
    activeCandidatesCount: 0,
    pausedCandidatesCount: 0,
    totalCurrentCost: 0,
    totalTimeThisWeek: 0,
    totalCostThisWeek: 0,
    activeProjectsCount: 0,
    pendingProjectsCount: 0,
    costHistory: [],
    projectCosts: [],
    recentActivities: [],
    activeCandidates: []
  });
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);
  const historyRef = useRef<Array<{ time: string; cost: number; candidatesCount: number }>>([]);

  // Load all metrics
  const loadMetrics = async () => {
    if (!user?.id) return;

    try {
      // Get the correct user ID (profile ID for clients)
      const userId = user.profile?.id || user.id;
      console.log('Dashboard loading metrics for user:', userId);
      
      // Get user's projects - try both user_id and owner_id
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, title, status')
        .or(`user_id.eq.${userId},owner_id.eq.${userId}`);

      if (projectsError) {
        console.error('Error loading projects:', projectsError);
        return;
      }

      if (!projects || projects.length === 0) {
        console.log('No projects found for user:', userId);
        return;
      }

      console.log('Found projects:', projects.length, projects.map(p => ({ id: p.id, title: p.title })));
      const projectIds = projects.map(p => p.id);
      
      // Count active and pending projects
      const activeProjectsCount = projects.filter(p => p.status === 'play').length;
      const pendingProjectsCount = projects.filter(p => p.status === 'pause' || p.status === 'attente-team').length;

      // Get active tracking sessions
      const { data: activeTracking, error: trackingError } = await supabase
        .from('active_time_tracking')
        .select(`
          *,
          projects (title)
        `)
        .in('project_id', projectIds);
      
      if (trackingError) {
        console.error('Error loading active tracking:', trackingError);
      }
      
      console.log('Active tracking sessions:', activeTracking?.length || 0, activeTracking);

      // DEBUG: Get ALL active tracking sessions to see what's happening
      const { data: allActiveTracking } = await supabase
        .from('active_time_tracking')
        .select('*');
      console.log('ALL active tracking sessions in DB:', allActiveTracking?.length || 0, allActiveTracking);

      // Calculate real-time metrics
      let currentCostPerMinute = 0;
      let totalCurrentCost = 0;
      const activeCandidates: any[] = [];
      
      (activeTracking || []).forEach(track => {
        if (track.status === 'active') {
          currentCostPerMinute += Number(track.hourly_rate);
        }
        totalCurrentCost += Number(track.current_cost || 0);
        
        activeCandidates.push({
          id: track.candidate_id,
          name: track.candidate_name,
          projectId: track.project_id,
          projectName: track.projects?.title || 'Projet',
          activity: track.activity_description,
          startTime: track.start_time,
          currentDuration: track.current_duration_minutes || 0,
          currentCost: track.current_cost || 0,
          hourlyRate: track.hourly_rate,
          status: track.status
        });
      });

      const activeCandidatesCount = activeCandidates.filter(c => c.status === 'active').length;
      const pausedCandidatesCount = activeCandidates.filter(c => c.status === 'paused').length;

      // Get this week's sessions
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: weekSessions, error: weekError } = await supabase
        .from('time_tracking_sessions')
        .select(`
          *,
          projects (title),
          profiles!candidate_id (
            first_name
          )
        `)
        .in('project_id', projectIds)
        .gte('start_time', weekAgo.toISOString())
        .order('start_time', { ascending: false });
      
      console.log('Week sessions query result:', { 
        count: weekSessions?.length || 0, 
        error: weekError,
        sessions: weekSessions 
      });

      // Calculate week metrics
      let totalTimeThisWeek = 0;
      let totalCostThisWeek = 0;
      const recentActivities: any[] = [];
      const projectCostsMap = new Map<string, any>();

      (weekSessions || []).forEach(session => {
        if (session.status === 'completed') {
          totalTimeThisWeek += session.duration_minutes || 0;
          totalCostThisWeek += session.total_cost || 0;
        }

        // Add to recent activities
        recentActivities.push({
          id: session.id,
          candidateId: session.candidate_id,
          candidateName: session.profiles?.first_name || 'Candidat', // Use first_name from profiles join
          projectId: session.project_id,
          projectName: session.projects?.title || 'Projet',
          activity: session.activity_description,
          startTime: session.start_time,
          endTime: session.end_time,
          duration: session.duration_minutes,
          cost: session.total_cost,
          status: session.status
        });

        // Aggregate by project
        const projectId = session.project_id;
        if (!projectCostsMap.has(projectId)) {
          projectCostsMap.set(projectId, {
            projectId,
            projectName: session.projects?.title || 'Projet',
            totalCost: 0,
            totalTime: 0
          });
        }
        const projectData = projectCostsMap.get(projectId);
        if (session.status === 'completed') {
          projectData.totalCost += session.total_cost || 0;
          projectData.totalTime += session.duration_minutes || 0;
        }
      });

      // Calculate percentages for project costs
      const projectCosts = Array.from(projectCostsMap.values());
      const totalProjectCost = projectCosts.reduce((sum, p) => sum + p.totalCost, 0);
      projectCosts.forEach(p => {
        p.percentage = totalProjectCost > 0 ? (p.totalCost / totalProjectCost) * 100 : 0;
      });

      // Add current data point to history
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      // Keep only last 60 data points (1 hour if updating every minute)
      if (historyRef.current.length >= 60) {
        historyRef.current.shift();
      }
      historyRef.current.push({
        time: timeString,
        cost: currentCostPerMinute,
        candidatesCount: activeCandidatesCount
      });

      setMetrics({
        currentCostPerMinute,
        activeCandidatesCount,
        pausedCandidatesCount,
        totalCurrentCost,
        totalTimeThisWeek,
        totalCostThisWeek,
        activeProjectsCount,
        pendingProjectsCount,
        costHistory: [...historyRef.current],
        projectCosts: projectCosts.sort((a, b) => b.totalCost - a.totalCost),
        recentActivities: recentActivities.slice(0, 10), // Keep only 10 most recent
        activeCandidates
      });
    } catch (error) {
      console.error('Error loading dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    loadMetrics();

    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to real-time updates
    channelRef.current = supabase
      .channel('dashboard-metrics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_time_tracking'
        },
        () => {
          console.log('Active tracking updated, refreshing metrics...');
          // Add a small delay to ensure data is committed
          setTimeout(() => loadMetrics(), 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_tracking_sessions'
        },
        () => {
          console.log('Sessions updated, refreshing metrics...');
          // Add a small delay to ensure data is committed
          setTimeout(() => loadMetrics(), 100);
        }
      )
      .subscribe();

    // Refresh every minute for smooth real-time updates
    const interval = setInterval(() => {
      loadMetrics();
    }, 60000); // 1 minute

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      clearInterval(interval);
    };
  }, [user?.id]);

  return {
    metrics,
    loading,
    refresh: loadMetrics
  };
};