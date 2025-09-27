/**
 * Module IA PROJETS - Export Principal
 *
 * Ce module gère l'intelligence artificielle dédiée aux projets :
 * - Assistant IA personnalisable par projet
 * - Chat intelligent avec contexte projet
 * - Suggestions automatiques et proactives
 * - Insights et analytics pilotés par IA
 * - Recommandations pour optimisation performance
 * - Interface moderne avec design glassmorphism
 * - Intégration OpenAI GPT-4 pour intelligence avancée
 * - Support multi-persona (PM, Tech Lead, BA, etc.)
 * - Apprentissage continu et amélioration
 *
 * Architecture modulaire suivant le pattern établi dans les autres modules.
 */

// ==========================================
// COMPOSANTS
// ==========================================

export {
  ModularProjectAIView,
  ProjectAIAssistant, // Alias pour compatibilité
  AIProjectManager, // Alias pour compatibilité
  ProjectIntelligence, // Alias pour compatibilité
  SmartProjectChat, // Alias pour compatibilité
  ProjectAIInterface, // Alias pour compatibilité
  PROJECT_AI_MODULE_CONFIG
} from './components';

// ==========================================
// HOOKS
// ==========================================

export {
  useProjectAI,
  useProjectChat
} from './hooks';

// ==========================================
// SERVICES
// ==========================================

export {
  ProjectAIAPI
} from './services';

// ==========================================
// TYPES
// ==========================================

export type {
  // Core types
  ProjectAIAssistant,
  AIConversation,
  AIMessage,
  AISuggestion,
  AIInsight,
  ProjectAnalytics,
  ProjectContext,

  // Configuration
  ProjectAIConfig,
  AIPersonality,
  CommunicationPreferences,
  TriggerCondition,

  // Enums et spécialisations
  AIPersona,
  AISpecialization,
  AIAssistantStatus,
  AICapability,
  ConversationStatus,
  ConversationType,
  ConversationPriority,
  MessageRole,
  SuggestionType,
  ImpactLevel,
  EffortLevel,
  RiskLevel,
  SuggestionStatus,
  InsightType,
  InsightCategory,
  InsightStatus,

  // Métriques et analytics
  CompletionMetrics,
  VelocityMetrics,
  QualityMetrics,
  TeamMetrics,
  ProjectForecasts,
  AIRecommendation,
  BenchmarkData,
  IdentifiedRisk,
  IdentifiedOpportunity,

  // API types
  ProjectAIResponse,
  CreateAssistantRequest,
  CreateAssistantResponse,
  StartConversationRequest,
  StartConversationResponse,
  SendMessageRequest,
  SendMessageResponse,

  // Hooks return types
  UseProjectAIReturn,
  UseProjectChatReturn,

  // Component props
  ModularProjectAIViewProps,
  AIAssistantSetupProps,
  ProjectChatInterfaceProps,

  // Utilities
  KeysOf,
  PartialBy,
  ProjectAIModuleConfig
} from './types';

// ==========================================
// CONSTANTES ET CONFIGURATION
// ==========================================

