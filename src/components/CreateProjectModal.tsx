
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
import { IallaLogo } from "./IallaLogo";
import { Calendar, Euro, FileUp, Loader2 } from "lucide-react";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (projectId: string) => void;
}

const CreateProjectModal = ({
  isOpen,
  onClose,
  onProjectCreated,
}: CreateProjectModalProps) => {
  console.log('CreateProjectModal rendered with isOpen:', isOpen);
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
          status: 'pause'
        })
        .select()
        .single();

      if (error) {
        console.error("Erreur création projet:", error);
        toast.error("Erreur lors de la création du projet");
        return;
      }

      // Handle file upload to storage
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

      toast.success("Projet créé avec succès !");
      
      // Reset form
      setTitle("");
      setDescription("");
      setProjectDate(new Date().toISOString().split('T')[0]);
      setClientBudget("");
      setDueDate("");
      setFile(null);
      
      onClose();
      onProjectCreated?.(project.id);

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
      <DialogContent className="sm:max-w-[800px] p-0 gap-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50">
        <DialogHeader className="p-6 pb-4 border-b bg-white/80 backdrop-blur-sm rounded-t-lg">
          <div className="flex items-center gap-3 mb-4">
            <IallaLogo size="sm" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Créer votre projet sur-mesure
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Définissez les détails de votre projet pour que nous puissions composer l'équipe parfaite
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-semibold">Nom du projet *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Refonte de notre site e-commerce"
                required
                disabled={isCreating}
                className="h-12 text-base"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">Description du projet</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez vos objectifs, contraintes et besoins spécifiques..."
                rows={4}
                disabled={isCreating}
                className="text-base resize-none"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project_date" className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date de début
                </Label>
                <Input
                  id="project_date"
                  type="date"
                  value={projectDate}
                  onChange={(e) => setProjectDate(e.target.value)}
                  required
                  disabled={isCreating}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date" className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date de fin souhaitée
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isCreating}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_budget" className="text-sm font-semibold flex items-center gap-2">
                  <Euro className="w-4 h-4" />
                  Budget prévu (optionnel)
                </Label>
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
                  className="h-12 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_file" className="text-sm font-semibold flex items-center gap-2">
                <FileUp className="w-4 h-4" />
                Cahier des charges (optionnel)
              </Label>
              <Input
                id="project_file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={isCreating}
                className="h-12 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                accept=".pdf,.doc,.docx,.txt"
              />
              <p className="text-xs text-gray-500">
                Formats acceptés: PDF, DOC, DOCX, TXT (max 10MB)
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <IallaLogo size="sm" showText={false} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-blue-900">
                    Prochaine étape
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Choisissez vos compétences sur mesure et créez votre team idéale !
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
        
        <DialogFooter className="p-6 pt-0 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!title.trim() || isCreating}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création en cours...
              </>
            ) : (
              "Créer et composer l'équipe"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectModal;
