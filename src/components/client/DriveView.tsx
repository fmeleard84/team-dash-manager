
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  FolderPlus, Upload, Folder, File as FileIcon, Download, Trash,
  Share2, Eye, MoreVertical, Pencil, ChevronRight
} from "lucide-react";
import FileShareModal from "./FileShareModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Project { id: string; title: string }
interface Entry { name: string; id?: string; created_at?: string; updated_at?: string; last_accessed_at?: string; metadata?: any; }

export default function DriveView() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [prefix, setPrefix] = useState<string>("");
  const [entries, setEntries] = useState<Entry[]>([]);
  
  const [loading, setLoading] = useState(false);

  // DnD state
  const [dragPath, setDragPath] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Share modal
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePath, setSharePath] = useState<string>("");

  const basePrefix = useMemo(() => (projectId ? `project/${projectId}/` : ""), [projectId]);
  const canGoUp = useMemo(() => prefix && prefix !== basePrefix, [prefix, basePrefix]);
  const breadcrumbs = useMemo(() => {
    const rel = prefix.replace(basePrefix, "");
    const segs = rel.split("/").filter(Boolean);
    const items: { label: string; path: string }[] = [{ label: "Dossier du projet", path: basePrefix }];
    let acc = basePrefix;
    for (const s of segs) {
      acc += `${s}/`;
      items.push({ label: s, path: acc });
    }
    return items;
  }, [prefix, basePrefix]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title")
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      else {
        setProjects(data as Project[]);
        if (data && data.length && !projectId) setProjectId(data[0].id);
      }
    })();
  }, []);

  useEffect(() => {
    if (projectId) {
      setPrefix(`project/${projectId}/`);
    }
  }, [projectId]);

  useEffect(() => {
    if (prefix) list(prefix);
  }, [prefix]);

  const list = async (p: string) => {
    setLoading(true);
    const { data, error } = await supabase.storage.from("project-files").list(p, {
      limit: 100,
      sortBy: { column: "name", order: "asc" },
    });
    setLoading(false);
    if (error) {
      console.error("list error", error);
      toast({ title: "Erreur", description: "Chargement du drive échoué" });
    } else {
      const filtered = (data as Entry[]).filter((e) => e.name !== ".keep");
      setEntries(filtered);
    }
  };

  const createFolder = async (nameArg?: string) => {
    const name = (nameArg ?? prompt("Nom du nouveau dossier") ?? "").trim();
    if (!name) return;
    const key = `${prefix}${name}/.keep`;
    const { error } = await supabase.storage
      .from("project-files")
      .upload(key, new Blob([new Uint8Array()]), { upsert: true, contentType: "text/plain" });
    if (error) {
      console.error("create folder error", error);
      toast({ title: "Erreur", description: "Création du dossier échouée" });
    } else {
      list(prefix);
    }
  };

  const upsertDefaultAcl = async (_fullPath: string) => {
    // ACLs désactivés: la table project_file_acls peut ne pas exister
    return;
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    for (const file of Array.from(files)) {
      const key = `${prefix}${file.name}`;
      const { error } = await supabase.storage.from("project-files").upload(key, file, { upsert: true });
      if (error) {
        console.error("upload error", error);
        toast({ title: "Erreur upload", description: file.name });
      }
    }
    toast({ title: "Upload terminé" });
    list(prefix);
  };

  const goInto = (name: string) => setPrefix(`${prefix}${name}/`);
  const goUp = () => {
    if (!canGoUp) return;
    const parts = prefix.split("/").filter(Boolean);
    parts.pop(); // remove current empty part due to trailing /
    parts.pop(); // remove current folder
    const newPrefix = parts.length ? parts.join("/") + "/" : basePrefix;
    setPrefix(newPrefix);
  };

  const openSignedUrl = async (name: string) => {
    const filePath = `${prefix}${name}`;
    const { data, error } = await supabase.storage.from("project-files").createSignedUrl(filePath, 60 * 60);
    if (error || !data) {
      console.error("signed url error", error);
      toast({ title: "Erreur", description: "Lien indisponible" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const download = async (name: string) => {
    // Simple: on ouvre le lien signé (téléchargement côté navigateur)
    await openSignedUrl(name);
  };

  const preview = async (name: string) => {
    await openSignedUrl(name);
  };

  const removeFile = async (name: string) => {
    const filePath = `${prefix}${name}`;
    const { error } = await supabase.storage.from("project-files").remove([filePath]);
    if (error) {
      console.error("remove error", error);
      toast({ title: "Erreur", description: "Suppression impossible" });
    } else {
      list(prefix);
    }
  };

  // Utils: lister récursivement tous les fichiers dans un préfixe
  const listAllInPrefix = async (p: string): Promise<string[]> => {
    const out: string[] = [];
    const stack: string[] = [p];
    while (stack.length) {
      const current = stack.pop()!;
      const { data, error } = await supabase.storage.from("project-files").list(current, {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) {
        console.error("listAllInPrefix error", error);
        continue;
      }
      for (const item of (data as Entry[])) {
        const isFolder = (item as any).metadata === null;
        if (isFolder) {
          stack.push(`${current}${item.name}/`);
        } else {
          out.push(`${current}${item.name}`);
        }
      }
    }
    return out;
  };

  const deleteFolder = async (folderName: string) => {
    const folderPrefix = `${prefix}${folderName}/`;
    const files = await listAllInPrefix(folderPrefix);
    if (files.length) {
      const { error } = await supabase.storage.from("project-files").remove(files);
      if (error) {
        console.error("deleteFolder error", error);
        toast({ title: "Erreur", description: "Suppression du dossier impossible" });
        return;
      }
    }
    // Remove the folder object itself (created via createFolder)
    await supabase.storage.from("project-files").remove([folderPrefix]);
    toast({ title: "Dossier supprimé" });
    list(prefix);
  };

  const renameFile = async (oldName: string) => {
    const newName = (prompt("Nouveau nom du fichier", oldName) ?? "").trim();
    if (!newName || newName === oldName) return;
    const from = `${prefix}${oldName}`;
    const to = `${prefix}${newName}`;
    const { error } = await supabase.storage.from("project-files").move(from, to);
    if (error) {
      console.error("rename file error", error);
      toast({ title: "Erreur", description: "Renommage du fichier impossible" });
      return;
    }
    toast({ title: "Fichier renommé" });
    list(prefix);
  };

  const renameFolder = async (folderName: string) => {
    const newName = (prompt("Nouveau nom du dossier", folderName) ?? "").trim();
    if (!newName || newName === folderName) return;
    const oldPrefix = `${prefix}${folderName}/`;
    const newPrefix = `${prefix}${newName}/`;
    const files = await listAllInPrefix(oldPrefix);
    for (const f of files) {
      const relative = f.replace(oldPrefix, "");
      const target = `${newPrefix}${relative}`;
      const { error } = await supabase.storage.from("project-files").move(f, target);
      if (error) console.error("move in renameFolder", f, error);
    }
    // Remove the old empty folder marker if any and create the new one to keep structure
    await supabase.storage.from("project-files").remove([oldPrefix]);
    await supabase.storage
      .from("project-files")
      .upload(`${newPrefix}.keep`, new Blob([new Uint8Array()]), { upsert: true, contentType: "text/plain" });
    toast({ title: "Dossier renommé" });
    list(prefix);
  };

  // DnD - Déplacement d'un fichier vers un dossier
  const moveToFolder = useCallback(async (filePath: string, targetFolderName: string) => {
    const fileName = filePath.split("/").pop() as string;
    const targetPath = `${prefix}${targetFolderName}/${fileName}`;
    if (filePath === targetPath) return;

    const { error } = await supabase.storage.from("project-files").move(filePath, targetPath);
    if (error) {
      console.error("move error", error);
      toast({ title: "Erreur", description: "Déplacement impossible" });
      return;
    }

    toast({ title: "Fichier déplacé" });
    list(prefix);
  }, [prefix]);

  // Zone de drop pour upload
  const onDragOverContainer = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const onDragLeaveContainer = () => setIsDragOver(false);
  const onDropContainer = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const dt = e.dataTransfer;
    if (dt?.files && dt.files.length > 0) {
      handleUpload(dt.files);
      return;
    }
  };

  const onDragStartFile = (e: React.DragEvent, name: string) => {
    const fromPath = `${prefix}${name}`;
    setDragPath(fromPath);
    e.dataTransfer.setData("text/x-path", fromPath);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDropOnFolder = (e: React.DragEvent, folderName: string) => {
    e.preventDefault();
    const fromData = e.dataTransfer.getData("text/x-path");
    const fromPath = fromData || dragPath;
    if (fromPath) {
      moveToFolder(fromPath, folderName);
    }
    setDragPath(null);
  };

  const openShare = (name: string) => {
    const filePath = `${prefix}${name}`;
    setSharePath(filePath);
    setShareOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Folder className="h-5 w-5" />
        <h2 className="text-2xl font-bold">Drive du projet</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestion des fichiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-1">
              <label className="text-sm font-medium">Projet</label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un projet" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          <div className="flex items-center justify-between border rounded-md p-3">
            <nav className="flex items-center gap-1 text-sm">
              {breadcrumbs.map((b, idx) => (
                <div key={b.path} className="flex items-center">
                  <button
                    className={`hover:underline ${idx === breadcrumbs.length - 1 ? "font-medium" : "text-primary"}`}
                    onClick={() => setPrefix(b.path)}
                    disabled={idx === breadcrumbs.length - 1}
                  >
                    {b.label}
                  </button>
                  {idx < breadcrumbs.length - 1 && (
                    <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* Conteneur avec dropzone pour l'upload */}
          <div
            className={`rounded-md border p-2 ${isDragOver ? "ring-2 ring-primary" : ""}`}
            onDragOver={onDragOverContainer}
            onDragLeave={onDragLeaveContainer}
            onDrop={onDropContainer}
          >
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Tuiles d'action */}
                <div className="rounded-md p-4 flex flex-col items-center justify-center gap-2 hover-scale cursor-pointer bg-muted border-2 border-dashed">
                  <label className="flex flex-col items-center gap-2 cursor-pointer">
                    <Upload className="h-6 w-6" />
                    <span className="text-sm font-medium">Uploader des fichiers</span>
                    <input type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                  </label>
                </div>
                <button
                  className="rounded-md p-4 flex flex-col items-center justify-center gap-2 hover-scale bg-muted border-2 border-dashed"
                  onClick={() => createFolder()}
                >
                  <FolderPlus className="h-6 w-6" />
                  <span className="text-sm font-medium">Nouveau dossier</span>
                </button>

                {/* Liste dossiers/fichiers */}
                {entries.map((e) => {
                  const isFolder = e.metadata === null;
                  const isFile = !isFolder;
                  return (
                      <div
                        key={e.name}
                        className={`group relative rounded-md p-3 flex items-center justify-between transition ${isFolder ? "border bg-background hover:bg-accent/40" : "bg-background hover:bg-accent/30"}`}
                        draggable={isFile}
                        onDragStart={(evt) => isFile && onDragStartFile(evt, e.name)}
                      >
                      {isFile ? (
                        <div className="flex items-center gap-3 min-w-0">
                          <FileIcon className="h-5 w-5" />
                          <button className="truncate text-left" onClick={() => preview(e.name)}>
                            <span className="text-sm font-medium truncate block">{e.name}</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          className="flex items-center gap-3 min-w-0"
                          onClick={() => goInto(e.name)}
                          onDragOver={(evt) => evt.preventDefault()}
                          onDrop={(evt) => onDropOnFolder(evt, e.name)}
                        >
                          <Folder className="h-5 w-5" />
                          <span className="text-sm font-medium truncate">{e.name}</span>
                        </button>
                      )}

                      {/* Menu actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Actions">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isFile ? (
                            <>
                              <DropdownMenuItem onClick={() => preview(e.name)}>
                                <Eye className="h-4 w-4 mr-2" /> Aperçu
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => download(e.name)}>
                                <Download className="h-4 w-4 mr-2" /> Télécharger
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openShare(e.name)}>
                                <Share2 className="h-4 w-4 mr-2" /> Partager
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => renameFile(e.name)}>
                                <Pencil className="h-4 w-4 mr-2" /> Renommer
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => removeFile(e.name)} className="text-destructive">
                                <Trash className="h-4 w-4 mr-2" /> Supprimer
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              <DropdownMenuItem onClick={() => renameFolder(e.name)}>
                                <Pencil className="h-4 w-4 mr-2" /> Renommer le dossier
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteFolder(e.name)} className="text-destructive">
                                <Trash className="h-4 w-4 mr-2" /> Supprimer le dossier
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <FileShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        projectId={projectId}
        path={sharePath}
      />
    </div>
  );
}

