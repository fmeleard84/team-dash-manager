import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useProjectOrchestrator = () => {
  const [isLoading, setIsLoading] = useState(false);

  const setupProject = async (projectId: string, kickoffDate?: string) => {
    setIsLoading(true);
    try {
      // First call the project-orchestrator for general setup
      const { data, error } = await supabase.functions.invoke('project-orchestrator', {
        body: {
          action: 'setup-project',
          projectId
        }
      });

      if (error) {
        console.error('Erreur orchestration projet:', error);
        toast.error('Erreur lors de la configuration du projet');
        return false;
      }

      // Then call the project-kickoff for planning synchronization
      const { data: kickoffData, error: kickoffError } = await supabase.functions.invoke('project-kickoff', {
        body: {
          projectId,
          kickoffDate
        }
      });

      if (kickoffError) {
        console.error('Erreur création kickoff:', kickoffError);
        toast.error('Erreur lors de la création du planning de lancement');
        return false;
      }

      if (data?.success && kickoffData?.success) {
        toast.success('Projet configuré avec succès ! Planning synchronisé pour toute l\'équipe.');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erreur inattendue:', error);
      toast.error('Une erreur inattendue est survenue');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    setupProject,
    isLoading
  };
};