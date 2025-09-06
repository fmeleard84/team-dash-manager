import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FullScreenModal, ModalActions } from "@/components/ui/fullscreen-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  
  // Get today's date for minimum date validation
  const today = new Date().toISOString().split('T')[0];

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
        .list(`projects/${projectId}`, {
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
          file_path: `projects/${projectId}/${file.name}`
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

    // Validate dates
    if (projectDate < today) {
      toast.error("La date de début ne peut pas être dans le passé");
      return;
    }

    if (dueDate && dueDate < projectDate) {
      toast.error("La date de fin doit être après la date de début");
      return;
    }

    setIsUpdating(true);
    try {
      // Log the data being sent for debugging
      const updateData = {
        title: title.trim(),
        description: description.trim() || null,
        project_date: projectDate,
        client_budget: clientBudget.trim() !== "" ? Number(clientBudget) : null,
        due_date: dueDate.trim() !== "" ? dueDate : null,
      };
      
      console.log("📊 Données projet à mettre à jour:", updateData);
      console.log("📅 project_date:", updateData.project_date);
      console.log("📅 due_date:", updateData.due_date);
      console.log("💰 client_budget:", updateData.client_budget);

      const { error } = await supabase
        .from("projects")
        .update(updateData)
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
        
        const path = `projects/${project.id}/${sanitizedFileName}`;
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
    <FullScreenModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Modifier votre projet"
      description="Actualisez les informations de votre projet selon vos nouveaux besoins"
      actions={
        <ModalActions
          onSave={handleSubmit}
          onCancel={handleClose}
          saveText={isUpdating ? "Mise à jour en cours..." : "Mettre à jour le projet"}
          cancelText="Annuler"
          saveDisabled={!title.trim() || isUpdating}
          isLoading={isUpdating}
        />
      }
    >
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations principales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations du projet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="text-sm font-semibold">Nom du projet *</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Refonte de notre site e-commerce"
                  required
                  disabled={isUpdating}
                  className="h-12 text-base"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-sm font-semibold">Description du projet</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez vos objectifs, contraintes et besoins spécifiques..."
                  rows={5}
                  disabled={isUpdating}
                  className="text-base resize-none"
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Planning et budget */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Planning et budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-project_date" className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date de début
                  </Label>
                  <Input
                    id="edit-project_date"
                    type="date"
                    value={projectDate}
                    onChange={(e) => setProjectDate(e.target.value)}
                    min={today}
                    required
                    disabled={isUpdating}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-due_date" className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date de fin souhaitée
                  </Label>
                  <Input
                    id="edit-due_date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={projectDate || today}
                    disabled={isUpdating}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-client_budget" className="text-sm font-semibold flex items-center gap-2">
                    <Euro className="w-4 h-4" />
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
                    className="h-12 text-base"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-project_file" className="text-sm font-semibold flex items-center gap-2">
                  <FileUp className="w-4 h-4" />
                  Cahier des charges (optionnel)
                </Label>
                
                {/* Affichage des fichiers existants */}
                {existingFiles.length > 0 && (
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-2">Fichiers existants :</p>
                    <div className="flex flex-wrap gap-2">
                      {existingFiles.map((file) => (
                        <div key={file.id} className="flex items-center gap-2 py-1 px-3 bg-white rounded border border-blue-200/30">
                          <span className="text-sm text-gray-700 truncate max-w-[200px]">{file.file_name}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(file.id, file.file_path)}
                            disabled={isUpdating}
                            className="text-red-500 hover:text-red-700"
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
                  className="h-12 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  accept=".pdf,.doc,.docx,.txt"
                />
                <p className="text-xs text-gray-500">
                  Formats acceptés : PDF, DOC, DOCX, TXT (max 10MB)
                </p>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </FullScreenModal>
  );
};

export default EditProjectModal;