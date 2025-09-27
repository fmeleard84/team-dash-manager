import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useProjectOrchestrator = () => {
  const [isLoading, setIsLoading] = useState(false);

  const setupProject = async (projectId: string, kickoffDate?: string) => {
    setIsLoading(true);
    console.log('🚀 Starting project setup for:', projectId);
    
    try {
      // First call the project-orchestrator for general setup
      const { data, error } = await supabase.functions.invoke('project-orchestrator', {
        body: {
          action: 'setup-project',
          projectId
        }
      });
      
      console.log('📦 Project orchestrator response:', { data, error });

      if (error) {
        console.error('Erreur orchestration projet:', error);
        console.error('Error details:', { data, error });
        
        // Show more specific error message
        const errorMessage = data?.error || error?.message || 'Erreur lors de la configuration du projet';
        toast.error(errorMessage);
        return false;
      }

      // Then call the project-kickoff for planning synchronization
      console.log('📅 Calling project-kickoff with:', { projectId, kickoffDate });
      const { data: kickoffData, error: kickoffError } = await supabase.functions.invoke('project-kickoff', {
        body: {
          projectId,
          kickoffDate
        }
      });
      
      console.log('📅 Project kickoff response:', { kickoffData, kickoffError });

      if (kickoffError) {
        console.error('Erreur création kickoff:', kickoffError);
        console.error('Kickoff error details:', { kickoffData, kickoffError });
        
        // Show detailed error message
        const kickoffErrorMessage = kickoffData?.error || kickoffError?.message || 'Erreur lors de la création du planning de lancement';
        toast.error(kickoffErrorMessage);
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