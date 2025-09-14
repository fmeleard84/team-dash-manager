import { useState } from "react";
import { FullScreenModal, ModalActions } from "@/components/ui/fullscreen-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Rocket, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface KickoffDialogProps {
  open: boolean;
  projectTitle: string;
  onClose: () => void;
  onConfirm: (kickoffISO: string) => void;
}

export function KickoffDialog({ open, projectTitle, onClose, onConfirm }: KickoffDialogProps) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().slice(0, 10);
  const defaultTime = "10:00";

  const [date, setDate] = useState<string>(defaultDate);
  const [time, setTime] = useState<string>(defaultTime);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  const handleConfirm = async () => {
    try {
      // Validation de la date et de l'heure
      if (!date || !time) {
        console.error("Date ou heure manquante:", { date, time });
        toast.error("Veuillez sélectionner une date et une heure");
        return;
      }

      const [hours, minutes] = time.split(":").map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        console.error("Format d'heure invalide:", time);
        toast.error("Format d'heure invalide");
        return;
      }

      // Créer la date avec l'heure correcte
      const dt = new Date(date);
      dt.setHours(hours, minutes, 0, 0);
      
      // Vérifier que la date est valide
      if (isNaN(dt.getTime())) {
        console.error("Date invalide:", { date, time, result: dt });
        toast.error("Date invalide");
        return;
      }

      const isoDate = dt.toISOString();
      console.log("Date kickoff confirmée:", isoDate);
      
      // Démarrer l'animation de progression
      setIsProcessing(true);
      setProgress(0);
      setProgressMessage("Initialisation du projet...");
      
      // Simuler la progression
      const progressSteps = [
        { value: 20, message: "Création du planning..." },
        { value: 40, message: "Configuration du Kanban..." },
        { value: 60, message: "Préparation du Drive..." },
        { value: 80, message: "Envoi des invitations..." },
        { value: 95, message: "Finalisation..." }
      ];
      
      let stepIndex = 0;
      const progressInterval = setInterval(() => {
        if (stepIndex < progressSteps.length) {
          setProgress(progressSteps[stepIndex].value);
          setProgressMessage(progressSteps[stepIndex].message);
          stepIndex++;
        }
      }, 400);
      
      // Appeler onConfirm
      await onConfirm(isoDate);
      
      // Nettoyer
      clearInterval(progressInterval);
      setProgress(100);
      setProgressMessage("Projet démarré avec succès !");
      
      // Attendre un peu avant de fermer
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        setProgressMessage("");
      }, 500);
      
    } catch (error) {
      console.error("Erreur lors du formatage de la date:", error);
      toast.error("Erreur lors du formatage de la date");
      setIsProcessing(false);
      setProgress(0);
      setProgressMessage("");
    }
  };

  return (
    <FullScreenModal
      isOpen={open}
      onClose={onClose}
      title="Planifier la réunion de lancement"
      description={`Projet : ${projectTitle}`}
      actions={
        !isProcessing && (
          <ModalActions
            onCancel={onClose}
            onSave={handleConfirm}
            cancelText="Annuler"
            saveText="Lancer le projet"
            customActions={
              <div className="flex items-center gap-2 mr-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded blur opacity-50" />
                  <Rocket className="w-5 h-5 text-primary-500 relative z-10" />
                </div>
                <span className="font-medium bg-gradient-to-r from-primary-600 to-secondary-600 text-transparent bg-clip-text">
                  Kickoff
                </span>
              </div>
            }
          />
        )
      }
    >
      <div className="space-y-8">
        {/* Loader de progression pendant le traitement */}
        {isProcessing && (
          <div className="fixed inset-0 bg-neutral-900/95 dark:bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center">
            <div className="max-w-md w-full mx-4">
              <div className="backdrop-blur-xl bg-white/90 dark:bg-neutral-900/90 rounded-2xl shadow-2xl shadow-primary-500/20 border border-primary-500/30 dark:border-primary-500/50 p-8 space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full blur-xl opacity-50 animate-pulse" />
                    <Loader2 className="h-16 w-16 text-primary-500 animate-spin relative z-10" />
                    <Rocket className="h-8 w-8 text-secondary-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20" />
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 text-transparent bg-clip-text">
                    Création du projet en cours
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">{progressMessage}</p>
                </div>

                <div className="space-y-2">
                  <Progress value={progress} className="h-2 bg-neutral-200 dark:bg-neutral-800" />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">{progress}%</p>
                </div>

                <div className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                  Veuillez patienter pendant la configuration de vos outils collaboratifs...
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Section information */}
        <div className="backdrop-blur-xl bg-gradient-to-r from-primary-500/10 to-secondary-500/10 dark:from-primary-500/20 dark:to-secondary-500/20 rounded-xl p-6 border border-primary-500/30 dark:border-primary-500/50 shadow-lg shadow-primary-500/10">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg blur-lg opacity-50 animate-pulse" />
              <div className="relative w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center shadow-neon-purple">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 dark:text-white text-lg mb-2">
                Démarrer avec votre nouvelle équipe !
              </h3>
              <p className="text-neutral-700 dark:text-neutral-300">
                Planifiez la première réunion de lancement avec toute l'équipe. 
                Un email d'invitation sera automatiquement envoyé à tous les participants.
              </p>
            </div>
          </div>
        </div>

        {/* Section date et heure */}
        <div className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 border border-primary-500/30 dark:border-primary-500/50 rounded-xl p-6 shadow-lg shadow-primary-500/10">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-primary-600 to-secondary-600 text-transparent bg-clip-text mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-500" />
            Choisir la date et l'heure
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label
                htmlFor="kickoff-date"
                className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                <Calendar className="w-4 h-4 text-primary-500" />
                Date du kickoff
              </Label>
              <Input
                id="kickoff-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 text-base bg-white/50 dark:bg-neutral-800/50 border-primary-300 dark:border-primary-700 focus:border-primary-500 focus:ring-primary-500 text-neutral-900 dark:text-white"
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>

            <div className="space-y-3">
              <Label
                htmlFor="kickoff-time"
                className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                <Clock className="w-4 h-4 text-primary-500" />
                Heure de début
              </Label>
              <Input
                id="kickoff-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-12 text-base bg-white/50 dark:bg-neutral-800/50 border-primary-300 dark:border-primary-700 focus:border-primary-500 focus:ring-primary-500 text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          {/* Affichage de la date formatée */}
          <div className="mt-6 p-4 backdrop-blur-xl bg-gradient-to-r from-primary-500/10 to-secondary-500/10 dark:from-primary-500/20 dark:to-secondary-500/20 border border-primary-500/30 dark:border-primary-500/50 rounded-lg shadow-neon-purple">
            <p className="text-sm text-neutral-800 dark:text-neutral-200">
              <strong className="text-primary-600 dark:text-primary-400">Réunion planifiée :</strong>{' '}
              {new Date(date + 'T' + time).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}{' '}
              à <span className="font-semibold text-secondary-600 dark:text-secondary-400">{time}</span>
            </p>
          </div>
        </div>

        {/* Section informations supplémentaires */}
        <div className="backdrop-blur-xl bg-gradient-to-r from-secondary-500/10 to-primary-500/10 dark:from-secondary-500/20 dark:to-primary-500/20 border border-secondary-500/30 dark:border-secondary-500/50 rounded-xl p-4 shadow-lg shadow-secondary-500/10">
          <div className="flex gap-3">
            <Rocket className="w-5 h-5 text-secondary-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-neutral-700 dark:text-neutral-300">
              <p className="font-medium mb-1 text-secondary-600 dark:text-secondary-400">Ce qui va se passer :</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Création automatique du calendrier Schedule-X partagé</li>
                <li>Configuration des outils collaboratifs (Kanban, Drive, Messages)</li>
                <li>Envoi des invitations à tous les membres de l'équipe</li>
                <li>Génération du lien de visioconférence Jitsi</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </FullScreenModal>
  );
}