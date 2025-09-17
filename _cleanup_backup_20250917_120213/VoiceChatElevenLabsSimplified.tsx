import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

const ELEVENLABS_API_KEY = 'sk_78684f6ed063bb3803838d5ce932e5c38d0a308e542381ac';
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice

interface VoiceChatElevenLabsSimplifiedProps {
  onTranscription: (text: string) => void;
  botResponse?: string;
  isEnabled: boolean;
  onToggle: () => void;
}

export function VoiceChatElevenLabsSimplified({ 
  onTranscription, 
  botResponse, 
  isEnabled, 
  onToggle 
}: VoiceChatElevenLabsSimplifiedProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isProcessingQueueRef = useRef(false);

  // Configuration de la reconnaissance vocale
  useEffect(() => {
    if (!isEnabled) {
      // Nettoyer complètement quand désactivé
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.log('Recognition already stopped');
        }
        recognitionRef.current = null;
      }
      // Arrêter tout audio en cours
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      audioQueueRef.current = [];
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Reconnaissance vocale non supportée');
      onToggle();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false; // Désactiver les résultats intermédiaires
    recognition.lang = 'fr-FR';
    recognition.maxAlternatives = 1;

    let isActive = true;

    recognition.onstart = () => {
      if (isActive) {
        console.log('🎙️ Écoute démarrée');
        setIsListening(true);
      }
    };

    recognition.onresult = (event: any) => {
      // Ignorer si l'IA parle
      if (audioRef.current || isSpeaking) {
        console.log('🔇 Résultat ignoré - IA en train de parler');
        return;
      }

      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.trim();
      
      if (transcript && event.results[last].isFinal) {
        console.log('📝 Transcription finale:', transcript);
        onTranscription(transcript);
        
        // Arrêter temporairement pour éviter les échos
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch(e) {}
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        toast.error('Microphone non autorisé');
        onToggle();
      } else if (event.error === 'no-speech') {
        // Ignorer cette erreur, c'est normal
        console.log('Pas de parole détectée');
      } else {
        console.error('Erreur reconnaissance:', event.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      
      // Redémarrer seulement si toujours activé et pas en train de parler
      if (isEnabled && isActive && !audioRef.current && !isSpeaking) {
        setTimeout(() => {
          if (isEnabled && isActive && recognitionRef.current && !audioRef.current) {
            try {
              recognitionRef.current.start();
            } catch(e) {
              console.log('Erreur redémarrage:', e);
            }
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;
    
    // Démarrer l'écoute initiale
    try {
      recognition.start();
    } catch(e) {
      console.error('Erreur démarrage initial:', e);
    }

    // Cleanup
    return () => {
      isActive = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch(e) {}
        recognitionRef.current = null;
      }
    };
  }, [isEnabled, onTranscription, onToggle, isSpeaking]);

  // Traiter la queue audio de manière séquentielle
  const processAudioQueue = async () => {
    if (isProcessingQueueRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isProcessingQueueRef.current = true;

    while (audioQueueRef.current.length > 0 && isEnabled) {
      const text = audioQueueRef.current.shift();
      if (!text) continue;

      // Arrêter complètement la reconnaissance pendant la synthèse
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
          console.log('🔇 Reconnaissance arrêtée pour synthèse');
        } catch(e) {}
      }

      await playAudio(text);
      
      // Petit délai entre les messages
      if (audioQueueRef.current.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    isProcessingQueueRef.current = false;

    // Redémarrer la reconnaissance après avoir fini de parler
    if (isEnabled && recognitionRef.current && !audioRef.current) {
      setTimeout(() => {
        if (isEnabled && recognitionRef.current) {
          try {
            recognitionRef.current.start();
            console.log('🎙️ Reconnaissance redémarrée après synthèse');
          } catch(e) {
            console.log('Erreur redémarrage après synthèse:', e);
          }
        }
      }, 500);
    }
  };

  // Fonction pour jouer l'audio avec ElevenLabs
  const playAudio = async (text: string): Promise<void> => {
    return new Promise(async (resolve) => {
      try {
        setIsSpeaking(true);
        
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
          {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
              text: text.replace(/\*\*/g, '').substring(0, 1000),
              model_id: 'eleven_multilingual_v2',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true
              }
            })
          }
        );

        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;
            setIsSpeaking(false);
            console.log('✅ Synthèse terminée');
            resolve();
          };
          
          audio.onerror = () => {
            audioRef.current = null;
            setIsSpeaking(false);
            resolve();
          };
          
          await audio.play();
          console.log('🔊 Synthèse en cours');
        } else {
          setIsSpeaking(false);
          resolve();
        }
      } catch (error) {
        console.error('Erreur TTS:', error);
        setIsSpeaking(false);
        resolve();
      }
    });
  };

  // Gérer les réponses du bot
  useEffect(() => {
    if (!botResponse || !isEnabled) return;

    // Ajouter à la queue au lieu de jouer directement
    audioQueueRef.current.push(botResponse);
    console.log('📥 Ajout à la queue audio:', botResponse.substring(0, 50));
    
    // Démarrer le traitement de la queue
    processAudioQueue();
  }, [botResponse, isEnabled]);

  // Nettoyage complet
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch(e) {}
        recognitionRef.current = null;
      }
      audioQueueRef.current = [];
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={onToggle}
        variant={isEnabled ? "default" : "outline"}
        size="sm"
        className={isEnabled ? "bg-gradient-to-r from-purple-600 to-pink-600" : ""}
      >
        {isEnabled ? (
          <>
            <Mic className="w-4 h-4 mr-2 animate-pulse" />
            Mode Vocal Actif
          </>
        ) : (
          <>
            <MicOff className="w-4 h-4 mr-2" />
            Activer Mode Vocal
          </>
        )}
      </Button>
      
      {isEnabled && (
        <div className="flex items-center gap-2">
          {isSpeaking ? (
            <Badge variant="secondary" className="bg-purple-500 text-white">
              <Volume2 className="w-3 h-3 mr-1 animate-pulse" />
              IA parle
            </Badge>
          ) : isListening ? (
            <Badge variant="secondary" className="bg-green-500 text-white">
              <Mic className="w-3 h-3 mr-1" />
              Écoute...
            </Badge>
          ) : (
            <Badge variant="outline">
              ⏸️ En attente
            </Badge>
          )}
          
          {audioQueueRef.current.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {audioQueueRef.current.length} message(s) en attente
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}