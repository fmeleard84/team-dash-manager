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
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (project && isOpen) {
      setTitle(project.title);
      setDescription(project.description || "");
      setProjectDate(project.project_date);
      setClientBudget(project.client_budget?.toString() || "");
      setDueDate(project.due_date || "");
      setFile(null);
    }
  }, [project, isOpen]);

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
        const path = `project/${project.id}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(path, file, { upsert: true });
        
        if (uploadError) {
          console.error("Erreur upload:", uploadError);
          toast.error("Erreur lors de l'upload du fichier");
        } else {
          toast.success("Fichier uploadé avec succès");
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

  const handleClose = () => {
    if (!isUpdating) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Modifier le projet</DialogTitle>
          <DialogDescription>
            Modifiez les informations de votre projet.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Nom du projet *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Application mobile, Site web..."
              required
              disabled={isUpdating}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez brièvement votre projet..."
              rows={3}
              disabled={isUpdating}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project_date">Date de début</Label>
              <Input
                id="edit-project_date"
                type="date"
                value={projectDate}
                onChange={(e) => setProjectDate(e.target.value)}
                required
                disabled={isUpdating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-due_date">Date de fin souhaitée (optionnel)</Label>
              <Input
                id="edit-due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isUpdating}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-client_budget">Budget prévu (optionnel)</Label>
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-project_file">Document (optionnel)</Label>
            <Input
              id="edit-project_file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={isUpdating}
            />
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isUpdating}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={!title.trim() || isUpdating}>
              {isUpdating ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProjectModal;