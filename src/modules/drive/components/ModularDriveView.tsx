/**
 * Composant Drive modernisé et modulaire
 * Interface complète de gestion des fichiers avec drag & drop, recherche et navigation
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FolderPlus, Search, Grid, List, Star, Share2, Download, Trash2, Edit3, ChevronRight, Home, Filter } from 'lucide-react';
import { useDrive, useProjectDrives, useDriveActions, useDriveSearch, useDriveStats } from '../hooks';
import type { DriveNode, DriveFilters } from '../types';

interface ModularDriveViewProps {
  projectId: string;
  initialDriveId?: string;
  className?: string;
  compact?: boolean;
}

type ViewMode = 'grid' | 'list';

export function ModularDriveView({
  projectId,
  initialDriveId,
  className = '',
  compact = false
}: ModularDriveViewProps) {
  const [selectedDriveId, setSelectedDriveId] = useState<string>(initialDriveId || '');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [draggedNode, setDraggedNode] = useState<DriveNode | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hooks du module DRIVE
  const { drives, loading: drivesLoading, createDrive } = useProjectDrives({ projectId });
  const {
    drive,
    nodes,
    loading: driveLoading,
    currentPath,
    parentId,
    navigateToFolder,
    refresh
  } = useDrive({
    driveId: selectedDriveId,
    autoRefresh: true
  });
  const {
    createFolder,
    uploadFile,
    downloadFile,
    deleteNode,
    moveNode,
    updateNode,
    shareNode,
    toggleStar,
    loading: actionLoading,
    error: actionError
  } = useDriveActions({
    onSuccess: (action) => {
      console.log(`✅ [ModularDriveView] ${action} completed successfully`);
      refresh();
    },
    onError: (action, error) => {
      console.error(`❌ [ModularDriveView] ${action} failed:`, error);
    }
  });
  const {
    query,
    results: searchResults,
    loading: searchLoading,
    setQuery,
    filters,
    setFilters,
    resetFilters,
    searchHistory
  } = useDriveSearch({ driveId: selectedDriveId });
  const {
    stats,
    activity,
    storageUsagePercent,
    popularFileTypes
  } = useDriveStats({
    driveId: selectedDriveId,
    includeActivity: true
  });

  // Sélection du drive principal par défaut
  React.useEffect(() => {
    if (!selectedDriveId && drives.length > 0) {
      setSelectedDriveId(drives[0].id);
    }
  }, [drives, selectedDriveId]);

  // Gestion du drag & drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const { dataTransfer } = e;
    const files = Array.from(dataTransfer.files);

    if (files.length > 0) {
      // Upload de fichiers système
      for (const file of files) {
        await uploadFile({
          file,
          parent_id: parentId,
          drive_id: selectedDriveId,
          generate_thumbnail: file.type.startsWith('image/')
        });
      }
    } else {
      // Déplacement de nœud interne
      const nodeId = dataTransfer.getData('text/drive-node-id');
      if (nodeId && nodeId !== parentId) {
        await moveNode(nodeId, parentId);
      }
    }

    setDraggedNode(null);
  }, [parentId, selectedDriveId, uploadFile, moveNode]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Création de dossier
  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;

    const folder = await createFolder({
      name: newFolderName,
      parent_id: parentId,
      drive_id: selectedDriveId
    });

    if (folder) {
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  }, [newFolderName, parentId, selectedDriveId, createFolder]);

  // Upload de fichiers
  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach(async (file) => {
      await uploadFile({
        file,
        parent_id: parentId,
        drive_id: selectedDriveId,
        generate_thumbnail: file.type.startsWith('image/')
      });
    });
  }, [parentId, selectedDriveId, uploadFile]);

  // Sélection multiple
  const handleNodeSelect = useCallback((nodeId: string, ctrlKey: boolean) => {
    if (ctrlKey) {
      setSelectedNodes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(nodeId)) {
          newSet.delete(nodeId);
        } else {
          newSet.add(nodeId);
        }
        return newSet;
      });
    } else {
      setSelectedNodes(new Set([nodeId]));
    }
  }, []);

  // Rendu des nœuds
  const displayNodes = query ? searchResults.map(r => r.node) : nodes;

  if (drivesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-4">
          {/* Sélecteur de Drive */}
          {!compact && (
            <select
              value={selectedDriveId}
              onChange={(e) => setSelectedDriveId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800"
            >
              <option value="">Sélectionner un drive</option>
              {drives.map((drive) => (
                <option key={drive.id} value={drive.id}>
                  {drive.name}
                </option>
              ))}
            </select>
          )}

          {/* Fil d'Ariane */}
          <nav className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400">
            <button
              onClick={() => navigateToFolder(null)}
              className="flex items-center gap-1 hover:text-primary-500 transition-colors"
            >
              <Home className="w-4 h-4" />
              {drive?.name || 'Drive'}
            </button>
            {currentPath.map((folder, index) => (
              <React.Fragment key={folder.id}>
                <ChevronRight className="w-4 h-4" />
                <button
                  onClick={() => navigateToFolder(folder.id)}
                  className="hover:text-primary-500 transition-colors"
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Statistiques rapides */}
          {stats && !compact && (
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mr-4">
              {stats.total_files} fichiers • {Math.round(stats.total_size_bytes / 1024 / 1024)}MB utilisés
            </div>
          )}

          {/* Actions */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            disabled={actionLoading}
          >
            <Upload className="w-4 h-4" />
            {!compact && 'Upload'}
          </button>

          <button
            onClick={() => setIsCreatingFolder(true)}
            className="flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            disabled={actionLoading}
          >
            <FolderPlus className="w-4 h-4" />
            {!compact && 'Dossier'}
          </button>

          {/* Basculer vue */}
          <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-600">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400' : 'text-neutral-500'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400' : 'text-neutral-500'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher des fichiers..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800"
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors ${
              showFilters
                ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
                : 'border-neutral-200 dark:border-neutral-600'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Historique de recherche */}
        {searchHistory.length > 0 && query.length === 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-xs text-neutral-500">Récent:</span>
            {searchHistory.slice(0, 3).map((historyItem, index) => (
              <button
                key={index}
                onClick={() => setQuery(historyItem)}
                className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-700 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600"
              >
                {historyItem}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zone principale avec drag & drop */}
      <div
        className="flex-1 p-4 min-h-64"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {driveLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : displayNodes.length === 0 ? (
          <div className="text-center py-12">
            {query ? (
              <div>
                <Search className="w-12 h-12 mx-auto text-neutral-400 mb-4" />
                <p className="text-neutral-500 dark:text-neutral-400">
                  Aucun résultat pour "{query}"
                </p>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 mx-auto text-neutral-400 mb-4" />
                <p className="text-neutral-500 dark:text-neutral-400 mb-2">
                  Ce dossier est vide
                </p>
                <p className="text-sm text-neutral-400">
                  Glissez-déposez des fichiers ici ou cliquez sur Upload
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4' : 'space-y-2'}>
            {displayNodes.map((node) => (
              <DriveNodeCard
                key={node.id}
                node={node}
                viewMode={viewMode}
                selected={selectedNodes.has(node.id)}
                onSelect={(ctrlKey) => handleNodeSelect(node.id, ctrlKey)}
                onNavigate={() => node.type === 'folder' ? navigateToFolder(node.id) : undefined}
                onDownload={() => downloadFile(node.id)}
                onDelete={() => deleteNode(node.id)}
                onStar={() => toggleStar(node.id, !node.is_starred)}
                onDragStart={() => setDraggedNode(node)}
                onDragEnd={() => setDraggedNode(null)}
                isDragging={draggedNode?.id === node.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal création dossier */}
      {isCreatingFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl w-96">
            <h3 className="text-lg font-semibold mb-4">Créer un dossier</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nom du dossier"
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCreatingFolder(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || actionLoading}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input fichier caché */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
      />

      {/* Erreur */}
      {actionError && (
        <div className="absolute bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg">
          {actionError}
        </div>
      )}
    </div>
  );
}

// Composant pour chaque nœud (fichier/dossier)
interface DriveNodeCardProps {
  node: DriveNode;
  viewMode: ViewMode;
  selected: boolean;
  onSelect: (ctrlKey: boolean) => void;
  onNavigate?: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onStar: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function DriveNodeCard({
  node,
  viewMode,
  selected,
  onSelect,
  onNavigate,
  onDownload,
  onDelete,
  onStar,
  onDragStart,
  onDragEnd,
  isDragging
}: DriveNodeCardProps) {
  const isFolder = node.type === 'folder';
  const fileSize = node.size_bytes ? formatFileSize(node.size_bytes) : '';

  const handleClick = (e: React.MouseEvent) => {
    onSelect(e.ctrlKey || e.metaKey);
    if (isFolder && !e.ctrlKey && !e.metaKey) {
      onNavigate?.();
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
          selected ? 'bg-primary-50 dark:bg-primary-900' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
        } ${isDragging ? 'opacity-50' : ''}`}
        onClick={handleClick}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
          {isFolder ? '📁' : getFileIcon(node.file_extension || '')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{node.name}</div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            {fileSize} • {new Date(node.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {node.is_starred && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
          {node.is_shared && <Share2 className="w-4 h-4 text-blue-500" />}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
        selected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900'
          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
      } ${isDragging ? 'opacity-50 scale-95' : ''}`}
      onClick={handleClick}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="text-center">
        <div className="w-12 h-12 mx-auto rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-2xl mb-2">
          {isFolder ? '📁' : getFileIcon(node.file_extension || '')}
        </div>
        <div className="font-medium text-sm truncate mb-1">{node.name}</div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          {fileSize || 'Dossier'}
        </div>
        <div className="flex items-center justify-center gap-1 mt-2">
          {node.is_starred && <Star className="w-3 h-3 text-yellow-500 fill-current" />}
          {node.is_shared && <Share2 className="w-3 h-3 text-blue-500" />}
        </div>
      </div>
    </div>
  );
}

// Utilitaires
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${Math.round(size * 10) / 10} ${units[unitIndex]}`;
}

function getFileIcon(extension: string): string {
  const iconMap: Record<string, string> = {
    pdf: '📄',
    doc: '📝', docx: '📝',
    xls: '📊', xlsx: '📊',
    ppt: '📺', pptx: '📺',
    txt: '📃',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
    mp4: '🎥', avi: '🎥', mov: '🎥',
    mp3: '🎵', wav: '🎵',
    zip: '🗜️', rar: '🗜️',
    html: '🌐', css: '🎨', js: '⚡', ts: '⚡',
  };

  return iconMap[extension.toLowerCase()] || '📄';
}