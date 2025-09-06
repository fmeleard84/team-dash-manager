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
              <div className="flex items-center gap-2 text-green-600 mr-4">
                <Rocket className="w-5 h-5" />
                <span className="font-medium">Kickoff</span>
              </div>
            }
          />
        )
      }
    >
      <div className="space-y-8">
        {/* Loader de progression pendant le traitement */}
        {isProcessing && (
          <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="max-w-md w-full mx-4">
              <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <Loader2 className="h-16 w-16 text-green-600 animate-spin" />
                    <Rocket className="h-8 w-8 text-green-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Création du projet en cours</h3>
                  <p className="text-sm text-gray-600 text-center">{progressMessage}</p>
                </div>
                
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-gray-500 text-center">{progress}%</p>
                </div>
                
                <div className="text-xs text-gray-500 text-center">
                  Veuillez patienter pendant la configuration de vos outils collaboratifs...
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Section information */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 text-lg mb-2">
                Démarrer avec votre nouvelle équipe !
              </h3>
              <p className="text-blue-700">
                Planifiez la première réunion de lancement avec toute l'équipe. 
                Un email d'invitation sera automatiquement envoyé à tous les participants.
              </p>
            </div>
          </div>
        </div>

        {/* Section date et heure */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            Choisir la date et l'heure
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label 
                htmlFor="kickoff-date" 
                className="flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <Calendar className="w-4 h-4 text-green-600" />
                Date du kickoff
              </Label>
              <Input 
                id="kickoff-date" 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="h-12 text-base border-gray-300 focus:border-green-500 focus:ring-green-500"
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
            
            <div className="space-y-3">
              <Label 
                htmlFor="kickoff-time" 
                className="flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <Clock className="w-4 h-4 text-green-600" />
                Heure de début
              </Label>
              <Input 
                id="kickoff-time" 
                type="time" 
                value={time} 
                onChange={(e) => setTime(e.target.value)}
                className="h-12 text-base border-gray-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Affichage de la date formatée */}
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Réunion planifiée :</strong>{' '}
              {new Date(date + 'T' + time).toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}{' '}
              à {time}
            </p>
          </div>
        </div>

        {/* Section informations supplémentaires */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex gap-3">
            <Rocket className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Ce qui va se passer :</p>
              <ul className="list-disc list-inside space-y-1 text-amber-700">
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