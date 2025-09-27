/**
 * Module ACTIVITÉS - Hook Timer
 *
 * Hook spécialisé pour la gestion du timer en temps réel avec
 * auto-sauvegarde, synchronisation et gestion des états.
 *
 * Fonctionnalités :
 * - Timer en temps réel avec millisecondes
 * - Auto-sauvegarde périodique
 * - Gestion des états (actif/pause/arrêt)
 * - Calcul du coût en temps réel
 * - Synchronisation avec le backend
 * - Gestion des interruptions (fermeture de page, etc.)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { toast } from 'sonner';
import {
  TimeSession,
  CreateTimeSessionData,
  UseActivityTimerReturn,
  ActivityError
} from '../types';
import { ActivitiesAPI } from '../services';

interface UseActivityTimerOptions {
  autoSaveInterval?: number; // en secondes
  onSessionStart?: (session: TimeSession) => void;
  onSessionPause?: (session: TimeSession) => void;
  onSessionResume?: (session: TimeSession) => void;
  onSessionStop?: (session: TimeSession) => void;
  onError?: (error: ActivityError) => void;
  autoToast?: boolean;
}

export const useActivityTimer = (options: UseActivityTimerOptions = {}) => {
  const {
    autoSaveInterval = 60, // 60 secondes par défaut
    onSessionStart,
    onSessionPause,
    onSessionResume,
    onSessionStop,
    onError,
    autoToast = true
  } = options;

  const { user } = useAuth();
  const candidateId = user?.id;

  // ==========================================
  // STATES
  // ==========================================

  const [currentSession, setCurrentSession] = useState<TimeSession | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0); // en secondes
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ActivityError | null>(null);

  // ==========================================
  // REFS FOR INTERVALS
  // ==========================================

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const pausedTimeRef = useRef<number>(0); // Temps cumulé en pause
  const lastSaveTimeRef = useRef<string | null>(null);

  // ==========================================
  // COMPUTED VALUES
  // ==========================================

  const isActive = currentSession?.status === 'active';
  const isPaused = currentSession?.status === 'paused';

  const currentCost = currentSession
    ? (elapsedTime / 60) * currentSession.hourly_rate
    : 0;

  const formattedTime = formatTime(elapsedTime);
  const formattedCost = `${currentCost.toFixed(2)}€`;

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================

  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Gère les erreurs
   */
  const handleError = useCallback((err: ActivityError, context: string) => {
    console.error(`[useActivityTimer] ${context}:`, err);
    setError(err);

    if (onError) {
      onError(err);
    }

    if (autoToast) {
      toast.error(err.message || 'Une erreur est survenue');
    }
  }, [onError, autoToast]);

  /**
   * Clear errors
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ==========================================
  // TIMER MANAGEMENT
  // ==========================================

  /**
   * Démarre le timer interne
   */
  const startInternalTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    startTimeRef.current = new Date();
    pausedTimeRef.current = 0;

    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000) - pausedTimeRef.current;
        setElapsedTime(Math.max(0, elapsed));
      }
    }, 1000);
  }, []);

  /**
   * Met en pause le timer interne
   */
  const pauseInternalTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Sauvegarder le temps écoulé
    if (startTimeRef.current) {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000);
      pausedTimeRef.current = elapsed;
    }
  }, []);

  /**
   * Reprend le timer interne
   */
  const resumeInternalTimer = useCallback(() => {
    // Ajuster le temps de départ pour tenir compte de la pause
    if (startTimeRef.current && pausedTimeRef.current > 0) {
      const now = new Date();
      startTimeRef.current = new Date(now.getTime() - (pausedTimeRef.current * 1000));
    }

    startInternalTimer();
  }, [startInternalTimer]);

  /**
   * Arrête le timer interne
   */
  const stopInternalTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    setElapsedTime(0);
  }, []);

  // ==========================================
  // AUTO-SAVE
  // ==========================================

  /**
   * Sauvegarde automatique de la session
   */
  const autoSave = useCallback(async () => {
    if (!currentSession || !isActive) return;

    try {
      const minutes = Math.floor(elapsedTime / 60);
      if (minutes === 0) return; // Pas de sauvegarde si moins d'1 minute

      console.log('[useActivityTimer] Auto-saving session...');

      await ActivitiesAPI.updateSession(currentSession.id, {
        duration_minutes: minutes,
        total_cost: minutes * currentSession.hourly_rate,
        notes: currentSession.notes ?
          `${currentSession.notes} | Auto-sauvé à ${new Date().toLocaleTimeString()}` :
          `Auto-sauvé à ${new Date().toLocaleTimeString()}`
      });

      lastSaveTimeRef.current = new Date().toISOString();
      console.log('[useActivityTimer] Auto-save successful');

    } catch (err: any) {
      console.warn('[useActivityTimer] Auto-save failed:', err);
      // Ne pas interrompre l'utilisateur pour une erreur d'auto-save
    }
  }, [currentSession, isActive, elapsedTime]);

  /**
   * Configure l'auto-sauvegarde
   */
  const setupAutoSave = useCallback(() => {
    if (autoSaveRef.current) {
      clearInterval(autoSaveRef.current);
    }

    if (isActive && autoSaveInterval > 0) {
      autoSaveRef.current = setInterval(autoSave, autoSaveInterval * 1000);
    }
  }, [isActive, autoSaveInterval, autoSave]);

  // ==========================================
  // SESSION ACTIONS
  // ==========================================

  /**
   * Démarre une nouvelle session
   */
  const startTimer = useCallback(async (data: CreateTimeSessionData) => {
    if (!candidateId) {
      const error: ActivityError = {
        code: 'CANDIDATE_NOT_FOUND',
        message: 'Candidat non trouvé'
      };
      handleError(error, 'startTimer');
      return;
    }

    if (currentSession) {
      const error: ActivityError = {
        code: 'SESSION_ALREADY_ACTIVE',
        message: 'Une session est déjà en cours'
      };
      handleError(error, 'startTimer');
      return;
    }

    setLoading(true);
    clearError();

    try {
      console.log('[useActivityTimer] Starting new session:', data);

      const response = await ActivitiesAPI.createSession(candidateId, data);

      if (response.success) {
        setCurrentSession(response.data);
        startInternalTimer();

        if (autoToast) {
          toast.success('Session démarrée');
        }

        if (onSessionStart) {
          onSessionStart(response.data);
        }

        console.log('[useActivityTimer] Session started successfully');
      } else {
        handleError(response.error!, 'startTimer');
      }

    } catch (err: any) {
      const error: ActivityError = {
        code: 'DATABASE_ERROR',
        message: err.message || 'Erreur lors du démarrage'
      };
      handleError(error, 'startTimer');
    } finally {
      setLoading(false);
    }
  }, [candidateId, currentSession, handleError, clearError, startInternalTimer, autoToast, onSessionStart]);

  /**
   * Met en pause la session active
   */
  const pauseTimer = useCallback(async () => {
    if (!currentSession || !isActive) {
      const error: ActivityError = {
        code: 'SESSION_NOT_ACTIVE',
        message: 'Aucune session active à mettre en pause'
      };
      handleError(error, 'pauseTimer');
      return;
    }

    setLoading(true);
    clearError();

    try {
      console.log('[useActivityTimer] Pausing session:', currentSession.id);

      const response = await ActivitiesAPI.pauseSession(currentSession.id);

      if (response.success) {
        setCurrentSession(response.data);
        pauseInternalTimer();

        if (autoToast) {
          toast.success('Session mise en pause');
        }

        if (onSessionPause) {
          onSessionPause(response.data);
        }

        console.log('[useActivityTimer] Session paused successfully');
      } else {
        handleError(response.error!, 'pauseTimer');
      }

    } catch (err: any) {
      const error: ActivityError = {
        code: 'DATABASE_ERROR',
        message: err.message || 'Erreur lors de la mise en pause'
      };
      handleError(error, 'pauseTimer');
    } finally {
      setLoading(false);
    }
  }, [currentSession, isActive, handleError, clearError, pauseInternalTimer, autoToast, onSessionPause]);

  /**
   * Reprend la session en pause
   */
  const resumeTimer = useCallback(async () => {
    if (!currentSession || !isPaused) {
      const error: ActivityError = {
        code: 'SESSION_NOT_ACTIVE',
        message: 'Aucune session en pause à reprendre'
      };
      handleError(error, 'resumeTimer');
      return;
    }

    setLoading(true);
    clearError();

    try {
      console.log('[useActivityTimer] Resuming session:', currentSession.id);

      const response = await ActivitiesAPI.resumeSession(currentSession.id);

      if (response.success) {
        setCurrentSession(response.data);
        resumeInternalTimer();

        if (autoToast) {
          toast.success('Session reprise');
        }

        if (onSessionResume) {
          onSessionResume(response.data);
        }

        console.log('[useActivityTimer] Session resumed successfully');
      } else {
        handleError(response.error!, 'resumeTimer');
      }

    } catch (err: any) {
      const error: ActivityError = {
        code: 'DATABASE_ERROR',
        message: err.message || 'Erreur lors de la reprise'
      };
      handleError(error, 'resumeTimer');
    } finally {
      setLoading(false);
    }
  }, [currentSession, isPaused, handleError, clearError, resumeInternalTimer, autoToast, onSessionResume]);

  /**
   * Arrête et termine la session
   */
  const stopTimer = useCallback(async () => {
    if (!currentSession || (!isActive && !isPaused)) {
      const error: ActivityError = {
        code: 'SESSION_NOT_ACTIVE',
        message: 'Aucune session active à arrêter'
      };
      handleError(error, 'stopTimer');
      return;
    }

    setLoading(true);
    clearError();

    try {
      console.log('[useActivityTimer] Stopping session:', currentSession.id);

      const response = await ActivitiesAPI.stopSession(currentSession.id);

      if (response.success) {
        setCurrentSession(null);
        stopInternalTimer();

        if (autoToast) {
          toast.success(`Session terminée - ${formatTime(elapsedTime)} - ${formattedCost}`);
        }

        if (onSessionStop) {
          onSessionStop(response.data);
        }

        console.log('[useActivityTimer] Session stopped successfully');
      } else {
        handleError(response.error!, 'stopTimer');
      }

    } catch (err: any) {
      const error: ActivityError = {
        code: 'DATABASE_ERROR',
        message: err.message || 'Erreur lors de l\'arrêt'
      };
      handleError(error, 'stopTimer');
    } finally {
      setLoading(false);
    }
  }, [currentSession, isActive, isPaused, handleError, clearError, stopInternalTimer, autoToast, onSessionStop, elapsedTime, formattedCost]);

  // ==========================================
  // EFFECTS
  // ==========================================

  /**
   * Configuration de l'auto-sauvegarde
   */
  useEffect(() => {
    setupAutoSave();

    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
      }
    };
  }, [setupAutoSave]);

  /**
   * Nettoyage à la désinscription
   */
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
      }
    };
  }, []);

  /**
   * Gestion de la fermeture de page (beforeunload)
   */
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (currentSession && isActive) {
        event.preventDefault();
        event.returnValue = 'Vous avez une session active. Voulez-vous vraiment quitter ?';

        // Tentative de sauvegarde rapide
        autoSave();

        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentSession, isActive, autoSave]);

  // ==========================================
  // RETURN OBJECT
  // ==========================================

  return {
    // État du timer
    currentSession,
    isActive,
    isPaused,
    elapsedTime,
    currentCost,

    // Actions de contrôle
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,

    // Données formatées
    formattedTime,
    formattedCost,

    // États
    loading,
    error,
    clearError,

    // Configuration
    autoSaveInterval,
    lastSaved: lastSaveTimeRef.current
  } as UseActivityTimerReturn;
};