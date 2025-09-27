import { FullScreenModal, ModalActions } from "@/components/ui/fullscreen-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { UserSelectNeon } from "@/components/ui/user-select-neon";
import { UserAvatarNeon } from "@/components/ui/user-avatar-neon";
import { FileText, Flag, Users, X, CalendarDays, Paperclip, Eye, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CardComments } from "../CardComments";
import { TaskRatingDisplay } from "../TaskRatingDisplay";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getStatusFromColumnTitle } from "@/utils/kanbanStatus";
import { forceFileDownload } from "@/utils/fileUpload";

interface CardEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: any;
  onCardChange: (card: any) => void;
  projectMembers: string[];
  projectUsers?: any[];
  uploadedFiles: File[];
  onUploadedFilesChange: (files: File[]) => void;
  onSave: () => void;
  isSaving: boolean;
  uploadProgress: { uploaded: number; total: number };
  readOnly?: boolean;
}

export function CardEditDialog({
  open,
  onOpenChange,
  card,
  onCardChange,
  projectMembers,
  projectUsers,
  uploadedFiles,
  onUploadedFilesChange,
  onSave,
  isSaving,
  uploadProgress,
  readOnly = false
}: CardEditDialogProps) {
  const { user } = useAuth();
  
  if (!card) return null;

  const isCandidate = user?.user_metadata?.role === 'candidate';
  // Determine if card is finalized based on column or explicit flag
  const cardStatus = card.columnTitle ? getStatusFromColumnTitle(card.columnTitle) : card.status;
  const isFinalized = card.isFinalized || cardStatus === 'done';
  const isReadOnlyMode = readOnly || (isCandidate && isFinalized);
  

  // Handler pour ajouter un commentaire
  const handleAddComment = async (text: string) => {
    if (!user) return;
    
    const newComment = {
      id: `comment-${Date.now()}`,
      text: text,
      author: user.email || 'Utilisateur',
      authorId: user.id,
      createdAt: new Date().toISOString()
    };
    
    const updatedComments = [...(card.comments || []), newComment];
    
    // Update card with new comment
    const { error } = await supabase
      .from('kanban_cards')
      .update({ comments: updatedComments })
      .eq('id', card.id);
      
    if (error) {
      throw error;
    }
    
    // Update local state
    onCardChange({ ...card, comments: updatedComments });
    toast.success('Commentaire ajouté');
  };

  return (
    <FullScreenModal isOpen={open} onClose={() => onOpenChange(false)} title="" description="">
      <div className="space-y-6">
        <div className="mb-6">
          <DialogTitle className="text-white text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isReadOnlyMode ? 'Consulter la tâche' : 'Modifier la tâche'}
          </DialogTitle>
        </div>
        <div className="space-y-3 pt-3">
          {/* Titre sur toute la largeur */}
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={card.title}
              onChange={(e) => !isReadOnlyMode && onCardChange({ ...card, title: e.target.value })}
              placeholder="Titre de la tâche..."
              className="h-9 pl-10 text-sm font-medium"
              disabled={isReadOnlyMode}
            />
          </div>

          {/* Priorité */}
          <Select
            value={card.priority || 'medium'}
            onValueChange={(value) => !isReadOnlyMode && onCardChange({ ...card, priority: value })}
            disabled={isReadOnlyMode}
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
                value={card.description || ''}
                onChange={(e) => !isReadOnlyMode && onCardChange({ ...card, description: e.target.value })}
                placeholder="Description détaillée de la tâche..."
                className="min-h-[100px] resize-none text-sm"
                rows={4}
                disabled={isReadOnlyMode}
              />
            </div>

            {/* Date et Membres */}
            <div className="space-y-2">
              {/* Date d'échéance */}
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                <Input
                  type="date"
                  value={card.dueDate || ''}
                  onChange={(e) => !isReadOnlyMode && onCardChange({ ...card, dueDate: e.target.value })}
                  className="h-9 pl-10 text-sm"
                  disabled={isReadOnlyMode}
                  title="Date d'échéance"
                />
              </div>

              {/* Membres assignés */}
              <div className="space-y-2">
                {/* Membres sélectionnés avec avatars */}
                {card.assignedTo?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg min-h-[32px] border border-neutral-200 dark:border-neutral-700">
                    {card.assignedTo?.map((user: string, index: number) => {
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
                          {!isReadOnlyMode && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-0.5 h-3.5 w-3.5 p-0 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full"
                              onClick={() => {
                                const newAssignees = card.assignedTo.filter((_: any, i: number) => i !== index);
                                onCardChange({ ...card, assignedTo: newAssignees });
                              }}
                            >
                              <X className="w-2.5 h-2.5 text-neutral-400 dark:text-neutral-300 hover:text-neutral-600 dark:hover:text-neutral-100" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Sélecteur de membres avec design néon - caché en mode read-only */}
                {!isReadOnlyMode && (
                  <UserSelectNeon
                    users={projectUsers ?
                      projectUsers.filter(u => !card.assignedTo?.includes(`${u.display_name} - ${u.job_title}`)).map(user => ({
                        id: `${user.display_name} - ${user.job_title}`,
                        name: user.display_name,
                        role: user.job_title,
                        email: user.email
                      }))
                      : projectMembers.filter(m => !card.assignedTo?.includes(m)).map((member) => {
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
                      if (value && !card.assignedTo?.includes(value)) {
                        onCardChange({
                          ...card,
                          assignedTo: [...(card.assignedTo || []), value]
                        });
                      }
                    }}
                    placeholder="Ajouter un membre"
                    className="w-full"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Section Fichiers */}
          <div className="space-y-2">
            {card.files && card.files.length > 0 && (
              <>
                <div className="text-xs font-medium text-gray-600">Fichiers joints</div>
                <div className="space-y-2">
                  <div className="p-2 border rounded-md">
                    <div className="text-sm font-medium mb-2">Fichiers ({card.files.length}):</div>
                    {card.files.map((file: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-2 flex-1">
                          <Paperclip className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium">{file.name || `Fichier ${index + 1}`}</span>
                          {file.size && (
                            <span className="text-xs text-gray-500">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {file.url ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => window.open(file.url, '_blank')}
                                title="Voir le fichier"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={async () => {
                                  toast.info('Téléchargement en cours...');
                                  await forceFileDownload(file.url, file.name || `fichier-${index + 1}`);
                                  toast.success('Téléchargement terminé');
                                }}
                                title="Télécharger le fichier"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 italic px-2">
                              Fichier sauvegardé
                            </span>
                          )}
                          {!isReadOnlyMode && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                              onClick={() => {
                                const newFiles = card.files.filter((_: any, i: number) => i !== index);
                                onCardChange({ ...card, files: newFiles });
                                toast.success('Fichier supprimé de la carte');
                              }}
                              title="Supprimer le fichier"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
              
            {/* Upload new files - caché en mode read-only */}
            {!isReadOnlyMode && (
              <>
                {!card.files || card.files.length === 0 && (
                  <div className="text-xs font-medium text-gray-600">Fichiers joints</div>
                )}
                {/* Afficher les fichiers en attente d'upload */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2 mb-2">
                    <div className="text-xs font-medium text-gray-600">Fichiers à uploader :</div>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <div className="flex items-center gap-2 flex-1">
                          <Paperclip className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          onClick={() => {
                            const newFiles = uploadedFiles.filter((_, i) => i !== index);
                            onUploadedFilesChange(newFiles);
                            toast.info('Fichier retiré de la liste');
                          }}
                          title="Retirer de la liste"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
                  <Input
                    id="card-files"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files);
                        // Ajouter aux fichiers existants au lieu de remplacer
                        const existingFiles = uploadedFiles || [];
                        onUploadedFilesChange([...existingFiles, ...newFiles]);
                        console.log('Files selected:', newFiles);
                        console.log('Total files to upload:', [...existingFiles, ...newFiles].length);
                      }
                    }}
                  />
                  <Label htmlFor="card-files" className="cursor-pointer">
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
              </>
            )}
          </div>

          {/* Section Note (pour les candidats sur les cartes finalisées) */}
          {isCandidate && isFinalized && (
            <TaskRatingDisplay taskId={card.id} showForCandidate={true} />
          )}
          
          {/* Section Commentaires - toujours visible */}
          <div className="space-y-2 pt-2">
            <CardComments
              comments={card.comments || []}
              onAddComment={!isCandidate ? handleAddComment : undefined}
              readOnly={isCandidate}
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 sticky bottom-0 bg-white pb-2">
            <Button 
              variant="outline" 
              onClick={() => {
                onOpenChange(false);
                onUploadedFilesChange([]);
              }}
              className="min-w-[100px] border-gray-200 hover:bg-gray-50"
            >
              {isReadOnlyMode ? 'Fermer' : 'Annuler'}
            </Button>
            {!isReadOnlyMode && (
              <Button 
                onClick={onSave} 
                disabled={isSaving}
                className="min-w-[120px] bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                {isSaving ? (
                  uploadProgress.total > 0 ? 
                    `Upload ${uploadProgress.uploaded}/${uploadProgress.total}...` : 
                    'Sauvegarde...'
                ) : 'Sauvegarder'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </FullScreenModal>
  );
}