/**
 * Module IA QUALIFICATION - Composants Index
 *
 * Centralise l'export de tous les composants React du module qualification IA.
 *
 * Composants disponibles :
 * - ModularQualificationView : Composant principal de qualification
 * - QualificationUI : Alias pour compatibilité
 * - VoiceQualification : Alias pour compatibilité
 * - IAQualificationTest : Alias pour compatibilité
 * - RealtimeQualification : Alias pour compatibilité
 */

import ModularQualificationView from './ModularQualificationView';

// Export principal
export { ModularQualificationView };
export default ModularQualificationView;

// Alias pour compatibilité avec l'existant
export { ModularQualificationView as QualificationUI };
export { ModularQualificationView as VoiceQualification };
export { ModularQualificationView as IAQualificationTest };
export { ModularQualificationView as RealtimeQualification };
export { ModularQualificationView as QualificationAgent };

// Configuration du module
export const QUALIFICATION_MODULE_CONFIG = {
  name: 'IA_QUALIFICATION',
  version: '1.0.0',
  features: [
    'voice_qualification',
    'realtime_audio',
    'ai_analysis',
    'adaptive_questions',
    'automatic_scoring',
    'detailed_feedback',
    'transcription',
    'progress_tracking'
  ],
  supportedLanguages: ['fr-FR', 'en-US'],
  audioFormats: ['webm', 'ogg', 'mp3'],
  maxSessionDuration: 1800, // 30 minutes
  maxRetryAttempts: 3
};