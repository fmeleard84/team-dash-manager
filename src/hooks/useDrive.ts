import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DriveNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parent_id: string | null;
  folder_id?: string | null;
  drive_id: string;
  size_bytes?: number;
  mime_type?: string;
  storage_path?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  metadata?: any;
  tags?: string[];
  icon?: string;
  color?: string;
  children?: DriveNode[];
}

export interface Drive {
  id: string;
  name: string;
  type: 'project' | 'personal' | 'shared';
  project_id?: string;
  owner_id?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface DriveMember {
  id: string;
  drive_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
}

export function useDrive(projectId?: string, userId?: string) {
  const { toast } = useToast();
  const [drives, setDrives] = useState<Drive[]>([]);
  const [selectedDrive, setSelectedDrive] = useState<string>('');
  const [driveContent, setDriveContent] = useState<DriveNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<DriveMember['permissions'] | null>(null);

  // Load available drives
  const loadDrives = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      // Try to get drives where user is a member
      const { data: memberDrives, error: memberError } = await supabase
        .from('drive_members')
        .select('drive_id, role, permissions')
        .eq('user_id', userId);

      if (memberError) {
        // If table doesn't exist yet, just return empty
        if (memberError.code === '42P01' || memberError.code === '42P17') {
          console.log('Drive tables not ready yet, skipping...');
          setDrives([]);
          setLoading(false);
          return;
        }
        throw memberError;
      }

      if (!memberDrives || memberDrives.length === 0) {
        setDrives([]);
        return;
      }

      const driveIds = memberDrives.map(m => m.drive_id);

      // Get drive details
      const { data: drivesData, error: drivesError } = await supabase
        .from('drives')
        .select('*')
        .in('id', driveIds)
        .order('created_at', { ascending: false });

      if (drivesError) throw drivesError;

      setDrives(drivesData || []);

      // Auto-select project drive if projectId is provided
      if (projectId && drivesData) {
        const projectDrive = drivesData.find(d => d.project_id === projectId);
        if (projectDrive) {
          setSelectedDrive(projectDrive.id);
          const member = memberDrives.find(m => m.drive_id === projectDrive.id);
          if (member) {
            setPermissions(member.permissions);
          }
        }
      } else if (drivesData && drivesData.length > 0 && !selectedDrive) {
        setSelectedDrive(drivesData[0].id);
        const member = memberDrives.find(m => m.drive_id === drivesData[0].id);
        if (member) {
          setPermissions(member.permissions);
        }
      }
    } catch (error) {
      console.error('Error loading drives:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les drives',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userId, projectId, toast]);

