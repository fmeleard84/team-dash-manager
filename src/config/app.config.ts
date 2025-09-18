/**
 * Configuration centralisée de l'application
 * Phase 2 de refactorisation - Extraction des constantes
 */

// URLs et endpoints
export const APP_CONFIG = {
  // Environnement
  isDevelopment: import.meta.env.MODE === 'development',
  isProduction: import.meta.env.MODE === 'production',

  // URLs de base
  urls: {
    development: 'https://95.216.204.226:8081',
    production: 'https://vaya.rip',
    staging: 'https://staging.vaya.rip',
  },

  // Configuration Supabase (utilise les variables d'environnement)
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },

  // Configuration JitSi pour les visioconférences
  jitsi: {
    domain: 'meet.jit.si',
    defaultRoomPrefix: 'vaya-room-',
  },

  // Configuration des emails
  email: {
    defaultFrom: 'hello@vaya.rip',
    defaultFromName: 'La Team Vaya',
    supportEmail: 'support@vaya.rip',
  },

  // Configuration des fichiers
  storage: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    buckets: {
      projects: 'projects',
      avatars: 'avatars',
      documents: 'documents',
      wiki: 'wiki',
    },
  },

  // Limites et quotas
  limits: {
    maxProjectsPerClient: 50,
    maxTeamMembersPerProject: 20,
    maxFilesPerProject: 100,
    maxMessageLength: 5000,
    maxWikiPageSize: 50000,
  },

  // Intervalles de rafraîchissement (en ms)
  refreshIntervals: {
    messages: 5000,
    notifications: 10000,
    projects: 30000,
    metrics: 60000,
  },

  // Configuration des animations
  animations: {
    duration: {
      fast: 150,
      normal: 250,
      slow: 500,
    },
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Configuration des toasts
  toast: {
    duration: 4000,
    position: 'bottom-right' as const,
  },

  // Statuts système
  projectStatus: {
    PAUSE: 'pause',
    WAITING_TEAM: 'attente-team',
    ACTIVE: 'play',
    COMPLETED: 'completed',
  } as const,

  candidateStatus: {
    QUALIFICATION: 'qualification',
    AVAILABLE: 'disponible',
    PAUSED: 'en_pause',
    UNAVAILABLE: 'indisponible',
  } as const,

  bookingStatus: {
    DRAFT: 'draft',
    SEARCHING: 'recherche',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
  } as const,

  // Niveaux de séniorité
  seniority: {
    JUNIOR: 'junior',
    CONFIRMED: 'confirmé',
    SENIOR: 'senior',
    EXPERT: 'expert',
  } as const,

  // Rôles utilisateur
  userRoles: {
    CLIENT: 'client',
    CANDIDATE: 'candidate',
    ADMIN: 'admin',
    TEAM_MEMBER: 'team_member',
  } as const,
};

// Helper pour obtenir l'URL de base selon l'environnement
export const getAppUrl = (): string => {
  if (typeof window === 'undefined') {
    return APP_CONFIG.urls.production;
  }

  const hostname = window.location.hostname;
  const port = window.location.port;

  // Development - Check port FIRST before hostname
  if (port === '8081') {
    return APP_CONFIG.urls.development;
  }

  // Production
  if (hostname === 'vaya.rip' || port === '3000') {
    return APP_CONFIG.urls.production;
  }

  // Fallback to origin
  return window.location.origin;
};

// Helper pour obtenir l'URL de callback email
export const getEmailCallbackUrl = (next?: string): string => {
  const baseUrl = getAppUrl();
  const nextParam = next ? `?next=${encodeURIComponent(next)}` : '';
  return `${baseUrl}/auth/callback${nextParam}`;
};

// Helper pour obtenir l'URL de stockage
export const getStorageUrl = (bucket: string, path: string): string => {
  return `${APP_CONFIG.supabase.url}/storage/v1/object/public/${bucket}/${path}`;
};

// Helper pour formater les montants
export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);
};

// Helper pour formater les dates
export const formatDate = (date: string | Date, format: 'short' | 'long' = 'short'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (format === 'long') {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  }

  return new Intl.DateTimeFormat('fr-FR').format(d);
};

// Export des types
export type ProjectStatus = typeof APP_CONFIG.projectStatus[keyof typeof APP_CONFIG.projectStatus];
export type CandidateStatus = typeof APP_CONFIG.candidateStatus[keyof typeof APP_CONFIG.candidateStatus];
export type BookingStatus = typeof APP_CONFIG.bookingStatus[keyof typeof APP_CONFIG.bookingStatus];
export type Seniority = typeof APP_CONFIG.seniority[keyof typeof APP_CONFIG.seniority];
export type UserRole = typeof APP_CONFIG.userRoles[keyof typeof APP_CONFIG.userRoles];

export default APP_CONFIG;