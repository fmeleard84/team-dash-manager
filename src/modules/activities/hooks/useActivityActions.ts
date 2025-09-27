/**
 * Module ACTIVITÉS - Hook Actions
 *
 * Hook spécialisé pour toutes les actions CRUD et utilitaires
 * liées aux activités et sessions de temps.
 *
 * Fonctionnalités :
 * - Actions CRUD sur les sessions
 * - Contrôle des sessions (start/pause/resume/stop)
 * - Fonctions utilitaires (formatage, validation, calculs)
 * - Export et templates
 * - Gestion des erreurs centralisée
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { toast } from 'sonner';
import {
  TimeSession,
  CreateTimeSessionData,
  UpdateTimeSessionData,
  ActivityFilters,
  ActivityExportFormat,
  ActivityExport,
  ActivityReport,
  ActivityTemplate,
  ActivityType,
  ActivityStatus,
  UseActivityActionsReturn,
  ActivityError,
  ACTIVITY_CONSTANTS
} from '../types';
import { ActivitiesAPI } from '../services';

interface UseActivityActionsOptions {
  onSessionCreated?: (session: TimeSession) => void;
  onSessionUpdated?: (session: TimeSession) => void;
  onSessionDeleted?: (sessionId: string) => void;
  onError?: (error: ActivityError) => void;
  autoToast?: boolean;
}

export const useActivityActions = (options: UseActivityActionsOptions = {}) => {
  const {
    onSessionCreated,
    onSessionUpdated,
    onSessionDeleted,
    onError,
    autoToast = true
  } = options;

  const { user } = useAuth();
  const candidateId = user?.id;

  // ==========================================
  // STATES
  // ==========================================

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ActivityError | null>(null);

  // ==========================================
  // ERROR HANDLING
  // ==========================================

  const handleError = useCallback((err: ActivityError, context: string) => {
    console.error(`[useActivityActions] ${context}:`, err);
    setError(err);

    if (onError) {
      onError(err);
    }

    if (autoToast) {
      toast.error(err.message || 'Une erreur est survenue');
    }
  }, [onError, autoToast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ==========================================
  // SESSION CRUD OPERATIONS
  // ==========================================

  /**
   * Crée une nouvelle session
   */
  const createSession = useCallback(async (data: CreateTimeSessionData) => {
    if (!candidateId) {
      const error: ActivityError = {
        code: 'CANDIDATE_NOT_FOUND',
        message: 'Candidat non trouvé'
      };
      handleError(error, 'createSession');
      return { data: null as any, success: false, error };
    }

    setSubmitting(true);
    clearError();

    try {
      console.log('[useActivityActions] Creating session:', data);

      const response = await ActivitiesAPI.createSession(candidateId, data);

      if (response.success) {
        console.log('[useActivityActions] Session created successfully');

        if (autoToast) {
          toast.success('Session créée avec succès');
        }

        if (onSessionCreated) {
          onSessionCreated(response.data);
        }
      } else {
        handleError(response.error!, 'createSession');
      }

      return response;

    } catch (err: any) {
      const error: ActivityError = {
        code: 'DATABASE_ERROR',
        message: err.message || 'Erreur lors de la création'
      };
      handleError(error, 'createSession');
      return { data: null as any, success: false, error };
    } finally {
      setSubmitting(false);
    }
  }, [candidateId, handleError, clearError, autoToast, onSessionCreated]);

  /**
   * Met à jour une session
   */
  const updateSession = useCallback(async (id: string, data: UpdateTimeSessionData) => {
    setSubmitting(true);
    clearError();

    try {
      console.log('[useActivityActions] Updating session:', id, data);

      const response = await ActivitiesAPI.updateSession(id, data);

      if (response.success) {
        console.log('[useActivityActions] Session updated successfully');

        if (autoToast) {
          toast.success('Session mise à jour avec succès');
        }

        if (onSessionUpdated) {
          onSessionUpdated(response.data);
        }
      } else {
        handleError(response.error!, 'updateSession');
      }

      return response;

    } catch (err: any) {
      const error: ActivityError = {
        code: 'DATABASE_ERROR',
        message: err.message || 'Erreur lors de la mise à jour'
      };
      handleError(error, 'updateSession');
      return { data: null as any, success: false, error };
    } finally {
      setSubmitting(false);
    }
  }, [handleError, clearError, autoToast, onSessionUpdated]);

  /**
   * Supprime une session
   */
  const deleteSession = useCallback(async (id: string) => {
    setSubmitting(true);
    clearError();

    try {
      console.log('[useActivityActions] Deleting session:', id);

      const response = await ActivitiesAPI.deleteSession(id);

      if (response.success) {
        console.log('[useActivityActions] Session deleted successfully');

        if (autoToast) {
          toast.success('Session supprimée avec succès');
        }

        if (onSessionDeleted) {
          onSessionDeleted(id);
        }
      } else {
        handleError(response.error!, 'deleteSession');
      }

      return response;

    } catch (err: any) {
      const error: ActivityError = {
        code: 'DATABASE_ERROR',
        message: err.message || 'Erreur lors de la suppression'
      };
      handleError(error, 'deleteSession');
      return { data: null as any, success: false, error };
    } finally {
      setSubmitting(false);
    }
  }, [handleError, clearError, autoToast, onSessionDeleted]);

  // ==========================================
  // SESSION CONTROL ACTIONS
  // ==========================================

  /**
   * Démarre une nouvelle session
   */
  const startSession = useCallback(async (data: CreateTimeSessionData) => {
    return createSession(data);
  }, [createSession]);

  /**
   * Met en pause une session active
   */
  const pauseSession = useCallback(async (id: string) => {
    setSubmitting(true);
    clearError();

    try {
      console.log('[useActivityActions] Pausing session:', id);

      const response = await ActivitiesAPI.pauseSession(id);

      if (response.success) {
        console.log('[useActivityActions] Session paused successfully');

        if (autoToast) {
          toast.success('Session mise en pause');
        }

        if (onSessionUpdated) {
          onSessionUpdated(response.data);
        }
      } else {
        handleError(response.error!, 'pauseSession');
      }

      return response;

    } catch (err: any) {
      const error: ActivityError = {
        code: 'DATABASE_ERROR',
        message: err.message || 'Erreur lors de la mise en pause'
      };
      handleError(error, 'pauseSession');
      return { data: null as any, success: false, error };
    } finally {
      setSubmitting(false);
    }
  }, [handleError, clearError, autoToast, onSessionUpdated]);

  /**
   * Reprend une session en pause
   */
  const resumeSession = useCallback(async (id: string) => {
    setSubmitting(true);
    clearError();

    try {
      console.log('[useActivityActions] Resuming session:', id);

      const response = await ActivitiesAPI.resumeSession(id);

      if (response.success) {
        console.log('[useActivityActions] Session resumed successfully');

        if (autoToast) {
          toast.success('Session reprise');
        }

        if (onSessionUpdated) {
          onSessionUpdated(response.data);
        }
      } else {
        handleError(response.error!, 'resumeSession');
      }

      return response;

    } catch (err: any) {
      const error: ActivityError = {
        code: 'DATABASE_ERROR',
        message: err.message || 'Erreur lors de la reprise'
      };
      handleError(error, 'resumeSession');
      return { data: null as any, success: false, error };
    } finally {
      setSubmitting(false);
    }
  }, [handleError, clearError, autoToast, onSessionUpdated]);

  /**
   * Arrête une session et la marque comme terminée
   */
  const stopSession = useCallback(async (id: string) => {
    setSubmitting(true);
    clearError();

    try {
      console.log('[useActivityActions] Stopping session:', id);

      const response = await ActivitiesAPI.stopSession(id);

      if (response.success) {
        console.log('[useActivityActions] Session stopped successfully');

        if (autoToast) {
          toast.success('Session terminée');
        }

        if (onSessionUpdated) {
          onSessionUpdated(response.data);
        }
      } else {
        handleError(response.error!, 'stopSession');
      }

      return response;

    } catch (err: any) {
      const error: ActivityError = {
        code: 'DATABASE_ERROR',
        message: err.message || 'Erreur lors de l\'arrêt'
      };
      handleError(error, 'stopSession');
      return { data: null as any, success: false, error };
    } finally {
      setSubmitting(false);
    }
  }, [handleError, clearError, autoToast, onSessionUpdated]);

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================

  /**
   * Formate une durée en minutes
   */
  const formatDuration = useCallback((minutes: number): string => {
    return ActivitiesAPI.formatDuration(minutes);
  }, []);

  /**
   * Formate un coût
   */
  const formatCost = useCallback((cost: number): string => {
    return ActivitiesAPI.formatCost(cost);
  }, []);

  /**
   * Calcule le coût d'une session
   */
  const calculateSessionCost = useCallback((session: TimeSession): number => {
    return ActivitiesAPI.calculateSessionCost(session);
  }, []);

  /**
   * Retourne la couleur d'un type d'activité
   */
  const getActivityTypeColor = useCallback((type: ActivityType): string => {
    const colors = {
      task: 'text-blue-600 bg-blue-100',
      meeting: 'text-purple-600 bg-purple-100',
      research: 'text-green-600 bg-green-100',
      development: 'text-orange-600 bg-orange-100',
      documentation: 'text-gray-600 bg-gray-100',
      other: 'text-indigo-600 bg-indigo-100'
    };

    return colors[type] || colors.other;
  }, []);

  /**
   * Retourne la couleur d'un statut d'activité
   */
  const getActivityStatusColor = useCallback((status: ActivityStatus): string => {
    const colors = {
      active: 'text-green-600 bg-green-100 animate-pulse',
      paused: 'text-orange-600 bg-orange-100',
      completed: 'text-gray-600 bg-gray-100',
      cancelled: 'text-red-600 bg-red-100'
    };

    return colors[status] || colors.completed;
  }, []);

  // ==========================================
  // VALIDATION
  // ==========================================

  /**
   * Valide les données d'une session
   */
  const validateSessionData = useCallback((data: CreateTimeSessionData): ActivityError | null => {
    if (!data.project_id?.trim()) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'Le projet est requis',
        field: 'project_id'
      };
    }

    if (!data.activity_description?.trim()) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'La description de l\'activité est requise',
        field: 'activity_description'
      };
    }

    if (data.hourly_rate <= 0) {
      return {
        code: 'INVALID_RATE',
        message: 'Le tarif horaire doit être supérieur à 0',
        field: 'hourly_rate'
      };
    }

    return null;
  }, []);

  /**
   * Vérifie si une session peut être modifiée
   */
  const canEditSession = useCallback((session: TimeSession): boolean => {
    // Seules les sessions complétées peuvent être modifiées
    return session.status === 'completed' && session.candidate_id === candidateId;
  }, [candidateId]);

  /**
   * Vérifie si une session peut être supprimée
   */
  const canDeleteSession = useCallback((session: TimeSession): boolean => {
    // Les sessions actives ne peuvent pas être supprimées
    return session.status !== 'active' && session.candidate_id === candidateId;
  }, [candidateId]);

  // ==========================================
  // EXPORT & REPORTS
  // ==========================================

  /**
   * Exporte les activités
   */
  const exportActivities = useCallback(async (
    filters: ActivityFilters,
    format: ActivityExportFormat
  ) => {
    if (!candidateId) {
      const error: ActivityError = {
        code: 'CANDIDATE_NOT_FOUND',
        message: 'Candidat non trouvé'
      };
      handleError(error, 'exportActivities');
      return { data: null as any, success: false, error };
    }

    setLoading(true);
    clearError();

    try {
      console.log('[useActivityActions] Exporting activities:', format);

      const response = await ActivitiesAPI.exportActivities(candidateId, filters, format);

      if (response.success) {
        console.log('[useActivityActions] Export completed successfully');

        if (autoToast) {
          toast.success('Export généré avec succès');
        }
      } else {
        handleError(response.error!, 'exportActivities');
      }

      return response;

    } catch (err: any) {
      const error: ActivityError = {
        code: 'EXPORT_ERROR',
        message: err.message || 'Erreur lors de l\'export'
      };
      handleError(error, 'exportActivities');
      return { data: null as any, success: false, error };
    } finally {
      setLoading(false);
    }
  }, [candidateId, handleError, clearError, autoToast]);

  /**
   * Génère un rapport
   */
  const generateReport = useCallback(async (
    type: string,
    filters: ActivityFilters
  ) => {
    setLoading(true);
    clearError();

    try {
      console.log('[useActivityActions] Generating report:', type);

      // Pour l'instant, simulation d'un rapport
      const report: ActivityReport = {
        id: `report_${Date.now()}`,
        title: `Rapport ${type}`,
        description: 'Rapport généré automatiquement',
        type: 'summary',
        filters,
        data: {
          summary: {} as any,
          charts: [],
          tables: [],
          insights: [],
          recommendations: []
        },
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (autoToast) {
        toast.success('Rapport généré avec succès');
      }

      return {
        data: report,
        success: true
      };

    } catch (err: any) {
      const error: ActivityError = {
        code: 'EXPORT_ERROR',
        message: err.message || 'Erreur lors de la génération du rapport'
      };
      handleError(error, 'generateReport');
      return { data: null as any, success: false, error };
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError, autoToast]);

  // ==========================================
  // TEMPLATES
  // ==========================================

  /**
   * Récupère les templates d'activité
   */
  const getTemplates = useCallback(async () => {
    setLoading(true);
    clearError();

    try {
      console.log('[useActivityActions] Loading templates');

      const response = await ActivitiesAPI.getTemplates();

      if (!response.success) {
        handleError(response.error!, 'getTemplates');
      }

      return response;

    } catch (err: any) {
      const error: ActivityError = {
        code: 'TEMPLATE_ERROR',
        message: err.message || 'Erreur lors du chargement des templates'
      };
      handleError(error, 'getTemplates');
      return { data: [], success: false, error };
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  /**
   * Applique un template pour créer une session
   */
  const applyTemplate = useCallback(async (templateId: string, projectId: string) => {
    if (!candidateId) {
      const error: ActivityError = {
        code: 'CANDIDATE_NOT_FOUND',
        message: 'Candidat non trouvé'
      };
      handleError(error, 'applyTemplate');
      return { data: null as any, success: false, error };
    }

    try {
      // Récupérer le template
      const templatesResponse = await getTemplates();
      if (!templatesResponse.success) {
        return templatesResponse;
      }

      const template = templatesResponse.data.find(t => t.id === templateId);
      if (!template) {
        const error: ActivityError = {
          code: 'TEMPLATE_ERROR',
          message: 'Template non trouvé'
        };
        handleError(error, 'applyTemplate');
        return { data: null as any, success: false, error };
      }

      // Créer la session à partir du template
      const sessionData: CreateTimeSessionData = {
        project_id: projectId,
        activity_description: template.description,
        activity_type: template.activity_type,
        hourly_rate: 0.5, // Tarif par défaut, à ajuster
        tags: template.default_tags,
        notes: `Créé depuis le template: ${template.name}`
      };

      return createSession(sessionData);

    } catch (err: any) {
      const error: ActivityError = {
        code: 'TEMPLATE_ERROR',
        message: err.message || 'Erreur lors de l\'application du template'
      };
      handleError(error, 'applyTemplate');
      return { data: null as any, success: false, error };
    }
  }, [candidateId, getTemplates, createSession, handleError]);

  // ==========================================
  // RETURN OBJECT
  // ==========================================

  return {
    // Actions CRUD
    createSession,
    updateSession,
    deleteSession,

    // Actions de contrôle des sessions
    startSession,
    pauseSession,
    resumeSession,
    stopSession,

    // Fonctions utilitaires
    formatDuration,
    formatCost,
    calculateSessionCost,
    getActivityTypeColor,
    getActivityStatusColor,

    // Validation
    validateSessionData,
    canEditSession,
    canDeleteSession,

    // Export et rapports
    exportActivities,
    generateReport,

    // Templates
    getTemplates,
    applyTemplate,

    // États de chargement
    loading,
    submitting,
    error,
    clearError
  } as UseActivityActionsReturn;
};