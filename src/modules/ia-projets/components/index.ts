/**
 * Module IA PROJETS - Composants Index
 *
 * Centralise l'export de tous les composants React du module IA projets.
 *
 * Composants disponibles :
 * - ModularProjectAIView : Composant principal d'assistant IA projet
 * - ProjectAIAssistant : Alias pour compatibilité
 * - AIProjectManager : Alias pour compatibilité
 * - ProjectIntelligence : Alias pour compatibilité
 * - SmartProjectChat : Alias pour compatibilité
 */

import ModularProjectAIView from './ModularProjectAIView';

// Export principal
export { ModularProjectAIView };
export default ModularProjectAIView;

// Alias pour compatibilité avec l'existant
export { ModularProjectAIView as ProjectAIAssistant };
export { ModularProjectAIView as AIProjectManager };
export { ModularProjectAIView as ProjectIntelligence };
export { ModularProjectAIView as SmartProjectChat };
export { ModularProjectAIView as ProjectAIInterface };

// Configuration du module
export const PROJECT_AI_MODULE_CONFIG = {
  name: 'IA_PROJETS',
  version: '1.0.0',
  features: [
    'ai_assistant',
    'intelligent_chat',
    'auto_suggestions',
    'project_insights',
    'performance_analytics',
    'proactive_recommendations',
    'contextual_help',
    'team_collaboration'
  ],
  supportedModels: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
  maxTokensPerRequest: 4000,
  maxConversationLength: 50,
  defaultPersona: 'project_manager' as const
};