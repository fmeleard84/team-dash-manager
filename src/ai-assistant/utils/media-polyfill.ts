/**
 * Polyfill et utilities pour gérer les médias dans différents contextes
 */

export const ensureMediaDevices = () => {
  // Check if we're in a secure context
  const isSecureContext = window.isSecureContext ||
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (!isSecureContext) {
    console.warn('⚠️ Not in a secure context. Media devices may not be available.');
    console.warn('Current URL:', window.location.href);
    console.warn('Please use HTTPS or localhost for WebRTC features.');
  }

  // Log current state for debugging
  console.log('🔍 Media devices check:', {
    isSecureContext,
    hasNavigator: typeof navigator !== 'undefined',
    hasMediaDevices: typeof navigator !== 'undefined' && 'mediaDevices' in navigator,
    hasGetUserMedia: typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      'getUserMedia' in navigator.mediaDevices,
    protocol: window.location.protocol,
    hostname: window.location.hostname
  });

  // If mediaDevices is not available, try to polyfill it
  if (!navigator.mediaDevices && navigator.getUserMedia) {
    console.log('📦 Adding mediaDevices polyfill...');

    navigator.mediaDevices = {
      getUserMedia: (constraints) => {
        return new Promise((resolve, reject) => {
          navigator.getUserMedia(constraints, resolve, reject);
        });
      },
      enumerateDevices: () => Promise.resolve([]),
      getSupportedConstraints: () => ({}),
      getDisplayMedia: () => Promise.reject(new Error('Not supported'))
    } as MediaDevices;
  }

  // Add legacy getUserMedia if needed
  if (!navigator.getUserMedia) {
    navigator.getUserMedia = (
      navigator.getUserMedia ||
      (navigator as any).webkitGetUserMedia ||
      (navigator as any).mozGetUserMedia ||
      (navigator as any).msGetUserMedia
    );
  }

  return navigator.mediaDevices;
};

export const checkMediaPermissions = async () => {
  try {
    // Try to check permissions if API is available
    if ('permissions' in navigator && navigator.permissions.query) {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      console.log('🎤 Microphone permission:', result.state);
      return result.state;
    }
  } catch (e) {
    console.log('Cannot check permissions:', e);
  }
  return 'unknown';
};

export const requestMicrophoneAccess = async () => {
  try {
    ensureMediaDevices();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia not supported in this browser');
    }

    console.log('🎤 Requesting microphone access...');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    });

    console.log('✅ Microphone access granted');

    // Stop the stream immediately (we just wanted to get permission)
    stream.getTracks().forEach(track => track.stop());

    return true;
  } catch (error: any) {
    console.error('❌ Microphone access error:', error);

    if (error.name === 'NotAllowedError') {
      throw new Error('Accès au microphone refusé. Veuillez autoriser l\'accès dans les paramètres du navigateur.');
    } else if (error.name === 'NotFoundError') {
      throw new Error('Aucun microphone trouvé. Veuillez connecter un microphone.');
    } else if (error.name === 'NotReadableError') {
      throw new Error('Le microphone est utilisé par une autre application.');
    } else if (error.name === 'OverconstrainedError') {
      throw new Error('Configuration audio non supportée.');
    } else {
      throw new Error(`Erreur d'accès au microphone: ${error.message}`);
    }
  }
};