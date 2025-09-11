import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FullScreenModal, ModalActions } from "@/components/ui/fullscreen-modal";
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Mic, 
  MicOff, 
  Camera, 
  CameraOff, 
  PhoneOff, 
  Settings, 
  Users,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Share,
  MessageSquare,
  Hand
} from 'lucide-react';
import { MessageParticipant } from '@/hooks/useMessages';

interface JitsiMeetIntegrationProps {
  roomName: string;
  displayName: string;
  onClose: () => void;
  participants: MessageParticipant[];
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export const JitsiMeetIntegration = ({ roomName, displayName, onClose, participants }: JitsiMeetIntegrationProps) => {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [participantCount, setParticipantCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // Load Jitsi Meet External API
  useEffect(() => {
    const loadJitsiScript = () => {
      if (window.JitsiMeetExternalAPI) {
        initializeJitsi();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = initializeJitsi;
      script.onerror = () => {
        setIsLoading(false);
        console.error('Failed to load Jitsi Meet External API');
      };
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    };

    const initializeJitsi = () => {
      if (!jitsiContainerRef.current) return;

      const domain = 'meet.jit.si';
      const options = {
        roomName: roomName.replace(/[^a-zA-Z0-9]/g, ''),
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName: displayName,
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableModeratorIndicator: false,
          startScreenSharing: false,
          enableEmailInStats: false,
          enableWelcomePage: false,
          prejoinPageEnabled: false,
          disableInviteFunctions: true,
          doNotStoreRoom: true,
          disableShortcuts: false,
          disableDeepLinking: true,
          enableInsecureRoomNameWarning: false,
          toolbarButtons: [
            'microphone', 'camera', 'closedcaptions', 'desktop',
            'fullscreen', 'fodeviceselection', 'hangup', 'profile',
            'chat', 'recording', 'livestreaming', 'etherpad',
            'sharedvideo', 'settings', 'raisehand', 'videoquality',
            'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
            'tileview', 'select-background', 'download', 'help', 'mute-everyone'
          ],
        },
        interfaceConfigOverwrite: {
          BRAND_WATERMARK_LINK: '',
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          SHOW_PROMOTIONAL_CLOSE_PAGE: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#474747',
          DISABLE_VIDEO_BACKGROUND: false,
          INITIAL_TOOLBAR_TIMEOUT: 20000,
          TOOLBAR_TIMEOUT: 4000,
          TOOLBAR_ALWAYS_VISIBLE: false,
          DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
          DEFAULT_LOCAL_DISPLAY_NAME: 'Moi',
          SHOW_CHROME_EXTENSION_BANNER: false,
        }
      };

      const api = new window.JitsiMeetExternalAPI(domain, options);

      // Event listeners
      api.addEventListener('videoConferenceJoined', () => {
        setIsLoading(false);
        setConnectionStatus('connected');
        console.log('Joined video conference');
      });

      api.addEventListener('videoConferenceLeft', () => {
        setConnectionStatus('disconnected');
        console.log('Left video conference');
        onClose();
      });

      api.addEventListener('participantJoined', (event: any) => {
        setParticipantCount(prev => prev + 1);
        console.log('Participant joined:', event);
      });

      api.addEventListener('participantLeft', (event: any) => {
        setParticipantCount(prev => Math.max(0, prev - 1));
        console.log('Participant left:', event);
      });

      api.addEventListener('audioMuteStatusChanged', (event: any) => {
        setIsMuted(event.muted);
      });

      api.addEventListener('videoMuteStatusChanged', (event: any) => {
        setIsCameraOff(event.muted);
      });

      api.addEventListener('readyToClose', () => {
        onClose();
      });

      setJitsiApi(api);
    };

    loadJitsiScript();

    return () => {
      if (jitsiApi) {
        jitsiApi.dispose();
      }
    };
  }, [roomName, displayName, onClose]);

  const toggleMute = () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('toggleAudio');
    }
  };

  const toggleCamera = () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('toggleVideo');
    }
  };

  const hangUp = () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('hangup');
    }
    onClose();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const startScreenShare = () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('toggleShareScreen');
    }
  };

  const openChat = () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('toggleChat');
    }
  };

  const raiseHand = () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('toggleRaiseHand');
    }
  };

  if (isLoading) {
    return (
      <FullScreenModal isOpen={true} onClose={() => onClose(false)} title="" description="">
        <div className="space-y-6">
          <div className="mb-6">
            <DialogTitle className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Connexion à la visio-conférence...
            </DialogTitle>
            <p className="text-gray-300">
              Chargement de Jitsi Meet pour la room: {roomName}
            </p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-pulse bg-muted rounded-lg w-full h-64 mb-4"></div>
              <p className="text-muted-foreground">Initialisation en cours...</p>
            </div>
          </div>
        </div>
      </FullScreenModal>
    );
  }

  return (
    <FullScreenModal isOpen={true} onClose={() => onClose(false)} title="" description="">
      <div className="space-y-6">
        <div className="flex flex-col h-full">
          {/* Header avec contrôles */}
          <div className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-3">
              <Badge 
                variant={connectionStatus === 'connected' ? 'default' : 'secondary'}
                className="flex items-center gap-1"
              >
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                {connectionStatus === 'connected' ? 'Connecté' : 'Connexion...'}
              </Badge>
              
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                {participantCount + 1} participant{participantCount > 0 ? 's' : ''}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick controls */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isMuted ? "destructive" : "outline"}
                    size="icon"
                    onClick={toggleMute}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isMuted ? 'Activer le micro' : 'Couper le micro'}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isCameraOff ? "destructive" : "outline"}
                    size="icon"
                    onClick={toggleCamera}
                  >
                    {isCameraOff ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isCameraOff ? 'Activer la caméra' : 'Couper la caméra'}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={startScreenShare}>
                    <Share className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Partager l'écran</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={openChat}>
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Chat</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={raiseHand}>
                    <Hand className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Lever la main</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={toggleFullscreen}>
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="destructive" size="icon" onClick={hangUp}>
                    <PhoneOff className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Raccrocher</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Participants attendus */}
          {!isFullscreen && (
            <div className="p-4 border-b bg-muted/20">
              <h4 className="text-sm font-medium mb-2">Participants invités:</h4>
              <div className="flex flex-wrap gap-2">
                {participants.map((participant, index) => (
                  <div key={participant.id || index} className="flex items-center gap-2 bg-background rounded-full px-3 py-1 border">
                    <Avatar className="w-5 h-5">
                      <AvatarFallback className="text-xs">
                        {participant.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{participant.name}</span>
                    <Badge variant="secondary" className="text-xs h-4">
                      {participant.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Jitsi Meet Container */}
          <div className="flex-1 relative bg-gray-900">
            <div 
              ref={jitsiContainerRef} 
              className="w-full h-full"
              style={{ minHeight: '400px' }}
            />
            
            {/* Overlay pour les notifications */}
            <div className="absolute top-4 right-4 z-10">
              {connectionStatus === 'connecting' && (
                <Badge variant="secondary" className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                  Connexion...
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </FullScreenModal>
  );
};