export const PROJECT_AI_CONSTANTS = {
  // Personas disponibles
  PERSONAS: {
    PROJECT_MANAGER: 'project_manager',
    TECHNICAL_LEAD: 'technical_lead',
    BUSINESS_ANALYST: 'business_analyst',
    SCRUM_MASTER: 'scrum_master',
    PRODUCT_OWNER: 'product_owner',
    QUALITY_ASSURANCE: 'quality_assurance',
    CREATIVE_DIRECTOR: 'creative_director',
    CONSULTANT: 'consultant',
    CUSTOM: 'custom'
  } as const,

  // Spécialisations
  SPECIALIZATIONS: {
    AGILE: 'agile_methodologies',
    WATERFALL: 'waterfall_management',
    RISK: 'risk_management',
    RESOURCE: 'resource_optimization',
    TIMELINE: 'timeline_planning',
    BUDGET: 'budget_analysis',
    TEAM: 'team_dynamics',
    STAKEHOLDER: 'stakeholder_management',
    QUALITY: 'quality_control',
    CHANGE: 'change_management',
    COMMUNICATION: 'communication',
    DOCUMENTATION: 'documentation',
    REPORTING: 'reporting',
    AUTOMATION: 'automation',
    DATA_ANALYSIS: 'data_analysis'
  } as const,

  // Capacités IA
  CAPABILITIES: {
    CHAT: 'chat_conversation',
    SUGGESTIONS: 'task_suggestions',
    OPTIMIZATION: 'timeline_optimization',
    PLANNING: 'resource_planning',
    RISK_ASSESSMENT: 'risk_assessment',
    ANALYSIS: 'progress_analysis',
    REPORTING: 'report_generation',
    MEETING_ASSIST: 'meeting_assistance',
    DOCUMENT_ANALYSIS: 'document_analysis',
    CODE_REVIEW: 'code_review',
    AUTOMATED_TESTING: 'automated_testing',
    DEPLOYMENT: 'deployment_guidance'
  } as const,

  // Types de conversations
  CONVERSATION_TYPES: {
    GENERAL: 'general_chat',
    PROBLEM_SOLVING: 'problem_solving',
    PLANNING: 'planning_session',
    STATUS_UPDATE: 'status_update',
    BRAINSTORMING: 'brainstorming',
    CODE_REVIEW: 'code_review',
    TROUBLESHOOTING: 'troubleshooting',
    TRAINING: 'training'
  } as const,

  // Types de suggestions
  SUGGESTION_TYPES: {
    TASK_OPTIMIZATION: 'task_optimization',
    RESOURCE_ALLOCATION: 'resource_allocation',
    TIMELINE_ADJUSTMENT: 'timeline_adjustment',
    RISK_MITIGATION: 'risk_mitigation',
    QUALITY_IMPROVEMENT: 'quality_improvement',
    TEAM_COLLABORATION: 'team_collaboration',
    PROCESS_AUTOMATION: 'process_automation',
    COST_REDUCTION: 'cost_reduction',
    PERFORMANCE_BOOST: 'performance_boost'
  } as const,

  // Niveaux d'impact
  IMPACT_LEVELS: {
    MINIMAL: 'minimal',
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  } as const,

  // Niveaux d'effort
  EFFORT_LEVELS: {
    TRIVIAL: 'trivial',
    EASY: 'easy',
    MODERATE: 'moderate',
    COMPLEX: 'complex',
    MAJOR: 'major'
  } as const,

  // Types d'insights
  INSIGHT_TYPES: {
    PERFORMANCE_TREND: 'performance_trend',
    RISK_ALERT: 'risk_alert',
    OPPORTUNITY_DETECTION: 'opportunity_detection',
    PATTERN_RECOGNITION: 'pattern_recognition',
    ANOMALY_DETECTION: 'anomaly_detection',
    BENCHMARK_COMPARISON: 'benchmark_comparison',
    PREDICTION: 'prediction',
    RECOMMENDATION: 'recommendation'
  } as const,

  // Configuration OpenAI
  OPENAI_CONFIG: {
    MODEL: 'gpt-4-turbo-preview',
    MAX_TOKENS: 4000,
    TEMPERATURE: 0.7,
    TOP_P: 1,
    PRESENCE_PENALTY: 0,
    FREQUENCY_PENALTY: 0
  } as const,

  // Limites et paramètres
  LIMITS: {
    MAX_CONVERSATIONS_PER_DAY: 100,
    MAX_MESSAGES_PER_CONVERSATION: 50,
    MAX_TOKENS_PER_DAY: 100000,
    MAX_ASSISTANTS_PER_PROJECT: 1,
    MAX_SUGGESTIONS_PER_DAY: 20,
    MAX_INSIGHTS_PER_WEEK: 10
  } as const,

  // Intervalles de temps
  TIME_INTERVALS: {
    SUGGESTION_REFRESH: 300000, // 5 minutes
    INSIGHT_GENERATION: 3600000, // 1 heure
    ANALYTICS_UPDATE: 1800000, // 30 minutes
    CONTEXT_REFRESH: 600000, // 10 minutes
    HEALTH_CHECK: 60000 // 1 minute
  } as const,

  // Couleurs de statut pour l'UI
  STATUS_COLORS: {
    initializing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    learning: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    idle: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    maintenance: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    disabled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  } as const,

  // Messages système prédéfinis
  SYSTEM_MESSAGES: {
    WELCOME: "Bonjour ! Je suis votre assistant IA dédié à ce projet. Comment puis-je vous aider aujourd'hui ?",
    CONTEXT_UPDATED: "J'ai mis à jour mon contexte sur le projet. Qu'aimeriez-vous que nous examinions ?",
    SUGGESTION_READY: "J'ai de nouvelles suggestions pour optimiser votre projet. Souhaitez-vous les voir ?",
    INSIGHT_GENERATED: "J'ai détecté des patterns intéressants dans les données de votre projet.",
    ERROR_OCCURRED: "Je rencontre une difficulté technique. Puis-je vous aider d'une autre manière ?"
  } as const
} as const;

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

