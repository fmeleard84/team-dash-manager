/**
 * Module NOTES - Export Principal
 *
 * Ce module gère tous les aspects liés à la gestion des notes personnelles :
 * - Création et édition de notes riches
 * - Organisation par notebooks (carnets)
 * - Système de tags avancé
 * - Recherche full-text intelligente
 * - Export multi-format (CSV, JSON, PDF)
 * - Statistiques de productivité
 * - Auto-sauvegarde et synchronisation temps réel
 *
 * Architecture modulaire suivant le pattern établi dans les autres modules.
 */

// ==========================================
// COMPOSANTS
// ==========================================

export {
  ModularNotesView,
  CandidateNotes, // Alias pour compatibilité
  NotesView, // Alias pour compatibilité
  NOTES_MODULE_CONFIG
} from './components';

// ==========================================
// HOOKS
// ==========================================

export {
  useNotes,
  useNoteActions,
  useNoteStats,
  useNoteSearch
} from './hooks';

// ==========================================
// SERVICES
// ==========================================

export {
  NotesAPI
} from './services';

// ==========================================
// TYPES
// ==========================================

export type {
  // Core types
  Note,
  Notebook,
  NoteTemplate,
  NoteStats,
  NotebookStats,

  // Filters and params
  NoteFilters,
  NoteSortBy,
  NoteSearchFilters,
  NoteExportFormat,
  CreateNoteData,
  UpdateNoteData,
  CreateNotebookData,
  UpdateNotebookData,
  NoteFormat,
  NoteType,
  NoteStatus,
  NotePriority,

  // API types
  NoteAPIResponse,
  NotePaginatedResponse,
  NoteExport,
  NoteError,
  NoteErrorCode,
  NoteSearchResult,
  SearchSuggestion,

  // Hooks return types
  UseNotesReturn,
  UseNoteActionsReturn,
  UseNoteStatsReturn,
  UseNoteSearchReturn,

  // Stats and analytics
  NoteActivity,
  ProductivityMetrics,
  NoteRecommendation,
  NoteGoal,
  PeriodComparison,
  TimeRange,

  // Component props
  ModularNotesViewProps,
  NoteEditorProps,
  NoteListProps,
  NotebookSelectorProps,

  // Utilities
  KeysOf,
  PartialBy,
  NotesModuleConfig,
  PaginatedResult
} from './types';

// ==========================================
// CONSTANTES ET UTILITAIRES
// ==========================================

export const NOTES_CONSTANTS = {
  // Formats de note
  NOTE_FORMATS: {
    MARKDOWN: 'markdown',
    PLAIN_TEXT: 'plain_text',
    HTML: 'html',
    RICH_TEXT: 'rich_text'
  } as const,

  // Types de note
  NOTE_TYPES: {
    PERSONAL: 'personal',
    MEETING: 'meeting',
    PROJECT: 'project',
    IDEA: 'idea',
    TASK: 'task',
    RESEARCH: 'research'
  } as const,

  // Statuts de note
  STATUSES: {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    ARCHIVED: 'archived',
    DELETED: 'deleted'
  } as const,

  // Niveaux de priorité
  PRIORITIES: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
  } as const,

  // Formats d'export
  EXPORT_FORMATS: {
    CSV: 'csv',
    JSON: 'json',
    PDF: 'pdf',
    MARKDOWN: 'markdown',
    HTML: 'html'
  } as const,

  // Limites et configurations
  LIMITS: {
    MAX_TITLE_LENGTH: 200,
    MAX_TAG_LENGTH: 50,
    MAX_TAGS_PER_NOTE: 20,
    MAX_CONTENT_LENGTH: 1000000, // 1MB en caractères
    MIN_SEARCH_QUERY: 2,
    MAX_SEARCH_RESULTS: 100,
    AUTO_SAVE_INTERVAL: 10000, // 10 secondes
    SEARCH_DEBOUNCE: 300 // 300ms
  } as const,

  // Couleurs pour les types
  TYPE_COLORS: {
    personal: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    meeting: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    project: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    idea: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
    task: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    research: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30'
  } as const,

  // Couleurs pour les priorités
  PRIORITY_COLORS: {
    low: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30',
    medium: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    high: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    urgent: 'text-red-600 bg-red-100 dark:bg-red-900/30'
  } as const,

  // Templates par défaut
  DEFAULT_TEMPLATES: {
    meeting: {
      title: 'Réunion - [Date]',
      content: '## Participants\n\n## Objectifs\n\n## Points discutés\n\n## Actions à suivre\n\n## Prochaines étapes\n',
      tags: ['réunion', 'équipe']
    },
    project: {
      title: 'Projet - [Nom]',
      content: '## Contexte\n\n## Objectifs\n\n## Étapes\n\n## Ressources\n\n## Timeline\n\n## Notes\n',
      tags: ['projet', 'planification']
    },
    idea: {
      title: 'Idée - [Titre]',
      content: '## Description\n\n## Avantages\n\n## Inconvénients\n\n## Prochaines étapes\n\n## Ressources nécessaires\n',
      tags: ['idée', 'innovation']
    }
  } as const
} as const;

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

