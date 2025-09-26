import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Video, X } from 'lucide-react';
import VayaJitsi from './VayaJitsi';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface VisioLauncherProps {
  roomName: string;
  projectTitle?: string;
  buttonText?: string;
  buttonVariant?: 'default' | 'outline' | 'ghost';
  buttonSize?: 'sm' | 'default' | 'lg';
}

export function VisioLauncher({
  roomName,
  projectTitle,
  buttonText = 'Rejoindre la visio',
  buttonVariant = 'outline',
  buttonSize = 'sm'
}: VisioLauncherProps) {
  const [isVisioOpen, setIsVisioOpen] = useState(false);
  const { user } = useAuth();
  const [userDisplayName, setUserDisplayName] = useState('Participant');

  // Définir une variable globale pour signaler qu'une visio est ouverte
  useEffect(() => {
    if (isVisioOpen) {
      (window as any).__visioActive = true;
    } else {
      (window as any).__visioActive = false;
    }

    return () => {
      (window as any).__visioActive = false;
    };
  }, [isVisioOpen]);

  useEffect(() => {
    const loadUserInfo = async () => {
      if (!user?.id) return;

      // Récupérer le prénom depuis user_metadata
      const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Participant';

      // Vérifier si c'est un candidat pour récupérer son expertise
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('profile_id')
        .eq('id', user.id)
        .maybeSingle();

      if (candidateProfile?.profile_id) {
        // Récupérer l'expertise depuis hr_profiles
        const { data: hrProfile } = await supabase
          .from('hr_profiles')
          .select('name')
          .eq('id', candidateProfile.profile_id)
          .maybeSingle();

        if (hrProfile?.name) {
          setUserDisplayName(`${firstName} - ${hrProfile.name}`);
        } else {
          setUserDisplayName(firstName);
        }
      } else {
        // C'est probablement un client
        setUserDisplayName(firstName);
      }
    };

    loadUserInfo();
  }, [user]);

  // Extraire le nom de la room si c'est dans notre format vaya-room:xxx
  const cleanRoomName = roomName.startsWith('vaya-room:')
    ? roomName.replace('vaya-room:', '')
    : roomName;

  if (isVisioOpen) {
    // Afficher la visio en fullscreen avec iframe intégré
    return (
      <div className="fixed inset-0 z-[60] bg-black">
        <div className="absolute top-4 right-4 z-10">
          <Button
            onClick={() => setIsVisioOpen(false)}
            variant="destructive"
            size="icon"
            className="rounded-full shadow-lg"
            title="Quitter la visio"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <VayaJitsi
          roomName={cleanRoomName}
          userName={userDisplayName}
          onClose={() => setIsVisioOpen(false)}
          projectTitle={projectTitle}
          height="calc(100vh - 80px)"
        />
      </div>
    );
  }

  return (
    <Button
      variant={buttonVariant}
      size={buttonSize}
      onClick={() => setIsVisioOpen(true)}
      className="gap-2 w-full"
    >
      <Video className="w-4 h-4" />
      {buttonText}
    </Button>
  );
}

// Export par défaut aussi pour compatibilité
export default VisioLauncher;