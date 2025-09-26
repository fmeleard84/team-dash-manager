import { useEffect, useRef } from "react";
import { useTheme } from "@/hooks/use-theme";

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface VayaJitsiProps {
  roomName: string;
  userName: string;
  onClose?: () => void;
  projectTitle?: string;
  height?: string;
}

function VayaJitsi({
  roomName,
  userName,
  onClose,
  projectTitle,
  height = "100vh"
}: VayaJitsiProps) {
  const { theme } = useTheme();
  const apiRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Vérifier que l'API Jitsi est chargée
    if (!window.JitsiMeetExternalAPI) {
      console.error("Jitsi Meet External API not loaded");
      return;
    }

    // Nettoyer la room name pour éviter les caractères spéciaux
    const cleanRoomName = roomName.replace(/[^a-zA-Z0-9-_]/g, '');

    const domain = "visio.vaya.rip";

    console.log('🎥 [JITSI] Configuration pour Jitsi:', {
      roomName: cleanRoomName,
      userName: userName,
      domain: domain
    });

    const options = {
      roomName: cleanRoomName,
      width: "100%",
      height: "100%",
      parentNode: containerRef.current,
      userInfo: {
        displayName: userName,
        email: '' // Optionnel
      },
      configOverwrite: {
        prejoinPageEnabled: false, // Skip prejoin pour une expérience plus fluide
        defaultLanguage: "fr",
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        disableDeepLinking: true,
        enableWelcomePage: false,
        enableClosePage: false,
        // Thème sombre si activé
        toolbarButtons: [
          'camera',
          'desktop',
          'fullscreen',
          'fodeviceselection',
          'hangup',
          'microphone',
          'raisehand',
          'chat',
          'recording',
          'livestreaming',
          'tileview',
          'videobackgroundblur',
          'download',
          'help',
          'mute-everyone',
          'security'
        ],
        // Couleurs personnalisées selon le thème
        defaultLocalDisplayName: userName,
        subject: projectTitle || `Réunion ${cleanRoomName}`,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        BRAND_WATERMARK_LINK: '',
        SHOW_POWERED_BY: false,
        SHOW_PROMOTIONAL_CLOSE_PAGE: false,
        TOOLBAR_ALWAYS_VISIBLE: true,
        SHOW_CHROME_EXTENSION_BANNER: false,
        MOBILE_APP_PROMO: false,
        HIDE_INVITE_MORE_HEADER: true,
        // Personnalisation des couleurs
        DEFAULT_BACKGROUND: theme === 'dark' ? '#0a0a0b' : '#ffffff',
        DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
        DEFAULT_LOCAL_DISPLAY_NAME: userName,
        // Couleurs personnalisées pour le thème
        APP_NAME: 'Vaya Visio',
        NATIVE_APP_NAME: 'Vaya Visio',
        PROVIDER_NAME: 'Vaya',
        // Toolbar toujours visible
        TOOLBAR_TIMEOUT: 10000,
        // Logo custom (si configuré sur le serveur)
        DEFAULT_LOGO_URL: '/assets/logo-vaya.png',
        DEFAULT_WELCOME_PAGE_LOGO_URL: '/assets/logo-vaya.png',
      }
    };

    try {
      console.log('🚀 [JITSI] Création de l\'instance Jitsi avec options:', options);
      apiRef.current = new window.JitsiMeetExternalAPI(domain, options);
      console.log('✅ [JITSI] Instance Jitsi créée avec succès');

      // Event listeners
      apiRef.current.addListener("readyToClose", () => {
        if (onClose) {
          onClose();
        } else {
          // Redirection par défaut vers le dashboard
          window.location.href = "/";
        }
      });

      // Événement quand la vidéoconférence est prête
      apiRef.current.addListener("videoConferenceJoined", () => {
        console.log("User joined the conference");
        // On peut ajouter des notifications ici
      });

      // Événement quand l'utilisateur quitte
      apiRef.current.addListener("videoConferenceLeft", () => {
        console.log("User left the conference");
      });

      // Appliquer le thème sombre si nécessaire
      if (theme === 'dark') {
        apiRef.current.executeCommand('overwriteConfig', {
          defaultBackground: '#0a0a0b',
        });
      }

    } catch (error) {
      console.error("Error creating Jitsi Meet instance:", error);
    }

    // Cleanup
    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [roomName, userName, onClose, projectTitle, theme]);

  return (
    <div
      className={`
        w-full overflow-hidden rounded-lg
        ${theme === 'dark' ? 'bg-neutral-900' : 'bg-white'}
      `}
      style={{ height }}
    >
      <div
        ref={containerRef}
        id="jitsi-container"
        className="w-full h-full"
      />
    </div>
  );
}

export default VayaJitsi;