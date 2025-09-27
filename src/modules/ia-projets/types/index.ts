/**
 * Module IA PROJETS - Types Principal
 *
 * Types TypeScript pour le système d'intelligence artificielle dédiée aux projets :
 * - Assistant IA pour équipes de projet
 * - Suggestions automatiques et optimisations
 * - Analyse de performance et recommandations
 * - Chat intelligent contextuel
 * - Automation de tâches récurrentes
 * - Rapports IA et insights projet
 */

// ==========================================
// CORE TYPES - IA PROJETS
// ==========================================

export interface ProjectAIAssistant {
  id: string;
  projectId: string;
  name: string;
  persona: AIPersona;
  specializations: AISpecialization[];

  // Configuration IA
  config: ProjectAIConfig;
  context: ProjectContext;

  // État et capacités
  status: AIAssistantStatus;
  capabilities: AICapability[];

  // Métriques
  totalInteractions: number;
  successfulSuggestions: number;
  averageResponseTime: number;
  satisfactionScore: number;

  // Métadonnées
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
}

export interface AIConversation {
  id: string;
  projectId: string;
  assistantId: string;
  userId: string;

  // Contenu de conversation
  messages: AIMessage[];
  context: ConversationContext;

  // État
  status: ConversationStatus;
  type: ConversationType;
  priority: ConversationPriority;

  // Analytics
  tokensUsed: number;
  duration: number; // en secondes
  satisfaction?: number; // 1-5

  // Métadonnées
  startedAt: string;
  endedAt?: string;
  tags: string[];
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;

  // Contenu enrichi
  attachments?: MessageAttachment[];
  suggestions?: AISuggestion[];
  actions?: AIAction[];

  // Contexte
  context?: MessageContext;
  confidence?: number; // 0-100

  // Métadonnées
  timestamp: string;
  tokensUsed?: number;
  processingTime?: number; // en ms
  edited: boolean;
  editedAt?: string;
}

export interface AISuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;

  // Détails de suggestion
  impact: ImpactLevel;
  effort: EffortLevel;
  priority: number; // 1-10
  confidence: number; // 0-100

  // Actions suggérées
  actions: SuggestedAction[];
  resources?: ResourceReference[];

  // Métriques
  implementationTime?: number; // en heures
  expectedBenefit?: string;
  riskLevel: RiskLevel;

  // État
  status: SuggestionStatus;
  implementedAt?: string;
  feedback?: UserFeedback;

  // Métadonnées
  createdAt: string;
  relevantUntil?: string;
}

export interface AIInsight {
  id: string;
  projectId: string;
  type: InsightType;
  category: InsightCategory;

  // Contenu
  title: string;
  summary: string;
  details: string;

  // Données et métriques
  data: InsightData;
  confidence: number;
  impact: ImpactLevel;

  // Visualisation
  chartConfig?: ChartConfiguration;
  recommendations?: string[];

  // État
  status: InsightStatus;
  viewedBy: string[]; // IDs utilisateurs
  acknowledgedBy: string[];

  // Métadonnées
  generatedAt: string;
  expiresAt?: string;
  tags: string[];
}

export interface ProjectAnalytics {
  projectId: string;
  period: AnalyticsPeriod;

  // Métriques de performance
  completion: CompletionMetrics;
  velocity: VelocityMetrics;
  quality: QualityMetrics;
  team: TeamMetrics;

  // Comparaisons
  previousPeriod?: ProjectAnalytics;
  benchmark?: BenchmarkData;

  // Prédictions
  forecasts: ProjectForecasts;
  risks: IdentifiedRisk[];
  opportunities: IdentifiedOpportunity[];

  // IA Insights
  aiSummary: string;
  recommendations: AIRecommendation[];

  // Métadonnées
  generatedAt: string;
  accuracy: number; // Précision des prédictions précédentes
}

// ==========================================
// CONFIGURATION ET PARAMÈTRES
// ==========================================

export interface ProjectAIConfig {
  // Personnalité IA
  personality: AIPersonality;
  communicationStyle: CommunicationStyle;
  expertise: ExpertiseArea[];

