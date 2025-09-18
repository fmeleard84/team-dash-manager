import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateExpertisePrompt } from '../tools/expertise-provider';
import { REALTIME_TOOLS } from '../config/realtime-tools';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: any[];
  isStreaming?: boolean;
}

export interface TextChatConfig {
  context?: string;
  onToolCall?: (toolName: string, args: any, result?: any) => void;
}

export function useTextChat(config: TextChatConfig = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Récupérer les outils disponibles
  const tools = REALTIME_TOOLS;

  // Construire le prompt système
  const buildSystemPrompt = useCallback(async () => {
    try {
      // Récupérer les prompts depuis la base de données
      const { data: prompts } = await supabase
        .from('prompts_ia')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: false });

      // Récupérer les expertises
      const expertisePrompt = await generateExpertisePrompt();

      // Construire les instructions complètes
      let instructions = '';
      
      // Si des prompts sont trouvés, les utiliser
      if (prompts && prompts.length > 0) {
        // Organiser les prompts par contexte
        const systemPrompts = prompts.filter(p => p.context === 'general');
        const contextPrompts = prompts.filter(p => 
          ['team-composition', 'project-management', 'technical', 'meeting', 'task-management'].includes(p.context)
        );
        const behaviorPrompts = prompts.filter(p => p.context === 'behavior');
        
        // Ajouter les prompts système
        if (systemPrompts.length > 0) {
          instructions += '=== INSTRUCTIONS SYSTÈME ===\n';
          systemPrompts.forEach(p => {
            instructions += p.prompt + '\n\n';
          });
        }
        
        // Ajouter les prompts de contexte
        if (contextPrompts.length > 0) {
          instructions += '=== CONTEXTE SPÉCIFIQUE ===\n';
          contextPrompts.forEach(p => {
            instructions += `[${p.context}]\n${p.prompt}\n\n`;
          });
        }
        
        // Ajouter les prompts de comportement
        if (behaviorPrompts.length > 0) {
          instructions += '=== COMPORTEMENT ===\n';
          behaviorPrompts.forEach(p => {
            instructions += p.prompt + '\n\n';
          });
        }
      } else {
        // Prompt par défaut si aucun prompt n'est configuré
        instructions = `Vous êtes un assistant IA pour Vaya, spécialisé dans la création et la gestion d'équipes projet.

VOTRE RÔLE PRINCIPAL :
- Aider les clients à composer des équipes pour leurs projets
- Identifier les besoins en ressources humaines
- Proposer les profils adaptés depuis notre base de métiers
- Créer les équipes via les outils disponibles

IMPORTANT : 
- Ne donnez PAS d'instructions techniques ou tutoriels
- Concentrez-vous sur la composition d'équipes
- Utilisez UNIQUEMENT les métiers disponibles dans la base
- Proposez toujours une équipe adaptée au projet demandé

`;
      }

      // Ajouter les expertises
      if (expertisePrompt) {
        instructions += expertisePrompt + '\n\n';
      }

      // Ajouter le contexte spécifique si fourni
      if (config.context) {
        instructions += `Contexte actuel: ${config.context}\n\n`;
      }

      // Ajouter les instructions pour les outils et les contraintes de validation
      instructions += `

=== CONTRAINTES IMPORTANTES POUR LA CRÉATION D'ÉQUIPE ===

Lors de la création d'une équipe, vous DEVEZ respecter strictement ces règles :

1. **MÉTIERS AUTORISÉS** : Utilisez UNIQUEMENT les métiers disponibles dans la base de données.
   Si un métier demandé n'existe pas, proposez le métier le plus proche disponible.

2. **EXPERTISES PAR MÉTIER** : Chaque métier a des expertises spécifiques.
   Utilisez UNIQUEMENT les expertises associées au métier choisi.

3. **SÉNIORITÉS AUTORISÉES** : UNIQUEMENT "junior", "intermediate", ou "senior"

4. **LANGUES AUTORISÉES** : Utilisez UNIQUEMENT les langues disponibles dans la base.

5. **VALIDATION AVANT CRÉATION** :
   - Vérifier que le métier existe
   - Vérifier que les expertises sont associées au métier
   - Vérifier que la séniorité est valide
   - Vérifier que les langues existent

IMPORTANT : Si des paramètres ne sont pas valides, demandez des clarifications avant de créer quoi que ce soit.

=== FONCTIONS DISPONIBLES ===

${tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

Utilisez ces fonctions seulement après avoir validé tous les paramètres.
`;

      return instructions;
    } catch (error) {
      console.error('Erreur lors de la construction du prompt système:', error);
      return 'Vous êtes un assistant IA pour Vaya. Aidez l\'utilisateur avec ses questions et tâches.';
    }
  }, [config.context]);

  // Recherche dans la base vectorielle (utilise les tables existantes)
  const searchVectorDatabase = useCallback(async (query: string) => {
    try {
      // Déterminer si la requête nécessite une recherche FAQ
      const needsFaqSearch = detectFaqIntent(query);
      
      if (!needsFaqSearch) {
        console.log('🎯 Contexte: Création/gestion d\'équipe - Pas de recherche FAQ');
        return {
          faqs: [],
          docs: []
        };
      }

      console.log('📚 Contexte: Question sur le fonctionnement - Recherche FAQ activée');
      
      // Utiliser la recherche vectorielle avec pgvector (déjà configuré dans Supabase)
      // Cette fonction utilise les embeddings et la similarité cosinus
      const { data: faqResults, error: faqError } = await supabase
        .rpc('search_faq_embeddings', {
          query_text: query,
          similarity_threshold: 0.7,
          match_count: 5
        });

      if (faqError) {
        console.error('Erreur recherche vectorielle FAQ:', faqError);
        // Fallback : recherche simple par mots-clés si la fonction RPC n'existe pas
        const keywords = extractKeywords(query);
        const { data: fallbackResults } = await supabase
          .from('faq_items')
          .select('*')
          .textSearch('question', keywords.join(' | '), {
            type: 'websearch',
            config: 'french'
          })
          .eq('is_published', true)
          .limit(5);
        
        return {
          faqs: fallbackResults || [],
          docs: []
        };
      }

      return {
        faqs: faqResults || [],
        docs: []
      };
    } catch (error) {
      console.error('Erreur recherche vectorielle:', error);
      return { faqs: [], docs: [] };
    }
  }, []);

  // Fonction pour détecter si c'est une question sur le fonctionnement
  const detectFaqIntent = (query: string): boolean => {
    const lowerQuery = query.toLowerCase();
    
    // Mots-clés indiquant une question sur le fonctionnement de la plateforme
    const faqKeywords = [
      'comment', 'pourquoi', 'qu\'est-ce', 'où', 'quand',
      'fonctionn', 'utilise', 'marche', 'faire',
      'aide', 'tutoriel', 'guide', 'documentation',
      'problème', 'erreur', 'bug', 'ne marche pas',
      'accès', 'connexion', 'inscription',
      'plateforme', 'site', 'application', 'outil',
      'kanban', 'drive', 'message', 'planning',
      'paramètre', 'configuration', 'profil'
    ];
    
    // Mots-clés indiquant une action de création/gestion (pas de FAQ)
    const actionKeywords = [
      'créer', 'composer', 'équipe', 'projet', 'budget',
      'développer', 'landing', 'wordpress', 'site',
      'besoin', 'cherche', 'veux', 'souhaite',
      'euros', '€', 'semaine', 'mois', 'durée',
      'senior', 'junior', 'expert', 'développeur',
      'compétence', 'expertise', 'langue'
    ];
    
    // Si c'est une action de création/gestion, pas de FAQ
    const isAction = actionKeywords.some(keyword => lowerQuery.includes(keyword));
    if (isAction) return false;
    
    // Si c'est une question sur le fonctionnement, chercher dans FAQ
    const isFaqQuestion = faqKeywords.some(keyword => lowerQuery.includes(keyword));
    return isFaqQuestion;
  };

  // Fonction pour extraire les mots-clés principaux
  const extractKeywords = (query: string): string[] => {
    // Supprimer les mots vides français
    const stopWords = ['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'mais', 'donc', 'car'];
    const words = query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    return words;
  };

  // Envoyer un message avec streaming
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Créer un nouveau controller pour cette requête
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Rechercher dans la base vectorielle
      const vectorResults = await searchVectorDatabase(content);

      // Construire le contexte enrichi
      let enrichedContext = content;
      if (vectorResults && vectorResults.faqs.length > 0) {
        enrichedContext += '\n\n### Informations pertinentes de la base de connaissances:\n';
        vectorResults.faqs.forEach((faq: any) => {
          enrichedContext += `\n**Q:** ${faq.question}\n**R:** ${faq.answer}\n`;
          if (faq.category) {
            enrichedContext += `*Catégorie: ${faq.category}*\n`;
          }
        });
      }

      // Construire le prompt système
      const systemPrompt = await buildSystemPrompt();

      // Créer le message assistant avec streaming
      const assistantMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      // Obtenir le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Non authentifié');
      }

      // Appeler l'API avec streaming
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/chat-completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: enrichedContext }
          ],
          tools: tools.map(tool => ({
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters || {}
            }
          })),
          model: 'gpt-4o',
          temperature: 0.7,
          max_tokens: 2000,
          stream: true // Activer le streaming
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      // Lire le stream SSE
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedContent = '';
      let toolCalls: any[] = [];

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              // Stream terminé
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessage.id 
                  ? { ...msg, content: accumulatedContent, isStreaming: false, toolCalls: toolCalls.length > 0 ? toolCalls : undefined }
                  : msg
              ));

              // Exécuter les tool calls si présents
              if (toolCalls.length > 0) {
                for (let i = 0; i < toolCalls.length; i++) {
                  const toolCall = toolCalls[i];
                  // Essayer d'exécuter la fonction localement si elle existe
                  const tool = tools.find(t => t.name === toolCall.function.name);
                  let result = null;

                  if (tool && tool.execute) {
                    try {
                      result = await tool.execute(toolCall.function.arguments);
                      console.log(`✅ Fonction ${toolCall.function.name} exécutée:`, result);
                      // Ajouter le résultat au toolCall
                      toolCalls[i] = { ...toolCall, result };
                    } catch (error) {
                      console.error(`❌ Erreur exécution ${toolCall.function.name}:`, error);
                      // Ajouter l'erreur au toolCall
                      toolCalls[i] = { ...toolCall, result: { success: false, error: error.message } };
                    }
                  }

                  // Notifier le composant parent avec le résultat
                  if (config.onToolCall) {
                    config.onToolCall(toolCall.function.name, toolCall.function.arguments, result);
                  }
                }
              }
            } else {
              try {
                const parsed = JSON.parse(data);
                
                if (parsed.type === 'delta') {
                  // Accumuler le contenu
                  if (parsed.content) {
                    accumulatedContent += parsed.content;
                    
                    // Mettre à jour le message en temps réel
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessage.id 
                        ? { ...msg, content: accumulatedContent }
                        : msg
                    ));
                  }
                  
                  // Accumuler les tool calls
                  if (parsed.tool_calls) {
                    // Les tool calls arrivent par chunks, il faut les assembler
                    parsed.tool_calls.forEach((tc: any) => {
                      const existing = toolCalls.find(t => t.index === tc.index);
                      if (existing) {
                        // Compléter l'appel existant
                        if (tc.function?.name) existing.function.name = tc.function.name;
                        if (tc.function?.arguments) {
                          existing.function.arguments = (existing.function.arguments || '') + tc.function.arguments;
                        }
                      } else {
                        // Nouvel appel
                        toolCalls.push({
                          index: tc.index,
                          id: tc.id,
                          type: 'function',
                          function: {
                            name: tc.function?.name || '',
                            arguments: tc.function?.arguments || ''
                          }
                        });
                      }
                    });
                  }
                } else if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch (e) {
                console.error('Erreur parsing SSE:', e, data);
              }
            }
          }
        }
      }

      // Parser les arguments JSON des tool calls
      toolCalls = toolCalls.map(tc => ({
        ...tc,
        function: {
          ...tc.function,
          arguments: tc.function.arguments ? JSON.parse(tc.function.arguments) : {}
        }
      }));

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Requête annulée');
        return;
      }
      
      console.error('Erreur lors de l\'envoi du message:', err);
      setError(err.message || 'Une erreur est survenue');
      
      // Ajouter un message d'erreur
      const errorMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      eventSourceRef.current = null;
    }
  }, [messages, isLoading, buildSystemPrompt, searchVectorDatabase, config.onToolCall]);

  // Réinitialiser la conversation
  const resetChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setMessages([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    resetChat
  };
}