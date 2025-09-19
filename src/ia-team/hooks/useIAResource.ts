import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { IAResource, IAPrompt } from '../types/ia-team.types';
import { useToast } from '@/hooks/use-toast';

interface UseIAResourceOptions {
  projectId?: string;
  includePrompt?: boolean;
}

export function useIAResource(options: UseIAResourceOptions = {}) {
  const { projectId, includePrompt = true } = options;
  const [iaResources, setIAResources] = useState<IAResource[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (projectId) {
      fetchIAResourcesForProject();
    }
  }, [projectId]);

  const fetchIAResourcesForProject = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      // Récupérer les ressources IA assignées à ce projet
      const { data: assignments, error: assignmentsError } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id,
          profile_id,
          hr_profiles!inner (
            id,
            name,
            category_id,
            base_price,
            is_ai,
            prompt_id
          )
        `)
        .eq('project_id', projectId)
        .eq('hr_profiles.is_ai', true)
        .in('booking_status', ['accepted', 'draft']);

      if (assignmentsError) throw assignmentsError;

      if (assignments && assignments.length > 0) {
        const resources: IAResource[] = [];

        for (const assignment of assignments) {
          const profile = assignment.hr_profiles;
          if (!profile) continue;

          let resource: IAResource = {
            id: assignment.id,
            name: profile.name,
            profile_id: profile.id,
            prompt_id: profile.prompt_id,
            is_ai: true,
            base_price: profile.base_price,
            category_id: profile.category_id
          };

          // Charger le prompt si demandé
          if (includePrompt && profile.prompt_id) {
            const { data: promptData, error: promptError } = await supabase
              .from('prompts_ia')
              .select('*')
              .eq('id', profile.prompt_id)
              .single();

            if (!promptError && promptData) {
              resource.prompt = promptData;
            }
          }

          resources.push(resource);
        }

        setIAResources(resources);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des ressources IA:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les ressources IA',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getIAResourceById = (resourceId: string): IAResource | undefined => {
    return iaResources.find(r => r.id === resourceId || r.profile_id === resourceId);
  };

  const isIAResource = async (profileId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('hr_profiles')
        .select('is_ai')
        .eq('id', profileId)
        .single();

      if (error) throw error;
      return data?.is_ai || false;
    } catch (error) {
      console.error('Erreur vérification IA:', error);
      return false;
    }
  };

  return {
    iaResources,
    loading,
    getIAResourceById,
    isIAResource,
    refetch: fetchIAResourcesForProject
  };
}