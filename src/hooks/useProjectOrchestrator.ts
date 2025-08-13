import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useProjectOrchestrator = () => {
  const [isLoading, setIsLoading] = useState(false);

  const setupProject = async (projectId: string) => {
    setIsLoading(true);
    try {
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

      if (data?.success) {
        toast.success('Projet configuré avec succès !');
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