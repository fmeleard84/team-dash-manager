/**
 * Hook pour gérer tous les drives d'un projet
 * Utilisé dans les dashboards pour afficher la liste des drives
 */

import { useState, useEffect, useCallback } from 'react';
import { DriveAPI } from '../services/driveAPI';
import type { Drive } from '../types';

interface UseProjectDrivesOptions {
  projectId: string;
  autoRefresh?: boolean;
}

interface UseProjectDrivesReturn {
  // État
  drives: Drive[];
  loading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  createDrive: (name: string, type?: Drive['type']) => Promise<Drive | null>;
  deleteDrive: (driveId: string) => Promise<boolean>;

  // Statistiques
  totalDrives: number;
  totalStorageUsed: number;
}

export function useProjectDrives({
  projectId,
  autoRefresh = true
}: UseProjectDrivesOptions): UseProjectDrivesReturn {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour charger les drives
  const loadDrives = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const drivesData = await DriveAPI.getProjectDrives(projectId);
      setDrives(drivesData);

    } catch (err) {
      console.error('[useProjectDrives] Error loading drives:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des drives');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Créer un nouveau drive
  const createDrive = useCallback(async (
    name: string,
    type: Drive['type'] = 'project'
  ): Promise<Drive | null> => {
    try {
      const newDrive = await DriveAPI.createDrive({
        name,
        type,
        project_id: projectId
      });

      // Ajouter le drive à la liste locale
      setDrives(prev => [newDrive, ...prev]);

      return newDrive;
    } catch (err) {
      console.error('[useProjectDrives] Error creating drive:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du drive');
      return null;
    }
  }, [projectId]);

  // Supprimer un drive
  const deleteDrive = useCallback(async (driveId: string): Promise<boolean> => {
    try {
      await DriveAPI.deleteDrive(driveId);

      // Retirer le drive de la liste locale
      setDrives(prev => prev.filter(drive => drive.id !== driveId));

      return true;
    } catch (err) {
      console.error('[useProjectDrives] Error deleting drive:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression du drive');
      return false;
    }
  }, []);

  // Actualisation manuelle
  const refresh = useCallback(async () => {
    await loadDrives();
  }, [loadDrives]);

  // Chargement initial
  useEffect(() => {
    if (projectId) {
      loadDrives();
    }
  }, [projectId, loadDrives]);

  // Auto-refresh optionnel
  useEffect(() => {
    if (!autoRefresh || !projectId) return;

    const interval = setInterval(() => {
      loadDrives();
    }, 60000); // Refresh toutes les minutes

    return () => clearInterval(interval);
  }, [autoRefresh, projectId, loadDrives]);

  // Calculs dérivés
  const totalDrives = drives.length;
  const totalStorageUsed = drives.reduce((total, drive) => total + (drive.storage_used_bytes || 0), 0);

  return {
    drives,
    loading,
    error,
    refresh,
    createDrive,
    deleteDrive,
    totalDrives,
    totalStorageUsed
  };
}