import { useState, useEffect, useCallback, useMemo } from 'react';
import { Tree, NodeApi } from 'react-arborist';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FolderIcon,
  FileIcon,
  Upload,
  FolderPlus,
  Search,
  Download,
  Trash2,
  Edit2,
  Eye,
  Share2,
  HardDrive,
  Users,
  Lock,
  ChevronDown,
  ChevronRight,
  FileText,
  Image,
  Video,
  FileCode,
  FileArchive,
} from 'lucide-react';

interface DriveNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parent_id: string | null;
  drive_id: string;
  size_bytes?: number;
  mime_type?: string;
  created_at: string;
  updated_at: string;
  children?: DriveNode[];
  icon?: string;
  color?: string;
}

interface Drive {
  id: string;
  name: string;
  type: 'project' | 'personal' | 'shared';
  project_id?: string;
  owner_id?: string;
  metadata?: any;
}

interface ModernDriveExplorerProps {
  projectId?: string;
  userType: 'client' | 'candidate';
  userId: string;
}

export default function ModernDriveExplorer({
  projectId,
  userType,
  userId,
}: ModernDriveExplorerProps) {
  const { toast } = useToast();
  const [selectedDrive, setSelectedDrive] = useState<string>('');
  const [drives, setDrives] = useState<Drive[]>([]);
  const [treeData, setTreeData] = useState<DriveNode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<NodeApi<DriveNode> | null>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Load available drives
  useEffect(() => {
    loadDrives();
  }, [projectId, userId]);

  // Load drive content when drive changes
  useEffect(() => {
    if (selectedDrive) {
      loadDriveContent(selectedDrive);
    }
  }, [selectedDrive]);

  const loadDrives = async () => {
    try {
      let drivesData: Drive[] = [];

      if (projectId) {
        // Load specific project drive
        const { data, error } = await supabase
          .from('drives')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (error) {
          // If drives table doesn't exist yet, fallback to empty
          if (error.code === '42P01') {
            console.log('Drives table not found, skipping...');
            return;
          }
          throw error;
        }

        drivesData = data || [];
      } else {
        // Load all drives for the user
        if (userType === 'client') {
          // For clients, load their owned drives
          const { data, error } = await supabase
            .from('drives')
            .select('*')
            .eq('owner_id', userId)
            .order('created_at', { ascending: false });

          if (error) {
            if (error.code === '42P01') {
              console.log('Drives table not found, skipping...');
              return;
            }
            throw error;
          }
          drivesData = data || [];
        } else {
          // For candidates, we need to get drives they're members of
          // First get drive_members entries
          const { data: memberData, error: memberError } = await supabase
            .from('drive_members')
            .select('drive_id')
            .eq('user_id', userId);

          if (memberError) {
            if (memberError.code === '42P01') {
              console.log('Drive members table not found, skipping...');
              return;
            }
            throw memberError;
          }

          if (memberData && memberData.length > 0) {
            const driveIds = memberData.map(m => m.drive_id);
            
            const { data, error } = await supabase
              .from('drives')
              .select('*')
              .in('id', driveIds)
              .order('created_at', { ascending: false });

            if (error) throw error;
            drivesData = data || [];
          }
        }
      }

      setDrives(drivesData);
      
      // Auto-select first drive
      if (drivesData.length > 0 && !selectedDrive) {
        setSelectedDrive(drivesData[0].id);
      }
    } catch (error: any) {
      console.error('Error loading drives:', error);
      
      // Only show toast for unexpected errors
      if (error?.code !== '42P01' && error?.code !== '42P17') {
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les drives',
          variant: 'destructive',
        });
      }
    }
  };

  const loadDriveContent = async (driveId: string) => {
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
      setTreeData(tree);
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
  };

  const buildTreeStructure = (folders: any[], files: any[]): DriveNode[] => {
    const nodeMap = new Map<string, DriveNode>();
    const rootNodes: DriveNode[] = [];

    // Add all folders to map
    folders.forEach(folder => {
      nodeMap.set(folder.id, {
        ...folder,
        type: 'folder',
        children: [],
      });
    });

    // Add all files to map
    files.forEach(file => {
      nodeMap.set(file.id, {
        ...file,
        type: 'file',
      });
    });

    // Build hierarchy
    nodeMap.forEach(node => {
      if (node.parent_id && node.type === 'folder') {
        const parent = nodeMap.get(node.parent_id);
        if (parent && parent.children) {
          parent.children.push(node);
        }
      } else if (!node.parent_id && node.type === 'folder') {
        rootNodes.push(node);
      }
    });

    // Add files to their folders
    files.forEach(file => {
      if (file.folder_id) {
        const folder = nodeMap.get(file.folder_id);
        if (folder && folder.children) {
          folder.children.push(nodeMap.get(file.id)!);
        }
      } else {
        rootNodes.push(nodeMap.get(file.id)!);
      }
    });

    return rootNodes;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!selectedDrive) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un drive',
        variant: 'destructive',
      });
      return;
    }

    const currentFolderId = selectedNode?.data.type === 'folder' 
      ? selectedNode.data.id 
      : selectedNode?.data.parent_id || null;

    for (const file of acceptedFiles) {
      try {
        // Upload to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storagePath = `drives/${selectedDrive}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        // Save file metadata
        const { error: dbError } = await supabase
          .from('files')
          .insert({
            name: file.name,
            folder_id: currentFolderId,
            drive_id: selectedDrive,
            storage_path: storagePath,
            mime_type: file.type,
            size_bytes: file.size,
            created_by: userId,
          });

        if (dbError) throw dbError;

        toast({
          title: 'Succès',
          description: `${file.name} uploadé avec succès`,
        });
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: 'Erreur',
          description: `Erreur lors de l'upload de ${file.name}`,
          variant: 'destructive',
        });
      }
    }

    // Reload content
    loadDriveContent(selectedDrive);
  }, [selectedDrive, selectedNode, userId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });

  const createFolder = async () => {
    if (!selectedDrive || !newFolderName.trim()) return;

    try {
      const parentId = selectedNode?.data.type === 'folder' 
        ? selectedNode.data.id 
        : null;

      const path = parentId 
        ? `${selectedNode?.data.path}/${newFolderName}`
        : newFolderName;

      const { error } = await supabase
        .from('folders')
        .insert({
          name: newFolderName,
          parent_id: parentId,
          drive_id: selectedDrive,
          path: path,
          created_by: userId,
        });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Dossier créé avec succès',
      });

      setNewFolderName('');
      setShowNewFolderDialog(false);
      loadDriveContent(selectedDrive);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le dossier',
        variant: 'destructive',
      });
    }
  };

  const deleteItem = async (node: NodeApi<DriveNode>) => {
    try {
      if (node.data.type === 'folder') {
        const { error } = await supabase
          .from('folders')
          .delete()
          .eq('id', node.data.id);
        if (error) throw error;
      } else {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('project-files')
          .remove([node.data.storage_path]);
        
        if (storageError) console.error('Storage deletion error:', storageError);

        // Delete from database
        const { error } = await supabase
          .from('files')
          .delete()
          .eq('id', node.data.id);
        if (error) throw error;
      }

      toast({
        title: 'Succès',
        description: `${node.data.name} supprimé`,
      });

      loadDriveContent(selectedDrive);
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'élément',
        variant: 'destructive',
      });
    }
  };

  const downloadFile = async (node: NodeApi<DriveNode>) => {
    if (node.data.type !== 'file') return;

    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(node.data.storage_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = node.data.name;
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

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <FileIcon className="h-4 w-4" />;
    
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <FileArchive className="h-4 w-4" />;
    if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('json')) return <FileCode className="h-4 w-4" />;
    
    return <FileIcon className="h-4 w-4" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Drive</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={selectedDrive} onValueChange={setSelectedDrive}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sélectionner un drive" />
              </SelectTrigger>
              <SelectContent>
                {drives.map(drive => (
                  <SelectItem key={drive.id} value={drive.id}>
                    <div className="flex items-center gap-2">
                      {drive.type === 'project' && <Users className="h-4 w-4" />}
                      {drive.type === 'personal' && <Lock className="h-4 w-4" />}
                      {drive.type === 'shared' && <Share2 className="h-4 w-4" />}
                      {drive.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNewFolderDialog(true)}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              Nouveau dossier
            </Button>

            <Button size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Uploader
              <input {...getInputProps()} />
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher des fichiers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* File Explorer */}
      <div 
        {...getRootProps()} 
        className="flex-1 overflow-auto p-4"
      >
        <AnimatePresence>
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-50"
            >
              <div className="text-center">
                <Upload className="h-12 w-12 mx-auto mb-2 text-primary" />
                <p className="text-lg font-medium">Déposer les fichiers ici</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          </div>
        ) : (
          <Tree
            data={treeData}
            openByDefault={false}
            width="100%"
            height={600}
            indent={24}
            rowHeight={36}
            overscanCount={10}
            searchQuery={searchQuery}
            searchMatch={(node, query) => 
              node.data.name.toLowerCase().includes(query.toLowerCase())
            }
            onSelect={(nodes) => setSelectedNode(nodes[0] || null)}
            onMove={async ({ dragIds, parentId }) => {
              // Handle move operation
              console.log('Moving', dragIds, 'to', parentId);
            }}
          >
            {({ node, style, dragHandle }) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    style={style}
                    className={`flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent cursor-pointer ${
                      node.isSelected ? 'bg-accent' : ''
                    }`}
                    ref={dragHandle}
                  >
                    <button
                      onClick={() => node.isInternal && node.toggle()}
                      className="hover:bg-accent-foreground/10 rounded p-0.5"
                    >
                      {node.isInternal && (
                        node.isOpen ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                      )}
                      {!node.isInternal && <div className="w-5" />}
                    </button>
                    
                    {node.data.type === 'folder' ? (
                      <FolderIcon 
                        className="h-4 w-4 text-blue-500" 
                        style={{ color: node.data.color }}
                      />
                    ) : (
                      getFileIcon(node.data.mime_type)
                    )}
                    
                    <span className="flex-1 text-sm">{node.data.name}</span>
                    
                    {node.data.type === 'file' && (
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(node.data.size_bytes)}
                      </span>
                    )}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {node.data.type === 'file' && (
                    <>
                      <DropdownMenuItem onClick={() => downloadFile(node)}>
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        Aperçu
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Renommer
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => deleteItem(node)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </Tree>
        )}
      </div>

      {/* New Folder Dialog */}
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
    </div>
  );
}