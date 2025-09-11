#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Translation map for common French to English terms
const translationMap = {
  // Titles and headers
  'Tableau de bord': 'Dashboard',
  'Projets': 'Projects',
  'Projet': 'Project',
  'Équipe': 'Team',
  'Ressources': 'Resources',
  'Messages': 'Messages',
  'Factures': 'Invoices',
  'Paramètres': 'Settings',
  'Déconnexion': 'Logout',
  'Connexion': 'Login',
  'Inscription': 'Sign up',
  'Profil': 'Profile',
  'Bienvenue': 'Welcome',
  
  // Project related
  'Créer un projet': 'Create project',
  'Nouveau projet': 'New project',
  'Modifier le projet': 'Edit project',
  'Supprimer le projet': 'Delete project',
  'Archiver le projet': 'Archive project',
  'Restaurer le projet': 'Restore project',
  'Démarrer le projet': 'Start project',
  'Terminer le projet': 'Complete project',
  'Projets actifs': 'Active projects',
  'Projets archivés': 'Archived projects',
  'Projets terminés': 'Completed projects',
  'Vue d\'ensemble': 'Overview',
  'Détails du projet': 'Project details',
  'Titre du projet': 'Project title',
  'Description du projet': 'Project description',
  'Date de début': 'Start date',
  'Date de fin': 'End date',
  'Budget': 'Budget',
  'Statut': 'Status',
  'En cours': 'In progress',
  'En pause': 'Paused',
  'En attente': 'Waiting',
  'Terminé': 'Completed',
  'Annulé': 'Cancelled',
  
  // Team and resources
  'Membres de l\'équipe': 'Team members',
  'Ajouter un membre': 'Add member',
  'Retirer un membre': 'Remove member',
  'Rôle': 'Role',
  'Disponibilité': 'Availability',
  'Disponible': 'Available',
  'Indisponible': 'Unavailable',
  'Compétences': 'Skills',
  'Expérience': 'Experience',
  'Tarif journalier': 'Daily rate',
  'Candidat': 'Candidate',
  'Client': 'Client',
  'Administrateur': 'Administrator',
  
  // Actions
  'Ajouter': 'Add',
  'Modifier': 'Edit',
  'Supprimer': 'Delete',
  'Enregistrer': 'Save',
  'Annuler': 'Cancel',
  'Confirmer': 'Confirm',
  'Valider': 'Validate',
  'Accepter': 'Accept',
  'Refuser': 'Decline',
  'Rechercher': 'Search',
  'Filtrer': 'Filter',
  'Télécharger': 'Download',
  'Importer': 'Import',
  'Exporter': 'Export',
  'Partager': 'Share',
  'Envoyer': 'Send',
  'Voir plus': 'See more',
  'Voir moins': 'See less',
  'Voir les détails': 'View details',
  'Retour': 'Back',
  'Suivant': 'Next',
  'Précédent': 'Previous',
  'Fermer': 'Close',
  'Ouvrir': 'Open',
  
  // Forms
  'Nom': 'Name',
  'Prénom': 'First name',
  'Nom de famille': 'Last name',
  'Email': 'Email',
  'Téléphone': 'Phone',
  'Adresse': 'Address',
  'Ville': 'City',
  'Pays': 'Country',
  'Code postal': 'Postal code',
  'Mot de passe': 'Password',
  'Confirmer le mot de passe': 'Confirm password',
  'Ancien mot de passe': 'Old password',
  'Nouveau mot de passe': 'New password',
  'Entreprise': 'Company',
  'Numéro SIRET': 'SIRET number',
  'Secteur d\'activité': 'Industry',
  'Taille de l\'entreprise': 'Company size',
  
  // Messages
  'Succès': 'Success',
  'Erreur': 'Error',
  'Attention': 'Warning',
  'Information': 'Information',
  'Chargement...': 'Loading...',
  'Enregistrement...': 'Saving...',
  'Suppression...': 'Deleting...',
  'Aucune donnée': 'No data',
  'Aucun résultat': 'No results',
  'Aucun projet': 'No projects',
  'Créez votre premier projet': 'Create your first project',
  'Êtes-vous sûr ?': 'Are you sure?',
  'Cette action est irréversible': 'This action cannot be undone',
  'Opération réussie': 'Operation successful',
  'Une erreur est survenue': 'An error occurred',
  'Veuillez réessayer': 'Please try again',
  'Session expirée': 'Session expired',
  'Non autorisé': 'Unauthorized',
  
  // Time
  'Aujourd\'hui': 'Today',
  'Hier': 'Yesterday',
  'Demain': 'Tomorrow',
  'Cette semaine': 'This week',
  'Ce mois': 'This month',
  'Cette année': 'This year',
  'jour': 'day',
  'jours': 'days',
  'heure': 'hour',
  'heures': 'hours',
  'minute': 'minute',
  'minutes': 'minutes',
  'seconde': 'second',
  'secondes': 'seconds',
  'il y a': 'ago',
  'dans': 'in',
  
  // Days of week
  'Lundi': 'Monday',
  'Mardi': 'Tuesday',
  'Mercredi': 'Wednesday',
  'Jeudi': 'Thursday',
  'Vendredi': 'Friday',
  'Samedi': 'Saturday',
  'Dimanche': 'Sunday',
  
  // Months
  'Janvier': 'January',
  'Février': 'February',
  'Mars': 'March',
  'Avril': 'April',
  'Mai': 'May',
  'Juin': 'June',
  'Juillet': 'July',
  'Août': 'August',
  'Septembre': 'September',
  'Octobre': 'October',
  'Novembre': 'November',
  'Décembre': 'December',
  
  // KPIs
  'Métriques': 'Metrics',
  'Budget total': 'Total budget',
  'Total projets': 'Total projects',
  'Taux de complétion': 'Completion rate',
  'Factures en attente': 'Pending invoices',
  'Revenus mensuels': 'Monthly revenue',
  'Nouveaux candidats': 'New candidates',
  'Durée moyenne': 'Average duration',
  
  // Settings
  'Préférences': 'Preferences',
  'Notifications': 'Notifications',
  'Sécurité': 'Security',
  'Confidentialité': 'Privacy',
  'Langue': 'Language',
  'Thème': 'Theme',
  'Mode sombre': 'Dark mode',
  'Mode clair': 'Light mode',
  
  // Specific features
  'Planning': 'Planning',
  'Kanban': 'Kanban',
  'Drive': 'Drive',
  'Wiki': 'Wiki',
  'Documentation': 'Documentation',
  'Assistant vocal': 'Voice assistant',
  'Assistant IA': 'AI Assistant',
  'Écoute en cours': 'Listening',
  'Traitement': 'Processing',
  'Parle': 'Speaking',
  
  // Admin
  'Catégories': 'Categories',
  'Modèles': 'Templates',
  'Utilisateurs': 'Users',
  'Permissions': 'Permissions',
  'Logs': 'Logs',
  'Système': 'System',
  'Base de données': 'Database',
  'Sauvegardes': 'Backups',
  
  // Invoice
  'Facture': 'Invoice',
  'Numéro de facture': 'Invoice number',
  'Date de facture': 'Invoice date',
  'Date d\'échéance': 'Due date',
  'Montant HT': 'Amount excl. tax',
  'TVA': 'VAT',
  'Montant TTC': 'Total amount',
  'Payé': 'Paid',
  'Impayé': 'Unpaid',
  'En retard': 'Overdue'
};