/**
 * Calcule les métriques d'une note (mots, caractères, temps de lecture)
 */
export const calculateNoteMetrics = (content: string) => {
  const words = content.trim().split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  const characterCount = content.length;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200)); // ~200 mots/minute

  return {
    word_count: wordCount,
    character_count: characterCount,
    read_time_minutes: readTimeMinutes
  };
};

/**
 * Extrait des tags suggérés depuis le contenu
 */
export const extractSuggestedTags = (content: string): string[] => {
  // Patterns courants pour extraction de tags
  const patterns = [
    /#(\w+)/g, // hashtags
    /@(\w+)/g, // mentions
    /\b(projet|réunion|idée|tâche|urgent|important)\b/gi // mots-clés
  ];

  const suggestedTags = new Set<string>();

  patterns.forEach(pattern => {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 2) {
        suggestedTags.add(match[1].toLowerCase());
      }
    }
  });

  return Array.from(suggestedTags).slice(0, 5);
};

/**
 * Formate une date relative pour l'affichage
 */
export const formatRelativeDate = (date: string | Date): string => {
  const now = new Date();
  const noteDate = new Date(date);
  const diffMs = now.getTime() - noteDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 1 ? 'À l\'instant' : `Il y a ${diffMinutes}min`;
    }
    return `Il y a ${diffHours}h`;
  }

  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;

  return noteDate.toLocaleDateString('fr-FR');
};

/**
 * Génère une couleur pour un type de note
 */
export const getNoteTypeColor = (type: string): string => {
  return NOTES_CONSTANTS.TYPE_COLORS[type as keyof typeof NOTES_CONSTANTS.TYPE_COLORS] ||
         NOTES_CONSTANTS.TYPE_COLORS.personal;
};

/**
 * Génère une couleur pour une priorité
 */
export const getNotePriorityColor = (priority: string): string => {
  return NOTES_CONSTANTS.PRIORITY_COLORS[priority as keyof typeof NOTES_CONSTANTS.PRIORITY_COLORS] ||
         NOTES_CONSTANTS.PRIORITY_COLORS.medium;
};

/**
 * Valide les données d'une note
 */