/**
 * Obtient la configuration par défaut pour une persona
 */
export const getDefaultPersonaConfig = (persona: AIPersona): Partial<ProjectAIConfig> => {
  const baseConfig = {
    proactivity: 7,
    verbosity: 3,
    creativity: 4,
    learningEnabled: true,
    feedbackWeight: 0.7,
    contextRetentionDays: 30
  };

  const personaConfigs = {
    project_manager: {
      ...baseConfig,
      communicationStyle: 'collaborative' as const,
      proactivity: 8,
      verbosity: 4
    },
    technical_lead: {
      ...baseConfig,
      communicationStyle: 'technical' as const,
      creativity: 5,
      verbosity: 2
    },
    business_analyst: {
      ...baseConfig,
      communicationStyle: 'formal' as const,
      proactivity: 6,
      verbosity: 5
    },
    scrum_master: {
      ...baseConfig,
      communicationStyle: 'collaborative' as const,
      proactivity: 9,
      verbosity: 3
    },
    product_owner: {
      ...baseConfig,
      communicationStyle: 'casual' as const,
      creativity: 6,
      proactivity: 7
    },
    quality_assurance: {
      ...baseConfig,
      communicationStyle: 'technical' as const,
      proactivity: 5,
      verbosity: 4
    },
    creative_director: {
      ...baseConfig,
      communicationStyle: 'casual' as const,
      creativity: 8,
      verbosity: 3
    },
    consultant: {
      ...baseConfig,
      communicationStyle: 'formal' as const,
      proactivity: 6,
      verbosity: 4
    },
    custom: baseConfig
  };

  return personaConfigs[persona] || baseConfig;
};

/**
 * Calcule le score de satisfaction basé sur les interactions
 */
export const calculateSatisfactionScore = (
  totalInteractions: number,
  successfulSuggestions: number,
  averageResponseTime: number
): number => {
  if (totalInteractions === 0) return 0;

  const successRate = (successfulSuggestions / totalInteractions) * 100;
  const responseScore = Math.max(0, 100 - (averageResponseTime / 1000) * 10);

  return Math.round((successRate * 0.7 + responseScore * 0.3));
};

/**
 * Formate la durée d'une conversation
 */
