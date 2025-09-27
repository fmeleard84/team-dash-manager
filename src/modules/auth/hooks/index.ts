/**
 * Module AUTH - Hooks Index
 *
 * Point d'entrée pour tous les hooks du module auth.
 * Centralise l'export des hooks React d'authentification.
 */

export { useAuth, useAuthLegacy } from './useAuth';

// Re-exports pour simplicité d'usage
export type {
  UseAuthProps,
  UseAuthReturn,
  ContextUser,
  LoginData,
  RegisterData
} from '../types';