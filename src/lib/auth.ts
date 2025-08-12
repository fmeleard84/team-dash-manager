import { useKeycloakAuth } from '@/contexts/KeycloakAuthContext';

/**
 * Auth utilities for the application
 */

// Simple guard function for protecting routes
export function requireAuth(fn: () => void) {
  const { isAuthenticated, login } = useKeycloakAuth();
  if (!isAuthenticated) return login();
  fn();
}

/**
 * Build Nextcloud URL with SSO support
 * @param pathType - Type of path ('project', 'client', 'resource')
 * @param identifier - Project title, client slug, or resource identifier
 * @returns Complete Nextcloud URL with proper encoding
 */
export function buildNextcloudUrl(pathType: 'project' | 'client' | 'resource', identifier: string): string {
  const baseUrl = 'https://cloud.ialla.fr/apps/files';
  
  let folderPath: string;
  
  switch (pathType) {
    case 'project':
      folderPath = `/Projet - ${identifier}`;
      break;
    case 'client':
      folderPath = `/Clients/${identifier}`;
      break;
    case 'resource':
      folderPath = `/Equipes/${identifier}`;
      break;
    default:
      folderPath = '/';
  }
  
  return `${baseUrl}?dir=${encodeURIComponent(folderPath)}`;
}

/**
 * Open Nextcloud in new tab with SSO
 * @param pathType - Type of path ('project', 'client', 'resource')
 * @param identifier - Project title, client slug, or resource identifier
 */
export function openNextcloud(pathType: 'project' | 'client' | 'resource' = 'project', identifier: string = '') {
  const url = buildNextcloudUrl(pathType, identifier);
  window.open(url, '_blank');
}