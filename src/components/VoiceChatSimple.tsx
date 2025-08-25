import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VoiceChatSimpleProps {
  onTranscription: (text: string) => void;
  botResponse?: string;
  isEnabled: boolean;
  onToggle: () => void;
}

export function VoiceChatSimple({ onTranscription, botResponse, isEnabled, onToggle }: VoiceChatSimpleProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState<'ready' | 'listening' | 'speaking'>('ready');
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const isStartingRef = useRef(false);
  const shouldRestartRef = useRef(true);

  // Initialiser la reconnaissance vocale Web Speech API
  useEffect(() => {
    if (!isEnabled) {
      stopListening();
      return;
    }

    // Vérifier le support de la Web Speech API
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error('Votre navigateur ne supporte pas la reconnaissance vocale');
      onToggle();
      return;
    }

    // Créer et configurer la reconnaissance
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false; // Seulement les résultats finaux
    recognition.lang = 'fr-FR';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎙️ Reconnaissance démarrée');
      setIsListening(true);
      setStatus('listening');
      isStartingRef.current = false;
    };

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript;
      
      console.log('📝 Transcription:', transcript);
      
      // Arrêter temporairement l'écoute pendant le traitement
      shouldRestartRef.current = false; // Empêcher le redémarrage automatique
      recognition.stop();
      setIsListening(false);
      setStatus('ready');
      
      // Réactiver le redémarrage après un délai
      setTimeout(() => {
        shouldRestartRef.current = true;
      }, 100);
      
      // Envoyer la transcription
      if (transcript.trim()) {
        onTranscription(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      // Ignorer les erreurs 'aborted' qui sont normales lors de l'arrêt
      if (event.error === 'aborted') {
        console.log('🔄 Reconnaissance interrompue (normal)');
        return;
      }
      
      console.error('❌ Erreur reconnaissance:', event.error);
      
      // Gérer les erreurs communes
      if (event.error === 'not-allowed') {
        toast.error('Permission du microphone refusée');
        shouldRestartRef.current = false;
        onToggle();
      } else if (event.error === 'no-speech') {
        // Pas de parole détectée, c'est normal
        console.log('🔇 Pas de parole détectée');
      } else if (event.error === 'network') {
        toast.error('Erreur réseau - vérifiez votre connexion');
      }
      
      isStartingRef.current = false;
    };

    recognition.onend = () => {
      console.log('🔚 Reconnaissance terminée');
      setIsListening(false);
      isStartingRef.current = false;
      
      // Redémarrer seulement si nécessaire
      if (isEnabled && !isPlayingRef.current && shouldRestartRef.current && !isStartingRef.current) {
        setTimeout(() => {
          if (isEnabled && !isPlayingRef.current && shouldRestartRef.current && !isStartingRef.current) {
            try {
              isStartingRef.current = true;
              recognition.start();
            } catch (e) {
              console.log('Impossible de redémarrer la reconnaissance');
              isStartingRef.current = false;
            }
          }
        }, 1000); // Délai plus long pour éviter les boucles
      }
    };

    recognitionRef.current = recognition;
    
    // Démarrer l'écoute avec un petit délai pour éviter les conflits
    setTimeout(() => {
      if (isEnabled && !isStartingRef.current) {
        try {
          isStartingRef.current = true;
          recognition.start();
        } catch (error) {
          console.error('Erreur démarrage reconnaissance:', error);
          isStartingRef.current = false;
        }
      }
    }, 100);

    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort(); // Utiliser abort() au lieu de stop()
        } catch (e) {
          console.log('Reconnaissance déjà arrêtée');
        }
        recognitionRef.current = null;
      }
    };
  }, [isEnabled, onTranscription, onToggle]);

  // Arrêter l'écoute
  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Reconnaissance déjà arrêtée');
      }
    }
    setIsListening(false);
    setStatus('ready');
  };

  // Lire les réponses du bot avec OpenAI TTS
  useEffect(() => {
    if (!isEnabled || !botResponse || isPlayingRef.current) return;
    
    playBotResponse(botResponse);
  }, [botResponse, isEnabled]);

  const playBotResponse = async (text: string) => {
    if (isPlayingRef.current) return;
    
    try {
      console.log('🔊 Lecture de la réponse:', text.substring(0, 50) + '...');
      
      // Marquer comme en cours de lecture
      isPlayingRef.current = true;
      setIsSpeaking(true);
      setStatus('speaking');
      
      // Arrêter la reconnaissance pendant que l'IA parle
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Reconnaissance déjà arrêtée');
        }
      }
      
      // Nettoyer le texte (enlever les ** pour le markdown)
      const cleanText = text.replace(/\*\*/g, '').substring(0, 1000);
      
      // Appeler OpenAI TTS via notre edge function
      const response = await supabase.functions.invoke('skill-test-ai', {
        body: {
          action: 'tts',
          text: cleanText
        }
      });
      
      if (response.data?.audio) {
        // Créer et jouer l'audio
        const audioBlob = new Blob(
          [Uint8Array.from(atob(response.data.audio), c => c.charCodeAt(0))],
          { type: 'audio/mp3' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        // Quand l'audio se termine
        audio.onended = () => {
          console.log('✅ Lecture terminée');
          URL.revokeObjectURL(audioUrl);
          isPlayingRef.current = false;
          setIsSpeaking(false);
          setStatus('ready');
          audioRef.current = null;
          
          // Redémarrer l'écoute après un court délai
          if (isEnabled && recognitionRef.current) {
            setTimeout(() => {
              if (isEnabled && recognitionRef.current && !isPlayingRef.current && !isStartingRef.current) {
                try {
                  isStartingRef.current = true;
                  recognitionRef.current.start();
                  console.log('🎙️ Écoute redémarrée après réponse');
                } catch (e) {
                  console.log('Impossible de redémarrer après réponse');
                  isStartingRef.current = false;
                }
              }
            }, 1000); // Délai plus long après la réponse
          }
        };
        
        // Gérer les erreurs
        audio.onerror = () => {
          console.error('❌ Erreur lecture audio');
          isPlayingRef.current = false;
          setIsSpeaking(false);
          setStatus('ready');
          audioRef.current = null;
          
          // Redémarrer l'écoute même en cas d'erreur
          if (isEnabled && recognitionRef.current) {
            setTimeout(() => {
              if (isEnabled && recognitionRef.current && !isPlayingRef.current && !isStartingRef.current) {
                try {
                  isStartingRef.current = true;
                  recognitionRef.current.start();
                } catch (e) {
                  console.log('Impossible de redémarrer après erreur audio');
                  isStartingRef.current = false;
                }
              }
            }, 1000);
          }
        };
        
        // Jouer l'audio
        await audio.play();
        console.log('▶️ Audio en cours de lecture');
      }
    } catch (error) {
      console.error('Erreur lecture audio:', error);
      isPlayingRef.current = false;
      setIsSpeaking(false);
      setStatus('ready');
      
      // Fallback sur la synthèse vocale native du navigateur
      try {
        const utterance = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ''));
        utterance.lang = 'fr-FR';
        utterance.rate = 1.1; // Un peu plus rapide
        
        utterance.onend = () => {
          isPlayingRef.current = false;
          setIsSpeaking(false);
          setStatus('ready');
          
          // Redémarrer l'écoute
          if (isEnabled && recognitionRef.current) {
            setTimeout(() => {
              if (isEnabled && recognitionRef.current && !isPlayingRef.current && !isStartingRef.current) {
                try {
                  isStartingRef.current = true;
                  recognitionRef.current.start();
                } catch (e) {
                  console.log('Impossible de redémarrer après synthèse native');
                  isStartingRef.current = false;
                }
              }
            }, 1000);
          }
        };
        
        speechSynthesis.speak(utterance);
        console.log('🔊 Fallback sur synthèse native');
      } catch (fallbackError) {
        console.error('Erreur synthèse vocale native:', fallbackError);
      }
    }
  };

  // Nettoyer à la désactivation
  useEffect(() => {
    if (!isEnabled) {
      // Empêcher les redémarrages
      shouldRestartRef.current = false;
      isStartingRef.current = false;
      
      // Arrêter la reconnaissance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.log('Reconnaissance déjà arrêtée');
        }
      }
      
      // Arrêter l'audio en cours
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      // Arrêter la synthèse vocale native
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      isPlayingRef.current = false;
      setIsSpeaking(false);
      setIsListening(false);
      setStatus('ready');
    } else {
      // Réactiver le flag de redémarrage quand on active
      shouldRestartRef.current = true;
    }
  }, [isEnabled]);

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
          {status === 'speaking' ? (
            <Badge variant="secondary" className="bg-purple-500 text-white">
              <Volume2 className="w-3 h-3 mr-1 animate-pulse" />
              IA parle
            </Badge>
          ) : status === 'listening' ? (
            <Badge variant="secondary" className="bg-red-500 text-white animate-pulse">
              <Mic className="w-3 h-3 mr-1" />
              Écoute...
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-green-500 text-white">
              ✓ Prêt
            </Badge>
          )}
          
          <Badge variant="outline" className="text-xs">
            🎯 Simple
          </Badge>
        </div>
      )}
    </div>
  );
}