// Function to translate text
function translateText(text) {
  let translatedText = text;
  
  // Sort by length (longest first) to avoid partial replacements
  const sortedKeys = Object.keys(translationMap).sort((a, b) => b.length - a.length);
  
  sortedKeys.forEach(french => {
    const english = translationMap[french];
    // Use regex for case-insensitive replacement
    const regex = new RegExp(escapeRegex(french), 'gi');
    translatedText = translatedText.replace(regex, (match) => {
      // Preserve the original case
      if (match[0] === match[0].toUpperCase()) {
        return english.charAt(0).toUpperCase() + english.slice(1);
      }
      return english;
    });
  });
  
  return translatedText;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// File extensions to process
const extensions = ['.tsx', '.ts', '.jsx', '.js'];

// Directories to exclude
const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'scripts'];

// Function to process a file
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Translate strings in JSX and template literals
    content = content.replace(
      />([^<]+)</g,
      (match, text) => {
        if (text.trim() && !text.includes('{') && !text.includes('}')) {
          const translated = translateText(text);
          return `>${translated}<`;
        }
        return match;
      }
    );
    
    // Translate strings in quotes
    content = content.replace(
      /["']([^"']+)["']/g,
      (match, text) => {
        // Skip if it looks like code or a path
        if (text.includes('/') || text.includes('.') || text.includes('_') || text.includes('-')) {
          return match;
        }
        
        // Check if it's a translatable string
        const translated = translateText(text);
        if (translated !== text) {
          return match[0] + translated + match[0];
        }
        return match;
      }
    );
    
    // Only write if content changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Translated: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Function to recursively process directory
function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!excludeDirs.includes(file)) {
        processDirectory(filePath);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        processFile(filePath);
      }
    }
  });
}

// Main execution
console.log('🌐 Starting translation to English...');
const srcPath = path.join(__dirname, '..', 'src');
processDirectory(srcPath);
console.log('✨ Translation complete!');