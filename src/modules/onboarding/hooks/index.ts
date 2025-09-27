/**
 * Module ONBOARDING - Hooks Index
 *
 * Point d'entrée pour tous les hooks du module onboarding.
 * Centralise l'export des hooks React.
 */

export { useOnboarding } from './useOnboarding';

// Alias pour compatibilité avec le code existant
export { useOnboarding as useCandidateOnboarding } from './useOnboarding';

// Re-exports pour simplicité d'usage
export type {
  UseOnboardingProps,
  UseOnboardingReturn,
  OnboardingData,
  CandidateProfile
} from '../types';