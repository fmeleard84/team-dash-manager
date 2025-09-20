/**
 * Export centralisé des services
 * Ces services unifient la gestion des données dans l'application
 */

// Service de gestion des candidats
export { CandidateService } from './CandidateService';
export type {
  CandidateProfile,
  CandidateExpertise,
  CandidateLanguage,
  CandidateFullProfile,
  CandidateSearchCriteria
} from './CandidateService';

// Service de calcul des prix (TOUJOURS à la minute)
export { PriceCalculator } from './PriceCalculator';

// Service de formatage des candidats (Prénom + Métier uniquement)
export { CandidateFormatter } from './CandidateFormatter';

/**
 * Guide d'utilisation rapide :
 *
 * 1. CANDIDATS :
 *    - CandidateService : Pour récupérer et gérer les données
 *    - CandidateFormatter : Pour l'affichage (prénom + métier)
 *    - useCandidate : Hook unifié pour les composants
 *
 * 2. PRIX :
 *    - TOUJOURS affichés à la minute dans l'app
 *    - Seule exception : paramètres candidat (tarif journalier)
 *    - PriceCalculator.getDailyToMinuteRate() : conversion principale
 *    - PriceCalculator.formatMinuteRate() : format d'affichage
 *
 * 3. AFFICHAGE :
 *    - JAMAIS le nom de famille
 *    - TOUJOURS Prénom + Métier
 *    - CandidateFormatter.formatCandidateTitle() : format standard
 */