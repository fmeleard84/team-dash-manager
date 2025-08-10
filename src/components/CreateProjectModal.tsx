
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

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (projectData: {
    title: string;
    description?: string;
    project_date: string;
    client_budget?: number;
    due_date?: string;
  }) => void;
  isCreating: boolean;
}

const CreateProjectModal = ({
  isOpen,
  onClose,
  onCreateProject,
  isCreating,
}: CreateProjectModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectDate, setProjectDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [clientBudget, setClientBudget] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreateProject({
      title: title.trim(),
      description: description.trim() || undefined,
      project_date: projectDate,
      client_budget: clientBudget.trim() !== "" ? Number(clientBudget) : undefined,
      due_date: dueDate.trim() !== "" ? dueDate : undefined,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setProjectDate(new Date().toISOString().split('T')[0]);
    setClientBudget("");
    setDueDate("");
  };

  const handleClose = () => {
    if (!isCreating) {
      setTitle("");
      setDescription("");
      setProjectDate(new Date().toISOString().split('T')[0]);
      setClientBudget("");
      setDueDate("");
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
