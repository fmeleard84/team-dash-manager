import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Video, X } from 'lucide-react';
import VayaJitsi from './VayaJitsi';
import { useAuth } from '@/contexts/AuthContext';

interface VisioModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
  projectTitle?: string;
  participants?: Array<{
    name: string;
    role?: string;
  }>;
}

export function VisioModal({
  isOpen,
  onClose,
  roomName,
  projectTitle,
  participants = []
}: VisioModalProps) {
  const { user } = useAuth();
  const [isInMeeting, setIsInMeeting] = useState(false);

  // Récupérer le prénom de l'utilisateur connecté
  const userName = user?.user_metadata?.first_name ||
                   user?.email?.split('@')[0] ||
                   'Participant';

  const handleJoinMeeting = () => {
    setIsInMeeting(true);
  };

  const handleLeaveMeeting = () => {
    setIsInMeeting(false);
    onClose();
  };

  if (isInMeeting) {
    // Mode plein écran pour la visio
    return (
      <div className="fixed inset-0 z-[60] bg-black">
        <div className="absolute top-4 right-4 z-10">
          <Button
            onClick={handleLeaveMeeting}
            variant="destructive"
            size="icon"
            className="rounded-full shadow-lg"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <VayaJitsi
          roomName={roomName}
          userName={userName}
          onClose={handleLeaveMeeting}
          projectTitle={projectTitle}
          height="100vh"
        />
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary-500" />
            Démarrer une visioconférence
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <h3 className="font-semibold text-sm mb-2">
              {projectTitle || 'Réunion d\'équipe'}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Salle : {roomName}
            </p>
          </div>

          {participants.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Participants invités :</h4>
              <div className="space-y-1">
                {participants.map((participant, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm p-2 bg-neutral-50 dark:bg-neutral-800 rounded"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white text-xs font-bold">
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{participant.name}</span>
                    {participant.role && (
                      <span className="text-neutral-500 text-xs">• {participant.role}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleJoinMeeting}
              className="flex-1 bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:opacity-90"
            >
              <Video className="w-4 h-4 mr-2" />
              Rejoindre la visio
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}