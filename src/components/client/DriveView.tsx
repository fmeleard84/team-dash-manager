import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FolderPlus, Upload, Folder, File as FileIcon, ArrowLeft, Download, Trash } from "lucide-react";

interface Project { id: string; title: string }
interface Entry { name: string; id?: string; created_at?: string; updated_at?: string; last_accessed_at?: string; metadata?: any; }

export default function DriveView() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [prefix, setPrefix] = useState<string>("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [folderName, setFolderName] = useState("");
  const [loading, setLoading] = useState(false);

  const basePrefix = useMemo(() => (projectId ? `project/${projectId}/` : ""), [projectId]);
  const canGoUp = useMemo(() => prefix && prefix !== basePrefix, [prefix, basePrefix]);

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
      setEntries(data as Entry[]);
    }
  };

  const createFolder = async () => {
    const name = folderName.trim();
    if (!name) return;
    const key = `${prefix}${name}/.keep`;
    const { error } = await supabase.storage
      .from("project-files")
      .upload(key, new Blob([new Uint8Array()]), { upsert: true });
    if (error) {
      console.error("create folder error", error);
      toast({ title: "Erreur", description: "Création du dossier échouée" });
    } else {
      setFolderName("");
      list(prefix);
    }
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

  const download = async (name: string) => {
    const filePath = `${prefix}${name}`;
    const { data, error } = await supabase.storage.from("project-files").createSignedUrl(filePath, 60 * 60);
    if (error || !data) {
      console.error("signed url error", error);
      toast({ title: "Erreur", description: "Téléchargement impossible" });
      return;
    }
    window.open(data.signedUrl, "_blank");
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

            <div className="flex items-end gap-2 md:col-span-2">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Nouveau dossier</label>
                <Input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="Nom du dossier" />
              </div>
              <Button onClick={createFolder} className="shrink-0" aria-label="Créer un dossier">
                <FolderPlus className="h-4 w-4 mr-2" /> Créer
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between border rounded-md p-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goUp} disabled={!canGoUp}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Dossier parent
              </Button>
              <span className="text-sm text-muted-foreground">/{prefix}</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <Upload className="h-4 w-4" />
                <span className="text-sm">Uploader</span>
                <input type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
              </label>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-2">
              {entries.map((e) => (
                e.name.endsWith("/") ? null : (
                  <div key={e.name} className="flex items-center justify-between border rounded-md p-2">
                    {e.name.includes(".") ? (
                      <div className="flex items-center gap-2">
                        <FileIcon className="h-4 w-4" />
                        <span className="text-sm">{e.name}</span>
                      </div>
                    ) : (
                      <button className="flex items-center gap-2" onClick={() => goInto(e.name)}>
                        <Folder className="h-4 w-4" />
                        <span className="text-sm font-medium">{e.name}</span>
                      </button>
                    )}
                    {e.name.includes(".") ? (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => download(e.name)} aria-label="Télécharger">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => removeFile(e.name)} aria-label="Supprimer">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
