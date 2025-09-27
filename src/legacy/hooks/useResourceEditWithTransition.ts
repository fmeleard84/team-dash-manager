import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useResourceModification } from './useResourceModification';
import { useToast } from '@/hooks/use-toast';

interface ResourceData {
  id: string;
  profile_id: string;
  seniority: string;
  languages: string[];
  expertises: string[];
  booking_status: string;
  current_candidate_id?: string;
}

/**
 * Hook pour gérer l'édition de ressources avec détection automatique des transitions
 * S'intègre avec le système existant sans le casser
 */
export function useResourceEditWithTransition() {
  const { analyzeModification, applyModification } = useResourceModification();
  const { toast } = useToast();
  const [pendingChanges, setPendingChanges] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  /**
   * Vérifie si une modification nécessite un remplacement de candidat
   */
  const checkResourceModification = useCallback(async (
    assignmentId: string,
    currentData: ResourceData,
    newData: Partial<ResourceData>
  ) => {
    // Si pas de candidat booké, pas besoin de vérification
    if (currentData.booking_status !== 'accepted' && currentData.booking_status !== 'booké') {
      return { requiresTransition: false, impact: null };
    }

    // Si pas de candidat assigné, pas de transition nécessaire
    if (!currentData.current_candidate_id) {
      return { requiresTransition: false, impact: null };
    }

    // Détecter les changements
    const changes: any = {};
    
    // Changement de profil (métier)
    if (newData.profile_id && newData.profile_id !== currentData.profile_id) {
      changes.profile_id = newData.profile_id;
    }
    
    // Changement de séniorité (TOUJOURS un remplacement)
    if (newData.seniority && newData.seniority !== currentData.seniority) {
      changes.seniority = newData.seniority;
    }
    
    // Changement de compétences
    if (newData.languages && JSON.stringify(newData.languages) !== JSON.stringify(currentData.languages)) {
      changes.languages = newData.languages;
    }
    
    if (newData.expertises && JSON.stringify(newData.expertises) !== JSON.stringify(currentData.expertises)) {
      changes.expertises = newData.expertises;
    }

    // Si aucun changement critique
    if (Object.keys(changes).length === 0) {
      return { requiresTransition: false, impact: null };
    }

    // Analyser l'impact
    const impact = await analyzeModification(assignmentId, changes);
    
    return {
      requiresTransition: impact?.requiresRebooking || false,
      impact,
      changes
    };
  }, [analyzeModification]);

  /**
   * Applique une modification avec gestion des transitions si nécessaire
   */
  const applyResourceEdit = useCallback(async (
    assignmentId: string,
    changes: any,
    customMessage?: string
  ) => {
    try {
      // Si une transition est nécessaire, utiliser le système de modification
      if (pendingChanges?.requiresTransition) {
        const result = await applyModification(
          assignmentId,
          changes,
          customMessage
        );
        
        if (result.requiresRebooking) {
          toast({
            title: "Modification appliquée",
            description: "La recherche d'un nouveau candidat est en cours. L'ancien candidat a été notifié.",
          });
        }
        
        return result;
      } else {
        // Sinon, mise à jour simple sans impact
        const { error } = await supabase
          .from('hr_resource_assignments')
          .update({
            ...changes,
            last_modified_at: new Date().toISOString()
          })
          .eq('id', assignmentId);
        
        if (error) throw error;
        
        toast({
          title: "Modification enregistrée",
          description: "Les changements ont été appliqués.",
        });
        
        return { success: true, requiresRebooking: false };
      }
    } catch (error) {
      console.error('Error applying edit:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'appliquer la modification",
        variant: "destructive"
      });
      throw error;
    } finally {
      setPendingChanges(null);
      setShowConfirmDialog(false);
    }
  }, [pendingChanges, applyModification, toast]);

  /**
   * Initie le processus d'édition avec vérification
   */
  const initiateResourceEdit = useCallback(async (
    assignmentId: string,
    currentData: ResourceData,
    newData: Partial<ResourceData>
  ) => {
    const result = await checkResourceModification(assignmentId, currentData, newData);
    
    if (result.requiresTransition) {
      // Stocker les changements en attente et afficher le dialog
      setPendingChanges({
        assignmentId,
        ...result
      });
      setShowConfirmDialog(true);
      return { showDialog: true, ...result };
    } else {
      // Appliquer directement sans dialog
      await applyResourceEdit(assignmentId, newData);
      return { showDialog: false, ...result };
    }
  }, [checkResourceModification, applyResourceEdit]);

  return {
    initiateResourceEdit,
    applyResourceEdit,
    checkResourceModification,
    pendingChanges,
    showConfirmDialog,
    setShowConfirmDialog
  };
}