export const validateNoteData = (data: Partial<CreateNoteData>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.title || data.title.trim().length === 0) {
    errors.push('Le titre est obligatoire');
  }

  if (data.title && data.title.length > NOTES_CONSTANTS.LIMITS.MAX_TITLE_LENGTH) {
    errors.push(`Le titre ne peut pas dépasser ${NOTES_CONSTANTS.LIMITS.MAX_TITLE_LENGTH} caractères`);
  }

  if (data.content && data.content.length > NOTES_CONSTANTS.LIMITS.MAX_CONTENT_LENGTH) {
    errors.push(`Le contenu ne peut pas dépasser ${NOTES_CONSTANTS.LIMITS.MAX_CONTENT_LENGTH} caractères`);
  }

  if (data.tags && data.tags.length > NOTES_CONSTANTS.LIMITS.MAX_TAGS_PER_NOTE) {
    errors.push(`Une note ne peut pas avoir plus de ${NOTES_CONSTANTS.LIMITS.MAX_TAGS_PER_NOTE} tags`);
  }

  if (data.tags) {
    const invalidTags = data.tags.filter(tag => tag.length > NOTES_CONSTANTS.LIMITS.MAX_TAG_LENGTH);
    if (invalidTags.length > 0) {
      errors.push(`Les tags ne peuvent pas dépasser ${NOTES_CONSTANTS.LIMITS.MAX_TAG_LENGTH} caractères`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Génère un template de note par défaut
 */
export const getDefaultNoteTemplate = (type: string): Partial<CreateNoteData> => {
  const template = NOTES_CONSTANTS.DEFAULT_TEMPLATES[type as keyof typeof NOTES_CONSTANTS.DEFAULT_TEMPLATES];

  if (template) {
    return {
      title: template.title.replace('[Date]', new Date().toLocaleDateString('fr-FR')),
      content: template.content,
      tags: template.tags,
      type: type as any,
      format: 'markdown',
      status: 'draft',
      priority: 'medium'
    };
  }

  return {
    title: '',
    content: '',
    tags: [],
    type: 'personal',
    format: 'markdown',
    status: 'draft',
    priority: 'medium'
  };
};

// ==========================================
// DOCUMENTATION DU MODULE
// ==========================================

/**
 * ## Module NOTES
 *
 * ### Fonctionnalités principales :
 *
 * 1. **Gestion des notes**
 *    - Création et édition avec éditeur riche
 *    - Support Markdown et texte enrichi
 *    - Auto-sauvegarde intelligente
 *    - Versioning et historique
 *
 * 2. **Organisation**
 *    - Notebooks (carnets) pour la categorisation
 *    - Système de tags flexible
 *    - Favoris et épinglage
 *    - Statuts et priorités
 *
 * 3. **Recherche avancée**
 *    - Recherche full-text intelligente
 *    - Filtres par notebook, tags, date
 *    - Suggestions automatiques
 *    - Historique des recherches
 *
 * 4. **Statistiques et analytiques**
 *    - Métriques de productivité
 *    - Tendances d'écriture
 *    - Objectifs personnalisés
 *    - Recommandations d'amélioration
 *
 * 5. **Export et partage**
 *    - Export en CSV, JSON, PDF, Markdown
 *    - Rapports personnalisés
 *    - Intégration avec le Drive
 *    - Partage via Messages
 *
 * ### Architecture :
 *
 * - **Services** : NotesAPI pour toutes les interactions Supabase
 * - **Hooks** : 4 hooks spécialisés pour différents aspects
 * - **Composants** : Interface modulaire avec éditeur intégré
 * - **Types** : Plus de 40 types TypeScript pour la sécurité
 *
 * ### Real-time :
 *
 * - Auto-sauvegarde en temps réel
 * - Synchronisation multi-onglets
 * - Notifications de changements
 * - Collaboration future (commentaires, partage)
 *
 * ### Usage :
 *
 * ```typescript
 * import { ModularNotesView, useNotes } from '@/modules/notes';
 *
 * // Dans un composant candidat
 * <ModularNotesView
 *   candidateId={user.id}
 *   showOverview={true}
 *   showStats={true}
 *   showExportOptions={true}
 *   showNotebooks={true}
 *   showSearch={true}
 * />
 *
 * // Ou utiliser les hooks directement
 * const { notes, createNote, loading } = useNotes();
 * const { search, results } = useNoteSearch();
 * const { stats, productivity } = useNoteStats();
 * ```
 *
 * ### Intégration :
 *
 * Le module s'intègre parfaitement avec :
 * - Module KANBAN (notes sur les tâches)
 * - Module PROJETS (notes par projet)
 * - Module MESSAGES (partage de notes)
 * - Module DRIVE (stockage des exports)
 * - Système d'authentification
 * - Tables notes et notebooks en base
 */