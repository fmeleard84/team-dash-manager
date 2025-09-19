
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FullScreenModal, ModalActions } from "@/components/ui/fullscreen-modal";
import { DatePicker } from "@/components/ui/date-picker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { IallaLogo } from "./IallaLogo";
import { Calendar, Euro, FileUp, Loader2 } from "lucide-react";
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const navigate = useNavigate();
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
      toast.error(t('projects.errors.mustBeLoggedIn'));
      return;
    }

    // Validate dates
    if (projectDate < today) {
      toast.error(t('projects.errors.startDatePast'));
      return;
    }

    if (dueDate && dueDate < projectDate) {
      toast.error(t('projects.errors.endDateBeforeStart'));
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
        toast.error(t('projects.errors.createError') + ': ' + error.message);
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
          toast.error(t('projects.errors.uploadError'));
        } else {
          toast.success(t('projects.uploadSuccess'));
          // TODO: Save file metadata once DB structure is fixed
          console.log("File uploaded to:", path);
        }
      }

      toast.success(t('projects.createSuccess'));
      
      // Reset form
      setTitle("");
      setDescription("");
      setProjectDate(new Date().toISOString().split('T')[0]);
      setClientBudget("");
      setDueDate("");
      setFile(null);
      
      onClose();
      onProjectCreated?.(project.id);
      
      // Naviguer vers la page ReactFlow du projet
      navigate(`/project/${project.id}`);

    } catch (error) {
      console.error("Erreur inattendue:", error);
      toast.error(t('errors.generic'));
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
      title={t('projects.createModal.title')}
      description={t('projects.createModal.description')}
      actions={
        <ModalActions
          onSave={handleSubmit}
          onCancel={handleClose}
          saveText={isCreating ? t('projects.creating') : t('projects.createAndComposeTeam')}
          cancelText={t('common.cancel')}
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
                <Label htmlFor="title" className="text-sm font-semibold">{t('projects.projectName')} *</Label>
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
                <Label htmlFor="description" className="text-sm font-semibold">{t('projects.projectDescription')}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('projects.descriptionPlaceholder')}
                  rows={5}
                  disabled={isCreating}
                  className="text-base resize-none"
                />
              </div>
            </CardContent>
          </Card>
          
          {/* {t('projects.datesAndBudget')} */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Planning et budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project_date" className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t('projects.startDate')}
                </Label>
                <DatePicker
                  value={projectDate}
                  onChange={setProjectDate}
                  placeholder={t('projects.selectStartDate')}
                  minDate={today}
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date" className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t('projects.desiredEndDate')}
                </Label>
                <DatePicker
                  value={dueDate}
                  onChange={setDueDate}
                  placeholder={t('projects.selectEndDate')}
                  minDate={projectDate || today}
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_budget" className="text-sm font-semibold flex items-center gap-2">
                  <Euro className="w-4 h-4" />
                  {t('projects.plannedBudget')} ({t('common.optional')})
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
          
          {/* {t('common.file')} */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('common.documents')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
              <Label htmlFor="project_file" className="text-sm font-semibold flex items-center gap-2">
                <FileUp className="w-4 h-4" />
                {t('projects.specifications')} ({t('common.optional')})
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
                {t('projects.acceptedFormats')}: PDF, DOC, DOCX, TXT (max 10MB)
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