  // Paramètres comportementaux
  proactivity: number; // 1-10 (réactif à proactif)
  verbosity: number; // 1-5 (concis à détaillé)
  creativity: number; // 1-5 (conservateur à créatif)

  // Préférences d'intervention
  interventionTriggers: TriggerCondition[];
  notificationFrequency: NotificationFrequency;
  workingHours?: TimeRange[];

  // Intégrations
  enabledFeatures: AIFeature[];
  externalServices: ExternalServiceConfig[];

  // Limites et restrictions
  maxTokensPerDay?: number;
  maxConversationsPerDay?: number;
  restrictedTopics?: string[];

  // Apprentissage
  learningEnabled: boolean;
  feedbackWeight: number; // Influence du feedback utilisateur
  contextRetentionDays: number;
}

export interface ProjectContext {
  // Informations projet
  projectInfo: ProjectInfo;
  teamMembers: TeamMemberInfo[];
  currentPhase: ProjectPhase;

  // État actuel
  activeTasks: TaskSummary[];
  recentActivities: ActivitySummary[];
  upcomingDeadlines: DeadlineInfo[];

  // Historique
  completedMilestones: MilestoneInfo[];
  resolvedIssues: IssueSummary[];
  lessonsLearned: LessonLearned[];

  // Métriques clés
  keyMetrics: ProjectMetric[];
  riskFactors: RiskFactor[];

  // Contexte externe
  industryTrends?: IndustryTrend[];
  competitorData?: CompetitorInfo[];
  marketConditions?: MarketCondition[];
}

// ==========================================
// ENUMS ET TYPES SPÉCIALISÉS
// ==========================================

export type AIPersona =
  | 'project_manager'    // Manager de projet expert
  | 'technical_lead'     // Lead technique
  | 'business_analyst'   // Analyste métier
  | 'scrum_master'       // Maître Scrum
  | 'product_owner'      // Product Owner
  | 'quality_assurance'  // QA specialist
  | 'creative_director'  // Directeur créatif
  | 'consultant'         // Consultant généraliste
  | 'custom';           // Personnalisé

export type AISpecialization =
  | 'agile_methodologies'
  | 'waterfall_management'
  | 'risk_management'
  | 'resource_optimization'
  | 'timeline_planning'
  | 'budget_analysis'
  | 'team_dynamics'
  | 'stakeholder_management'
  | 'quality_control'
  | 'change_management'
  | 'communication'
  | 'documentation'
  | 'reporting'
  | 'automation'
  | 'data_analysis';

export type AIAssistantStatus =
  | 'initializing'
  | 'active'
  | 'learning'
  | 'idle'
  | 'maintenance'
  | 'disabled'
  | 'error';

export type AICapability =
  | 'chat_conversation'
  | 'task_suggestions'
  | 'timeline_optimization'
  | 'resource_planning'
  | 'risk_assessment'
  | 'progress_analysis'
  | 'report_generation'
  | 'meeting_assistance'
  | 'document_analysis'
  | 'code_review'
  | 'automated_testing'
  | 'deployment_guidance';

export type ConversationStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived'
  | 'escalated';

export type ConversationType =
  | 'general_chat'
  | 'problem_solving'
  | 'planning_session'
  | 'status_update'
  | 'brainstorming'
  | 'code_review'
  | 'troubleshooting'
  | 'training';

export type ConversationPriority =
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent'
  | 'critical';

export type MessageRole =
  | 'user'
  | 'assistant'
  | 'system'
  | 'function';

export type SuggestionType =
  | 'task_optimization'
  | 'resource_allocation'
  | 'timeline_adjustment'
  | 'risk_mitigation'
  | 'quality_improvement'
  | 'team_collaboration'
  | 'process_automation'
  | 'cost_reduction'
  | 'performance_boost';

export type ImpactLevel =
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type EffortLevel =
  | 'trivial'
  | 'easy'
  | 'moderate'
  | 'complex'
  | 'major';

export type RiskLevel =
  | 'very_low'
  | 'low'
  | 'medium'
  | 'high'
  | 'very_high';

export type SuggestionStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'implementing'
  | 'completed'
  | 'rejected'
  | 'expired';

