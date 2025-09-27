import { useState, useEffect, useCallback } from 'react';
import { ProjetAPI } from '../services/projetAPI';
import type { ProjectMember } from '../types';

export const useProjectMembers = (projectId: string) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔍 [useProjectMembers] Loading members for project:', projectId);
      const data = await ProjetAPI.getProjectMembers(projectId);
      setMembers(data);
      console.log('✅ [useProjectMembers] Loaded members:', data.length);
    } catch (err) {
      console.error('❌ [useProjectMembers] Error:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  return {
    members,
    loading,
    error,
    refetch: loadMembers
  };
};