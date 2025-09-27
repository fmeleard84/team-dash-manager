import { useCallback } from 'react';
import { useToast } from '@/ui/components/use-toast';
import { EvaluationsAPI } from '../services/evaluationsAPI';
import {
  TaskRating,
  CreateRatingData,
  UpdateRatingData,
  EvaluationExport,
  EvaluationFilters,
  EvaluationExportFormat,
  UseEvaluationActionsReturn
} from '../types';

interface UseEvaluationActionsOptions {
  candidateId?: string;
}

export function useEvaluationActions(options: UseEvaluationActionsOptions = {}): UseEvaluationActionsReturn {
  const { toast } = useToast();

  /**
   * Crée une nouvelle évaluation
   */
  const createRating = useCallback(async (data: CreateRatingData): Promise<TaskRating> => {
    const response = await EvaluationsAPI.createRating(data);

    if (response.success) {
      toast({
        title: "Évaluation créée",
        description: "Votre évaluation a été enregistrée avec succès",
      });
      return response.data;
    } else {
      toast({
        title: "Erreur",
        description: response.error?.message || "Impossible de créer l'évaluation",
        variant: "destructive",
      });
      throw new Error(response.error?.message || "Création impossible");
    }
  }, [toast]);

  /**
   * Met à jour une évaluation existante
   */
  const updateRating = useCallback(async (
    ratingId: string,
    data: UpdateRatingData
  ): Promise<TaskRating> => {
    const response = await EvaluationsAPI.updateRating(ratingId, data);

    if (response.success) {
      toast({
        title: "Évaluation mise à jour",
        description: "Les modifications ont été enregistrées",
      });
      return response.data;
    } else {
      toast({
        title: "Erreur",
        description: response.error?.message || "Impossible de mettre à jour l'évaluation",
        variant: "destructive",
      });
      throw new Error(response.error?.message || "Mise à jour impossible");
    }
  }, [toast]);

  /**
   * Supprime une évaluation
   */
  const deleteRating = useCallback(async (ratingId: string): Promise<boolean> => {
    // Demander confirmation
    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir supprimer cette évaluation ? Cette action est irréversible.'
    );

    if (!confirmed) return false;

    try {
      const response = await EvaluationsAPI.deleteRating(ratingId);

      if (response.success) {
        toast({
          title: "Évaluation supprimée",
          description: "L'évaluation a été supprimée avec succès",
        });
        return true;
      } else {
        toast({
          title: "Erreur",
          description: response.error?.message || "Impossible de supprimer l'évaluation",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  /**
   * Exporte les évaluations
   */
  const exportEvaluations = useCallback(async (
    filters: EvaluationFilters,
    format: EvaluationExportFormat
  ): Promise<EvaluationExport> => {
    const { candidateId: defaultCandidateId } = options;
    if (!defaultCandidateId) {
      throw new Error('Candidate ID required for export');
    }

    const response = await EvaluationsAPI.exportEvaluations(defaultCandidateId, filters, format);

    if (response.success) {
      toast({
        title: "Export en cours",
        description: `Génération du fichier ${format.toUpperCase()} en cours...`,
      });

      // Simuler la notification de fin d'export
      setTimeout(() => {
        toast({
          title: "Export terminé",
          description: "Votre fichier est prêt au téléchargement",
          action: {
            label: "Télécharger",
            onClick: () => {
              // Simuler le téléchargement
              const link = document.createElement('a');
              link.href = response.data.download_url || '#';
              link.download = `evaluations_${new Date().toISOString().split('T')[0]}.${format}`;
              link.click();
            }
          }
        });
      }, 3000);

      return response.data;
    } else {
      toast({
        title: "Erreur d'export",
        description: response.error?.message || "Impossible d'exporter les évaluations",
        variant: "destructive",
      });
      throw new Error(response.error?.message || "Export impossible");
    }
  }, [options, toast]);

  /**
   * Calcule la moyenne des notes
   */
  const calculateAverageRating = useCallback((ratings: TaskRating[]): number => {
    return EvaluationsAPI.calculateAverageRating(ratings);
  }, []);

  /**
   * Formate le label d'une note
   */
  const formatRatingLabel = useCallback((rating: number): string => {
    return EvaluationsAPI.formatRatingLabel(rating);
  }, []);

  /**
   * Vérifie si l'utilisateur peut modifier une évaluation
   */
  const canEditRating = useCallback((rating: TaskRating, currentUserId: string): boolean => {
    // Seul le client qui a créé l'évaluation peut la modifier
    return rating.client_id === currentUserId;
  }, []);

  /**
   * Obtient la couleur CSS pour une note
   */
  const getRatingColor = useCallback((rating: number): string => {
    return EvaluationsAPI.getRatingColor(rating);
  }, []);

  /**
   * Valide les données d'une évaluation avant soumission
   */
  const validateRatingData = useCallback((data: CreateRatingData | UpdateRatingData): {
    isValid: boolean;
    errors: string[];
  } => {
    const errors: string[] = [];

    if ('rating' in data && data.rating !== undefined) {
      if (data.rating < 1 || data.rating > 5) {
        errors.push('La note doit être comprise entre 1 et 5');
      }
    }

    if ('comment' in data && data.comment && data.comment.length > 1000) {
      errors.push('Le commentaire ne peut pas dépasser 1000 caractères');
    }

    if ('task_id' in data && !data.task_id) {
      errors.push('L\'ID de la tâche est requis');
    }

    if ('project_id' in data && !data.project_id) {
      errors.push('L\'ID du projet est requis');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  /**
   * Génère des statistiques rapides à partir d'une liste d'évaluations
   */
  const getQuickStats = useCallback((ratings: TaskRating[]): {
    total: number;
    average: number;
    distribution: Record<number, number>;
    withComments: number;
  } => {
    if (ratings.length === 0) {
      return {
        total: 0,
        average: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        withComments: 0
      };
    }

    const total = ratings.length;
    const average = calculateAverageRating(ratings);
    const distribution = ratings.reduce((acc, rating) => {
      acc[rating.rating] = (acc[rating.rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // S'assurer que toutes les notes (1-5) sont présentes
    for (let i = 1; i <= 5; i++) {
      if (!(i in distribution)) {
        distribution[i] = 0;
      }
    }

    const withComments = ratings.filter(r => r.comment && r.comment.trim().length > 0).length;

    return {
      total,
      average,
      distribution,
      withComments
    };
  }, [calculateAverageRating]);

  /**
   * Filtre les évaluations par critères
   */
  const filterRatings = useCallback((
    ratings: TaskRating[],
    criteria: {
      minRating?: number;
      maxRating?: number;
      hasComment?: boolean;
      projectId?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): TaskRating[] => {
    return ratings.filter(rating => {
      // Filtre par note minimale
      if (criteria.minRating !== undefined && rating.rating < criteria.minRating) {
        return false;
      }

      // Filtre par note maximale
      if (criteria.maxRating !== undefined && rating.rating > criteria.maxRating) {
        return false;
      }

      // Filtre par présence de commentaire
      if (criteria.hasComment !== undefined) {
        const hasComment = rating.comment && rating.comment.trim().length > 0;
        if (criteria.hasComment !== hasComment) {
          return false;
        }
      }

      // Filtre par projet
      if (criteria.projectId && rating.project_id !== criteria.projectId) {
        return false;
      }

      // Filtre par date de début
      if (criteria.dateFrom && rating.created_at < criteria.dateFrom) {
        return false;
      }

      // Filtre par date de fin
      if (criteria.dateTo && rating.created_at > criteria.dateTo) {
        return false;
      }

      return true;
    });
  }, []);

  return {
    createRating,
    updateRating,
    deleteRating,
    exportEvaluations,
    calculateAverageRating,
    formatRatingLabel,
    canEditRating,
    getRatingColor: getRatingColor,
    validateRatingData,
    getQuickStats,
    filterRatings
  };
}