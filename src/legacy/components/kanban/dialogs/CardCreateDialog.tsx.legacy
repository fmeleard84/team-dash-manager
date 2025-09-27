import { FullScreenModal, ModalActions } from "@/components/ui/fullscreen-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { UserSelectNeon } from "@/components/ui/user-select-neon";
import { UserAvatarNeon } from "@/components/ui/user-avatar-neon";
import { FileText, Flag, Users, X, CalendarDays, Paperclip, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface CardCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardData: any;
  onCardDataChange: (data: any) => void;
  projectMembers: string[];
  projectUsers?: any[];
  uploadedFiles: File[];
  onUploadedFilesChange: (files: File[]) => void;
  onSave: () => void;
  isSaving: boolean;
  uploadProgress: { uploaded: number; total: number };
}

export function CardCreateDialog({
  open,
  onOpenChange,
  cardData,
  onCardDataChange,
  projectMembers,
  projectUsers,
  uploadedFiles,
  onUploadedFilesChange,
  onSave,
  isSaving,
  uploadProgress
}: CardCreateDialogProps) {
  return (
    <FullScreenModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Nouvelle tâche"
      description="Créer une nouvelle tâche pour votre projet"
      actions={
        <ModalActions
          onCancel={() => onOpenChange(false)}
          onSave={onSave}
          cancelText="Annuler"
          saveText="Créer la tâche"
          isSaving={isSaving}
        />
      }
    >
      <div className="space-y-6">
          {/* Titre sur toute la largeur */}
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={cardData.title}
              onChange={(e) => onCardDataChange({ ...cardData, title: e.target.value })}
              placeholder="Titre de la tâche..."
              className="h-9 pl-10 text-sm font-medium"
              required
            />
          </div>

          {/* Priorité */}
          <Select
            value={cardData.priority}
            onValueChange={(value) => onCardDataChange({ ...cardData, priority: value })}
          >
            <SelectTrigger className="h-9">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-gray-400" />
                <SelectValue placeholder="Priorité" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Faible
                </span>
              </SelectItem>
              <SelectItem value="medium">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  Moyenne
                </span>
              </SelectItem>
              <SelectItem value="high">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  Élevée
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Description à gauche, Date et Membres à droite */}
          <div className="grid grid-cols-2 gap-3">
            {/* Description */}
            <div>
              <Textarea
                value={cardData.description}
                onChange={(e) => onCardDataChange({ ...cardData, description: e.target.value })}
                placeholder="Description détaillée de la tâche..."
                className="min-h-[100px] resize-none text-sm"
                rows={4}
              />
            </div>

            {/* Date et Membres */}
            <div className="space-y-2">
              {/* Date d'échéance */}
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                <Input
                  type="date"
                  value={cardData.dueDate}
                  onChange={(e) => onCardDataChange({ ...cardData, dueDate: e.target.value })}
                  className="h-9 pl-10 text-sm"
                  title="Date d'échéance"
                />
              </div>

              {/* Membres assignés */}
              <div className="space-y-2">
                {/* Membres sélectionnés */}
                {cardData.assignedTo.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg min-h-[32px] border border-neutral-200 dark:border-neutral-700">
                    {cardData.assignedTo.map((user: string, index: number) => {
                      const parts = user.split(' - ');
                      const name = parts[0] || user;
                      const role = parts[1] || '';
                      const nameParts = name.split(' ');
                      const initials = nameParts.length > 1
                        ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
                        : name.substring(0, 2).toUpperCase();

                      // Générer un gradient basé sur les initiales
                      const charCode = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0);
                      const gradients = [
                        'from-purple-500 to-pink-500',
                        'from-blue-500 to-cyan-500',
                        'from-green-500 to-emerald-500',
                        'from-orange-500 to-red-500',
                        'from-indigo-500 to-purple-500'
                      ];
                      const gradient = gradients[charCode % gradients.length];

                      return (
                        <div key={index} className="flex items-center gap-1.5 bg-white dark:bg-neutral-800 px-2 py-1 rounded-full border border-neutral-200 dark:border-neutral-700 shadow-sm">
                          <Avatar className="w-5 h-5 border border-white dark:border-neutral-800">
                            <AvatarFallback className={`text-[9px] bg-gradient-to-br ${gradient} text-white font-bold`}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-neutral-700 dark:text-neutral-300">{name}</span>
                          {role && <span className="text-xs text-neutral-500 dark:text-neutral-400">({role})</span>}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-0.5 h-3.5 w-3.5 p-0 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full"
                            onClick={() => {
                              const newAssignees = cardData.assignedTo.filter((_: any, i: number) => i !== index);
                              onCardDataChange({ ...cardData, assignedTo: newAssignees });
                            }}
                          >
                            <X className="w-2.5 h-2.5 text-neutral-400 dark:text-neutral-300 hover:text-neutral-600 dark:hover:text-neutral-100" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Sélecteur de membres avec design néon */}
                <UserSelectNeon
                  users={projectUsers ?
                    projectUsers.filter(u => !cardData.assignedTo.includes(`${u.display_name} - ${u.job_title}`)).map(user => ({
                      id: `${user.display_name} - ${user.job_title}`,
                      name: user.display_name,
                      role: user.job_title,
                      email: user.email
                    }))
                    : projectMembers.filter(m => !cardData.assignedTo.includes(m)).map((member) => {
                      const parts = member.split(' - ');
                      const name = parts[0];
                      const role = parts[1] || '';
                      return {
                        id: member,
                        name: name,
                        role: role
                      };
                    })
                  }
                  selectedUserId=""
                  onUserChange={(value) => {
                    if (value && !cardData.assignedTo.includes(value)) {
                      onCardDataChange({
                        ...cardData,
                        assignedTo: [...cardData.assignedTo, value]
                      });
                    }
                  }}
                  placeholder="Ajouter un membre"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Section Fichiers */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-600">Fichiers joints</div>
            <div className="space-y-2">
              {/* Display selected files if any */}
              {uploadedFiles.length > 0 && (
                <div className="p-2 border rounded-md">
                  <div className="text-sm font-medium mb-2">Fichiers sélectionnés:</div>
                  {uploadedFiles.map((file: File, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2 flex-1">
                        <Paperclip className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          onClick={() => {
                            const newFiles = uploadedFiles.filter((_, i: number) => i !== index);
                            onUploadedFilesChange(newFiles);
                            toast.success('Fichier retiré de la sélection');
                          }}
                          title="Retirer le fichier"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Upload new files */}
              <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
                <Input
                  id="new-card-files"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      const newFiles = Array.from(e.target.files);
                      // Ajouter aux fichiers existants au lieu de remplacer
                      const existingFiles = uploadedFiles || [];
                      onUploadedFilesChange([...existingFiles, ...newFiles]);
                      console.log('New card files selected:', newFiles);
                      console.log('Total files to upload:', [...existingFiles, ...newFiles].length);
                    }
                  }}
                />
                <Label htmlFor="new-card-files" className="cursor-pointer">
                  <div className="text-sm text-gray-600">
                    Cliquez pour ajouter des fichiers ou glissez-déposez
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="mt-2 text-xs text-green-600">
                      {uploadedFiles.length} fichier(s) sélectionné(s)
                    </div>
                  )}
                </Label>
              </div>
            </div>
          </div>
        </div>
    </FullScreenModal>
  );
}