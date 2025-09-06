
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FullScreenModal, ModalActions } from "@/components/ui/fullscreen-modal";
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
  // Get today's date for minimum date validation
  const today = new Date().toISOString().split('T')[0];
  
  const [projectDate, setProjectDate] = useState(today);
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

    // Validate dates
    if (projectDate < today) {
      toast.error("La date de début ne peut pas être dans le passé");
      return;
    }

    if (dueDate && dueDate < projectDate) {
      toast.error("La date de fin doit être après la date de début");
      return;
    }

    setIsCreating(true);
    try {
      // Log the data being sent for debugging
      const projectData = {
        title: title.trim(),
        description: description.trim() || null,
        project_date: projectDate,
        client_budget: clientBudget.trim() !== "" ? Number(clientBudget) : null,
        due_date: dueDate.trim() !== "" ? dueDate : null,
        owner_id: user.id,
        status: 'pause'
      };
      
      console.log("📊 Données projet à créer:", projectData);
      console.log("📅 project_date:", projectData.project_date);
      console.log("📅 due_date:", projectData.due_date);
      console.log("💰 client_budget:", projectData.client_budget);

      const { data: project, error } = await supabase
        .from("projects")
        .insert(projectData)
        .select()
        .single();

      if (error) {
        console.error("❌ Erreur création projet:", error);
        console.error("❌ Détails de l'erreur:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        toast.error(`Erreur lors de la création du projet: ${error.message}`);
        return;
      }
      
      console.log("✅ Projet créé avec succès:", project);
      console.log("📅 Dates enregistrées - project_date:", project.project_date, "due_date:", project.due_date);
      console.log("💰 Budget enregistré:", project.client_budget);

      // Handle file upload to storage
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
    setProjectDate(today);
    setClientBudget("");
    setDueDate("");
    setFile(null);
    onClose();
  }
};

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Créer votre projet sur-mesure"
      description="Définissez les détails de votre projet pour que nous puissions composer l'équipe parfaite"
      actions={
        <ModalActions
          onSave={handleSubmit}
          onCancel={handleClose}
          saveText={isCreating ? "Création en cours..." : "Créer et composer l'équipe"}
          cancelText="Annuler"
          saveDisabled={!title.trim() || isCreating}
          isLoading={isCreating}
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
                  rows={5}
                  disabled={isCreating}
                  className="text-base resize-none"
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Dates et budget */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Planning et budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  min={today}
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
                  min={projectDate || today}
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
            </CardContent>
          </Card>
          
          {/* Fichier */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documents</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
          
          {/* Note d'information */}
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
    </FullScreenModal>
  );
};

export default CreateProjectModal;
