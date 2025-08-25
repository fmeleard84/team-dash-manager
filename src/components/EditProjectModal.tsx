import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { IallaLogo } from "./IallaLogo";
import { Calendar, Euro, FileUp, Loader2, Edit } from "lucide-react";

interface Project {
  id: string;
  title: string;
  description?: string;
  project_date: string;
  due_date?: string | null;
  client_budget?: number | null;
}

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectUpdated?: () => void;
  project: Project | null;
}

const EditProjectModal = ({
  isOpen,
  onClose,
  onProjectUpdated,
  project,
}: EditProjectModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectDate, setProjectDate] = useState("");
  const [clientBudget, setClientBudget] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [existingFiles, setExistingFiles] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (project && isOpen) {
      setTitle(project.title);
      setDescription(project.description || "");
      setProjectDate(project.project_date);
      setClientBudget(project.client_budget?.toString() || "");
      setDueDate(project.due_date || "");
      setFile(null);
      
      // Load existing files
      loadExistingFiles(project.id);
    }
  }, [project, isOpen]);

  const loadExistingFiles = async (projectId: string) => {
    try {
      // TODO: Load from project_files table once DB structure is fixed
      // For now, try to list files from storage
      const { data: files, error } = await supabase.storage
        .from('project-files')
        .list(`project/${projectId}`, {
          limit: 100,
          offset: 0
        });
      
      if (error) {
        console.error("Erreur chargement fichiers:", error);
      } else {
        // Transform storage files to match expected format
        const transformedFiles = (files || []).map((file) => ({
          id: file.name,
          file_name: file.name,
          file_path: `project/${projectId}/${file.name}`
        }));
        setExistingFiles(transformedFiles);
      }
    } catch (error) {
      console.error("Erreur inattendue:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !project) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          project_date: projectDate,
          client_budget: clientBudget.trim() !== "" ? Number(clientBudget) : null,
          due_date: dueDate.trim() !== "" ? dueDate : null,
        })
        .eq("id", project.id);

      if (error) {
        console.error("Erreur mise à jour projet:", error);
        toast.error("Erreur lors de la mise à jour du projet");
        return;
      }

      // Handle file upload if new file is provided
      if (file) {
        // Sanitize filename for storage
        const sanitizedFileName = file.name
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .replace(/_{2,}/g, '_')
          .replace(/^_|_$/g, '');
        
        const path = `project/${project.id}/${sanitizedFileName}`;
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(path, file, { upsert: true });
        
        if (uploadError) {
          console.error("Erreur upload:", uploadError);
          toast.error("Erreur lors de l'upload du fichier");
        } else {
          toast.success("Fichier uploadé avec succès");
          // TODO: Save file metadata once DB structure is fixed
          console.log("File uploaded to:", path);
        }
      }

      toast.success("Projet mis à jour avec succès !");
      onClose();
      onProjectUpdated?.();

    } catch (error) {
      console.error("Erreur inattendue:", error);
      toast.error("Une erreur inattendue est survenue");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteFile = async (fileId: string, filePath: string) => {
    try {
      // Delete from storage only for now
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([filePath]);
      
      if (storageError) {
        console.error("Erreur suppression storage:", storageError);
        toast.error("Erreur lors de la suppression du fichier");
      } else {
        toast.success("Fichier supprimé avec succès");
        // Reload files
        if (project) {
          loadExistingFiles(project.id);
        }
      }
    } catch (error) {
      console.error("Erreur inattendue:", error);
      toast.error("Une erreur inattendue est survenue");
    }
  };

  const handleClose = () => {
    if (!isUpdating) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] p-0 gap-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50">
        <DialogHeader className="p-6 pb-4 border-b bg-white/80 backdrop-blur-sm rounded-t-lg">
          <div className="flex items-center gap-3 mb-4">
            <IallaLogo size="sm" />
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Edit className="w-4 h-4 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Modifier votre projet
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Actualisez les informations de votre projet selon vos nouveaux besoins
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 max-h-[55vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="text-sm font-semibold">Nom du projet *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Refonte de notre site e-commerce"
                required
                disabled={isUpdating}
                className="h-9 text-sm"
              />
            </div>
          
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-sm font-semibold">Description du projet</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez vos objectifs, contraintes et besoins spécifiques..."
                  rows={5}
                  disabled={isUpdating}
                  className="text-sm resize-none"
                />
              </div>
              
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="edit-project_date" className="text-xs font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Date de début
                  </Label>
                  <Input
                    id="edit-project_date"
                    type="date"
                    value={projectDate}
                    onChange={(e) => setProjectDate(e.target.value)}
                    required
                    disabled={isUpdating}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-due_date" className="text-xs font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Date de fin souhaitée
                  </Label>
                  <Input
                    id="edit-due_date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={isUpdating}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-client_budget" className="text-xs font-semibold flex items-center gap-1">
                    <Euro className="w-3 h-3" />
                    Budget prévu (optionnel)
                  </Label>
                  <Input
                    id="edit-client_budget"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 15000"
                    value={clientBudget}
                    onChange={(e) => setClientBudget(e.target.value)}
                    disabled={isUpdating}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-project_file" className="text-sm font-semibold flex items-center gap-2">
                <FileUp className="w-4 h-4" />
                Cahier des charges (optionnel)
              </Label>
              
              {/* Affichage ultra-compact des fichiers existants */}
              {existingFiles.length > 0 && (
                <div className="p-1.5 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50 rounded">
                  <div className="flex flex-wrap gap-1">
                    {existingFiles.map((file) => (
                      <div key={file.id} className="flex items-center gap-1 py-0.5 px-1.5 bg-white/80 rounded border border-blue-200/30">
                        <span className="text-xs text-gray-700 truncate max-w-[150px]">{file.file_name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.id, file.file_path)}
                          disabled={isUpdating}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          ×
                        </button>
                      </div>
                  ))}
                  </div>
                </div>
              )}
              
              <Input
                id="edit-project_file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={isUpdating}
                className="h-10 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                accept=".pdf,.doc,.docx,.txt"
              />
              <p className="text-xs text-gray-500">
                PDF, DOC, DOCX, TXT (max 10MB)
              </p>
            </div>
          
          </form>
        </div>
        
        <DialogFooter className="p-6 pt-0 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUpdating}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!title.trim() || isUpdating}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mise à jour en cours...
              </>
            ) : (
              "Mettre à jour le projet"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditProjectModal;