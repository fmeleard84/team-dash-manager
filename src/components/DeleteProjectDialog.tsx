import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Archive, 
  Trash2, 
  Info,
  Shield,
  Users,
  FileText,
  HardDrive
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DeleteProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    title: string;
    status: string;
  };
  onProjectDeleted?: () => void;
  onProjectArchived?: () => void;
}

type ActionType = 'archive' | 'delete';

export function DeleteProjectDialog({
  isOpen,
  onClose,
  project,
  onProjectDeleted,
  onProjectArchived
}: DeleteProjectDialogProps) {
  const [actionType, setActionType] = useState<ActionType>('archive');
  const [confirmationText, setConfirmationText] = useState('');
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Texte de confirmation requis selon l'action
  const getRequiredText = () => {
    if (actionType === 'delete') {
      return `DELETE ${project.title}`;
    }
    return `ARCHIVE ${project.title}`;
  };

  const isConfirmationValid = () => {
    return confirmationText === getRequiredText();
  };

  const handleAction = async () => {
    if (!isConfirmationValid()) {
      toast.error('Le texte de confirmation ne correspond pas');
      return;
    }

    setIsProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      if (actionType === 'archive') {
        // Vérifier d'abord si le projet est déjà archivé
        const { data: projectData, error: checkError } = await supabase
          .from('projects')
          .select('archived_at')
          .eq('id', project.id)
          .single();
        
        if (checkError) throw checkError;
        
        if (projectData?.archived_at) {
          toast.info('Projet déjà archivé', {
            description: 'Ce projet est déjà en lecture seule'
          });
          onProjectArchived?.();
          onClose();
          return;
        }
        
        // Appeler la fonction d'archivage
        const { data, error } = await supabase.rpc('archive_project', {
          project_id_param: project.id,
          user_id_param: user.id,
          reason_param: reason || null
        });

        if (error) throw error;
        
        if (data?.success) {
          toast.success('Projet archivé avec succès', {
            description: 'Le projet est maintenant en lecture seule'
          });
          onProjectArchived?.();
          onClose();
        } else {
          throw new Error(data?.error || 'Erreur lors de l\'archivage');
        }
      } else {
        // Vérifier d'abord si le projet est déjà supprimé
        const { data: projectData, error: checkError } = await supabase
          .from('projects')
          .select('deleted_at')
          .eq('id', project.id)
          .single();
        
        if (checkError) throw checkError;
        
        if (projectData?.deleted_at) {
          toast.info('Projet déjà supprimé', {
            description: 'Ce projet a déjà été supprimé'
          });
          onProjectDeleted?.();
          onClose();
          return;
        }
        
        // Appeler la fonction de suppression douce
        const { data, error } = await supabase.rpc('soft_delete_project', {
          project_id_param: project.id,
          user_id_param: user.id,
          reason_param: reason || null
        });

        if (error) throw error;
        
        if (data?.success) {
          toast.success('Projet supprimé', {
            description: `${data.affected_users || 0} utilisateurs ont été notifiés`
          });
          onProjectDeleted?.();
          onClose();
        } else {
          throw new Error(data?.error || 'Erreur lors de la suppression');
        }
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'opération', {
        description: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setActionType('archive');
    setConfirmationText('');
    setReason('');
  };

  const handleClose = () => {
    if (!isProcessing) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" />
            Action sur le projet
          </DialogTitle>
          <DialogDescription>
            Choisissez l'action à effectuer sur le projet "{project.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Choix de l'action */}
          <div className="space-y-3">
            <Label>Type d'action</Label>
            <RadioGroup value={actionType} onValueChange={(v) => setActionType(v as ActionType)}>
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="archive" id="archive" className="mt-1" />
                <label htmlFor="archive" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium">
                    <Archive className="w-4 h-4 text-blue-500" />
                    Archiver le projet
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Le projet devient lecture seule. Toutes les données restent accessibles mais aucune modification n'est possible.
                    Cette action est réversible.
                  </p>
                </label>
              </div>
              
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="delete" id="delete" className="mt-1" />
                <label htmlFor="delete" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium">
                    <Trash2 className="w-4 h-4 text-red-500" />
                    Supprimer le projet
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Suppression définitive. Les données financières et historiques sont conservées mais le projet n'est plus accessible.
                    Cette action est irréversible.
                  </p>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Avertissements selon l'action */}
          {actionType === 'delete' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Attention - Action irréversible</AlertTitle>
              <AlertDescription className="space-y-2 mt-2">
                <p>La suppression entraînera :</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    Perte d'accès pour tous les membres de l'équipe
                  </li>
                  <li className="flex items-center gap-2">
                    <HardDrive className="w-3 h-3" />
                    Suppression des accès Drive, Kanban et Messages
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="w-3 h-3" />
                    Les factures et paiements restent accessibles pour l'historique
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {actionType === 'archive' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Information - Archivage</AlertTitle>
              <AlertDescription>
                L'archivage permet de conserver toutes les données en lecture seule.
                Vous pourrez réactiver le projet à tout moment depuis la section "Projets archivés".
              </AlertDescription>
            </Alert>
          )}

          {/* Raison (optionnelle) */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Raison (optionnel)
            </Label>
            <Textarea
              id="reason"
              placeholder="Expliquez pourquoi vous effectuez cette action..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Pour confirmer, tapez <span className="font-mono font-bold">{getRequiredText()}</span>
            </Label>
            <Input
              id="confirmation"
              type="text"
              placeholder="Tapez le texte de confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className={!isConfirmationValid() && confirmationText ? 'border-red-500' : ''}
            />
            {confirmationText && !isConfirmationValid() && (
              <p className="text-sm text-red-500">
                Le texte ne correspond pas
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Annuler
          </Button>
          <Button
            variant={actionType === 'delete' ? 'destructive' : 'default'}
            onClick={handleAction}
            disabled={!isConfirmationValid() || isProcessing}
          >
            {isProcessing ? (
              <>Traitement...</>
            ) : (
              <>
                {actionType === 'archive' ? (
                  <>
                    <Archive className="w-4 h-4 mr-2" />
                    Archiver le projet
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer le projet
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}