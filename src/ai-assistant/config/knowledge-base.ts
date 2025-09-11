/**
 * Base de connaissances de la plateforme Team Dash Manager
 * Cette base contient toutes les informations sur le fonctionnement de la plateforme
 */

export interface KnowledgeCategory {
  title: string;
  description: string;
  details: string;
  workflows?: string[];
  tips?: string[];
  relatedFeatures?: string[];
}

export const PLATFORM_KNOWLEDGE: Record<string, KnowledgeCategory> = {
  // Fonctionnalités principales
  reactflow: {
    title: "ReactFlow - Composition d'équipe",
    description: "Interface visuelle pour composer et configurer les équipes projet",
    details: `
ReactFlow est l'outil central pour définir les ressources humaines d'un projet :
- Interface drag & drop pour ajouter des profils métiers
- Configuration de la séniorité (Junior, Medior, Senior, Expert)
- Définition des compétences requises
- Paramétrage des langues parlées
- Calcul automatique du budget selon les profils
- Validation visuelle de la composition d'équipe
- Templates prédéfinis pour différents types de projets
    `,
    workflows: [
      "Open un Project existant ou créer un New project",
      "Accéder à l'onglet 'Team' ou cliquer sur 'Composer l'équipe'",
      "Glisser-déposer les profils métiers depuis la palette",
      "Configurer chaque ressource (séniorité, compétences, langues)",
      "Valider la composition quand tous les postes sont pourvus",
      "Lancer la recherche de candidats correspondants"
    ],
    tips: [
      "Use templates to save time",
      "Budget adjusts automatically based on profiles",
      "Check seniority consistency in the team"
    ],
    relatedFeatures: ["projects", "hr_resource_assignments", "candidate_matching"]
  },

  Kanban: {
    title: "Kanban - Gestion des tâches",
    description: "Tableau de bord visuel pour le suivi des tâches projet",
    details: `
Le Kanban permet de gérer les tâches de manière visuelle et collaborative :
- Colonnes personnalisables (À faire, En cours, En revue, Terminé)
- Création rapide de cartes de tâches
- Assignation aux membres de l'équipe
- Définition des priorités (Basse, Moyenne, Haute, Urgente)
- Ajout de dates d'échéance
- Commentaires et pièces jointes sur les cartes
- Filtrage par assigné, priorité ou statut
- Drag & drop pour changer le statut des tâches
    `,
    workflows: [
      "Accéder au Kanban depuis le menu principal ou le projet",
      "Cliquer sur '+' dans une colonne pour créer une tâche",
      "Remplir le titre, la description et assigner à un membre",
      "Définir la priorité et la date d'échéance si nécessaire",
      "Glisser-déposer les cartes entre colonnes pour changer leur statut",
      "Double-cliquer sur une carte pour voir les détails"
    ],
    tips: [
      "Utilisez les labels de couleur pour catégoriser les tâches",
      "La limite WIP (Work In Progress) évite la surcharge",
      "Les tâches urgentes apparaissent en haut des colonnes"
    ],
    relatedFeatures: ["projects", "Planning", "team_collaboration"]
  },

  planning: {
    title: "Planning - Calendrier projet",
    description: "Vue calendaire de tous les événements et jalons du Project",
    details: `
Le Planning centralise tous les événements temporels du projet :
- Vue mensuelle, hebdomadaire ou journalière
- Création de réunions avec participants
- Définition de jalons projet (milestones)
- Événements récurrents
- Notifications automatiques avant les événements
- Synchronisation avec les calendriers externes (Google, Outlook)
- Vue par projet ou vue globale tous projets
- Code couleur par type d'événement
    `,
    workflows: [
      "Ouvrir le Planning depuis le menu ou un projet spécifique",
      "Choisir la vue (mois, semaine, jour)",
      "Cliquer sur une date pour créer un événement",
      "Définir le type (réunion, jalon, deadline)",
      "Ajouter les participants depuis l'Team Project',
      "Configurer les rappels et Notifications",
      "Sauvegarder l'événement"
    ],
    tips: [
      "Les événements kickoff sont créés automatiquement au démarrage projet",
      "Utilisez la vue semaine pour une meilleure visibilité",
      "Les conflits d'agenda sont détectés automatiquement"
    ],
    relatedFeatures: ["project_events", "meetings", "milestones"]
  },

  messages: {
    title: "Messages - Communication d'équipe",
    description: "Système de messagerie intégré pour la communication projet",
    details: `
La messagerie permet une communication fluide au sein de l'équipe :
- Canaux par projet automatiques
- Messages directs entre membres
- Partage de fichiers et documents
- Mentions @ pour notifier
- Threads de discussion
- Recherche dans l'historique
- Intégration avec les autres outils (tâches, planning)
- Notifications push et email
    `,
    workflows: [
      "Accéder aux Messages depuis le menu ou le projet",
      "Sélectionner le canal projet ou un contact",
      "Taper le message dans la zone de texte",
      "Utiliser @ pour mentionner un membre",
      "Joindre des fichiers avec le bouton trombone",
      "Envoyer avec Entrée ou le bouton d'envoi"
    ],
    tips: [
      "Créez des threads pour organiser les discussions",
      "Les ficYesterdays partagés sont automatiquement ajoutés au Drive",
      "Utilisez /commandes pour des actions rapides"
    ],
    relatedFeatures: ["Drive", "Notifications", "team_collaboration"]
  },

  drive: {
    title: "Drive - Stockage de fichiers",
    description: "Espace de stockage cloud partagé pour les documents Project",
    details: `
Le Drive centralise tous les documents du projet :
- Structure de dossiers personnalisable
- Upload par drag & drop
- Versionning automatique des fichiers
- Aperçu des documents (PDF, images, vidéos)
- Partage sélectif avec permissions
- Recherche dans le contenu des documents
- Quotas de stockage par projet
- Synchronisation locale optionnelle
- Corbeille avec restauration possible
    `,
    workflows: [
      "Open le Drive depuis le menu ou le Project",
      "Créer des dossiers pour organiser les ficYesterdays",
      "Glisser-déposer les fichiers ou cliquer sur Upload",
      "Double-cliquer pour prévisualiser",
      "Clic droit pour Share ou Download",
      "Utiliser la barre de recherche pour trouver des documents"
    ],
    tips: [
      "Les gros ficYesterdays sont automatiquement compressés",
      "La corbeille conserve les ficYesterdays 30 days",
      "Activez la synchronisation pour un accès hors ligne"
    ],
    relatedFeatures: ["Messages", "Wiki", "project_files"]
  },

  wiki: {
    title: "Wiki - Documentation projet",
    description: "Base de connaissances collaborative du Project",
    details: `
Le Wiki permet de documenter le projet de manière structurée :
- Éditeur markdown avec aperçu temps réel
- Structure hiérarchique des pages
- Templates de documentation
- Historique des modifications
- Commentaires sur les pages
- Recherche full-text
- Export PDF de la documentation
- Liens entre pages et références croisées
    `,
    workflows: [
      "Accéder au Wiki depuis le Project",
      "Créer une nouvelle page ou section",
      "Utiliser l'éditeur markdown pour rédiger",
      "Structurer avec des titres et sous-titres",
      "Ajouter des liens vers d'autres pages",
      "Sauvegarder et publier la page",
      "Inviter à la révision si nécessaire"
    ],
    tips: [
      "Utilisez les templates pour démarrer rapidement",
      "Le somMayre est généré automatiquement",
      "Les images du Drive peuvent être intégrées directement"
    ],
    relatedFeatures: ["Drive", "Documentation", "knowledge_management"]
  },

  // Processus métier
  project_creation: {
    title: "Création de Project",
    description: "Processus complet de création d'un nouveau projet",
    details: `
La création d'un projet suit un workflow structuré :
1. Définition des informations de base (titre, description, dates)
2. Configuration du budget et des contraintes
3. Composition de l'équipe dans ReactFlow
4. Validation et lancement de la recherche de candidats
5. Suivi des acceptations
6. Kickoff et démarrage opérationnel
    `,
    workflows: [
      "Cliquer sur 'New project' dans le dashboard",
      "Remplir les informations générales du projet",
      "Définir le budget et les dates clés",
      "Composer l'Team in ReactFlow',
      "Validate et lancer la recherche de Candidates",
      "Attendre les réponses des Candidates",
      "Une fois l'équipe complète, lancer le kickoff",
      "Les outils collaboratifs sont alors activés automatiquement"
    ],
    tips: [
      "Préparez votre brief projet avant de commencer",
      "Le budget influence le matching des candidats",
      "Le kickoff active tous les outils collaboratifs"
    ],
    relatedFeatures: ["reactflow", "candidate_matching", "project_kickoff"]
  },

  candidate_matching: {
    title: "Matching des candidats",
    description: "Système de correspondance entre besoins projet et profils candidats",
    details: `
Le matching automatique trouve les meilleurs candidats pour votre projet :
- Analyse multi-critères (métier, séniorité, compétences, langues, disponibilité)
- Score de compatibilité calculé
- Notifications automatiques aux candidats qualifiés
- Suivi des réponses (accepté, refusé, en attente)
- Remplacement automatique si refus
- Validation finale avant démarrage
    `,
    workflows: [
      "Définir les besoins dans ReactFlow",
      "Lancer la recherche de candidats",
      "Le système notifie les candidats correspondants",
      "Suivre les réponses dans le tableau de bord",
      "Remplacer les refus si nécessaire",
      "Valider l'Team complète',
      "Procéder au kickoff Project"
    ],
    tips: [
      "Soyez précis in les Skills requises",
      "Prévoyez un délai pour les réponses (48-72h)",
      "Gardez des Candidates de backup"
    ],
    relatedFeatures: ["hr_resource_assignments", "candidate_profiles", "Notifications"]
  },

  project_status: {
    title: "Statuss de Project",
    description: "Comprendre les différents états d'un projet",
    details: `
Les projets passent par différents statuts :
- PAUSE : Projet créé mais équipe incomplète
- ATTENTE-TEAM : Tous les candidats n'ont pas encore accepté
- PLAY : Projet actif avec outils collaboratifs activés
- COMPLETED : Projet terminé

Seuls les projets en statut PLAY ont accès aux outils collaboratifs.
    `,
    workflows: [
      "Création → Status: PAUSE",
      "Recherche Candidates → Status: PAUSE",
      "Candidats acceptent → Status: ATTENTE-TEAM",
      "Kickoff lancé → Status: PLAY",
      "Project Completed → Status: COMPLETED"
    ],
    tips: [
      "Le kickoff est crucial pour activer les outils",
      "Un Project peut repasser Paused si besoin",
      "Les Projects COMPLETED restent consultables"
    ],
    relatedFeatures: ["projects", "project_orchestrator", "project_events"]
  },

  // Rôles et permissions
  roles: {
    title: "Roles et Permissions",
    description: "System de Roles in la plateforme",
    details: `
Trois rôles principaux existent :
- CLIENT : Crée et gère les projets, compose les équipes
- CANDIDAT : Reçoit des propositions, participe aux projets
- ADMIN : Gestion complète de la plateforme

Chaque rôle a des permissions spécifiques et une interface adaptée.
    `,
    workflows: [
      "L'inscription détermine le rôle initial",
      "Les permissions sont appliquées automatiquement",
      "L'interface s'adapte selon le rôle",
      "Les admins peuvent modifier les rôles"
    ],
    tips: [
      "Un utilisateur ne peut avoir qu'un seul Role',
      "Le changement de Role nécessite une intervention admin",
      "Les Permissions sont gérées par RLS in Supabase"
    ],
    relatedFeatures: ["authentication", "Profilees", "Permissions"]
  }
};

// Fonction helper pour rechercher dans la base de connaissances
export function searchKnowledge(query: string): KnowledgeCategory[] {
  const searchTerms = query.toLowerCase().split(' ');
  const results: Array<{ category: KnowledgeCategory; score: number }> = [];
  
  Object.values(PLATFORM_KNOWLEDGE).forEach(category => {
    let score = 0;
    const searchableText = `${category.title} ${category.description} ${category.details}`.toLowerCase();
    
    searchTerms.forEach(term => {
      if (searchableText.includes(term)) {
        score += 1;
      }
    });
    
    if (score > 0) {
      results.push({ category, score });
    }
  });
  
  return results
    .sort((a, b) => b.score - a.score)
    .map(r => r.category);
}

// Export des catégories pour utilisation dans l'UI
export const KNOWLEDGE_CATEGORIES = Object.keys(PLATFORM_KNOWLEDGE);