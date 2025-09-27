/**
 * Hook pour toutes les actions CRUD sur les fichiers et dossiers
 * Centralise toutes les mutations avec gestion d'erreur et loading states
 */

import { useState, useCallback } from 'react';
import { DriveAPI } from '../services/driveAPI';
import type {
  DriveNode,
  DriveShare,
  CreateFolderData,
  UpdateNodeData,
  UploadFileData,
  ShareNodeData,
  DriveSearchResult,
  DriveFilters
} from '../types';

interface UseDriveActionsOptions {
  onSuccess?: (action: string, data?: any) => void;
  onError?: (action: string, error: string) => void;
}

interface UseDriveActionsReturn {
  // État des actions
  loading: boolean;
  error: string | null;
  lastAction: string | null;

  // Actions sur les dossiers
  createFolder: (folderData: CreateFolderData) => Promise<DriveNode | null>;
  updateNode: (nodeId: string, updateData: UpdateNodeData) => Promise<DriveNode | null>;
  moveNode: (nodeId: string, newParentId: string | null) => Promise<DriveNode | null>;
  deleteNode: (nodeId: string) => Promise<boolean>;

  // Actions sur les fichiers
  uploadFile: (fileData: UploadFileData) => Promise<{ node: DriveNode; upload: any } | null>;
  downloadFile: (nodeId: string) => Promise<{ url: string; filename: string } | null>;

  // Partage
  shareNode: (shareData: ShareNodeData) => Promise<DriveShare | null>;

  // Recherche
  searchFiles: (driveId: string, query: string, filters?: DriveFilters) => Promise<DriveSearchResult[]>;

  // Utilitaires
  clearError: () => void;
  toggleStar: (nodeId: string, isStarred: boolean) => Promise<DriveNode | null>;
}

export function useDriveActions({
  onSuccess,
  onError
}: UseDriveActionsOptions = {}): UseDriveActionsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Gestionnaire d'action générique
  const executeAction = useCallback(async <T>(
    actionName: string,
    actionFn: () => Promise<T>,
    defaultReturn: T | null = null
  ): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      setLastAction(actionName);

      const result = await actionFn();

      onSuccess?.(actionName, result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Erreur lors de l'action: ${actionName}`;
      setError(errorMessage);
      onError?.(actionName, errorMessage);
      return defaultReturn;
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onError]);

  // Créer un dossier
  const createFolder = useCallback(async (folderData: CreateFolderData): Promise<DriveNode | null> => {
    return executeAction('createFolder', () => DriveAPI.createFolder(folderData));
  }, [executeAction]);

  // Mettre à jour un nœud
  const updateNode = useCallback(async (nodeId: string, updateData: UpdateNodeData): Promise<DriveNode | null> => {
    return executeAction('updateNode', () => DriveAPI.updateNode(nodeId, updateData));
  }, [executeAction]);

  // Déplacer un nœud
  const moveNode = useCallback(async (nodeId: string, newParentId: string | null): Promise<DriveNode | null> => {
    return executeAction('moveNode', () => DriveAPI.moveNode(nodeId, newParentId));
  }, [executeAction]);

  // Supprimer un nœud
  const deleteNode = useCallback(async (nodeId: string): Promise<boolean> => {
    const result = await executeAction('deleteNode', async () => {
      await DriveAPI.deleteNode(nodeId);
      return true;
    }, false);
    return result ?? false;
  }, [executeAction]);

  // Upload d'un fichier
  const uploadFile = useCallback(async (fileData: UploadFileData): Promise<{ node: DriveNode; upload: any } | null> => {
    return executeAction('uploadFile', async () => {
      const result = await DriveAPI.uploadFile(fileData);
      if (!result.node) throw new Error('Échec de la création du nœud fichier');
      return { node: result.node, upload: result.upload };
    });
  }, [executeAction]);

  // Téléchargement d'un fichier
  const downloadFile = useCallback(async (nodeId: string): Promise<{ url: string; filename: string } | null> => {
    return executeAction('downloadFile', () => DriveAPI.downloadFile(nodeId));
  }, [executeAction]);

  // Partage d'un nœud
  const shareNode = useCallback(async (shareData: ShareNodeData): Promise<DriveShare | null> => {
    return executeAction('shareNode', () => DriveAPI.shareNode(shareData));
  }, [executeAction]);

  // Recherche de fichiers
  const searchFiles = useCallback(async (
    driveId: string,
    query: string,
    filters?: DriveFilters
  ): Promise<DriveSearchResult[]> => {
    const result = await executeAction('searchFiles', () => DriveAPI.searchFiles(driveId, query, filters), []);
    return result ?? [];
  }, [executeAction]);

  // Toggle étoile
  const toggleStar = useCallback(async (nodeId: string, isStarred: boolean): Promise<DriveNode | null> => {
    return executeAction('toggleStar', () => DriveAPI.updateNode(nodeId, { is_starred: isStarred }));
  }, [executeAction]);

  // Effacer l'erreur
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    lastAction,
    createFolder,
    updateNode,
    moveNode,
    deleteNode,
    uploadFile,
    downloadFile,
    shareNode,
    searchFiles,
    toggleStar,
    clearError
  };
}