export type InsightType =
  | 'performance_trend'
  | 'risk_alert'
  | 'opportunity_detection'
  | 'pattern_recognition'
  | 'anomaly_detection'
  | 'benchmark_comparison'
  | 'prediction'
  | 'recommendation';

export type InsightCategory =
  | 'timeline'
  | 'budget'
  | 'quality'
  | 'team'
  | 'stakeholder'
  | 'technical'
  | 'business'
  | 'strategic';

export type InsightStatus =
  | 'new'
  | 'acknowledged'
  | 'acting'
  | 'resolved'
  | 'dismissed';

// ==========================================
// TYPES DE DONNÉES ET MÉTRIQUES
// ==========================================

export interface CompletionMetrics {
  overall: number; // 0-100%
  byPhase: { [phase: string]: number };
  byMember: { [memberId: string]: number };
  onTime: number; // Pourcentage de tâches terminées à l'heure
  qualityScore: number; // 0-100
  trend: MetricTrend;
}

export interface VelocityMetrics {
  tasksPerWeek: number;
  averageTaskDuration: number; // en heures
  throughput: number; // tâches/sprint ou tâches/mois
  burndownRate: number; // progression vers objectifs
  predictedCompletion: string; // Date prédite
}

export interface QualityMetrics {
  defectRate: number; // défauts/100 tâches
  reworkPercentage: number;
  clientSatisfaction: number; // 1-5
  testCoverage?: number; // pour projets tech
  reviewScore: number; // Score moyen des revues
}

export interface TeamMetrics {
  engagement: number; // 1-10
  productivity: number; // tâches/personne/période
  collaboration: number; // 1-10
  availability: number; // 0-100%
  skillUtilization: { [skill: string]: number };
}

export interface ProjectForecasts {
  completionDate: DateForecast;
  budgetOverrun: BudgetForecast;
  resourceNeeds: ResourceForecast[];
  riskProbabilities: RiskProbability[];
}

export interface AIRecommendation {
  id: string;
  type: RecommendationType;
  priority: number; // 1-10
  title: string;
  description: string;
  expectedImpact: ImpactLevel;
  implementationSteps: string[];
  successMetrics: string[];
  timeframe: string;
}

// ==========================================
// CONFIGURATION AVANCÉE
// ==========================================

export interface AIPersonality {
  name: string;
  traits: PersonalityTrait[];
  communicationPreferences: CommunicationPreferences;
  decisionMaking: DecisionMakingStyle;
  riskTolerance: RiskTolerance;
}

export interface PersonalityTrait {
  trait: TraitType;
  intensity: number; // 1-5
}

export type TraitType =
  | 'analytical'
  | 'creative'
  | 'detail_oriented'
  | 'collaborative'
  | 'decisive'
  | 'empathetic'
  | 'innovative'
  | 'practical'
  | 'strategic'
  | 'supportive';

export interface CommunicationPreferences {
  formality: FormalityLevel;
  directness: DirectnessLevel;
  emojiUsage: EmojiUsage;
  explanationDepth: ExplanationDepth;
  exampleFrequency: ExampleFrequency;
}

export type FormalityLevel = 'casual' | 'professional' | 'formal' | 'adaptive';
export type DirectnessLevel = 'indirect' | 'balanced' | 'direct' | 'very_direct';
export type EmojiUsage = 'none' | 'minimal' | 'moderate' | 'frequent';
export type ExplanationDepth = 'brief' | 'standard' | 'detailed' | 'comprehensive';
export type ExampleFrequency = 'rare' | 'occasional' | 'frequent' | 'abundant';

// ==========================================
// API ET RESPONSES
// ==========================================

export interface ProjectAIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: {
    requestId?: string;
    tokensUsed?: number;
    processingTime?: number;
    model?: string;
    confidence?: number;
  };
}

export interface CreateAssistantRequest {
  projectId: string;
  persona: AIPersona;
  specializations: AISpecialization[];
  config: Partial<ProjectAIConfig>;
}

export interface CreateAssistantResponse {
  assistant: ProjectAIAssistant;
  initialContext: ProjectContext;
  setupTasks: string[];
}

