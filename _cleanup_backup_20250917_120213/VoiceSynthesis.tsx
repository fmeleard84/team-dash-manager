import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Configuration ElevenLabs
const ELEVENLABS_API_KEY = 'sk_78684f6ed063bb3803838d5ce932e5c38d0a308e542381ac';
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Voice ID Rachel (voix française)

interface VoiceSynthesisProps {
  isEnabled: boolean;
  onToggle: () => void;
  textToSpeak?: string;
  onSpeakingChange?: (speaking: boolean) => void; // Callback pour l'état de parole
}

export function VoiceSynthesis({ 
  isEnabled, 
  onToggle,
  textToSpeak,
  onSpeakingChange
}: VoiceSynthesisProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastTextRef = useRef<string>("");

  // Fonction pour synthétiser et jouer le texte
  const speakText = async (text: string) => {
    if (!text || !isEnabled) return;
    
    // Éviter de répéter le même texte
    if (text === lastTextRef.current && isSpeaking) {
      console.log('⚠️ Texte déjà en cours de lecture');
      return;
    }
    
    lastTextRef.current = text;
    setIsLoading(true);

    try {
      console.log('🎤 Synthèse vocale du texte:', text.substring(0, 50) + '...');
      
      // Nettoyer le texte des emojis et markdown
      const cleanText = text
        .replace(/[*_~`#]/g, '') // Enlever le markdown
        .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Enlever les emojis
        .replace(/\s+/g, ' ') // Normaliser les espaces
        .trim();

      // Appeler l'API Text-to-Speech d'ElevenLabs
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.5,
              use_speaker_boost: true
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Erreur API:', error);
        throw new Error(`Erreur synthèse: ${response.status}`);
      }

      // Créer un blob audio à partir de la réponse
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Arrêter l'audio précédent s'il existe
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      // Créer et jouer le nouvel audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      setIsLoading(false);
      setIsSpeaking(true);
      if (onSpeakingChange) onSpeakingChange(true);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
        if (onSpeakingChange) onSpeakingChange(false);
        lastTextRef.current = "";
        console.log('✅ Lecture terminée');
      };

      audio.onerror = (error) => {
        console.error('❌ Erreur lecture audio:', error);
        setIsSpeaking(false);
        if (onSpeakingChange) onSpeakingChange(false);
        setIsLoading(false);
      };

      await audio.play();
      console.log('🔊 Lecture en cours...');

    } catch (error) {
      console.error('❌ Erreur synthèse vocale:', error);
      toast.error('Erreur de synthèse vocale');
      setIsLoading(false);
      setIsSpeaking(false);
    }
  };

  // Arrêter la lecture
  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setIsLoading(false);
    lastTextRef.current = "";
  };

  // Gérer l'activation/désactivation
  useEffect(() => {
    if (!isEnabled) {
      stopSpeaking();
    }
  }, [isEnabled]);

  // Lire le nouveau texte quand il change
  useEffect(() => {
    if (textToSpeak && isEnabled && textToSpeak !== lastTextRef.current) {
      speakText(textToSpeak);
    }
  }, [textToSpeak, isEnabled]);

  // Nettoyer à la destruction
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={onToggle}
        variant={isEnabled ? "default" : "outline"}
        size="sm"
        className={isEnabled ? "bg-gradient-to-r from-purple-600 to-pink-600" : ""}
        disabled={isLoading}
      >
        {isEnabled ? (
          <>
            <Volume2 className="w-4 h-4 mr-2" />
            Synthèse Vocale Active
          </>
        ) : (
          <>
            <VolumeX className="w-4 h-4 mr-2" />
            Activer Synthèse Vocale
          </>
        )}
      </Button>
      
      {isEnabled && (
        <div className="flex items-center gap-2">
          {isLoading && (
            <Badge variant="secondary" className="bg-yellow-500 text-white">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Préparation...
            </Badge>
          )}
          {isSpeaking && !isLoading && (
            <Badge variant="secondary" className="bg-green-500 text-white">
              <Volume2 className="w-3 h-3 mr-1 animate-pulse" />
              En train de parler
            </Badge>
          )}
          {!isSpeaking && !isLoading && (
            <Badge variant="secondary" className="bg-gray-500 text-white">
              En attente
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}