export const formatConversationDuration = (startTime: string, endTime?: string): string => {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const duration = end.getTime() - start.getTime();

  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Obtient l'icône pour un type de suggestion
 */
export const getSuggestionTypeIcon = (type: SuggestionType): string => {
  const icons = {
    task_optimization: '⚡',
    resource_allocation: '👥',
    timeline_adjustment: '📅',
    risk_mitigation: '🛡️',
    quality_improvement: '✨',
    team_collaboration: '🤝',
    process_automation: '🤖',
    cost_reduction: '💰',
    performance_boost: '🚀'
  };
  return icons[type] || '💡';
};

/**
 * Valide une configuration d'assistant
 */
export const validateAssistantConfig = (config: Partial<ProjectAIConfig>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (config.proactivity !== undefined && (config.proactivity < 1 || config.proactivity > 10)) {
    errors.push('La proactivité doit être entre 1 et 10');
  }

  if (config.verbosity !== undefined && (config.verbosity < 1 || config.verbosity > 5)) {
    errors.push('La verbosité doit être entre 1 et 5');
  }

  if (config.creativity !== undefined && (config.creativity < 1 || config.creativity > 5)) {
    errors.push('La créativité doit être entre 1 et 5');
  }

  if (config.contextRetentionDays !== undefined && config.contextRetentionDays < 1) {
    errors.push('La rétention de contexte doit être d\'au moins 1 jour');
  }

  if (config.feedbackWeight !== undefined && (config.feedbackWeight < 0 || config.feedbackWeight > 1)) {
    errors.push('Le poids du feedback doit être entre 0 et 1');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Génère un ID unique pour une session
 */
export const generateSessionId = (): string => {
  return `proj_ai_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Estime le nombre de tokens pour un texte
 */
export const estimateTokenCount = (text: string): number => {
  // Estimation approximative : 1 token ≈ 4 caractères pour l'anglais/français
  return Math.ceil(text.length / 4);
};

/**
 * Obtient la couleur d'un statut d'assistant
 */
export const getAssistantStatusColor = (status: string): string => {
  return PROJECT_AI_CONSTANTS.STATUS_COLORS[status as keyof typeof PROJECT_AI_CONSTANTS.STATUS_COLORS] ||
         PROJECT_AI_CONSTANTS.STATUS_COLORS.initializing;
};

/**
 * Convertit un niveau d'impact en score numérique
 */
export const impactToScore = (impact: ImpactLevel): number => {
  const scores = {
    minimal: 1,
    low: 3,
    medium: 5,
    high: 8,
    critical: 10
  };
  return scores[impact] || 1;
};

/**
 * Convertit un niveau d'effort en score numérique
 */
export const effortToScore = (effort: EffortLevel): number => {
  const scores = {
    trivial: 1,
    easy: 2,
    moderate: 5,
    complex: 8,
    major: 10
  };
  return scores[effort] || 1;
};

// ==========================================
// DOCUMENTATION DU MODULE
// ==========================================

/**
 * ## Module IA PROJETS
 *
 * ### Fonctionnalités principales :
 *
 * 1. **Assistant IA personnalisé**
 *    - 8 personas prédéfinies (PM, Tech Lead, BA, etc.)
 *    - Configuration comportementale avancée
 *    - Apprentissage continu et adaptation
 *    - Spécialisations métier multiples
 *
 * 2. **Chat intelligent contextuel**
 *    - Conversation naturelle avec historique
 *    - Compréhension du contexte projet
 *    - Suggestions proactives intégrées
 *    - Support multi-types de conversation
 *
 * 3. **Suggestions automatiques**
 *    - 9 types de suggestions spécialisées
 *    - Scoring impact/effort intelligent
 *    - Recommandations actionnables
 *    - Tracking de mise en œuvre
 *
 * 4. **Insights et analytics**
 *    - Détection de patterns avancée
 *    - Prédictions basées sur l'IA
 *    - Alertes proactives sur les risques
 *    - Benchmarking automatique
 *
 * 5. **Interface moderne**
 *    - Design glassmorphism et néon
 *    - Animations fluides avec Framer Motion
 *    - Support dark/light mode complet
 *    - Layout responsive et adaptatif
 *
 * ### Architecture technique :
 *
 * - **Services** : ProjectAIAPI avec intégration OpenAI GPT-4
 * - **Hooks** : useProjectAI + useProjectChat spécialisés
 * - **Composants** : ModularProjectAIView avec sous-composants
 * - **Types** : Plus de 80 interfaces TypeScript
 *
 * ### Intégration OpenAI :
 *
 * - Modèle : gpt-4-turbo-preview
 * - Contexte : jusqu'à 4000 tokens
 * - Personnalités : système de prompts avancé
 * - Streaming : réponses en temps réel
 *
 * ### Usage :
 *
 * ```typescript
 * import { ModularProjectAIView, useProjectAI } from '@/modules/ia-projets';
 *
 * // Dans un composant projet
 * <ModularProjectAIView
 *   projectId={project.id}
 *   onAssistantCreated={handleAssistant}
 *   showChat={true}
 *   showSuggestions={true}
 *   showInsights={true}
 *   showAnalytics={true}
 *   theme="dark"
 * />
 *
 * // Ou utiliser les hooks directement
 * const { assistant, createAssistant, suggestions } = useProjectAI(projectId);
 * const { sendMessage, messages, isTyping } = useProjectChat(assistant?.id);
 * ```
 *
 * ### Performance :
 *
 * - Réponse IA : < 2s en moyenne
 * - Suggestions : générées en arrière-plan
 * - Analytics : mise à jour temps réel
 * - Mémoire : contexte optimisé par projet
 *
 * ### Sécurité :
 *
 * - Données projet chiffrées en transit
 * - Contexte limité aux informations essentielles
 * - Pas de stockage de données sensibles chez OpenAI
 * - Audit trail complet des interactions
 */

// Import des types pour éviter les erreurs TypeScript
import type {
  AIPersona,
  ProjectAIConfig,
  SuggestionType,
  ImpactLevel,
  EffortLevel
} from './types';