export interface StartConversationRequest {
  assistantId: string;
  type: ConversationType;
  priority?: ConversationPriority;
  initialMessage?: string;
  context?: Partial<ConversationContext>;
}

export interface StartConversationResponse {
  conversation: AIConversation;
  welcomeMessage: AIMessage;
  suggestedQuestions: string[];
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  attachments?: MessageAttachment[];
  context?: Partial<MessageContext>;
}

export interface SendMessageResponse {
  message: AIMessage;
  aiResponse: AIMessage;
  suggestions?: AISuggestion[];
  actions?: AIAction[];
}

// ==========================================
// HOOKS RETURN TYPES
// ==========================================

export interface UseProjectAIReturn {
  // État de l'assistant
  assistant: ProjectAIAssistant | null;
  isLoading: boolean;
  error: string | null;

  // Fonctions de gestion
  createAssistant: (request: CreateAssistantRequest) => Promise<ProjectAIAssistant | null>;
  updateConfig: (config: Partial<ProjectAIConfig>) => Promise<boolean>;
  deleteAssistant: () => Promise<boolean>;

  // Conversations
  activeConversation: AIConversation | null;
  startConversation: (type: ConversationType, message?: string) => Promise<AIConversation | null>;
  sendMessage: (content: string, attachments?: MessageAttachment[]) => Promise<boolean>;
  endConversation: () => Promise<boolean>;

  // Suggestions et insights
  suggestions: AISuggestion[];
  insights: AIInsight[];
  refreshSuggestions: () => Promise<void>;
  implementSuggestion: (suggestionId: string) => Promise<boolean>;
  dismissSuggestion: (suggestionId: string) => Promise<boolean>;

  // Analytics
  analytics: ProjectAnalytics | null;
  refreshAnalytics: () => Promise<void>;

  // Utilitaires
  isActive: boolean;
  lastActivity: string | null;
}

export interface UseProjectChatReturn {
  // État de conversation
  conversation: AIConversation | null;
  messages: AIMessage[];
  isTyping: boolean;
  isConnected: boolean;

  // Actions de chat
  sendMessage: (content: string, attachments?: MessageAttachment[]) => Promise<boolean>;
  startNewConversation: (type: ConversationType) => Promise<boolean>;
  endConversation: () => Promise<boolean>;

  // Gestion des messages
  editMessage: (messageId: string, newContent: string) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  regenerateResponse: (messageId: string) => Promise<boolean>;

  // État et contrôles
  error: string | null;
  retryCount: number;
  canRetry: boolean;
}

// ==========================================
// COMPONENT PROPS
// ==========================================

export interface ModularProjectAIViewProps {
  projectId: string;
  onAssistantCreated?: (assistant: ProjectAIAssistant) => void;
  onConversationStart?: (conversation: AIConversation) => void;

  // Configuration d'affichage
  showChat?: boolean;
  showSuggestions?: boolean;
  showInsights?: boolean;
  showAnalytics?: boolean;

  // Style
  className?: string;
  theme?: 'light' | 'dark';
  compact?: boolean;
}

export interface AIAssistantSetupProps {
  projectId: string;
  onComplete: (assistant: ProjectAIAssistant) => void;
  onCancel?: () => void;

  // Pré-configuration
  defaultPersona?: AIPersona;
  defaultSpecializations?: AISpecialization[];

  className?: string;
}

export interface ProjectChatInterfaceProps {
  assistantId: string;
  onMessageSent?: (message: AIMessage) => void;
  onSuggestionReceived?: (suggestion: AISuggestion) => void;

  // Configuration UI
  showAttachments?: boolean;
  showSuggestions?: boolean;
  maxMessages?: number;

  className?: string;
  theme?: 'light' | 'dark';
}

// ==========================================
// UTILITAIRES ET HELPERS
// ==========================================

export interface ProjectAIModuleConfig {
  name: string;
  version: string;
  features: string[];
  supportedModels: string[];
  maxTokensPerRequest: number;
  maxConversationLength: number;
  defaultPersona: AIPersona;
}

