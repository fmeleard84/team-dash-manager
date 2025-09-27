/**
 * Hook principal pour la gestion des drives
 * Fournit l'état et les actions pour un drive complet
 */

import { useState, useEffect, useCallback } from 'react';
import { DriveAPI } from '../services/driveAPI';
import type { Drive, DriveNode } from '../types';

interface UseDriveOptions {
  driveId: string;
  parentId?: string | null;
  autoRefresh?: boolean;
}

interface UseDriveReturn {
  // État
  drive: Drive | null;
  nodes: DriveNode[];
  loading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  navigateToFolder: (folderId: string | null) => void;

  // Navigation
  currentPath: DriveNode[];
  parentId: string | null;
}

export function useDrive({
  driveId,
  parentId = null,
  autoRefresh = true
}: UseDriveOptions): UseDriveReturn {
  const [drive, setDrive] = useState<Drive | null>(null);
  const [nodes, setNodes] = useState<DriveNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentParentId, setCurrentParentId] = useState<string | null>(parentId);
  const [currentPath, setCurrentPath] = useState<DriveNode[]>([]);

  // Fonction pour charger le drive et ses nœuds
  const loadDrive = useCallback(async (targetParentId: string | null = currentParentId) => {
    try {
      setLoading(true);
      setError(null);

      const { drive: driveData, nodes: nodesData } = await DriveAPI.getDriveById(driveId, targetParentId);

      setDrive(driveData);
      setNodes(nodesData);

      // Construire le chemin de navigation
      if (targetParentId) {
        const pathData = await buildNavigationPath(driveId, targetParentId);
        setCurrentPath(pathData);
      } else {
        setCurrentPath([]);
      }

    } catch (err) {
      console.error('[useDrive] Error loading drive:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement du drive');
    } finally {
      setLoading(false);
    }
  }, [driveId, currentParentId]);

  // Navigation vers un dossier
  const navigateToFolder = useCallback((folderId: string | null) => {
    setCurrentParentId(folderId);
  }, []);

  // Actualisation manuelle
  const refresh = useCallback(async () => {
    await loadDrive(currentParentId);
  }, [loadDrive, currentParentId]);

  // Chargement initial et réactif
  useEffect(() => {
    if (driveId) {
      loadDrive(currentParentId);
    }
  }, [driveId, currentParentId, loadDrive]);

  // Auto-refresh optionnel
  useEffect(() => {
    if (!autoRefresh || !driveId) return;

    const interval = setInterval(() => {
      loadDrive(currentParentId);
    }, 30000); // Refresh toutes les 30 secondes

    return () => clearInterval(interval);
  }, [autoRefresh, driveId, currentParentId, loadDrive]);

  return {
    drive,
    nodes,
    loading,
    error,
    refresh,
    navigateToFolder,
    currentPath,
    parentId: currentParentId
  };
}

/**
 * Construit le chemin de navigation complet pour un dossier
 */
async function buildNavigationPath(driveId: string, folderId: string): Promise<DriveNode[]> {
  const path: DriveNode[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    try {
      const { nodes } = await DriveAPI.getDriveById(driveId, null);
      const folder = nodes.find(node => node.id === currentId && node.type === 'folder');

      if (folder) {
        path.unshift(folder);
        currentId = folder.parent_id;
      } else {
        break;
      }
    } catch (error) {
      console.warn('[useDrive] Error building path:', error);
      break;
    }
  }

  return path;
}