import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Configuration ElevenLabs
const ELEVENLABS_API_KEY = 'sk_78684f6ed063bb3803838d5ce932e5c38d0a308e542381ac';
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Voice ID Rachel (voix française)

interface VoiceConversationProps {
  isEnabled: boolean;
  onToggle: () => void;
  textToSpeak?: string; // Texte de l'IA à dire
  onUserMessage: (text: string) => void; // Quand l'utilisateur a parlé
}

type ConversationState = 'idle' | 'ai-speaking' | 'user-listening' | 'processing';

export function VoiceConversation({ 
  isEnabled, 
  onToggle,
  textToSpeak,
  onUserMessage
}: VoiceConversationProps) {
  const [state, setState] = useState<ConversationState>('idle');
  const [transcript, setTranscript] = useState('');
  
  // Références pour audio et reconnaissance
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const lastTextRef = useRef<string>("");
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef(false);

  // Synthèse vocale de l'IA
  const speakText = useCallback(async (text: string) => {
    if (!text || text === lastTextRef.current) {
      console.log('⚠️ Texte identique ou vide, pas de synthèse');
      return;
    }
    
    // Si on est déjà en train de parler ou d'écouter, ignorer
    if (state === 'ai-speaking' || state === 'user-listening') {
      console.log('⚠️ Conversation en cours, nouvelle synthèse ignorée');
      return;
    }
    
    lastTextRef.current = text;
    setState('ai-speaking');
    console.log('🤖 IA commence à parler:', text.substring(0, 50) + '...');

    try {
      // Nettoyer le texte
      const cleanText = text
        .replace(/[*_~`#]/g, '')
        .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Appeler l'API ElevenLabs
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
              similarity_boost: 0.75
            }
          })
        }
      );

      if (!response.ok) throw new Error(`Erreur synthèse: ${response.status}`);

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Arrêter l'audio précédent
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      // Jouer le nouvel audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        console.log('✅ IA a fini de parler');
        
        // Réinitialiser le texte pour éviter les répétitions
        lastTextRef.current = "";
        
        // Passer à l'écoute seulement si on est toujours activé
        if (isEnabled) {
          setState('user-listening');
          // Démarrer l'écoute après un court délai
          setTimeout(() => {
            if (isEnabled) {
              startListening();
            }
          }, 500);
        } else {
          setState('idle');
        }
      };

      audio.onerror = () => {
        console.error('❌ Erreur audio');
        setState('idle');
      };

      await audio.play();
      console.log('🔊 Audio en cours de lecture');

    } catch (error) {
      console.error('❌ Erreur synthèse:', error);
      toast.error('Erreur de synthèse vocale');
      setState('idle');
    }
  }, [isEnabled]);

  // Initialiser la reconnaissance vocale
  const initRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Reconnaissance vocale non supportée');
      return null;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎤 Écoute démarrée');
      isListeningRef.current = true;
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Afficher la transcription temporaire
      if (interimTranscript) {
        setTranscript(prev => prev + interimTranscript);
      }

      // Si on a une transcription finale, réinitialiser le timer de silence
      if (finalTranscript) {
        const fullTranscript = transcript + finalTranscript;
        setTranscript(fullTranscript.trim());
        
        // Réinitialiser le timer de silence
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        
        // Détecter 2 secondes de silence pour envoyer
        silenceTimerRef.current = setTimeout(() => {
          if (fullTranscript.trim().length > 2) {
            console.log('📤 Envoi après silence:', fullTranscript.trim());
            stopListening();
            onUserMessage(fullTranscript.trim());
            setState('processing');
          }
        }, 2000); // 2 secondes de silence
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('❌ Erreur reconnaissance:', event.error);
      }
      isListeningRef.current = false;
    };

    recognition.onend = () => {
      console.log('🛑 Écoute terminée');
      isListeningRef.current = false;
      
      // Envoyer le message si on a du texte
      if (transcript.trim().length > 2) {
        console.log('📤 Envoi du message final:', transcript.trim());
        onUserMessage(transcript.trim());
        setState('processing'); // Rester en traitement jusqu'à la prochaine réponse
      } else {
        setState('idle'); // Retour au repos si pas de texte
      }
      setTranscript('');
    };

    return recognition;
  }, [onUserMessage, transcript]);

  // Démarrer l'écoute
  const startListening = useCallback(() => {
    // Ne pas démarrer si l'IA parle
    if (state === 'ai-speaking') {
      console.log('⚠️ IA en train de parler, écoute annulée');
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }

    if (recognitionRef.current && !isListeningRef.current) {
      try {
        recognitionRef.current.start();
        setState('user-listening');
      } catch (error) {
        console.log('⚠️ Reconnaissance déjà active');
      }
    }
  }, [state, initRecognition]);

  // Arrêter l'écoute
  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('⚠️ Arrêt écoute');
      }
    }
  }, []);

  // Gérer l'activation/désactivation
  useEffect(() => {
    if (!isEnabled) {
      // Tout arrêter
      stopListening();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setState('idle');
      setTranscript('');
    } else if (textToSpeak) {
      // Si on a du texte à dire, commencer par ça
      speakText(textToSpeak);
    }
  }, [isEnabled, textToSpeak, speakText, stopListening]);

  // Nettoyer à la destruction
  useEffect(() => {
    return () => {
      stopListening();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [stopListening]);

  // Gérer les changements de texte à dire
  useEffect(() => {
    if (textToSpeak && isEnabled && (state === 'idle' || state === 'processing')) {
      // Parler si on est au repos ou en traitement (nouvelle réponse de l'IA)
      speakText(textToSpeak);
    }
  }, [textToSpeak, isEnabled, state, speakText]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Button
          onClick={onToggle}
          variant={isEnabled ? "default" : "outline"}
          size="sm"
          className={isEnabled ? "bg-gradient-to-r from-purple-600 to-pink-600" : ""}
        >
          {isEnabled ? (
            <>
              <Volume2 className="w-4 h-4 mr-2" />
              Mode Vocal Actif
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 mr-2" />
              Activer Mode Vocal
            </>
          )}
        </Button>
        
        {isEnabled && (
          <div className="flex items-center gap-2">
            {state === 'ai-speaking' && (
              <Badge variant="secondary" className="bg-purple-500 text-white animate-pulse">
                <Volume2 className="w-3 h-3 mr-1" />
                IA parle...
              </Badge>
            )}
            {state === 'user-listening' && (
              <Badge variant="secondary" className="bg-red-500 text-white animate-pulse">
                <Mic className="w-3 h-3 mr-1" />
                À vous de parler
              </Badge>
            )}
            {state === 'processing' && (
              <Badge variant="secondary" className="bg-yellow-500 text-white">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Traitement...
              </Badge>
            )}
            {state === 'idle' && (
              <Badge variant="secondary" className="bg-gray-500 text-white">
                En attente
              </Badge>
            )}
          </div>
        )}
      </div>
      
      {/* Afficher la transcription en cours */}
      {state === 'user-listening' && transcript && (
        <div className="p-2 bg-gray-100 rounded-lg animate-pulse">
          <p className="text-sm text-gray-700">
            <Mic className="w-3 h-3 inline mr-1" />
            {transcript}
          </p>
        </div>
      )}
    </div>
  );
}