// Types génériques utilitaires
export type KeysOf<T> = keyof T;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Interfaces auxiliaires (simplifiées pour l'exemple)
export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface AIAction {
  id: string;
  type: string;
  label: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface ConversationContext {
  projectPhase?: string;
  activeFeatures?: string[];
  recentEvents?: string[];
  userPreferences?: Record<string, any>;
}

export interface MessageContext {
  referencedMessages?: string[];
  mentions?: string[];
  urgency?: 'low' | 'normal' | 'high';
  category?: string;
}

export interface SuggestedAction {
  action: string;
  parameters: Record<string, any>;
  description: string;
}

export interface ResourceReference {
  type: 'document' | 'link' | 'person' | 'tool';
  reference: string;
  description: string;
}

export interface UserFeedback {
  rating: number; // 1-5
  comment?: string;
  implemented: boolean;
  implementationNotes?: string;
}

export interface InsightData {
  metrics: Record<string, number>;
  trends: Record<string, number[]>;
  comparisons?: Record<string, number>;
  predictions?: Record<string, any>;
}

export interface ChartConfiguration {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  data: any;
  options: any;
}

// Types simplifiés pour référence
export interface ProjectInfo { id: string; name: string; description: string; }
export interface TeamMemberInfo { id: string; name: string; role: string; }
export interface TaskSummary { id: string; title: string; status: string; }
export interface ActivitySummary { id: string; type: string; description: string; }
export interface DeadlineInfo { id: string; title: string; date: string; }
export interface MilestoneInfo { id: string; name: string; completedAt: string; }
export interface IssueSummary { id: string; title: string; resolvedAt: string; }
export interface LessonLearned { id: string; lesson: string; category: string; }
export interface ProjectMetric { name: string; value: number; unit: string; }
export interface RiskFactor { id: string; description: string; probability: number; }
export interface IndustryTrend { trend: string; impact: ImpactLevel; }
export interface CompetitorInfo { name: string; strength: string; }
export interface MarketCondition { condition: string; impact: string; }

export interface AnalyticsPeriod {
  start: string;
  end: string;
  type: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface BenchmarkData {
  industry: string;
  metrics: Record<string, number>;
  percentile: number;
}

export interface IdentifiedRisk {
  id: string;
  description: string;
  probability: number;
  impact: ImpactLevel;
  mitigation: string;
}

export interface IdentifiedOpportunity {
  id: string;
  description: string;
  potential: ImpactLevel;
  effort: EffortLevel;
  timeframe: string;
}

export interface DateForecast {
  predicted: string;
  confidence: number;
  earliestPossible: string;
  latestPossible: string;
}

export interface BudgetForecast {
  predicted: number;
  confidence: number;
  variance: number;
  riskFactors: string[];
}

export interface ResourceForecast {
  resourceType: string;
  predicted: number;
  confidence: number;
  timeframe: string;
}

export interface RiskProbability {
  risk: string;
  probability: number;
  timeframe: string;
}

export interface MetricTrend {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  period: string;
}

export type RecommendationType =
  | 'process_improvement'
  | 'resource_optimization'
  | 'risk_mitigation'
  | 'quality_enhancement'
  | 'timeline_adjustment'
  | 'cost_reduction'
  | 'team_development'
  | 'stakeholder_management';

export type CommunicationStyle = 'formal' | 'casual' | 'technical' | 'collaborative';
export type ExpertiseArea = 'management' | 'technical' | 'creative' | 'analytical' | 'strategic';
export type NotificationFrequency = 'immediate' | 'hourly' | 'daily' | 'weekly' | 'on_demand';
export type AIFeature = 'chat' | 'suggestions' | 'analytics' | 'automation' | 'reporting';
export type ProjectPhase = 'planning' | 'design' | 'development' | 'testing' | 'deployment' | 'maintenance';
export type DecisionMakingStyle = 'consensus' | 'directive' | 'analytical' | 'intuitive';
export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';

export interface ExternalServiceConfig {
  service: string;
  enabled: boolean;
  config: Record<string, any>;
}

export interface TriggerCondition {
  event: string;
  threshold?: number;
  frequency?: string;
  enabled: boolean;
}

export interface TimeRange {
  start: string; // HH:mm
  end: string;   // HH:mm
  timezone: string;
}