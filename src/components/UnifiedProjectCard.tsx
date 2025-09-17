/**
 * UnifiedProjectCard - Composant unifié pour toutes les variantes de cartes projet
 * Phase 2 de refactorisation - Consolidation
 */

import React from 'react';
import { Project } from '@/types/project';

// Types pour les différentes variantes
export type ProjectCardVariant = 'client' | 'candidate' | 'admin' | 'default';
export type ProjectCardContext = 'available' | 'accepted' | 'active' | 'completed' | 'archived';
export type DesignSystem = 'neon' | 'material' | 'radix';

// Interface unifiée avec toutes les props possibles
export interface UnifiedProjectCardProps {
  // Core props
  project: Project;
  variant?: ProjectCardVariant;
  context?: ProjectCardContext;
  designSystem?: DesignSystem;

  // Resource data
  resourceAssignments?: any[];
  isArchived?: boolean;
  refreshTrigger?: number;

  // Client/Admin actions
  onStatusToggle?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  onStart?: (project: { id: string; title: string; kickoffISO?: string }) => void;
  onEdit?: () => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onProjectEdited?: () => void;

  // Candidate specific actions
  onAccept?: () => void;
  onDecline?: () => void;

  // Display options
  showPaymentIntegration?: boolean;
  showRealTimeUpdates?: boolean;
  showFileManagement?: boolean;
  showTeamProgress?: boolean;
  showSkills?: boolean;
  showLanguages?: boolean;

  // Custom styling
  className?: string;
}

// Import du composant de base actuel qui servira de fondation
import { ProjectCard as BaseProjectCard } from './ProjectCard';

/**
 * Composant unifié ProjectCard
 * Utilise le ProjectCard existant comme base et ajoute la logique de variants
 */
export const UnifiedProjectCard: React.FC<UnifiedProjectCardProps> = ({
  variant = 'default',
  context = 'active',
  designSystem = 'neon',
  showPaymentIntegration = true,
  showRealTimeUpdates = true,
  showFileManagement = true,
  showTeamProgress = true,
  showSkills = false,
  showLanguages = false,
  ...props
}) => {
  // Pour l'instant, on utilise le ProjectCard de base
  // Dans les prochaines itérations, on ajoutera la logique spécifique aux variants

  // Configuration basée sur le variant
  const getVariantConfig = () => {
    switch (variant) {
      case 'candidate':
        return {
          showPaymentIntegration: false,
          showRealTimeUpdates: false,
          showFileManagement: false,
          showTeamProgress: false,
          showSkills: true,
          showLanguages: true,
        };
      case 'admin':
        return {
          showPaymentIntegration: true,
          showRealTimeUpdates: true,
          showFileManagement: true,
          showTeamProgress: true,
          showSkills: true,
          showLanguages: true,
        };
      case 'client':
        return {
          showPaymentIntegration,
          showRealTimeUpdates,
          showFileManagement,
          showTeamProgress,
          showSkills: false,
          showLanguages: false,
        };
      default:
        return {
          showPaymentIntegration: false,
          showRealTimeUpdates: false,
          showFileManagement: true,
          showTeamProgress: true,
          showSkills: false,
          showLanguages: false,
        };
    }
  };

  const config = getVariantConfig();

  // Pour cette première version, on passe directement au composant de base
  // avec les configurations appropriées
  return (
    <BaseProjectCard
      {...props}
      // Les props spécifiques seront gérées dans les prochaines itérations
    />
  );
};

// Wrappers pour faciliter la migration
export const ClientProjectCard: React.FC<Omit<UnifiedProjectCardProps, 'variant'>> = (props) => (
  <UnifiedProjectCard {...props} variant="client" />
);

export const CandidateProjectCardUnified: React.FC<Omit<UnifiedProjectCardProps, 'variant'>> = (props) => (
  <UnifiedProjectCard {...props} variant="candidate" />
);

export const AdminProjectCard: React.FC<Omit<UnifiedProjectCardProps, 'variant'>> = (props) => (
  <UnifiedProjectCard {...props} variant="admin" />
);

// Export par défaut pour remplacement direct
export default UnifiedProjectCard;