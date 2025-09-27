import { useState, useCallback } from 'react';
import { ProjetAPI } from '../services/projetAPI';
import type { CreateProjectData, UpdateProjectData, Project } from '../types';

export const useProjectActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = useCallback(async (data: CreateProjectData): Promise<Project | null> => {
    try {
      setLoading(true);
      setError(null);
      const project = await ProjetAPI.createProject(data);
      console.log('✅ [useProjectActions] Project created:', project.id);
      return project;
    } catch (err) {
      console.error('❌ [useProjectActions] Error creating project:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProject = useCallback(async (
    projectId: string,
    updates: UpdateProjectData
  ): Promise<Project | null> => {
    try {
      setLoading(true);
      setError(null);
      const project = await ProjetAPI.updateProject(projectId, updates);
      console.log('✅ [useProjectActions] Project updated:', project.id);
      return project;
    } catch (err) {
      console.error('❌ [useProjectActions] Error updating project:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await ProjetAPI.deleteProject(projectId);
      console.log('✅ [useProjectActions] Project deleted:', projectId);
      return true;
    } catch (err) {
      console.error('❌ [useProjectActions] Error deleting project:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    createProject,
    updateProject,
    deleteProject,
    loading,
    error,
    clearError
  };
};