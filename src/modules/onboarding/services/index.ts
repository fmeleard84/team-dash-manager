/**
 * Module ONBOARDING - Services Index
 *
 * Point d'entrée pour tous les services du module onboarding.
 * Centralise l'export des services API.
 */

export { OnboardingAPI } from './onboardingAPI';

// Re-exports pour simplicité d'usage
export type {
  OnboardingResponse,
  CompleteOnboardingRequest,
  ProjectSearchParams,
  OnboardingStats
} from '../types';