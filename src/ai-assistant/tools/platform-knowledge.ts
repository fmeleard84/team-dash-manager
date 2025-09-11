/**
 * Implémentation des fonctions liées à la base de connaissances
 */

import { PLATFORM_KNOWLEDGE, searchKnowledge, KnowledgeCategory } from '../config/knowledge-base';

export interface ExplainFeatureResult {
  success: boolean;
  feature: string;
  explanation: string;
  workflow?: string[];
  tips?: string[];
  relatedFeatures?: string[];
  hasMore?: boolean;
  error?: string;
}

/**
 * Explique une fonctionnalité de la plateforme
 */
export async function explain_platform_feature(args: {
  feature: string;
  detail_level?: string;
  include_workflow?: boolean;
}): Promise<ExplainFeatureResult> {
  try {
    const knowledge = PLATFORM_KNOWLEDGE[args.feature];
    
    if (!knowledge) {
      return {
        success: false,
        feature: args.feature,
        explanation: '',
        error: `La fonctionnalité "${args.feature}" n'est pas trouvée dans la base de connaissances.`
      };
    }
    
    let explanation = '';
    let workflow: string[] | undefined;
    let tips: string[] | undefined;
    
    // Adapter le niveau de détail
    switch (args.detail_level || 'detailed') {
      case 'brief':
        // Version courte : titre + description seulement
        explanation = `**${knowledge.title}**\n\n${knowledge.description}`;
        break;
        
      case 'tutorial':
        // Version complète avec tout
        explanation = `**${knowledge.title}**\n\n${knowledge.description}\n\n${knowledge.details}`;
        workflow = knowledge.workflows;
        tips = knowledge.tips;
        break;
        
      case 'detailed':
      default:
        // Version détaillée standard
        explanation = `**${knowledge.title}**\n\n${knowledge.details}`;
        if (args.include_workflow) {
          workflow = knowledge.workflows;
        }
        tips = knowledge.tips;
        break;
    }
    
    return {
      success: true,
      feature: args.feature,
      explanation,
      workflow,
      tips,
      relatedFeatures: knowledge.relatedFeatures,
      hasMore: args.detail_level === 'brief'
    };
    
  } catch (error) {
    console.error('Error in explain_platform_feature:', error);
    return {
      success: false,
      feature: args.feature,
      explanation: '',
      error: 'Une erreur est survenue lors de la récupération des informations.'
    };
  }
}

export interface SearchKnowledgeResult {
  success: boolean;
  query: string;
  results: Array<{
    feature: string;
    title: string;
    description: string;
    relevance: number;
  }>;
  totalResults: number;
  error?: string;
}

/**
 * Recherche dans la base de connaissances
 */
export async function search_knowledge(args: {
  query: string;
  category?: string;
}): Promise<SearchKnowledgeResult> {
  try {
    const results = searchKnowledge(args.query);
    
    // Filtrer par catégorie si spécifiée
    let filteredResults = results;
    if (args.category && args.category !== 'all') {
      // Implémenter le filtrage par catégorie selon vos besoins
      // Pour l'instant, on retourne tous les résultats
    }
    
    // Formater les résultats
    const formattedResults = filteredResults.slice(0, 5).map((knowledge, index) => {
      // Trouver la clé correspondante
      const featureKey = Object.keys(PLATFORM_KNOWLEDGE).find(
        key => PLATFORM_KNOWLEDGE[key] === knowledge
      ) || '';
      
      return {
        feature: featureKey,
        title: knowledge.title,
        description: knowledge.description,
        relevance: 1 - (index * 0.1) // Score de pertinence décroissant
      };
    });
    
    return {
      success: true,
      query: args.query,
      results: formattedResults,
      totalResults: filteredResults.length
    };
    
  } catch (error) {
    console.error('Error in search_knowledge:', error);
    return {
      success: false,
      query: args.query,
      results: [],
      totalResults: 0,
      error: 'Une erreur est survenue lors de la recherche.'
    };
  }
}

/**
 * Obtient une suggestion contextuelle basée sur l'activité actuelle
 */
export async function get_contextual_help(context: {
  currentPage?: string;
  currentAction?: string;
  userRole?: string;
}): Promise<ExplainFeatureResult> {
  // Mapper les pages aux fonctionnalités
  const pageToFeature: Record<string, string> = {
    '/project': 'projects',
    '/kanban': 'Kanban',
    '/planning': 'Planning',
    '/messages': 'Messages',
    '/drive': 'Drive',
    '/wiki': 'Wiki',
    '/reactflow': 'reactflow'
  };
  
  const feature = context.currentPage ? pageToFeature[context.currentPage] : 'project_creation';
  
  if (feature && PLATFORM_KNOWLEDGE[feature]) {
    return explain_platform_feature({
      feature,
      detail_level: 'brief',
      include_workflow: true
    });
  }
  
  return {
    success: false,
    feature: '',
    explanation: 'Aucune aide contextuelle disponible pour cette page.'
  };
}