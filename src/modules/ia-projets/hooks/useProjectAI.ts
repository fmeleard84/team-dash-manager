/**
 * Hook Principal - Module IA PROJETS
 *
 * Gère l'état et les interactions avec l'assistant IA dédié aux projets.
 * Fournit une interface React pour toutes les fonctionnalités IA.
 *
 * Fonctionnalités :
 * - Création et gestion d'assistants IA
 * - Sessions de chat intelligent
 * - Suggestions automatiques
 * - Insights et analytics
 * - Gestion d'état temps réel
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { toast } from 'sonner';

import { ProjectAIAPI } from '../services';
import type {
  ProjectAIAssistant,
  AIConversation,
  AISuggestion,
  AIInsight,
  ProjectAnalytics,
  UseProjectAIReturn,
  CreateAssistantRequest,
  ConversationType,
  AIPersona,
  AISpecialization
} from '../types';

/**
 * Hook principal pour la gestion de l'IA projet
 */
export function useProjectAI(projectId?: string): UseProjectAIReturn {
  const { user } = useAuth();

  // État de l'assistant
  const [assistant, setAssistant] = useState<ProjectAIAssistant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État des conversations
  const [activeConversation, setActiveConversation] = useState<AIConversation | null>(null);
  const [conversationHistory, setConversationHistory] = useState<AIConversation[]>([]);

  // État des suggestions et insights
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);

  // Références pour optimisation
  const lastActivity = useRef<string | null>(null);
  const refreshInterval = useRef<NodeJS.Timeout>();

  /**
   * Initialise l'assistant pour le projet courant
   */
  useEffect(() => {
    if (projectId && user) {
      loadExistingAssistant();
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [projectId, user]);

  /**
   * Charge l'assistant existant ou propose d'en créer un
   */
  const loadExistingAssistant = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Rechercher un assistant existant pour ce projet
      const { data, error } = await supabase
        .from('project_ai_assistants')
        .select('*')
        .eq('projectId', projectId)
        .eq('status', 'active')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // Pas d'erreur si pas de résultat
        throw error;
      }

      if (data) {
        setAssistant(data);
        lastActivity.current = data.lastActiveAt;

        // Charger les données associées
        await Promise.all([
          loadSuggestions(data.id),
          loadInsights(data.id),
          loadRecentConversations(data.id)
        ]);

        // Démarrer le monitoring temps réel
        startRealtimeMonitoring(data.id);
      }

    } catch (error) {
      console.error('[useProjectAI] Erreur loadExistingAssistant:', error);
      setError('Erreur lors du chargement de l\'assistant');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  /**
   * Crée un nouvel assistant IA
   */
  const createAssistant = useCallback(async (
    request: CreateAssistantRequest
  ): Promise<ProjectAIAssistant | null> => {
    if (!user || !projectId) {
      toast.error('Utilisateur non authentifié');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await ProjectAIAPI.createAssistant({
        ...request,
        projectId
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erreur création assistant');
      }

      const newAssistant = response.data.assistant;
      setAssistant(newAssistant);
      lastActivity.current = newAssistant.lastActiveAt;

      // Démarrer le monitoring
      startRealtimeMonitoring(newAssistant.id);

      toast.success(`Assistant ${newAssistant.name} créé avec succès`);
      return newAssistant;

    } catch (error) {
      console.error('[useProjectAI] Erreur createAssistant:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;

    } finally {
      setIsLoading(false);
    }
  }, [user, projectId]);

  /**
   * Met à jour la configuration de l'assistant
   */
  const updateConfig = useCallback(async (
    config: Partial<ProjectAIAssistant['config']>
  ): Promise<boolean> => {
    if (!assistant) {
      toast.error('Aucun assistant actif');
      return false;
    }

    setIsLoading(true);

    try {
      const response = await ProjectAIAPI.updateAssistantConfig(assistant.id, config);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erreur mise à jour');
      }

      setAssistant(response.data);
      toast.success('Configuration mise à jour');
      return true;

    } catch (error) {
      console.error('[useProjectAI] Erreur updateConfig:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur mise à jour';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;

    } finally {
      setIsLoading(false);
    }
  }, [assistant]);

  /**
   * Supprime l'assistant
   */
  const deleteAssistant = useCallback(async (): Promise<boolean> => {
    if (!assistant) return false;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('project_ai_assistants')
        .update({ status: 'disabled' })
        .eq('id', assistant.id);

      if (error) throw error;

      setAssistant(null);
      setActiveConversation(null);
      setSuggestions([]);
      setInsights([]);
      setAnalytics(null);

      // Arrêter le monitoring
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }

      toast.success('Assistant supprimé');
      return true;

    } catch (error) {
      console.error('[useProjectAI] Erreur deleteAssistant:', error);
      setError('Erreur lors de la suppression');
      toast.error('Erreur lors de la suppression');
      return false;

    } finally {
      setIsLoading(false);
    }
  }, [assistant]);

  /**
   * Démarre une nouvelle conversation
   */
  const startConversation = useCallback(async (
    type: ConversationType,
    initialMessage?: string
  ): Promise<AIConversation | null> => {
    if (!assistant) {
      toast.error('Aucun assistant disponible');
      return null;
    }

    setIsLoading(true);

    try {
      const response = await ProjectAIAPI.startConversation({
        assistantId: assistant.id,
        type,
        initialMessage
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erreur démarrage conversation');
      }

      const conversation = response.data.conversation;
      setActiveConversation(conversation);
      setConversationHistory(prev => [conversation, ...prev]);

      return conversation;

    } catch (error) {
      console.error('[useProjectAI] Erreur startConversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur conversation';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;

    } finally {
      setIsLoading(false);
    }
  }, [assistant]);

  /**
   * Envoie un message dans la conversation active
   */
  const sendMessage = useCallback(async (
    content: string,
    attachments?: any[]
  ): Promise<boolean> => {
    if (!activeConversation) {
      toast.error('Aucune conversation active');
      return false;
    }

    setIsLoading(true);

    try {
      const response = await ProjectAIAPI.sendMessage({
        conversationId: activeConversation.id,
        content,
        attachments
      });

      if (!response.success) {
        throw new Error(response.error || 'Erreur envoi message');
      }

      // Mettre à jour les suggestions si reçues
      if (response.data?.suggestions) {
        setSuggestions(prev => [...response.data!.suggestions!, ...prev]);
      }

      return true;

    } catch (error) {
      console.error('[useProjectAI] Erreur sendMessage:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur envoi';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;

    } finally {
      setIsLoading(false);
    }
  }, [activeConversation]);

  /**
   * Termine la conversation active
   */
  const endConversation = useCallback(async (): Promise<boolean> => {
    if (!activeConversation) return true;

    try {
      const { error } = await supabase
        .from('ai_conversations')
        .update({
          status: 'completed',
          endedAt: new Date().toISOString()
        })
        .eq('id', activeConversation.id);

      if (error) throw error;

      setActiveConversation(null);
      return true;

    } catch (error) {
      console.error('[useProjectAI] Erreur endConversation:', error);
      return false;
    }
  }, [activeConversation]);

  /**
   * Actualise les suggestions
   */
  const refreshSuggestions = useCallback(async (): Promise<void> => {
    if (!assistant) return;

    try {
      const response = await ProjectAIAPI.generateSuggestions(
        projectId!,
        assistant.id
      );

      if (response.success && response.data) {
        setSuggestions(response.data);
      }

    } catch (error) {
      console.error('[useProjectAI] Erreur refreshSuggestions:', error);
    }
  }, [assistant, projectId]);

  /**
   * Implémente une suggestion
   */
  const implementSuggestion = useCallback(async (
    suggestionId: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('ai_suggestions')
        .update({
          status: 'implementing',
          implementedAt: new Date().toISOString()
        })
        .eq('id', suggestionId);

      if (error) throw error;

      // Mettre à jour l'état local
      setSuggestions(prev =>
        prev.map(s => s.id === suggestionId
          ? { ...s, status: 'implementing', implementedAt: new Date().toISOString() }
          : s
        )
      );

      toast.success('Suggestion mise en œuvre');
      return true;

    } catch (error) {
      console.error('[useProjectAI] Erreur implementSuggestion:', error);
      toast.error('Erreur lors de l\'implémentation');
      return false;
    }
  }, []);

  /**
   * Rejette une suggestion
   */
  const dismissSuggestion = useCallback(async (
    suggestionId: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('ai_suggestions')
        .update({ status: 'rejected' })
        .eq('id', suggestionId);

      if (error) throw error;

      setSuggestions(prev =>
        prev.map(s => s.id === suggestionId
          ? { ...s, status: 'rejected' }
          : s
        )
      );

      return true;

    } catch (error) {
      console.error('[useProjectAI] Erreur dismissSuggestion:', error);
      return false;
    }
  }, []);

  /**
   * Actualise les analytics
   */
  const refreshAnalytics = useCallback(async (): Promise<void> => {
    if (!assistant || !projectId) return;

    try {
      // Simuler des analytics pour l'exemple
      const mockAnalytics: ProjectAnalytics = {
        projectId,
        period: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
          type: 'month'
        },
        completion: {
          overall: 75,
          byPhase: { development: 80, testing: 60 },
          byMember: {},
          onTime: 85,
          qualityScore: 92,
          trend: { direction: 'up', percentage: 5, period: 'week' }
        },
        velocity: {
          tasksPerWeek: 12,
          averageTaskDuration: 24,
          throughput: 48,
          burndownRate: 0.85,
          predictedCompletion: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString()
        },
        quality: {
          defectRate: 2.1,
          reworkPercentage: 8,
          clientSatisfaction: 4.2,
          reviewScore: 4.5
        },
        team: {
          engagement: 8.5,
          productivity: 85,
          collaboration: 9.2,
          availability: 95,
          skillUtilization: { frontend: 90, backend: 85, design: 75 }
        },
        forecasts: {
          completionDate: {
            predicted: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
            confidence: 85,
            earliestPossible: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            latestPossible: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          budgetOverrun: {
            predicted: 5,
            confidence: 75,
            variance: 3,
            riskFactors: ['Scope creep', 'Resource availability']
          },
          resourceNeeds: [],
          riskProbabilities: []
        },
        risks: [],
        opportunities: [],
        aiSummary: "Le projet progresse bien avec une vélocité stable. Attention aux risques de délais sur les tests.",
        recommendations: [
          {
            id: '1',
            type: 'process_improvement',
            priority: 8,
            title: 'Optimiser les tests automatisés',
            description: 'Améliorer la couverture de tests pour réduire les délais',
            expectedImpact: 'medium',
            implementationSteps: ['Audit des tests', 'Ajout de tests unitaires', 'CI/CD pipeline'],
            successMetrics: ['Couverture > 80%', 'Temps de build < 10min'],
            timeframe: '2 semaines'
          }
        ],
        generatedAt: new Date().toISOString(),
        accuracy: 88
      };

      setAnalytics(mockAnalytics);

    } catch (error) {
      console.error('[useProjectAI] Erreur refreshAnalytics:', error);
    }
  }, [assistant, projectId]);

  // Méthodes helper privées
  const loadSuggestions = useCallback(async (assistantId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_suggestions')
        .select('*')
        .eq('assistantId', assistantId)
        .eq('status', 'pending')
        .order('createdAt', { ascending: false })
        .limit(10);

      if (!error && data) {
        setSuggestions(data);
      }
    } catch (error) {
      console.error('[useProjectAI] Erreur loadSuggestions:', error);
    }
  }, []);

  const loadInsights = useCallback(async (assistantId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('assistantId', assistantId)
        .eq('status', 'new')
        .order('generatedAt', { ascending: false })
        .limit(5);

      if (!error && data) {
        setInsights(data);
      }
    } catch (error) {
      console.error('[useProjectAI] Erreur loadInsights:', error);
    }
  }, []);

  const loadRecentConversations = useCallback(async (assistantId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('assistantId', assistantId)
        .order('startedAt', { ascending: false })
        .limit(5);

      if (!error && data) {
        setConversationHistory(data);

        // Reprendre la conversation active si elle existe
        const active = data.find(c => c.status === 'active');
        if (active) {
          setActiveConversation(active);
        }
      }
    } catch (error) {
      console.error('[useProjectAI] Erreur loadRecentConversations:', error);
    }
  }, []);

  const startRealtimeMonitoring = useCallback((assistantId: string) => {
    // Surveiller les changements en temps réel
    refreshInterval.current = setInterval(() => {
      if (assistant) {
        // Vérifier s'il y a des nouveautés
        refreshSuggestions();
      }
    }, 30000); // Toutes les 30 secondes
  }, [assistant, refreshSuggestions]);

  // Valeurs calculées
  const isActive = assistant?.status === 'active';
  const lastActivityTime = lastActivity.current;

  return {
    // État de l'assistant
    assistant,
    isLoading,
    error,

    // Fonctions de gestion
    createAssistant,
    updateConfig,
    deleteAssistant,

    // Conversations
    activeConversation,
    startConversation,
    sendMessage,
    endConversation,

    // Suggestions et insights
    suggestions,
    insights,
    refreshSuggestions,
    implementSuggestion,
    dismissSuggestion,

    // Analytics
    analytics,
    refreshAnalytics,

    // Utilitaires
    isActive,
    lastActivity: lastActivityTime
  };
}

// Import Supabase client
import { supabase } from '@/integrations/supabase/client';