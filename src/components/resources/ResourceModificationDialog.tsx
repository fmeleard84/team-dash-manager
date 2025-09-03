import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle2, UserMinus, RefreshCw } from "lucide-react";
import { useResourceModification, ResourceChanges, ResourceModificationImpact } from '@/hooks/useResourceModification';

interface ResourceModificationDialogProps {
  open: boolean;
  onClose: () => void;
  assignmentId: string;
  currentResource: {
    profile_id: string;
    profile_name: string;
    seniority: string;
    languages: string[];
    expertises: string[];
  };
  proposedChanges: ResourceChanges;
  onConfirm: () => void;
}

export function ResourceModificationDialog({
  open,
  onClose,
  assignmentId,
  currentResource,
  proposedChanges,
  onConfirm
}: ResourceModificationDialogProps) {
  const [impact, setImpact] = useState<ResourceModificationImpact | null>(null);
  const [customReason, setCustomReason] = useState('');
  const { analyzeModification, applyModification, isAnalyzing, isApplying } = useResourceModification();

  useEffect(() => {
    if (open && assignmentId && proposedChanges) {
      handleAnalyze();
    }
  }, [open, assignmentId, proposedChanges]);

  const handleAnalyze = async () => {
    const result = await analyzeModification(assignmentId, proposedChanges);
    setImpact(result);
  };

  const handleConfirm = async () => {
    if (!impact) return;

    try {
      await applyModification(assignmentId, proposedChanges, customReason);
      onConfirm();
      onClose();
    } catch (error) {
      console.error('Failed to apply modification:', error);
    }
  };

  const renderImpactSummary = () => {
    if (!impact) return null;

    if (!impact.hasImpact) {
      return (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Aucun impact</AlertTitle>
          <AlertDescription>
            {impact.message}
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        {impact.requiresRebooking && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Remplacement requis</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{impact.message}</p>
              {impact.currentCandidate && (
                <div className="mt-2 p-2 bg-red-50 rounded">
                  <p className="text-sm font-medium">Candidat impacté:</p>
                  <p className="text-sm">{impact.currentCandidate.name}</p>
                  <p className="text-sm text-gray-500">{impact.currentCandidate.email}</p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {impact.changeType && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Type de changement:</p>
            <Badge variant={impact.requiresRebooking ? 'destructive' : 'secondary'}>
              {getChangeTypeLabel(impact.changeType)}
            </Badge>
          </div>
        )}

        {impact.missingSkills && (
          <div className="space-y-2">
            {impact.missingSkills.languages.length > 0 && (
              <div>
                <p className="text-sm font-medium">Langues manquantes:</p>
                <div className="flex gap-1 flex-wrap mt-1">
                  {impact.missingSkills.languages.map(lang => (
                    <Badge key={lang} variant="outline">{lang}</Badge>
                  ))}
                </div>
              </div>
            )}
            {impact.missingSkills.expertises.length > 0 && (
              <div>
                <p className="text-sm font-medium">Expertises manquantes:</p>
                <div className="flex gap-1 flex-wrap mt-1">
                  {impact.missingSkills.expertises.map(exp => (
                    <Badge key={exp} variant="outline">{exp}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const getChangeTypeLabel = (type: string): string => {
    switch(type) {
      case 'profile_change':
        return 'Changement de métier';
      case 'seniority_change':
        return 'Changement de séniorité';
      case 'skill_update':
        return 'Mise à jour des compétences';
      default:
        return type;
    }
  };

  const renderChangeSummary = () => {
    const changes = [];

    if (proposedChanges.profile_id && proposedChanges.profile_id !== currentResource.profile_id) {
      changes.push(
        <div key="profile" className="flex items-center gap-2">
          <UserMinus className="h-4 w-4 text-red-500" />
          <span>Changement de profil</span>
        </div>
      );
    }

    if (proposedChanges.seniority && proposedChanges.seniority !== currentResource.seniority) {
      changes.push(
        <div key="seniority" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-orange-500" />
          <span>{currentResource.seniority} → {proposedChanges.seniority}</span>
        </div>
      );
    }

    if (proposedChanges.languages) {
      const added = proposedChanges.languages.filter(l => !currentResource.languages.includes(l));
      const removed = currentResource.languages.filter(l => !proposedChanges.languages!.includes(l));
      
      if (added.length > 0) {
        changes.push(
          <div key="lang-add" className="flex items-center gap-2">
            <span className="text-green-600">+ Langues: {added.join(', ')}</span>
          </div>
        );
      }
      if (removed.length > 0) {
        changes.push(
          <div key="lang-rem" className="flex items-center gap-2">
            <span className="text-red-600">- Langues: {removed.join(', ')}</span>
          </div>
        );
      }
    }

    if (proposedChanges.expertises) {
      const added = proposedChanges.expertises.filter(e => !currentResource.expertises.includes(e));
      const removed = currentResource.expertises.filter(e => !proposedChanges.expertises!.includes(e));
      
      if (added.length > 0) {
        changes.push(
          <div key="exp-add" className="flex items-center gap-2">
            <span className="text-green-600">+ Expertises: {added.join(', ')}</span>
          </div>
        );
      }
      if (removed.length > 0) {
        changes.push(
          <div key="exp-rem" className="flex items-center gap-2">
            <span className="text-red-600">- Expertises: {removed.join(', ')}</span>
          </div>
        );
      }
    }

    return (
      <div className="space-y-2 p-3 bg-gray-50 rounded">
        <p className="text-sm font-medium mb-2">Modifications proposées:</p>
        {changes}
      </div>
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Modification de ressource - {currentResource.profile_name}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Analyse de l'impact de vos modifications sur le projet
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 my-4">
          {renderChangeSummary()}

          {isAnalyzing ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Analyse en cours...</span>
            </div>
          ) : (
            renderImpactSummary()
          )}

          {impact?.requiresRebooking && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Message personnalisé pour le candidat sortant (optionnel):
              </label>
              <textarea
                className="w-full p-2 border rounded min-h-[80px]"
                placeholder="Ajoutez un message personnalisé..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isApplying}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isApplying || isAnalyzing || !impact}
            className={impact?.requiresRebooking ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {isApplying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Application...
              </>
            ) : (
              <>
                {impact?.requiresRebooking ? 'Confirmer et remplacer' : 'Confirmer'}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}