import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ResourceModificationImpact {
  hasImpact: boolean;
  requiresRebooking: boolean;
  changeType: 'profile_change' | 'seniority_change' | 'skill_update' | null;
  currentCandidate?: {
    id: string;
    name: string;
    email: string;
  };
  message: string;
  missingSkills?: {
    languages: string[];
    expertises: string[];
  };
}

export interface ResourceChanges {
  profile_id?: string;
  seniority?: string;
  languages?: string[];
  expertises?: string[];
}

export function useResourceModification() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();

  /**
   * Analyser l'impact d'une modification de ressource
   */
  const analyzeModification = async (
    assignmentId: string,
    changes: ResourceChanges
  ): Promise<ResourceModificationImpact | null> => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-resource-modification', {
        body: {
          action: 'analyze',
          assignmentId,
          changes
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error analyzing modification:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'analyser l\'impact de la modification',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Appliquer une modification de ressource
   */
  const applyModification = async (
    assignmentId: string,
    changes: ResourceChanges,
    reason?: string
  ) => {
    setIsApplying(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-resource-modification', {
        body: {
          action: 'apply',
          assignmentId,
          changes,
          reason
        }
      });

      if (error) throw error;

      if (data.requiresRebooking) {
        toast({
          title: 'Modification appliquée',
          description: 'La recherche d\'un nouveau candidat est en cours.',
        });
      } else {
        toast({
          title: 'Modification appliquée',
          description: 'Les changements ont été enregistrés sans impact sur le candidat actuel.',
        });
      }

      return data;
    } catch (error) {
      console.error('Error applying modification:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'appliquer la modification',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsApplying(false);
    }
  };

  /**
   * Surveiller les transitions en cours pour un projet
   */
  const useTransitionMonitoring = (projectId: string) => {
    const [transitions, setTransitions] = useState<any[]>([]);

    // Configurer le realtime pour les transitions
    useState(() => {
      if (!projectId) return;

      const channel = supabase
        .channel(`transitions-${projectId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'resource_transitions',
            filter: `project_id=eq.${projectId}`
          },
          (payload) => {
            console.log('Transition update:', payload);
            
            if (payload.eventType === 'INSERT') {
              setTransitions(prev => [...prev, payload.new]);
              toast({
                title: 'Nouvelle transition',
                description: 'Une modification de ressource est en cours.',
              });
            } else if (payload.eventType === 'UPDATE') {
              setTransitions(prev => 
                prev.map(t => t.id === payload.new.id ? payload.new : t)
              );
              
              if (payload.new.status === 'completed') {
                toast({
                  title: 'Transition terminée',
                  description: 'Le nouveau candidat a été assigné avec succès.',
                });
              }
            }
          }
        )
        .subscribe();

      // Charger les transitions existantes
      loadTransitions(projectId);

      return () => {
        channel.unsubscribe();
      };
    });

    const loadTransitions = async (projectId: string) => {
      const { data, error } = await supabase
        .from('resource_transitions')
        .select(`
          *,
          hr_resource_assignments (
            hr_profiles (
              name
            )
          ),
          previous_candidate:candidate_profiles!previous_candidate_id (
            first_name,
            last_name
          ),
          new_candidate:candidate_profiles!new_candidate_id (
            first_name,
            last_name
          )
        `)
        .eq('project_id', projectId)
        .in('status', ['pending', 'searching', 'candidate_found'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTransitions(data);
      }
    };

    return transitions;
  };

  /**
   * Récupérer l'historique des modifications pour un projet
   */
  const getModificationHistory = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('resource_change_history')
        .select(`
          *,
          removed_candidate:candidate_profiles!removed_candidate_id (
            first_name,
            last_name,
            email
          ),
          added_candidate:candidate_profiles!added_candidate_id (
            first_name,
            last_name,
            email
          ),
          changed_by_user:auth.users!changed_by (
            email
          )
        `)
        .eq('project_id', projectId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error loading history:', error);
      return [];
    }
  };

  return {
    analyzeModification,
    applyModification,
    useTransitionMonitoring,
    getModificationHistory,
    isAnalyzing,
    isApplying
  };
}