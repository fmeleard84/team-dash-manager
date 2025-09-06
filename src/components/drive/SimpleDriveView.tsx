import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FolderPlus,
  Folder,
  File,
  FileText,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  FileCode,
  Download,
  Trash2,
  Search,
  HardDrive,
  MessageSquare,
  Trello,
  Loader2,
  Edit3,
  ChevronRight,
  Home,
} from 'lucide-react';

interface SimpleDriveViewProps {
  projectId: string;
  userType: 'client' | 'candidate';
}

interface FileEntry {
  name: string;
  id?: string;
  created_at?: string;
  updated_at?: string;
  last_accessed_at?: string;
  metadata?: any;
  size?: number;
  isVirtual?: boolean;
  itemCount?: number;
  mimeType?: string;
  thumbnailUrl?: string;
  fullPath?: string;
}

export default function SimpleDriveView({ projectId, userType }: SimpleDriveViewProps) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showRenameFolderDialog, setShowRenameFolderDialog] = useState(false);
  const [folderToRename, setFolderToRename] = useState('');
  const [renameFolderName, setRenameFolderName] = useState('');
  const [draggedItem, setDraggedItem] = useState<FileEntry | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const basePrefix = `projects/${projectId}/`;

  useEffect(() => {
    if (projectId) {
      loadEntries(basePrefix);
    }
  }, [projectId]);

  const loadEntries = async (prefix: string) => {
    if (!projectId) return;
    
    setLoading(true);
    setCurrentPath(prefix);
    
    try {
      // Dossiers par défaut si on est à la racine
      if (prefix === basePrefix) {
        const virtualFolders: FileEntry[] = [
          { name: 'Documents', isVirtual: true, created_at: new Date().toISOString() },
          { name: 'Images', isVirtual: true, created_at: new Date().toISOString() },
          { name: 'Livrables', isVirtual: true, created_at: new Date().toISOString() },
          { name: 'Messagerie', isVirtual: true, created_at: new Date().toISOString() },
          { name: 'Kanban', isVirtual: true, created_at: new Date().toISOString() },
        ];
        
        // Charger le nombre d'éléments dans chaque dossier virtuel
        for (const folder of virtualFolders) {
          const folderPath = `${prefix}${folder.name}/`;
          const { data: folderContent } = await supabase.storage
            .from('project-files')
            .list(folderPath, { limit: 1000 });
          
          folder.itemCount = folderContent?.length || 0;
        }
        
        // Charger aussi les vrais fichiers/dossiers à la racine
        const { data, error } = await supabase.storage
          .from('project-files')
          .list(prefix, { limit: 100, offset: 0 });
        
        if (!error && data) {
          const realEntries = await Promise.all(data.map(async (item) => {
            // Si c'est un dossier, compter les éléments
            let itemCount = 0;
            let mimeType = '';
            
            if (!item.name.includes('.')) {
              const { data: subItems } = await supabase.storage
                .from('project-files')
                .list(`${prefix}${item.name}/`, { limit: 1000 });
              itemCount = subItems?.length || 0;
            } else {
              // Déterminer le type MIME pour les fichiers
              const ext = item.name.split('.').pop()?.toLowerCase();
              mimeType = getMimeType(ext || '');
            }
            
            // Générer l'URL de la vignette pour les images
            let thumbnailUrl = '';
            if (mimeType.startsWith('image/')) {
              const { data } = supabase.storage.from('project-files').getPublicUrl(`${prefix}${item.name}`);
              thumbnailUrl = data?.publicUrl || '';
            }
            
            return {
              name: item.name,
              id: item.id,
              created_at: item.created_at,
              updated_at: item.updated_at,
              last_accessed_at: item.last_accessed_at,
              metadata: item.metadata,
              itemCount,
              mimeType,
              size: (item.metadata as any)?.size,
              thumbnailUrl
            };
          }));
          
          setEntries([...virtualFolders, ...realEntries]);
        } else {
          setEntries(virtualFolders);
        }
      } else if (prefix.includes('/Messagerie/') || prefix === `${basePrefix}Messagerie/`) {
        // Charger les fichiers depuis le bucket message-files
        const { data, error } = await supabase.storage
          .from('message-files')
          .list(`projects/${projectId}/`, { limit: 100, offset: 0 });
        
        const entries = data?.map(item => ({
          name: item.name,
          id: item.id,
          created_at: item.created_at,
          updated_at: item.updated_at,
          metadata: item.metadata,
          size: (item.metadata as any)?.size,
          mimeType: getMimeType(item.name.split('.').pop()?.toLowerCase() || '')
        })) || [];
        
        setEntries(entries);
      } else if (prefix.includes('/Kanban/') || prefix === `${basePrefix}Kanban/`) {
        // Charger les fichiers depuis le bucket kanban-files
        const { data, error } = await supabase.storage
          .from('kanban-files')
          .list(`cards/`, { limit: 100, offset: 0 });
        
        const entries = data?.map(item => ({
          name: item.name,
          id: item.id,
          created_at: item.created_at,
          updated_at: item.updated_at,
          metadata: item.metadata,
          size: (item.metadata as any)?.size,
          mimeType: getMimeType(item.name.split('.').pop()?.toLowerCase() || '')
        })) || [];
        
        setEntries(entries);
      } else {
        // Charger le contenu d'un sous-dossier normal
        const { data, error } = await supabase.storage
          .from('project-files')
          .list(prefix, { limit: 100, offset: 0 });
        
        if (!error && data) {
          const entries = await Promise.all(data.map(async (item) => {
            let itemCount = 0;
            let mimeType = '';
            
            if (!item.name.includes('.')) {
              const { data: subItems } = await supabase.storage
                .from('project-files')
                .list(`${prefix}${item.name}/`, { limit: 1000 });
              itemCount = subItems?.length || 0;
            } else {
              const ext = item.name.split('.').pop()?.toLowerCase();
              mimeType = getMimeType(ext || '');
            }
            
            return {
              name: item.name,
              id: item.id,
              created_at: item.created_at,
              updated_at: item.updated_at,
              metadata: item.metadata,
              itemCount,
              mimeType,
              size: (item.metadata as any)?.size,
              fullPath: `${prefix}${item.name}`
            };
          }));
          
          setEntries(entries);
        } else {
          setEntries([]);
        }
      }
    } catch (error) {
      console.error('Error loading entries:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors du chargement',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getMimeType = (extension: string): string => {
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'txt': 'text/plain',
      'mp4': 'video/mp4',
      'mp3': 'audio/mpeg',
      'zip': 'application/zip',
      'js': 'application/javascript',
      'json': 'application/json',
      'html': 'text/html',
      'css': 'text/css',
    };
    return mimeTypes[extension] || 'application/octet-stream';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const totalFiles = files.length;
    const totalSize = Array.from(files).reduce((acc, file) => acc + file.size, 0);
    let uploadedSize = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `${currentPath}${fileName}`;

        // Déterminer le bon bucket selon le dossier actuel
        let bucket = 'project-files';
        let uploadPath = filePath;
        
        if (currentPath.includes('/Messagerie/')) {
          bucket = 'message-files';
          uploadPath = `projects/${projectId}/${fileName}`;
        } else if (currentPath.includes('/Kanban/')) {
          bucket = 'kanban-files';
          uploadPath = `cards/${fileName}`;
        }

        // Simuler la progression pour ce fichier
        const chunkSize = file.size / 10;
        for (let j = 0; j < 10; j++) {
          uploadedSize += chunkSize;
          setUploadProgress(Math.min((uploadedSize / totalSize) * 100, 95));
          await new Promise(resolve => setTimeout(resolve, 50)); // Petit délai pour afficher la progression
        }

        const { error } = await supabase.storage
          .from(bucket)
          .upload(uploadPath, file);

        if (error) throw error;

        // Finaliser la progression pour ce fichier
        uploadedSize = (i + 1) * (totalSize / totalFiles);
        setUploadProgress((uploadedSize / totalSize) * 100);

        if (i === files.length - 1) {
          toast({
            title: 'Succès',
            description: `${files.length} fichier(s) uploadé(s) avec succès`,
          });
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: 'Erreur',
          description: `Erreur lors de l'upload de ${file.name}`,
          variant: 'destructive',
        });
      }
    }
    
    setIsUploading(false);
    setUploadProgress(0);
    
    // Recharger la liste
    loadEntries(currentPath);
  };

  const handleDownload = async (fileName: string, entry?: FileEntry) => {
    try {
      // Déterminer le bon bucket et chemin
      let bucket = 'project-files';
      let downloadPath = `${currentPath}${fileName}`;
      
      if (currentPath.includes('/Messagerie/')) {
        bucket = 'message-files';
        downloadPath = `projects/${projectId}/${fileName}`;
      } else if (currentPath.includes('/Kanban/')) {
        bucket = 'kanban-files';
        downloadPath = `cards/${fileName}`;
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .download(downloadPath);

      if (error) throw error;

      // Créer un blob avec le bon type MIME pour forcer le téléchargement
      const blob = new Blob([data], { type: entry?.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le fichier',
        variant: 'destructive',
      });
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      // Créer un fichier placeholder pour créer le dossier
      const folderPath = `${currentPath}${newFolderName}/.keep`;
      
      const { error } = await supabase.storage
        .from('project-files')
        .upload(folderPath, new Blob(['']));

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `Dossier "${newFolderName}" créé avec succès`,
      });

      setShowNewFolderDialog(false);
      setNewFolderName('');
      loadEntries(currentPath);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le dossier',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (fileName: string) => {
    try {
      const { error } = await supabase.storage
        .from('project-files')
        .remove([`${currentPath}${fileName}`]);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Fichier supprimé',
      });
      
      loadEntries(currentPath);
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le fichier',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteFolder = async (folderName: string) => {
    try {
      // Lister tous les fichiers dans le dossier
      const { data: files, error: listError } = await supabase.storage
        .from('project-files')
        .list(`${currentPath}${folderName}`);

      if (listError) throw listError;

      // Supprimer tous les fichiers du dossier
      if (files && files.length > 0) {
        const filePaths = files.map(file => `${currentPath}${folderName}/${file.name}`);
        const { error: deleteError } = await supabase.storage
          .from('project-files')
          .remove(filePaths);

        if (deleteError) throw deleteError;
      }

      // Supprimer le fichier .keep du dossier
      await supabase.storage
        .from('project-files')
        .remove([`${currentPath}${folderName}/.keep`]);

      toast({
        title: 'Succès',
        description: `Dossier "${folderName}" supprimé`,
      });
      
      loadEntries(currentPath);
    } catch (error) {
      console.error('Delete folder error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le dossier',
        variant: 'destructive',
      });
    }
  };

  const handleMoveFile = async (sourcePath: string, targetFolder: string) => {
    try {
      const fileName = sourcePath.split('/').pop();
      if (!fileName) return;

      // Ne pas déplacer si c'est le même dossier
      const sourceFolder = sourcePath.substring(0, sourcePath.lastIndexOf('/') + 1);
      const targetPath = `${currentPath}${targetFolder}/`;
      
      if (sourceFolder === targetPath) {
        return;
      }

      // Télécharger le fichier source
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('project-files')
        .download(sourcePath);
      
      if (downloadError) throw downloadError;
      
      // Construire le nouveau chemin
      const newPath = `${targetPath}${fileName}`;
      
      // Vérifier si le fichier existe déjà dans le dossier cible
      const { data: existingFile } = await supabase.storage
        .from('project-files')
        .list(targetPath, {
          search: fileName,
          limit: 1
        });
      
      if (existingFile && existingFile.length > 0) {
        // Ajouter un timestamp au nom si le fichier existe déjà
        const nameParts = fileName.split('.');
        const extension = nameParts.pop();
        const baseName = nameParts.join('.');
        const newFileName = `${baseName}_${Date.now()}.${extension}`;
        const alternativePath = `${targetPath}${newFileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(alternativePath, fileData);
        
        if (uploadError) throw uploadError;
      } else {
        // Uploader dans le nouveau chemin
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(newPath, fileData);
        
        if (uploadError) throw uploadError;
      }
      
      // Supprimer l'ancien fichier
      const { error: removeError } = await supabase.storage
        .from('project-files')
        .remove([sourcePath]);
      
      if (removeError) throw removeError;
      
      toast({
        title: 'Succès',
        description: `Fichier "${fileName}" déplacé dans "${targetFolder}"`,
      });
      
      // Recharger les entrées
      loadEntries(currentPath);
    } catch (error) {
      console.error('Move file error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de déplacer le fichier',
        variant: 'destructive',
      });
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetFolder?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    setIsDraggingOver(false);
    dragCounter.current = 0;

    // Cas 1: Drag & drop depuis le système de fichiers externe
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setIsUploading(true);
      setUploadProgress(0);
      
      const totalSize = files.reduce((acc, file) => acc + file.size, 0);
      let uploadedSize = 0;

      for (const file of files) {
        try {
          const fileName = `${Date.now()}-${file.name}`;
          const uploadPath = targetFolder 
            ? `${currentPath}${targetFolder}/${fileName}`
            : `${currentPath}${fileName}`;

          // Simuler la progression
          const chunkSize = file.size / 10;
          for (let j = 0; j < 10; j++) {
            uploadedSize += chunkSize;
            setUploadProgress(Math.min((uploadedSize / totalSize) * 100, 95));
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          const { error } = await supabase.storage
            .from('project-files')
            .upload(uploadPath, file);

          if (error) throw error;

          uploadedSize = files.indexOf(file) + 1 * (totalSize / files.length);
          setUploadProgress((uploadedSize / totalSize) * 100);
        } catch (error) {
          console.error('Upload error:', error);
          toast({
            title: 'Erreur',
            description: `Erreur lors de l'upload de ${file.name}`,
            variant: 'destructive',
          });
        }
      }

      setIsUploading(false);
      setUploadProgress(0);
      loadEntries(currentPath);
      
      toast({
        title: 'Succès',
        description: `${files.length} fichier(s) uploadé(s)`,
      });
    } 
    // Cas 2: Drag & drop interne (déplacement de fichier)
    else if (draggedItem && targetFolder) {
      if (draggedItem.fullPath) {
        await handleMoveFile(draggedItem.fullPath, targetFolder);
      } else if (draggedItem.name) {
        // Si fullPath n'est pas défini, le construire
        const sourcePath = `${currentPath}${draggedItem.name}`;
        await handleMoveFile(sourcePath, targetFolder);
      }
      setDraggedItem(null);
    } else if (draggedItem && !targetFolder) {
      // Cas où on drop sur la zone principale (pas sur un dossier)
      setDraggedItem(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: FileEntry) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.name);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, folderName?: string) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    
    if (folderName) {
      setDragOver(folderName);
    } else {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>, folderName?: string) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    
    if (dragCounter.current === 0) {
      if (folderName) {
        setDragOver(null);
      } else {
        setIsDraggingOver(false);
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOver(null);
    setIsDraggingOver(false);
    dragCounter.current = 0;
  };

  const handleRenameFolder = async () => {
    if (!renameFolderName.trim()) return;

    try {
      // Lister tous les fichiers dans le dossier
      const { data: files, error: listError } = await supabase.storage
        .from('project-files')
        .list(`${currentPath}${folderToRename}`);

      if (listError) throw listError;

      // Copier tous les fichiers vers le nouveau dossier
      if (files && files.length > 0) {
        for (const file of files) {
          const oldPath = `${currentPath}${folderToRename}/${file.name}`;
          const newPath = `${currentPath}${renameFolderName}/${file.name}`;
          
          // Télécharger le fichier
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('project-files')
            .download(oldPath);
          
          if (downloadError) throw downloadError;
          
          // Uploader dans le nouveau chemin
          const { error: uploadError } = await supabase.storage
            .from('project-files')
            .upload(newPath, fileData);
          
          if (uploadError) throw uploadError;
        }
      }

      // Créer le fichier .keep dans le nouveau dossier
      await supabase.storage
        .from('project-files')
        .upload(`${currentPath}${renameFolderName}/.keep`, new Blob(['']));

      // Supprimer l'ancien dossier
      if (files && files.length > 0) {
        const oldPaths = files.map(file => `${currentPath}${folderToRename}/${file.name}`);
        await supabase.storage
          .from('project-files')
          .remove(oldPaths);
      }
      
      // Supprimer le .keep de l'ancien dossier
      await supabase.storage
        .from('project-files')
        .remove([`${currentPath}${folderToRename}/.keep`]);

      toast({
        title: 'Succès',
        description: `Dossier renommé en "${renameFolderName}"`,
      });

      setShowRenameFolderDialog(false);
      setFolderToRename('');
      setRenameFolderName('');
      loadEntries(currentPath);
    } catch (error) {
      console.error('Rename folder error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de renommer le dossier',
        variant: 'destructive',
      });
    }
  };

  const filteredEntries = entries.filter(entry =>
    entry.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
    entry.name !== '.keep' // Cacher les fichiers .keep
  );

  const isFolder = (name: string) => !name.includes('.');

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBreadcrumbItems = () => {
    if (!currentPath || currentPath === basePrefix) return [];
    
    const pathParts = currentPath.replace(basePrefix, '').split('/').filter(p => p);
    const items = [];
    
    for (let i = 0; i < pathParts.length; i++) {
      const path = basePrefix + pathParts.slice(0, i + 1).join('/') + '/';
      items.push({
        name: pathParts[i],
        path: path
      });
    }
    
    return items;
  };

  const getFileIcon = (entry: FileEntry) => {
    if (isFolder(entry.name)) {
      if (entry.name === 'Messagerie') return <MessageSquare className="h-5 w-5 text-purple-500" />;
      if (entry.name === 'Kanban') return <Trello className="h-5 w-5 text-blue-500" />;
      return <Folder className="h-5 w-5 text-yellow-500" />;
    }
    
    if (entry.mimeType?.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-green-500" />;
    if (entry.mimeType?.startsWith('video/')) return <FileVideo className="h-5 w-5 text-red-500" />;
    if (entry.mimeType?.startsWith('audio/')) return <FileAudio className="h-5 w-5 text-purple-500" />;
    if (entry.mimeType?.includes('pdf')) return <FileText className="h-5 w-5 text-red-600" />;
    if (entry.mimeType?.includes('javascript') || entry.mimeType?.includes('json')) return <FileCode className="h-5 w-5 text-blue-600" />;
    
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const getThumbnail = async (entry: FileEntry) => {
    if (!entry.mimeType?.startsWith('image/')) return null;
    
    let bucket = 'project-files';
    let path = `${currentPath}${entry.name}`;
    
    if (currentPath.includes('/Messagerie/')) {
      bucket = 'message-files';
      path = `projects/${projectId}/${entry.name}`;
    } else if (currentPath.includes('/Kanban/')) {
      bucket = 'kanban-files';
      path = `cards/${entry.name}`;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl;
  };

  return (
    <>
      <Card 
        className={`h-full relative transition-all duration-200 ${
          isDraggingOver && !dragOver 
            ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/20' 
            : ''
        }`}
        onDrop={(e) => handleDrop(e)}
        onDragOver={handleDragOver}
        onDragEnter={(e) => handleDragEnter(e)}
        onDragLeave={(e) => handleDragLeave(e)}
      >
        {/* Indicateur global de drop zone */}
        {isDraggingOver && !dragOver && (
          <div className="absolute inset-4 rounded-lg border-2 border-blue-500 border-dashed bg-blue-500/10 pointer-events-none flex items-center justify-center z-10">
            <div className="bg-blue-500 text-white px-6 py-3 rounded-full text-lg font-medium animate-pulse">
              Déposer les fichiers ici
            </div>
          </div>
        )}
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Drive du Projet
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNewFolderDialog(true)}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Nouveau dossier
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Uploader
              </Button>
              <input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Fil d'Ariane */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="px-2 py-1 h-auto"
            onClick={() => loadEntries(basePrefix)}
          >
            <Home className="h-3 w-3" />
          </Button>
          {getBreadcrumbItems().map((item, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="h-3 w-3" />
              <Button
                variant="ghost"
                size="sm"
                className="px-2 py-1 h-auto"
                onClick={() => loadEntries(item.path)}
              >
                {item.name}
              </Button>
            </React.Fragment>
          ))}
        </div>
        
        {isUploading && (
          <div className="mt-2">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-sm text-muted-foreground mt-1">Upload en cours... {Math.round(uploadProgress)}%</p>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Aucun fichier trouvé</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEntries.map((entry, index) => (
              <div
                key={entry.id || index}
                className={`relative flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-all duration-200 ${
                  isFolder(entry.name) ? 'cursor-pointer' : 'cursor-move'
                } ${
                  dragOver === entry.name && isFolder(entry.name) 
                    ? 'bg-blue-100 dark:bg-blue-950 ring-2 ring-blue-500 scale-[1.02] shadow-lg' 
                    : ''
                } ${
                  draggedItem?.name === entry.name 
                    ? 'opacity-30 scale-95' 
                    : ''
                }`}
                onClick={() => {
                  if (isFolder(entry.name)) {
                    loadEntries(`${currentPath}${entry.name}/`);
                  }
                }}
                draggable={!isFolder(entry.name)}
                onDragStart={(e) => !isFolder(entry.name) && handleDragStart(e, entry)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => {
                  if (isFolder(entry.name)) {
                    handleDrop(e, entry.name);
                  }
                }}
                onDragOver={(e) => {
                  if (isFolder(entry.name)) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                  }
                }}
                onDragEnter={(e) => {
                  if (isFolder(entry.name)) {
                    handleDragEnter(e, entry.name);
                  }
                }}
                onDragLeave={(e) => {
                  if (isFolder(entry.name)) {
                    handleDragLeave(e, entry.name);
                  }
                }}
              >
                {/* Indicateur visuel de drop zone pour les dossiers */}
                {dragOver === entry.name && isFolder(entry.name) && (
                  <div className="absolute inset-0 rounded-lg border-2 border-blue-500 border-dashed bg-blue-500/10 pointer-events-none flex items-center justify-center">
                    <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                      Déposer ici
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 flex-1" title={
                  isFolder(entry.name) 
                    ? "Cliquer pour ouvrir le dossier | Déposer des fichiers ici" 
                    : "Glisser pour déplacer ce fichier"
                }>
                  {/* Afficher la vignette pour les images, sinon l'icône */}
                  {entry.thumbnailUrl ? (
                    <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                      <img 
                        src={entry.thumbnailUrl} 
                        alt={entry.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Si l'image ne charge pas, afficher l'icône
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center">' +
                            '<svg class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>' +
                            '</svg></div>';
                        }}
                      />
                    </div>
                  ) : (
                    getFileIcon(entry)
                  )}
                  <div className="flex-1">
                    <span className="font-medium">{entry.name}</span>
                    <div className="text-xs text-muted-foreground flex items-center gap-4">
                      {isFolder(entry.name) ? (
                        <span>{entry.itemCount || 0} élément(s)</span>
                      ) : (
                        <>
                          <span>{formatFileSize(entry.size)}</span>
                          <span>{formatDate(entry.created_at)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!isFolder(entry.name) ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(entry.name, entry);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {userType === 'client' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(entry.name);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  ) : (
                    // Actions pour les dossiers (sauf dossiers virtuels)
                    userType === 'client' && !entry.isVirtual && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderToRename(entry.name);
                            setRenameFolderName(entry.name);
                            setShowRenameFolderDialog(true);
                          }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Êtes-vous sûr de vouloir supprimer le dossier "${entry.name}" et tout son contenu ?`)) {
                              handleDeleteFolder(entry.name);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    
    {/* Dialog de création de dossier */}
    <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un nouveau dossier</DialogTitle>
          <DialogDescription>
            Entrez le nom du nouveau dossier
          </DialogDescription>
        </DialogHeader>
        <Input
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="Nom du dossier"
          onKeyDown={(e) => e.key === 'Enter' && createFolder()}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
            Annuler
          </Button>
          <Button onClick={createFolder}>
            Créer
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Dialog de renommage de dossier */}
    <Dialog open={showRenameFolderDialog} onOpenChange={setShowRenameFolderDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renommer le dossier</DialogTitle>
          <DialogDescription>
            Entrez le nouveau nom pour le dossier "{folderToRename}"
          </DialogDescription>
        </DialogHeader>
        <Input
          value={renameFolderName}
          onChange={(e) => setRenameFolderName(e.target.value)}
          placeholder="Nouveau nom du dossier"
          onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder()}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => {
            setShowRenameFolderDialog(false);
            setFolderToRename('');
            setRenameFolderName('');
          }}>
            Annuler
          </Button>
          <Button onClick={handleRenameFolder}>
            Renommer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}