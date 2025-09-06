import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TimeSession {
  id: string;
  projectId: string;
  projectTitle: string;
  activityDescription: string;
  startTime: string;
  duration: number; // in seconds
  hourlyRate: number;
  totalCost: number;
  status: 'active' | 'paused' | 'completed';
}

interface ActiveSession {
  sessionId: string;
  projectId: string;
  projectTitle: string;
  activityDescription: string;
  startTime: Date;
  elapsedSeconds: number;
  hourlyRate: number;
  currentCost: number;
  isPaused: boolean;
}

export const useTimeTracking = () => {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [candidateRate, setCandidateRate] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeChannelRef = useRef<any>(null);

  // Load candidate's hourly rate
  const loadCandidateRate = async () => {
    if (!user?.id) return;

    try {
      // Get candidate profile
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select(`
          id,
          profile_id,
          candidate_languages (
            hr_languages (
              name
            )
          ),
          candidate_expertises (
            hr_expertises (
              name
            )
          )
        `)
        .eq('id', user.id)
        .single();

      if (!candidateProfile) return;

      // Get base rate from HR profile
      const { data: hrProfile } = await supabase
        .from('hr_profiles')
        .select('base_rate_per_minute')
        .eq('id', candidateProfile.profile_id)
        .single();

      if (!hrProfile?.base_rate_per_minute) {
        // Default rate if not set
        setCandidateRate(10); // 10€/minute default
        return;
      }

      let baseRate = hrProfile.base_rate_per_minute;

      // Get rate modifiers
      const { data: modifiers } = await supabase
        .from('rate_modifiers')
        .select('*')
        .eq('is_active', true);

      if (modifiers) {
        // Apply language modifiers
        const languages = candidateProfile.candidate_languages?.map(cl => cl.hr_languages.name) || [];
        const languageModifiers = modifiers.filter(m => 
          m.type === 'language' && languages.includes(m.name)
        );
        
        // Apply expertise modifiers
        const expertises = candidateProfile.candidate_expertises?.map(ce => ce.hr_expertises.name) || [];
        const expertiseModifiers = modifiers.filter(m => 
          m.type === 'expertise' && expertises.includes(m.name)
        );

        // Calculate final rate
        let totalPercentageIncrease = 0;
        languageModifiers.forEach(m => totalPercentageIncrease += m.percentage_increase);
        expertiseModifiers.forEach(m => totalPercentageIncrease += m.percentage_increase);

        const finalRate = baseRate * (1 + totalPercentageIncrease / 100);
        setCandidateRate(finalRate);

        // Store calculated rate in database
        await supabase
          .from('candidate_hourly_rates')
          .upsert({
            candidate_id: candidateProfile.id,
            profile_id: candidateProfile.profile_id,
            base_rate_per_minute: baseRate,
            language_modifiers: languageModifiers.map(m => ({ name: m.name, percentage: m.percentage_increase })),
            expertise_modifiers: expertiseModifiers.map(m => ({ name: m.name, percentage: m.percentage_increase })),
            calculated_rate_per_minute: finalRate,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'candidate_id'
          });
      } else {
        setCandidateRate(baseRate);
      }
    } catch (error) {
      console.error('Error loading candidate rate:', error);
      setCandidateRate(10); // Fallback rate
    }
  };

  // Start a new time tracking session
  const startSession = async (projectId: string, projectTitle: string, activityDescription: string) => {
    if (!user?.email || activeSession) return;

    setLoading(true);
    try {
      // Get candidate ID
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('id, first_name, last_name')
        .eq('id', user.id)
        .single();

      if (!candidateProfile) {
        toast.error('Profil candidat non trouvé');
        return;
      }

      // Check if there's already an active session in database
      const { data: existingActive } = await supabase
        .from('active_time_tracking')
        .select('id, projects(title)')
        .eq('candidate_id', candidateProfile.id)
        .in('status', ['active', 'paused'])
        .single();

      if (existingActive) {
        toast.error(`Un chronomètre est déjà en cours sur le projet "${existingActive.projects?.title}". Veuillez l'arrêter avant d'en démarrer un nouveau.`);
        setLoading(false);
        return;
      }

      // Create new session in database
      const { data: session, error: sessionError } = await supabase
        .from('time_tracking_sessions')
        .insert({
          candidate_id: candidateProfile.id,
          project_id: projectId,
          activity_description: activityDescription,
          hourly_rate: candidateRate,
          status: 'active'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Add to active tracking for real-time
      const { error: activeError } = await supabase
        .from('active_time_tracking')
        .insert({
          candidate_id: candidateProfile.id,
          project_id: projectId,
          session_id: session.id,
          candidate_name: `${candidateProfile.first_name} ${candidateProfile.last_name}`,
          activity_description: activityDescription,
          start_time: session.start_time,
          hourly_rate: candidateRate,
          status: 'active'
        });

      if (activeError) throw activeError;

      // Set active session in state
      setActiveSession({
        sessionId: session.id,
        projectId,
        projectTitle,
        activityDescription,
        startTime: new Date(session.start_time),
        elapsedSeconds: 0,
        hourlyRate: candidateRate,
        currentCost: 0,
        isPaused: false
      });

      toast.success('Chronomètre démarré');
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Erreur lors du démarrage du chronomètre');
    } finally {
      setLoading(false);
    }
  };

  // Pause/Resume session
  const togglePause = async () => {
    if (!activeSession) return;

    const newPausedState = !activeSession.isPaused;
    
    try {
      await supabase
        .from('active_time_tracking')
        .update({
          status: newPausedState ? 'paused' : 'active',
          last_update: new Date().toISOString()
        })
        .eq('session_id', activeSession.sessionId);

      setActiveSession(prev => prev ? {
        ...prev,
        isPaused: newPausedState
      } : null);

      toast.success(newPausedState ? 'Chronomètre en pause' : 'Chronomètre repris');
    } catch (error) {
      console.error('Error toggling pause:', error);
      toast.error('Erreur lors de la pause/reprise');
    }
  };

  // Stop session
  const stopSession = async () => {
    if (!activeSession) return;

    setLoading(true);
    try {
      const durationMinutes = Math.ceil(activeSession.elapsedSeconds / 60);
      const totalCost = durationMinutes * candidateRate;

      // Update session in database
      await supabase
        .from('time_tracking_sessions')
        .update({
          end_time: new Date().toISOString(),
          duration_minutes: durationMinutes,
          total_cost: totalCost,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', activeSession.sessionId);

      // Remove from active tracking
      await supabase
        .from('active_time_tracking')
        .delete()
        .eq('session_id', activeSession.sessionId);

      setActiveSession(null);
      toast.success(`Session terminée - Durée: ${durationMinutes} min - Coût: ${totalCost.toFixed(2)}€`);
    } catch (error) {
      console.error('Error stopping session:', error);
      toast.error('Erreur lors de l\'arrêt du chronomètre');
    } finally {
      setLoading(false);
    }
  };

  // Update timer every second
  useEffect(() => {
    if (activeSession && !activeSession.isPaused) {
      intervalRef.current = setInterval(() => {
        setActiveSession(prev => {
          if (!prev) return null;
          
          const newElapsed = prev.elapsedSeconds + 1;
          const minutes = Math.ceil(newElapsed / 60);
          const newCost = minutes * prev.hourlyRate;

          // Update database every minute
          if (newElapsed % 60 === 0) {
            supabase
              .from('active_time_tracking')
              .update({
                current_duration_minutes: minutes,
                current_cost: newCost,
                last_update: new Date().toISOString()
              })
              .eq('session_id', prev.sessionId)
              .then(({ error }) => {
                if (error) console.error('Error updating active tracking:', error);
              });
          }

          return {
            ...prev,
            elapsedSeconds: newElapsed,
            currentCost: newCost
          };
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeSession?.isPaused, activeSession?.sessionId]);

  // Load existing sessions
  const loadSessions = async () => {
    if (!user?.email) return;

    try {
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!candidateProfile) return;

      const { data: sessionsData, error } = await supabase
        .from('time_tracking_sessions')
        .select(`
          *,
          projects (
            title
          )
        `)
        .eq('candidate_id', candidateProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedSessions: TimeSession[] = (sessionsData || []).map(s => ({
        id: s.id,
        projectId: s.project_id,
        projectTitle: s.projects?.title || 'Projet',
        activityDescription: s.activity_description,
        startTime: s.start_time,
        duration: (s.duration_minutes || 0) * 60,
        hourlyRate: s.hourly_rate,
        totalCost: s.total_cost || 0,
        status: s.status
      }));

      setSessions(formattedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  // Check for existing active session on mount
  const checkActiveSession = async () => {
    if (!user?.email) return;

    try {
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!candidateProfile) return;

      const { data: activeTracking } = await supabase
        .from('active_time_tracking')
        .select(`
          *,
          projects (
            title
          )
        `)
        .eq('candidate_id', candidateProfile.id)
        .in('status', ['active', 'paused'])
        .single();

      if (activeTracking) {
        const startTime = new Date(activeTracking.start_time);
        // Use the stored duration from database instead of calculating from start time
        // This ensures pauses are properly accounted for
        const elapsedSeconds = (activeTracking.current_duration_minutes || 0) * 60;

        setActiveSession({
          sessionId: activeTracking.session_id,
          projectId: activeTracking.project_id,
          projectTitle: activeTracking.projects?.title || 'Projet',
          activityDescription: activeTracking.activity_description,
          startTime,
          elapsedSeconds,
          hourlyRate: activeTracking.hourly_rate,
          currentCost: activeTracking.current_cost || 0,
          isPaused: activeTracking.status === 'paused'
        });
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    }
  };

  // Initialize on mount
  useEffect(() => {
    loadCandidateRate();
    loadSessions();
    checkActiveSession();
  }, [user?.email]);

  // Format time display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Update session duration (for editing in activities page)
  const updateSessionDuration = async (sessionId: string, newDurationMinutes: number) => {
    try {
      const newCost = newDurationMinutes * candidateRate;
      
      const { error } = await supabase
        .from('time_tracking_sessions')
        .update({
          duration_minutes: newDurationMinutes,
          total_cost: newCost,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Durée mise à jour');
      await loadSessions(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error updating session duration:', error);
      toast.error('Erreur lors de la mise à jour');
      return false;
    }
  };

  return {
    activeSession,
    sessions,
    candidateRate,
    loading,
    startSession,
    togglePause,
    stopSession,
    formatTime,
    refreshSessions: loadSessions,
    updateSessionDuration
  };
};