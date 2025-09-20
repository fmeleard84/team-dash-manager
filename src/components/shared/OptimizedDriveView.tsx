import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
}

interface Entry { 
  name: string; 
  id?: string; 
  created_at?: string; 
  updated_at?: string; 
  metadata?: any; 
}

interface SharedDriveViewProps {
  projects: Project[];
  userType?: 'client' | 'candidate';
}

// Cache pour stocker les entrées déjà chargées
const entriesCache = new Map<string, { entries: Entry[], counts: Record<string, number>, timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function OptimizedDriveView({ projects, userType = 'client' }: SharedDriveViewProps) {
  const { toast } = useToast();
  const [projectId, setProjectId] = useState<string>("");
  const [prefix, setPrefix] = useState<string>("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [renamingItem, setRenamingItem] = useState<string | null>(null);
  const [newName, setNewName] = useState<string>("");
  
  // Pagination
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const ITEMS_PER_PAGE = 30;
  
  // Ref pour l'intersection observer (infinite scroll)
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectId && projects.length > 0) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  const basePrefix = useMemo(() => (projectId ? `project/${projectId}/` : ""), [projectId]);
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

  // Fonction optimisée pour charger les entrées
  const loadEntries = useCallback(async (append = false) => {
    if (!projectId) return;
    
    const cacheKey = `${projectId}:${prefix}:${offset}`;
    
    // Vérifier le cache
    if (!append && entriesCache.has(cacheKey)) {
      const cached = entriesCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        setEntries(cached.entries);
        setFolderCounts(cached.counts);
        return;
      }
    }
    
    try {
      setLoading(true);
      
      // Charger les entrées avec pagination
      const { data, error } = await supabase.storage
        .from('project-files')
        .list(prefix, { 
          limit: ITEMS_PER_PAGE, 
          offset: append ? offset : 0 
        });
      
      if (error) throw error;
      
      const filteredEntries = (data || []).filter(entry => 
        !entry.name.startsWith('.emptyFolderPlaceholder') && 
        !entry.name.startsWith('.keep') &&
        entry.name !== 'project' &&
        entry.name !== projectId
      );
      
      // Ajouter les dossiers virtuels si on est à la racine et pas en mode append
      let finalEntries = filteredEntries;
      if (prefix === basePrefix && !append) {
        const defaultFolders = ['Kanban', 'Messagerie'];
        const existingFolderNames = filteredEntries.filter(e => !e.id).map(e => e.name);
        const virtualFolders = defaultFolders
          .filter(name => !existingFolderNames.includes(name))
          .map(name => ({
            name,
            id: undefined,
            created_at: new Date().toISOString()
          }));
        finalEntries = [...virtualFolders, ...filteredEntries];
      }
      
      // Mise à jour des entrées
      if (append) {
        setEntries(prev => [...prev, ...finalEntries]);
      } else {
        setEntries(finalEntries);
      }
      
      // Vérifier s'il y a plus d'éléments
      setHasMore(filteredEntries.length === ITEMS_PER_PAGE);
      
      // Compter les éléments dans les dossiers (en parallèle pour la performance)
      const folders = finalEntries.filter(e => !e.id);
      if (folders.length > 0 && !append) {
        const countPromises = folders.map(async (folder) => {
          const { data: subFiles } = await supabase.storage
            .from('project-files')
            .list(`${prefix}${folder.name}`, { limit: 1 });
          return { 
            name: folder.name, 
            count: subFiles ? subFiles.length : 0 
          };
        });
        
        const counts = await Promise.all(countPromises);
        const countsMap = counts.reduce((acc, { name, count }) => {
          acc[name] = count;
          return acc;
        }, {} as Record<string, number>);
        
        setFolderCounts(countsMap);
        
        // Mettre en cache
        if (!append) {
          entriesCache.set(cacheKey, {
            entries: finalEntries,
            counts: countsMap,
            timestamp: Date.now()
          });
        }
      }
      
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
  }, [projectId, prefix, offset, userType, toast, basePrefix]);

  // Intersection Observer pour le scroll infini
  useEffect(() => {
    if (!hasMore || loading) return;
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setOffset(prev => prev + ITEMS_PER_PAGE);
        loadEntries(true);
      }
    });
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    
    return () => observer.disconnect();
  }, [hasMore, loading, loadEntries]);

  // Charger les entrées quand le projet ou le préfixe change
  useEffect(() => {
    if (projectId && prefix) {
      setOffset(0);
      loadEntries();
    }
  }, [projectId, prefix]);

  useEffect(() => {
    if (projectId) {
      setPrefix(basePrefix);
      setEntries([]);
      setFolderCounts({});
      setOffset(0);
      // Effacer le cache pour ce projet
      Array.from(entriesCache.keys())
        .filter(key => key.startsWith(`${projectId}:`))
        .forEach(key => entriesCache.delete(key));
    }
  }, [projectId, basePrefix]);

  const createFolder = async () => {
    const folderName = prompt("Nom du dossier:");
    if (!folderName || !projectId) return;

    try {
      const filePath = `${prefix}${folderName}/.keep`;
      const { error } = await supabase.storage
        .from('project-files')
        .upload(filePath, new Blob([]), { upsert: false });
      
      if (error) throw error;
      
      toast({
        title: "Dossier créé",
        description: `Le dossier "${folderName}" a été créé.`,
      });
      
      // Invalider le cache
      const cacheKey = `${projectId}:${prefix}:0`;
      entriesCache.delete(cacheKey);
      
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

  const uploadFiles = async (files: FileList) => {
    if (!projectId) return;

    try {
      setLoading(true);
      const uploadPromises = Array.from(files).map(async (file) => {
        const filePath = `${prefix}${file.name}`;
        const { error } = await supabase.storage
          .from('project-files')
          .upload(filePath, file, { upsert: true });
        
        if (error) throw error;
        return file.name;
      });

      await Promise.all(uploadPromises);
      
      toast({
        title: "Fichiers téléchargés",
        description: `${files.length} fichier(s) téléchargé(s) avec succès.`,
      });
      
      // Invalider le cache
      const cacheKey = `${projectId}:${prefix}:0`;
      entriesCache.delete(cacheKey);
      
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

  const deleteItem = async (path: string, isFolder: boolean = false) => {
    const itemType = isFolder ? "ce dossier" : "ce fichier";
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${itemType} "${path}" ?`)) return;

    try {
      setLoading(true);
      
      const { error } = await supabase.functions.invoke('storage-operations', {
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
      
      // Invalider le cache
      const cacheKey = `${projectId}:${prefix}:0`;
      entriesCache.delete(cacheKey);
      
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
    setOffset(0);
  };

  const navigateUp = () => {
    if (!canGoUp) return;
    const segments = prefix.split('/').filter(Boolean);
    segments.pop();
    setPrefix(segments.length > 0 ? `${segments.join('/')}/` : basePrefix);
    setOffset(0);
  };

  const navigateToBreadcrumb = (path: string) => {
    setPrefix(path);
    setOffset(0);
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

  // Fonctions de renommage (simplifiées, car non critiques pour la perf)
  const startRename = (name: string) => {
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
      
      const entry = entries.find(e => e.name === renamingItem);
      const isFolder = !entry?.id;
      
      const { error } = await supabase.functions.invoke('storage-operations', {
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
      
      // Invalider le cache
      const cacheKey = `${projectId}:${prefix}:0`;
      entriesCache.delete(cacheKey);
      
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

              {/* File Browser avec scroll optimisé */}
              <div
                className={`border-2 border-dashed rounded-xl p-6 transition-all max-h-[600px] overflow-y-auto ${
                  isDragOver ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50' : 'border-purple-200 bg-white'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {loading && entries.length === 0 ? (
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
                                <DropdownMenuItem onClick={() => startRename(entry.name)}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Renommer
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => startRename(entry.name)}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Renommer
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem
                              onClick={() => deleteItem(entry.name, !entry.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                    
                    {/* Indicateur de chargement pour le scroll infini */}
                    {hasMore && (
                      <div ref={loadMoreRef} className="text-center py-4">
                        {loading ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto"></div>
                        ) : (
                          <p className="text-sm text-gray-500">Faire défiler pour charger plus...</p>
                        )}
                      </div>
                    )}
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