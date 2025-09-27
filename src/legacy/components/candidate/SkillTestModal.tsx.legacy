import { useState } from 'react';
import { FullScreenModal } from '@/components/ui/fullscreen-modal';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import CandidateSkillTest from '@/pages/CandidateSkillTest';

interface SkillTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SkillTestModal({ isOpen, onClose }: SkillTestModalProps) {
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    // La logique d'activation vocale sera gérée in CandidateeSkillTest
  };

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title='Test de Validation IA"
      description="Évaluation personnalisée de vos compétences"
      showBackButton={true}
      backButtonText="Retour au dashboard"
      actions={
        <div className="flex items-center gap-3">
          <Button
            onClick={toggleVoice}
            variant={voiceEnabled ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-2"
          >
            {voiceEnabled ? (
              <>
                <Mic className="w-4 h-4" />
                Conversation activée
              </>
            ) : (
              <>
                <MicOff className="w-4 h-4" />
                Activer conversation
              </>
            )}
          </Button>
        </div>
      }
      contentClassName="p-0"
    >
      <div className="h-full w-full bg-bg">
        <CandidateSkillTest />
      </div>
    </FullScreenModal>
  );
}