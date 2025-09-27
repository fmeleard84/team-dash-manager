import { useState, useEffect, useCallback } from 'react';
import { EvaluationsAPI } from '../services/evaluationsAPI';
import {
  TaskRating,
  CreateRatingData,
  UseRatingDialogReturn
} from '../types';

interface UseRatingDialogOptions {
  onRatingSubmitted?: (rating: TaskRating) => void;
  autoReset?: boolean;
}

export function useRatingDialog({
  onRatingSubmitted,
  autoReset = true
}: UseRatingDialogOptions = {}): UseRatingDialogReturn {
  // État du dialog
  const [isOpen, setIsOpen] = useState(false);
  const [taskInfo, setTaskInfo] = useState<{
    id: string;
    title: string;
    projectId: string;
    candidateId?: string;
  } | null>(null);

  // État du formulaire
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRating, setExistingRating] = useState<TaskRating | null>(null);

  /**
   * Ouvre le dialog pour une tâche spécifique
   */
  const openDialog = useCallback((task: {
    id: string;
    title: string;
    projectId: string;
    candidateId?: string;
  }) => {
    setTaskInfo(task);
    setIsOpen(true);
  }, []);

  /**
   * Ferme le dialog
   */
  const closeDialog = useCallback(() => {
    setIsOpen(false);
    if (autoReset) {
      // Petit délai pour l'animation de fermeture
      setTimeout(() => {
        resetForm();
        setTaskInfo(null);
        setExistingRating(null);
      }, 300);
    }
  }, [autoReset]);

  /**
   * Remet à zéro le formulaire
   */
  const resetForm = useCallback(() => {
    setRating(0);
    setComment('');
    setIsSubmitting(false);
  }, []);

  /**
   * Vérifie s'il existe déjà une évaluation pour cette tâche
   */
  const checkExistingRating = useCallback(async (taskId: string, clientId: string) => {
    try {
      // Pour l'instant, on simule la vérification
      // Dans une vraie implémentation, on ferait un appel à l'API
      setExistingRating(null);
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'évaluation existante:', error);
    }
  }, []);

  /**
   * Soumet l'évaluation
   */
  const submitRating = useCallback(async () => {
    if (!taskInfo || rating === 0) {
      throw new Error('Informations manquantes pour soumettre l\'évaluation');
    }

    setIsSubmitting(true);

    try {
      const data: CreateRatingData = {
        task_id: taskInfo.id,
        project_id: taskInfo.projectId,
        candidate_id: taskInfo.candidateId || null,
        rating,
        comment: comment.trim() || undefined
      };

      let result: TaskRating;

      if (existingRating) {
        // Mettre à jour l'évaluation existante
        result = await EvaluationsAPI.updateRating(existingRating.id, {
          rating,
          comment: comment.trim() || undefined
        }).then(response => {
          if (!response.success) {
            throw new Error(response.error?.message || 'Erreur lors de la mise à jour');
          }
          return response.data;
        });
      } else {
        // Créer une nouvelle évaluation
        result = await EvaluationsAPI.createRating(data).then(response => {
          if (!response.success) {
            throw new Error(response.error?.message || 'Erreur lors de la création');
          }
          return response.data;
        });
      }

      // Appeler le callback si fourni
      onRatingSubmitted?.(result);

      // Fermer le dialog
      closeDialog();

      return result;
    } catch (error) {
      console.error('Erreur lors de la soumission de l\'évaluation:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [taskInfo, rating, comment, existingRating, onRatingSubmitted, closeDialog]);

  /**
   * Valide le formulaire
   */
  const validateForm = useCallback((): {
    isValid: boolean;
    errors: string[];
  } => {
    const errors: string[] = [];

    if (rating === 0) {
      errors.push('Veuillez sélectionner une note');
    }

    if (rating < 1 || rating > 5) {
      errors.push('La note doit être comprise entre 1 et 5');
    }

    if (comment.length > 1000) {
      errors.push('Le commentaire ne peut pas dépasser 1000 caractères');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [rating, comment]);

  /**
   * Obtient le label de la note actuelle
   */
  const getCurrentRatingLabel = useCallback((): string => {
    return EvaluationsAPI.formatRatingLabel(rating);
  }, [rating]);

  /**
   * Obtient la couleur de la note actuelle
   */
  const getCurrentRatingColor = useCallback((): string => {
    return EvaluationsAPI.getRatingColor(rating);
  }, [rating]);

  // Vérifier l'évaluation existante quand le dialog s'ouvre
  useEffect(() => {
    if (isOpen && taskInfo) {
      // checkExistingRating(taskInfo.id, currentUserId);
      // Pour l'instant, on suppose qu'il n'y a pas d'évaluation existante
    }
  }, [isOpen, taskInfo]);

  // Pré-remplir le formulaire si une évaluation existe
  useEffect(() => {
    if (existingRating) {
      setRating(existingRating.rating);
      setComment(existingRating.comment || '');
    }
  }, [existingRating]);

  return {
    // État du dialog
    isOpen,
    openDialog,
    closeDialog,

    // Données du formulaire
    rating,
    comment,
    isSubmitting,
    existingRating,

    // Actions du formulaire
    setRating,
    setComment,
    submitRating,
    resetForm,

    // Métadonnées
    taskInfo,

    // Utilitaires
    validateForm,
    getCurrentRatingLabel,
    getCurrentRatingColor
  };
}