  // Load drive content
  const loadDriveContent = useCallback(async (driveId: string) => {
    if (!driveId) return;
    
    setLoading(true);
    try {
      // Load folders
      const { data: folders, error: foldersError } = await supabase
        .from('folders')
        .select('*')
        .eq('drive_id', driveId)
        .order('name');

      if (foldersError) throw foldersError;

      // Load files
      const { data: files, error: filesError } = await supabase
        .from('files')
        .select('*')
        .eq('drive_id', driveId)
        .order('name');

      if (filesError) throw filesError;

      // Build tree structure
      const tree = buildTreeStructure(folders || [], files || []);
      setDriveContent(tree);
    } catch (error) {
      console.error('Error loading drive content:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger le contenu du drive',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Build tree structure from flat lists
  const buildTreeStructure = (folders: any[], files: any[]): DriveNode[] => {
    const nodeMap = new Map<string, DriveNode>();
    const rootNodes: DriveNode[] = [];

    // Add all folders to map
    folders.forEach(folder => {
      nodeMap.set(folder.id, {
        ...folder,
        type: 'folder' as const,
        children: [],
      });
    });

    // Build folder hierarchy
    folders.forEach(folder => {
      const node = nodeMap.get(folder.id)!;
      if (folder.parent_id) {
        const parent = nodeMap.get(folder.parent_id);
        if (parent && parent.children) {
          parent.children.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    // Add files to their folders or root
    files.forEach(file => {
      const fileNode: DriveNode = {
        ...file,
        type: 'file' as const,
        parent_id: file.folder_id,
      };

      if (file.folder_id) {
        const folder = nodeMap.get(file.folder_id);
        if (folder && folder.children) {
          folder.children.push(fileNode);
        }
      } else {
        rootNodes.push(fileNode);
      }
    });

    return rootNodes;
  };

  // Create folder
  const createFolder = useCallback(async (
    name: string,
    parentId?: string | null
  ) => {
    if (!selectedDrive || !permissions?.write) {
      toast({
        title: 'Erreur',
        description: 'Vous n\'avez pas les permissions pour créer un dossier',
        variant: 'destructive',
      });
      return null;
    }

    try {
      // Build path
      let path = name;
      if (parentId) {
        const { data: parentFolder } = await supabase
          .from('folders')
          .select('path')
          .eq('id', parentId)
          .single();
        
        if (parentFolder) {
          path = `${parentFolder.path}/${name}`;
        }
      }

      const { data, error } = await supabase
        .from('folders')
        .insert({
          name,
          parent_id: parentId,
          drive_id: selectedDrive,
          path,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Dossier créé avec succès',
      });

      // Reload content
      await loadDriveContent(selectedDrive);
      
      return data;
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le dossier',
        variant: 'destructive',
      });
      return null;
    }
  }, [selectedDrive, permissions, userId, toast, loadDriveContent]);

  // Upload file
  const uploadFile = useCallback(async (
    file: File,
    folderId?: string | null
  ) => {
    if (!selectedDrive || !permissions?.write) {
      toast({
        title: 'Erreur',
        description: 'Vous n\'avez pas les permissions pour uploader un fichier',
        variant: 'destructive',
      });
      return null;
    }

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `drives/${selectedDrive}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Save metadata
      const { data, error: dbError } = await supabase
        .from('files')
        .insert({
          name: file.name,
          folder_id: folderId,
          drive_id: selectedDrive,
          storage_path: storagePath,
          mime_type: file.type,
          size_bytes: file.size,
          created_by: userId,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast({
        title: 'Succès',
        description: `${file.name} uploadé avec succès`,
      });

      // Reload content
      await loadDriveContent(selectedDrive);
      
      return data;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erreur',
        description: `Erreur lors de l'upload de ${file.name}`,
        variant: 'destructive',
      });
      return null;
    }
  }, [selectedDrive, permissions, userId, toast, loadDriveContent]);

  // Delete item
  const deleteItem = useCallback(async (item: DriveNode) => {
    if (!permissions?.delete) {
      toast({
        title: 'Erreur',
        description: 'Vous n\'avez pas les permissions pour supprimer',
        variant: 'destructive',
      });
      return false;
    }

    try {
      if (item.type === 'folder') {
        const { error } = await supabase
          .from('folders')
          .delete()
          .eq('id', item.id);
        
        if (error) throw error;
      } else {
        // Delete from storage
        if (item.storage_path) {
          const { error: storageError } = await supabase.storage
            .from('project-files')
            .remove([item.storage_path]);
          
          if (storageError) console.error('Storage deletion error:', storageError);
        }

        // Delete from database
        const { error } = await supabase
          .from('files')
          .delete()
          .eq('id', item.id);
        
        if (error) throw error;
      }

      toast({
        title: 'Succès',
        description: `${item.name} supprimé`,
      });

      // Reload content
      await loadDriveContent(selectedDrive);
      
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'élément',
        variant: 'destructive',
      });
      return false;
    }
  }, [permissions, selectedDrive, toast, loadDriveContent]);

  // Download file
  const downloadFile = useCallback(async (file: DriveNode) => {
    if (file.type !== 'file' || !file.storage_path) return false;

    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(file.storage_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le fichier',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Move item
  const moveItem = useCallback(async (
    itemId: string,
    itemType: 'folder' | 'file',
    newParentId: string | null
  ) => {
    if (!permissions?.write) {
      toast({
        title: 'Erreur',
        description: 'Vous n\'avez pas les permissions pour déplacer',
        variant: 'destructive',
      });
      return false;
    }

    try {
      if (itemType === 'folder') {
        // Update folder parent
        const { error } = await supabase
          .from('folders')
          .update({ parent_id: newParentId })
          .eq('id', itemId);
        
        if (error) throw error;
      } else {
        // Update file folder
        const { error } = await supabase
          .from('files')
          .update({ folder_id: newParentId })
          .eq('id', itemId);
        
        if (error) throw error;
      }

      toast({
        title: 'Succès',
        description: 'Élément déplacé avec succès',
      });

      // Reload content
      await loadDriveContent(selectedDrive);
      
      return true;
    } catch (error) {
      console.error('Move error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de déplacer l\'élément',
        variant: 'destructive',
      });
      return false;
    }
  }, [permissions, selectedDrive, toast, loadDriveContent]);

  // Initialize
  useEffect(() => {
    if (userId) {
      loadDrives();
    }
  }, [userId, loadDrives]);

  // Load content when drive changes
  useEffect(() => {
    if (selectedDrive) {
      loadDriveContent(selectedDrive);
    }
  }, [selectedDrive, loadDriveContent]);

  return {
    drives,
    selectedDrive,
    setSelectedDrive,
    driveContent,
    permissions,
    loading,
    actions: {
      createFolder,
      uploadFile,
      deleteItem,
      downloadFile,
      moveItem,
      reload: () => loadDriveContent(selectedDrive),
    },
  };
}