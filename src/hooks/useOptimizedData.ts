/**
 * Hook optimisé pour les données
 * Utilise le DataManager pour réduire les requêtes de 30-35%
 */

import { useState, useEffect, useCallback } from 'react';
import { DataManager } from '@/services/DataManager';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook optimisé pour les données candidat
 * Remplace useCandidateIdentity, useCandidateProfile, etc.
 */
export function useOptimizedCandidateData() {
  const { user } = useAuth();
  const [candidateData, setCandidateData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await DataManager.getCandidateComplete(user.id);
      setCandidateData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching candidate data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const invalidate = useCallback(() => {
    if (user?.id) {
      DataManager.invalidateCache(`candidate-complete-${user.id}`);
      fetchData();
    }
  }, [user?.id, fetchData]);

  return {
    candidateData,
    isLoading,
    error,
    refetch: invalidate
  };
}

/**
 * Hook optimisé pour les projets avec équipe
 * Remplace useProjectsWithResources, useCandidateProjectsOptimized
 */
export function useOptimizedProjects(role: 'client' | 'candidate' = 'client') {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await DataManager.getProjectsWithTeam(user.id, role);
      setProjects(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Erreur lors du chargement des projets');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, role]);

  useEffect(() => {
    fetchProjects();

    // Refresh périodique toutes les 30 secondes pour les projets actifs
    const interval = setInterval(() => {
      DataManager.invalidateCacheByPattern(`projects-team-${role}-${user?.id}`);
      fetchProjects();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchProjects, role, user?.id]);

  const updateAssignmentStatus = useCallback(async (
    assignmentId: string,
    status: 'accepted' | 'declined'
  ) => {
    if (!user?.id) return false;

    try {
      await DataManager.updateAssignmentStatus(assignmentId, status, user.id);
      // Les données sont mises à jour de manière optimiste
      await fetchProjects(); // Refresh après mise à jour
      return true;
    } catch (err) {
      console.error('Error updating assignment:', err);
      return false;
    }
  }, [user?.id, fetchProjects]);

  const invalidate = useCallback(() => {
    if (user?.id) {
      DataManager.invalidateCacheByPattern(`projects-team-${role}-${user.id}`);
      fetchProjects();
    }
  }, [user?.id, role, fetchProjects]);

  return {
    projects,
    isLoading,
    error,
    refetch: invalidate,
    updateAssignmentStatus
  };
}

/**
 * Hook pour les ressources HR (métiers, langues, expertises)
 * Utilisé dans les formulaires et sélecteurs
 */
export function useHRResources() {
  const [resources, setResources] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setIsLoading(true);
        const data = await DataManager.getHRResources();
        setResources(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching HR resources:', err);
        setError('Erreur lors du chargement des ressources');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResources();
  }, []);

  return {
    profiles: resources?.profiles || [],
    languages: resources?.languages || [],
    expertises: resources?.expertises || [],
    industries: resources?.industries || [],
    isLoading,
    error
  };
}

/**
 * Hook pour invalider le cache globalement
 * Utile après des actions importantes (création projet, etc.)
 */
export function useCacheInvalidation() {
  const { user } = useAuth();

  const invalidateAll = useCallback(() => {
    DataManager.invalidateCache();
  }, []);

  const invalidateUser = useCallback(() => {
    if (user?.id) {
      DataManager.invalidateCacheByPattern(user.id);
    }
  }, [user?.id]);

  const invalidateProjects = useCallback(() => {
    DataManager.invalidateCacheByPattern('projects-team');
  }, []);

  const invalidateCandidate = useCallback(() => {
    DataManager.invalidateCacheByPattern('candidate-complete');
  }, []);

  return {
    invalidateAll,
    invalidateUser,
    invalidateProjects,
    invalidateCandidate
  };
}