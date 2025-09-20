import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectSelectorNeon } from '@/components/ui/project-selector-neon';
import { useToast } from "@/hooks/use-toast";
import {
  FolderPlus, Upload, Folder, File as FileIcon, Download, Trash2,
  Eye, MoreVertical, Pencil, ChevronRight, Cloud
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Project { 
  id: string; 
  title: string;
  archived_at?: string | null;
}

interface Entry { 
  name: string; 
  id?: string; 
  created_at?: string; 
  updated_at?: string; 
  last_accessed_at?: string; 
  metadata?: any; 
}

interface SharedDriveViewProps {
  projects: Project[];
  userType?: 'client' | 'candidate';
}

export default function SharedDriveView({ projects, userType = 'client' }: SharedDriveViewProps) {
  const { toast } = useToast();
  const [projectId, setProjectId] = useState<string>("");
  const [prefix, setPrefix] = useState<string>("");
  
  // Initialize with first project when projects are loaded
  useEffect(() => {
    if (!projectId && projects.length > 0) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  
  const [loading, setLoading] = useState(false);

  // DnD state
  const [dragPath, setDragPath] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Rename state
  const [renamingItem, setRenamingItem] = useState<string | null>(null);
  const [newName, setNewName] = useState<string>("");

  const basePrefix = useMemo(() => (projectId ? `projects/${projectId}/` : ""), [projectId]);
  const canGoUp = useMemo(() => prefix && prefix !== basePrefix, [prefix, basePrefix]);
  const breadcrumbs = useMemo(() => {
    const currentProject = projects.find(p => p.id === projectId);
    const projectTitle = currentProject?.title || "Projet";
    
    const rel = prefix.replace(basePrefix, "");
    const segs = rel.split("/").filter(Boolean);
    const items: { label: string; path: string }[] = [{ label: projectTitle, path: basePrefix }];
    let acc = basePrefix;
    for (const s of segs) {
      acc += `${s}/`;
      items.push({ label: s, path: acc });
    }
    return items;
  }, [prefix, basePrefix, projectId, projects]);

  const loadEntries = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      console.log(`📁 ${userType.toUpperCase()}: Loading entries for prefix:`, prefix);
      
      // Si on est à la racine du projet, ajouter les dossiers par défaut
      if (prefix === basePrefix) {
        // Dossiers par défaut qui doivent toujours exister
        const defaultFolders = ['Kanban', 'Messagerie'];
        const virtualFolders: Entry[] = defaultFolders.map(name => ({
          name,
          id: undefined,
          created_at: new Date().toISOString()
        }));
        
        // Charger aussi les vrais fichiers/dossiers
        const { data, error } = await supabase.storage
          .from('project-files')
          .list(prefix, { limit: 100, offset: 0 });
        
        if (!error && data) {
          // Filtrer les placeholders et les dossiers parasites
          const realEntries = data.filter(entry => 
            !entry.name.startsWith('.emptyFolderPlaceholder') && 
            !entry.name.startsWith('.keep') &&
            entry.name !== 'project' && // Filtrer le dossier "project" parasite
            entry.name !== projectId // Filtrer un éventuel dossier avec l'ID du projet
          );
          
          // Ne garder que les dossiers virtuels qui n'existent pas physiquement
          const existingFolderNames = realEntries.filter(e => !e.id).map(e => e.name);
          const filteredVirtualFolders = virtualFolders.filter(vf => 
            !existingFolderNames.includes(vf.name)
          );
          
          const allEntries = [...filteredVirtualFolders, ...realEntries];
          setEntries(allEntries);
          
          // Compter les éléments dans chaque dossier (virtuels ET réels)
          const counts: Record<string, number> = {};
          const allFolders = allEntries.filter(e => !e.id);
          
          for (const folder of allFolders) {
            const { data: subFiles } = await supabase.storage
              .from('project-files')
              .list(`${prefix}${folder.name}`, { limit: 100 });
            counts[folder.name] = subFiles ? subFiles.filter(f => 
              !f.name.startsWith('.emptyFolderPlaceholder') && 
              !f.name.startsWith('.keep')
            ).length : 0;
          }
          setFolderCounts(counts);
        } else {
          setEntries(virtualFolders);
        }
      } else {
        // Chargement normal pour les sous-dossiers
        const { data, error } = await supabase.storage
          .from('project-files')
          .list(prefix, { limit: 100, offset: 0 });
        
        if (error) throw error;
        const filteredEntries = (data || []).filter(entry => 
          !entry.name.startsWith('.emptyFolderPlaceholder') && 
          !entry.name.startsWith('.keep')
        );
        setEntries(filteredEntries);
        
        // Compter les éléments dans les sous-dossiers aussi
        const counts: Record<string, number> = {};
        const folders = filteredEntries.filter(e => !e.id);
        for (const folder of folders) {
          const { data: subFiles } = await supabase.storage
            .from('project-files')
            .list(`${prefix}${folder.name}`, { limit: 100 });
          counts[folder.name] = subFiles ? subFiles.filter(f => 
            !f.name.startsWith('.emptyFolderPlaceholder') && 
            !f.name.startsWith('.keep')
          ).length : 0;
        }
        setFolderCounts(counts);
      }
      
      console.log(`📁 ${userType.toUpperCase()}: Loaded ${entries.length} entries`);
    } catch (error) {
      console.error(`📁 ${userType.toUpperCase()}: Error loading entries:`, error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les fichiers.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, prefix, userType, toast, basePrefix]);

  // Load entries when projectId or prefix changes
  useEffect(() => {
    if (projectId && prefix) {
      loadEntries();
    }
  }, [projectId, prefix, loadEntries]);

  useEffect(() => {
    if (projectId) {
      setPrefix(basePrefix);
      setEntries([]); // Reset entries when project changes
      setFolderCounts({}); // Reset counts when project changes
    }
  }, [projectId, basePrefix]);

  const createFolder = async () => {
    // Vérifier si le projet est archivé
    const currentProject = projects.find(p => p.id === projectId);
    if (currentProject?.archived_at) {
      toast({
        title: "Action non autorisée",
        description: "Impossible de créer des dossiers dans un projet archivé.",
        variant: "destructive",
      });
      return;
    }
    
    const folderName = prompt("Nom du dossier:");
    if (!folderName || !projectId) return;

    try {
      // Nettoyer le nom du dossier
      const sanitizedFolderName = folderName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Enlève les accents
        .replace(/[^a-zA-Z0-9_\-\s]/g, '_') // Remplace les caractères spéciaux par _ (garde les espaces pour les dossiers)
        .replace(/\s+/g, '_') // Remplace les espaces par _
        .replace(/_+/g, '_') // Remplace les _ multiples par un seul
        .replace(/^_|_$/g, ''); // Enlève les _ au début et à la fin
      
      const filePath = `${prefix}${sanitizedFolderName}/.keep`;
      const { error } = await supabase.storage
        .from('project-files')
        .upload(filePath, new Blob([]), { upsert: false });
      
      if (error) throw error;
      
      toast({
        title: "Dossier créé",
        description: `Le dossier "${folderName}" a été créé.`,
      });
      
      loadEntries();
    } catch (error) {
      console.error(`📁 ${userType.toUpperCase()}: Error creating folder:`, error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le dossier.",
        variant: "destructive",
      });
    }
  };

  // Fonction pour nettoyer les noms de fichiers (enlever accents et caractères spéciaux)
  const sanitizeFileName = (fileName: string): string => {
    // Séparer le nom et l'extension
    const lastDotIndex = fileName.lastIndexOf('.');
    const nameWithoutExt = lastDotIndex > -1 ? fileName.substring(0, lastDotIndex) : fileName;
    const extension = lastDotIndex > -1 ? fileName.substring(lastDotIndex) : '';
    
    // Remplacer les accents
    let sanitized = nameWithoutExt
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Enlève les accents
      .replace(/[^a-zA-Z0-9_\-]/g, '_') // Remplace les caractères spéciaux par _
      .replace(/_+/g, '_') // Remplace les _ multiples par un seul
      .replace(/^_|_$/g, ''); // Enlève les _ au début et à la fin
    
    // Si le nom est vide après sanitization, utiliser un timestamp
    if (!sanitized) {
      sanitized = `file_${Date.now()}`;
    }
    
    return sanitized + extension;
  };

  const uploadFiles = async (files: FileList) => {
    if (!projectId) return;

    // Vérifier si le projet est archivé
    const currentProject = projects.find(p => p.id === projectId);
    if (currentProject?.archived_at) {
      toast({
        title: "Action non autorisée",
        description: "Impossible d'ajouter des fichiers dans un projet archivé.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const uploadPromises = Array.from(files).map(async (file) => {
        // Nettoyer le nom du fichier
        const sanitizedName = sanitizeFileName(file.name);
        const filePath = `${prefix}${sanitizedName}`;
        
        console.log(`📁 Uploading: "${file.name}" as "${sanitizedName}"`);
        
        const { error } = await supabase.storage
          .from('project-files')
          .upload(filePath, file, { upsert: true });
        
        if (error) throw error;
        return sanitizedName;
      });

      const uploadedNames = await Promise.all(uploadPromises);
      
      // Vérifier si des noms ont été modifiés
      const filesArray = Array.from(files);
      const modifiedFiles = filesArray.filter((file, index) => 
        sanitizeFileName(file.name) !== file.name
      );
      
      if (modifiedFiles.length > 0) {
        toast({
          title: "Fichiers téléchargés",
          description: `${files.length} fichier(s) téléchargé(s). Note: Certains noms ont été modifiés pour supprimer les caractères spéciaux.`,
        });
      } else {
        toast({
          title: "Fichiers téléchargés",
          description: `${files.length} fichier(s) téléchargé(s) avec succès.`,
        });
      }
      
      loadEntries();
    } catch (error) {
      console.error(`📁 ${userType.toUpperCase()}: Error uploading files:`, error);
      toast({
        title: "Erreur",
        description: "Erreur lors du téléchargement.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(`${prefix}${path}`);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = path;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Téléchargement",
        description: `Téléchargement de "${path}" démarré.`,
      });
    } catch (error) {
      console.error(`📁 ${userType.toUpperCase()}: Error downloading file:`, error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le fichier.",
        variant: "destructive",
      });
    }
  };

  const viewFile = async (name: string) => {
    try {
      const { data } = supabase.storage
        .from('project-files')
        .getPublicUrl(`${prefix}${name}`);
      
      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir le fichier.",
        variant: "destructive",
      });
    }
  };

  const startRename = (name: string) => {
    // Vérifier si le projet est archivé
    const currentProject = projects.find(p => p.id === projectId);
    if (currentProject?.archived_at) {
      toast({
        title: "Action non autorisée",
        description: "Impossible de renommer des éléments dans un projet archivé.",
        variant: "destructive",
      });
      return;
    }
    
    setRenamingItem(name);
    setNewName(name);
  };

  const cancelRename = () => {
    setRenamingItem(null);
    setNewName("");
  };

  const confirmRename = async () => {
    if (!renamingItem || !newName || renamingItem === newName) {
      cancelRename();
      return;
    }

    try {
      setLoading(true);
      const oldPath = `${prefix}${renamingItem}`;
      const newPath = `${prefix}${newName}`;
      
      // Check if it's a folder (no id means it's a folder)
      const entry = entries.find(e => e.name === renamingItem);
      const isFolder = !entry?.id;
      
      // Use the edge function for rename operation
      const { data, error } = await supabase.functions.invoke('storage-operations', {
        body: {
          operation: 'rename',
          oldPath: oldPath,
          newPath: newPath,
          isFolder: isFolder
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Succès",
        description: `"${renamingItem}" renommé en "${newName}"`,
      });
      
      cancelRename();
      await loadEntries();
    } catch (error) {
      console.error('Error renaming:', error);
      toast({
        title: "Erreur",
        description: "Impossible de renommer l'élément.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (path: string, isFolder: boolean = false) => {
    // Vérifier si le projet est archivé
    const currentProject = projects.find(p => p.id === projectId);
    if (currentProject?.archived_at) {
      toast({
        title: "Action non autorisée",
        description: "Impossible de supprimer des éléments dans un projet archivé.",
        variant: "destructive",
      });
      return;
    }
    
    const itemType = isFolder ? "ce dossier" : "ce fichier";
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${itemType} "${path}" ?`)) return;

    try {
      setLoading(true);
      
      // Use the edge function for delete operation
      const { data, error } = await supabase.functions.invoke('storage-operations', {
        body: {
          operation: 'delete',
          oldPath: `${prefix}${path}`,
          isFolder: isFolder
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Suppression",
        description: `"${path}" a été supprimé.`,
      });
      
      await loadEntries();
    } catch (error) {
      console.error(`📁 ${userType.toUpperCase()}: Error deleting item:`, error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'élément.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      uploadFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const navigateToFolder = (folderName: string) => {
    setPrefix(`${prefix}${folderName}/`);
  };

  const navigateUp = () => {
    if (!canGoUp) return;
    const segments = prefix.split('/').filter(Boolean);
    segments.pop();
    setPrefix(segments.length > 0 ? `${segments.join('/')}/` : basePrefix);
  };

  const navigateToBreadcrumb = (path: string) => {
    setPrefix(path);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            
            <ProjectSelectorNeon
              projects={projects}
              selectedProjectId={projectId}
              onProjectChange={setProjectId}
              placeholder="Sélectionner un projet"
              className="w-64"
            />
          </div>
          
          {projectId && (
            <div className="flex gap-2">
              {projects.find(p => p.id === projectId)?.archived_at ? (
                <div className="text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
                  🔒 Projet archivé - Lecture seule
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={loading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                  <Button 
                    className="bg-white hover:bg-purple-50 text-purple-700 border border-purple-300"
                    size="sm" 
                    onClick={createFolder} 
                    disabled={loading}
                  >
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Nouveau dossier
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <Card className="border-purple-200/50">
        <CardContent className="space-y-4 pt-6">

          {projectId && (
            <>
              {/* Breadcrumbs */}
              <div className="flex items-center gap-2 text-sm bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg px-4 py-2">
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.path} className="flex items-center gap-2">
                    <button
                      onClick={() => navigateToBreadcrumb(crumb.path)}
                      className="text-purple-600 hover:text-purple-800 font-medium transition-colors"
                    >
                      {crumb.label}
                    </button>
                    {index < breadcrumbs.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                ))}
              </div>

              {/* File Browser */}
              <div
                className={`border-2 border-dashed rounded-xl p-6 transition-all ${
                  isDragOver ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50' : 'border-purple-200 bg-white'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="mt-2 text-sm text-purple-600">Chargement...</p>
                  </div>
                ) : entries.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Cloud className="w-8 h-8 text-purple-500" />
                    </div>
                    <p className="text-gray-700 font-medium">Aucun fichier dans ce dossier</p>
                    <p className="text-sm text-gray-500 mt-2">Glissez-déposez des fichiers ici ou utilisez le bouton Upload</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {canGoUp && (
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors"
                        onClick={navigateUp}
                      >
                        <Folder className="w-5 h-5 text-purple-600" />
                        <span className="font-medium">..</span>
                      </div>
                    )}
                    
                    {entries.map((entry) => (
                      <div
                        key={entry.name}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all group"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {entry.id ? (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <FileIcon className="w-5 h-5 text-gray-600" />
                            </div>
                          ) : (
                            <div 
                              className="w-10 h-10 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg flex items-center justify-center cursor-pointer" 
                              onClick={() => !renamingItem && navigateToFolder(entry.name)}
                            >
                              <Folder className="w-5 h-5 text-purple-600" />
                            </div>
                          )}
                          <div className="flex-1">
                            {renamingItem === entry.name ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={newName}
                                  onChange={(e) => setNewName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') confirmRename();
                                    if (e.key === 'Escape') cancelRename();
                                  }}
                                  className="px-2 py-1 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  autoFocus
                                />
                                <Button size="sm" onClick={confirmRename} variant="ghost">
                                  ✓
                                </Button>
                                <Button size="sm" onClick={cancelRename} variant="ghost">
                                  ✗
                                </Button>
                              </div>
                            ) : (
                              <>
                                <p className="font-medium text-gray-800">
                                  {entry.name}
                                  {!entry.id && folderCounts[entry.name] !== undefined && (
                                    <span className="ml-2 text-sm text-gray-500">
                                      ({folderCounts[entry.name]} élément{folderCounts[entry.name] !== 1 ? 's' : ''})
                                    </span>
                                  )}
                                </p>
                                {entry.metadata?.size && (
                                  <p className="text-sm text-gray-500">
                                    {formatFileSize(entry.metadata.size)} • {entry.updated_at && formatDate(entry.updated_at)}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {entry.id ? (
                              <>
                                <DropdownMenuItem onClick={() => viewFile(entry.name)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Voir
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => downloadFile(entry.name)}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Télécharger
                                </DropdownMenuItem>
                                {!projects.find(p => p.id === projectId)?.archived_at && (
                                  <DropdownMenuItem onClick={() => startRename(entry.name)}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Renommer
                                  </DropdownMenuItem>
                                )}
                              </>
                            ) : (
                              <>
                                {!projects.find(p => p.id === projectId)?.archived_at && (
                                  <DropdownMenuItem onClick={() => startRename(entry.name)}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Renommer
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                            {!projects.find(p => p.id === projectId)?.archived_at && (
                              <DropdownMenuItem
                                onClick={() => deleteItem(entry.name, !entry.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

    </div>
  );
}