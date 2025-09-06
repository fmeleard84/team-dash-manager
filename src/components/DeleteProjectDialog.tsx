import { useState } from 'react';
import { FullScreenModal, ModalActions } from '@/components/ui/fullscreen-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        
        // Utiliser la nouvelle edge function qui contourne le problème de contrainte
        const { data, error } = await supabase.functions.invoke('fix-project-delete', {
          body: {
            project_id: project.id,
            user_id: user.id,
            reason: reason || null
          }
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
    <FullScreenModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Gestion du projet"
      description={`Choisissez l'action à effectuer sur le projet "${project.title}"`}
      preventClose={isProcessing}
      actions={
        <ModalActions
          onCancel={handleClose}
          cancelText="Annuler"
          customActions={
            <Button
              variant={actionType === 'delete' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={!isConfirmationValid() || isProcessing}
              className={actionType === 'archive' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
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
          }
        />
      }
    >
      <div className="space-y-6">
        {/* Header avec icône */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <Shield className="w-8 h-8 text-orange-500" />
          <div>
            <h2 className="text-xl font-semibold">Action sur le projet</h2>
            <p className="text-sm text-gray-600">Sélectionnez une action ci-dessous</p>
          </div>
        </div>

        {/* Cards pour le choix de l'action */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Type d'action</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={actionType} onValueChange={(v) => setActionType(v as ActionType)} className="space-y-4">
              <div className="flex items-start space-x-3 p-4 border-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                   onClick={() => setActionType('archive')}>
                <RadioGroupItem value="archive" id="archive" className="mt-1" />
                <label htmlFor="archive" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium text-base">
                    <Archive className="w-5 h-5 text-blue-500" />
                    Archiver le projet
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Le projet devient lecture seule. Toutes les données restent accessibles mais aucune modification n'est possible.
                    <span className="block mt-1 text-blue-600 font-medium">✓ Cette action est réversible</span>
                  </p>
                </label>
              </div>
              
              <div className="flex items-start space-x-3 p-4 border-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                   onClick={() => setActionType('delete')}>
                <RadioGroupItem value="delete" id="delete" className="mt-1" />
                <label htmlFor="delete" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium text-base">
                    <Trash2 className="w-5 h-5 text-red-500" />
                    Supprimer le projet
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Suppression définitive. Les données financières et historiques sont conservées mais le projet n'est plus accessible.
                    <span className="block mt-1 text-red-600 font-medium">⚠ Cette action est irréversible</span>
                  </p>
                </label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Avertissements selon l'action */}
        {actionType === 'delete' && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-base">Attention - Action irréversible</AlertTitle>
            <AlertDescription className="space-y-3 mt-3">
              <p className="font-medium">La suppression entraînera :</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <Users className="w-4 h-4 mt-0.5 text-red-600" />
                  <span>Perte d'accès pour tous les membres de l'équipe</span>
                </li>
                <li className="flex items-start gap-3">
                  <HardDrive className="w-4 h-4 mt-0.5 text-red-600" />
                  <span>Suppression des accès Drive, Kanban et Messages</span>
                </li>
                <li className="flex items-start gap-3">
                  <FileText className="w-4 h-4 mt-0.5 text-red-600" />
                  <span>Les factures et paiements restent accessibles pour l'historique</span>
                </li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {actionType === 'archive' && (
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-5 w-5 text-blue-600" />
            <AlertTitle className="text-base text-blue-900">Information - Archivage</AlertTitle>
            <AlertDescription className="text-blue-800 mt-2">
              L'archivage permet de conserver toutes les données en lecture seule.
              Vous pourrez réactiver le projet à tout moment depuis la section "Projets archivés".
            </AlertDescription>
          </Alert>
        )}

        {/* Raison (optionnelle) */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Label htmlFor="reason" className="text-base font-medium">
                Raison de l'action (optionnel)
              </Label>
              <Textarea
                id="reason"
                placeholder="Expliquez pourquoi vous effectuez cette action..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Confirmation */}
        <Card className={actionType === 'delete' ? 'border-red-200' : 'border-blue-200'}>
          <CardHeader>
            <CardTitle className="text-lg">Confirmation requise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label htmlFor="confirmation" className="text-base">
                Pour confirmer, tapez exactement : 
                <span className="font-mono font-bold text-lg ml-2 text-gray-900">
                  {getRequiredText()}
                </span>
              </Label>
              <Input
                id="confirmation"
                type="text"
                placeholder="Tapez le texte de confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className={`text-base ${!isConfirmationValid() && confirmationText ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {confirmationText && !isConfirmationValid() && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Le texte ne correspond pas exactement
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </FullScreenModal>
  );
}