
import { useState } from "react";
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
import { useAuth } from "@/contexts/AuthContext";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: () => void;
}

const CreateProjectModal = ({
  isOpen,
  onClose,
  onProjectCreated,
}: CreateProjectModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectDate, setProjectDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [clientBudget, setClientBudget] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (!user?.id) {
      toast.error("Vous devez être connecté pour créer un projet");
      return;
    }

    setIsCreating(true);
    try {
      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          project_date: projectDate,
          client_budget: clientBudget.trim() !== "" ? Number(clientBudget) : null,
          due_date: dueDate.trim() !== "" ? dueDate : null,
          owner_id: user.id,
          status: 'draft'
        })
        .select()
        .single();

      if (error) {
        console.error("Erreur création projet:", error);
        toast.error("Erreur lors de la création du projet");
        return;
      }

      // TODO: Handle file upload to storage if needed
      if (file) {
        console.log("File to upload:", file.name);
      }

      toast.success("Projet créé avec succès !");
      
      // Reset form
      setTitle("");
      setDescription("");
      setProjectDate(new Date().toISOString().split('T')[0]);
      setClientBudget("");
      setDueDate("");
      setFile(null);
      
      onClose();
      onProjectCreated?.();

    } catch (error) {
      console.error("Erreur inattendue:", error);
      toast.error("Une erreur inattendue est survenue");
    } finally {
      setIsCreating(false);
    }
  };

const handleClose = () => {
  if (!isCreating) {
    setTitle("");
    setDescription("");
    setProjectDate(new Date().toISOString().split('T')[0]);
    setClientBudget("");
    setDueDate("");
    setFile(null);
    onClose();
  }
};

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Créer un nouveau projet</DialogTitle>
          <DialogDescription>
            Saisissez les informations de base pour votre nouveau projet.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Nom du projet *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Application mobile, Site web..."
              required
              disabled={isCreating}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez brièvement votre projet..."
              rows={3}
              disabled={isCreating}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_date">Date de début</Label>
              <Input
                id="project_date"
                type="date"
                value={projectDate}
                onChange={(e) => setProjectDate(e.target.value)}
                required
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Date de fin souhaitée (optionnel)</Label>
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isCreating}
              />
            </div>
          </div>

<div className="space-y-2">
  <Label htmlFor="client_budget">Budget prévu (optionnel)</Label>
  <Input
    id="client_budget"
    type="number"
    inputMode="decimal"
    step="0.01"
    min="0"
    placeholder="Ex: 15000"
    value={clientBudget}
    onChange={(e) => setClientBudget(e.target.value)}
    disabled={isCreating}
  />
</div>

<div className="space-y-2">
  <Label htmlFor="project_file">Document (optionnel)</Label>
  <Input
    id="project_file"
    type="file"
    onChange={(e) => setFile(e.target.files?.[0] || null)}
    disabled={isCreating}
  />
</div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={!title.trim() || isCreating}>
              {isCreating ? "Création..." : "Créer le projet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectModal;
