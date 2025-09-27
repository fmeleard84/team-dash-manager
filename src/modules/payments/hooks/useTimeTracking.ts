import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/ui/components/use-toast';
import { PaymentsAPI } from '../services/paymentsAPI';
import {
  TimeRecord,
  PaymentError,
  UseTimeTrackingReturn
} from '../types';

interface UseTimeTrackingOptions {
  candidateId: string;
  projectId?: string;
  autoSave?: boolean;
  autoSaveInterval?: number; // en millisecondes
}

export function useTimeTracking({
  candidateId,
  projectId,
  autoSave = true,
  autoSaveInterval = 30000 // 30 secondes
}: UseTimeTrackingOptions): UseTimeTrackingReturn {
  const { toast } = useToast();

  // États
  const [activeSession, setActiveSession] = useState<TimeRecord | null>(null);
  const [todayRecords, setTodayRecords] = useState<TimeRecord[]>([]);
  const [weekRecords, setWeekRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PaymentError | null>(null);

  // Timer pour l'auto-save
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  /**
   * Charge les enregistrements de temps
   */
  const loadTimeRecords = useCallback(async () => {
    if (!candidateId) return;

    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      // Calculer le début de la semaine (lundi)
      const weekStart = new Date(today);
      const dayOfWeek = weekStart.getDay();
      const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Lundi = 1
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);

      // Récupérer les enregistrements du jour
      const todayResponse = await PaymentsAPI.getTimeRecords(
        candidateId,
        projectId,
        todayStart,
        todayEnd
      );

      if (todayResponse.success) {
        setTodayRecords(todayResponse.data);

        // Trouver la session active (s'il y en a une)
        const active = todayResponse.data.find(record =>
          record.status === 'active' || record.status === 'paused'
        );
        setActiveSession(active || null);
      }

      // Récupérer les enregistrements de la semaine
      const weekResponse = await PaymentsAPI.getTimeRecords(
        candidateId,
        projectId,
        weekStart.toISOString()
      );

      if (weekResponse.success) {
        setWeekRecords(weekResponse.data);
      }

    } catch (err) {
      console.error('useTimeTracking.loadTimeRecords:', err);
      setError({
        code: 'FETCH_ERROR',
        message: 'Impossible de charger les enregistrements de temps'
      });
    } finally {
      setLoading(false);
    }
  }, [candidateId, projectId]);

  /**
   * Démarre le suivi du temps
   */
  const startTracking = useCallback(async (
    trackingProjectId: string,
    description: string
  ): Promise<TimeRecord> => {
    try {
      // Arrêter toute session active existante
      if (activeSession) {
        await stopTracking();
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      // Créer une nouvelle session
      const { data, error } = await supabase
        .from('time_tracking_sessions')
        .insert({
          project_id: trackingProjectId,
          candidate_id: user.id,
          start_time: new Date().toISOString(),
          activity_description: description,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      const newRecord: TimeRecord = {
        id: data.id,
        project_id: trackingProjectId,
        candidate_id: user.id,
        start_time: data.start_time,
        duration_minutes: 0,
        activity_description: description,
        task_category: 'development',
        hourly_rate_cents: 4500,
        amount_cents: 0,
        status: 'active',
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      setActiveSession(newRecord);
      setTodayRecords(prev => [newRecord, ...prev]);

      toast({
        title: "Suivi démarré",
        description: `Suivi du temps démarré pour "${description}"`,
      });

      return newRecord;
    } catch (error) {
      console.error('useTimeTracking.startTracking:', error);
      const errorMessage = error instanceof Error ? error.message : 'Impossible de démarrer le suivi';

      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });

      setError({
        code: 'START_TRACKING_ERROR',
        message: errorMessage
      });

      throw error;
    }
  }, [activeSession, toast]);

  /**
   * Arrête le suivi du temps
   */
  const stopTracking = useCallback(async (): Promise<TimeRecord> => {
    if (!activeSession) {
      throw new Error('Aucune session active');
    }

    try {
      const endTime = new Date();
      const startTime = new Date(activeSession.start_time);
      const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      const { data, error } = await supabase
        .from('time_tracking_sessions')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', activeSession.id)
        .select()
        .single();

      if (error) throw error;

      const completedRecord: TimeRecord = {
        ...activeSession,
        end_time: data.end_time,
        duration_minutes: durationMinutes,
        amount_cents: Math.round(durationMinutes * 75), // 45€/hour = 0.75€/min
        status: 'completed',
        updated_at: data.updated_at
      };

      setActiveSession(null);
      setTodayRecords(prev => prev.map(record =>
        record.id === activeSession.id ? completedRecord : record
      ));

      // Arrêter l'auto-save
      if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
        setAutoSaveTimer(null);
      }

      toast({
        title: "Suivi arrêté",
        description: `Session terminée : ${PaymentsAPI.formatDuration(durationMinutes)}`,
      });

      return completedRecord;
    } catch (error) {
      console.error('useTimeTracking.stopTracking:', error);
      const errorMessage = error instanceof Error ? error.message : 'Impossible d\'arrêter le suivi';

      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });

      throw error;
    }
  }, [activeSession, autoSaveTimer, toast]);

  /**
   * Met en pause le suivi
   */
  const pauseTracking = useCallback(async (): Promise<void> => {
    if (!activeSession || activeSession.status !== 'active') {
      throw new Error('Aucune session active à mettre en pause');
    }

    try {
      const { error } = await supabase
        .from('time_tracking_sessions')
        .update({
          status: 'paused',
          updated_at: new Date().toISOString()
        })
        .eq('id', activeSession.id);

      if (error) throw error;

      const pausedRecord = { ...activeSession, status: 'paused' as const };
      setActiveSession(pausedRecord);

      // Arrêter l'auto-save pendant la pause
      if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
        setAutoSaveTimer(null);
      }

      toast({
        title: "Suivi en pause",
        description: "Le suivi du temps a été mis en pause",
      });
    } catch (error) {
      console.error('useTimeTracking.pauseTracking:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre en pause le suivi",
        variant: "destructive",
      });
    }
  }, [activeSession, autoSaveTimer, toast]);

  /**
   * Reprend le suivi
   */
  const resumeTracking = useCallback(async (): Promise<void> => {
    if (!activeSession || activeSession.status !== 'paused') {
      throw new Error('Aucune session en pause à reprendre');
    }

    try {
      const { error } = await supabase
        .from('time_tracking_sessions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', activeSession.id);

      if (error) throw error;

      const resumedRecord = { ...activeSession, status: 'active' as const };
      setActiveSession(resumedRecord);

      toast({
        title: "Suivi repris",
        description: "Le suivi du temps a repris",
      });
    } catch (error) {
      console.error('useTimeTracking.resumeTracking:', error);
      toast({
        title: "Erreur",
        description: "Impossible de reprendre le suivi",
        variant: "destructive",
      });
    }
  }, [activeSession, toast]);

  /**
   * Met à jour la description d'un enregistrement
   */
  const updateDescription = useCallback(async (
    recordId: string,
    description: string
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('time_tracking_sessions')
        .update({
          activity_description: description,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId);

      if (error) throw error;

      // Mettre à jour les états locaux
      if (activeSession && activeSession.id === recordId) {
        setActiveSession({ ...activeSession, activity_description: description });
      }

      setTodayRecords(prev => prev.map(record =>
        record.id === recordId
          ? { ...record, activity_description: description }
          : record
      ));

      setWeekRecords(prev => prev.map(record =>
        record.id === recordId
          ? { ...record, activity_description: description }
          : record
      ));

      toast({
        title: "Description mise à jour",
        description: "La description de l'activité a été modifiée",
      });
    } catch (error) {
      console.error('useTimeTracking.updateDescription:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la description",
        variant: "destructive",
      });
    }
  }, [activeSession, toast]);

  /**
   * Supprime un enregistrement
   */
  const deleteRecord = useCallback(async (recordId: string): Promise<void> => {
    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir supprimer cet enregistrement ? Cette action est irréversible.'
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('time_tracking_sessions')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      // Mettre à jour les états locaux
      if (activeSession && activeSession.id === recordId) {
        setActiveSession(null);
      }

      setTodayRecords(prev => prev.filter(record => record.id !== recordId));
      setWeekRecords(prev => prev.filter(record => record.id !== recordId));

      toast({
        title: "Enregistrement supprimé",
        description: "L'enregistrement de temps a été supprimé",
      });
    } catch (error) {
      console.error('useTimeTracking.deleteRecord:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'enregistrement",
        variant: "destructive",
      });
    }
  }, [activeSession, toast]);

  /**
   * Calcule le total du jour
   */
  const getTotalToday = useCallback((): number => {
    let total = todayRecords
      .filter(record => record.status === 'completed')
      .reduce((sum, record) => sum + record.duration_minutes, 0);

    // Ajouter le temps de la session active
    if (activeSession && activeSession.status === 'active') {
      const currentTime = new Date();
      const startTime = new Date(activeSession.start_time);
      const currentDuration = Math.floor((currentTime.getTime() - startTime.getTime()) / (1000 * 60));
      total += currentDuration;
    }

    return total;
  }, [todayRecords, activeSession]);

  /**
   * Calcule le total de la semaine
   */
  const getTotalThisWeek = useCallback((): number => {
    let total = weekRecords
      .filter(record => record.status === 'completed')
      .reduce((sum, record) => sum + record.duration_minutes, 0);

    // Ajouter le temps de la session active si elle fait partie de cette semaine
    if (activeSession && activeSession.status === 'active') {
      const currentTime = new Date();
      const startTime = new Date(activeSession.start_time);
      const currentDuration = Math.floor((currentTime.getTime() - startTime.getTime()) / (1000 * 60));
      total += currentDuration;
    }

    return total;
  }, [weekRecords, activeSession]);

  // Chargement initial
  useEffect(() => {
    loadTimeRecords();
  }, [loadTimeRecords]);

  // Auto-save pour la session active
  useEffect(() => {
    if (!autoSave || !activeSession || activeSession.status !== 'active') {
      if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
        setAutoSaveTimer(null);
      }
      return;
    }

    const timer = setInterval(async () => {
      try {
        // Sauvegarder la progression actuelle
        const currentTime = new Date();
        const startTime = new Date(activeSession.start_time);
        const currentDuration = Math.floor((currentTime.getTime() - startTime.getTime()) / (1000 * 60));

        await supabase
          .from('time_tracking_sessions')
          .update({
            duration_minutes: currentDuration,
            updated_at: currentTime.toISOString()
          })
          .eq('id', activeSession.id);

        // Mettre à jour l'état local
        setActiveSession(prev => prev ? {
          ...prev,
          duration_minutes: currentDuration,
          amount_cents: Math.round(currentDuration * 75),
          updated_at: currentTime.toISOString()
        } : null);

      } catch (error) {
        console.error('Erreur lors de l\'auto-save:', error);
      }
    }, autoSaveInterval);

    setAutoSaveTimer(timer);

    return () => {
      clearInterval(timer);
    };
  }, [autoSave, activeSession, autoSaveInterval, autoSaveTimer]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  return {
    activeSession,
    todayRecords,
    weekRecords,
    loading,
    error,
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
    updateDescription,
    deleteRecord,
    getTotalToday,
    getTotalThisWeek
  };
}