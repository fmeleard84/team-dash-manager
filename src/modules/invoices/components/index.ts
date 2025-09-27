/**
 * Module FACTURES - Composants Index
 *
 * Centralise l'export de tous les composants du module factures avec les alias
 * de compatibilité pour faciliter l'adoption progressive.
 */

export { ModularInvoicesView } from './ModularInvoicesView';

// ==========================================
// ALIAS DE COMPATIBILITÉ
// ==========================================

// Alias principal pour le composant client
export { ModularInvoicesView as ClientInvoices } from './ModularInvoicesView';

// Alias génériques
export { ModularInvoicesView as InvoicesView } from './ModularInvoicesView';
export { ModularInvoicesView as InvoiceList } from './ModularInvoicesView';

// ==========================================
// CONFIGURATION DU MODULE
// ==========================================

export const INVOICES_MODULE_CONFIG = {
  name: 'invoices',
  version: '1.0.0',
  description: 'Système de facturation complet avec paiements Stripe et export comptable',
  features: [
    'Génération automatique depuis time tracking',
    'Paiements sécurisés via Stripe',
    'Export PDF et formats comptables',
    'Templates de factures personnalisables',
    'Statistiques et tableaux de bord',
    'Gestion de la TVA et réglementations',
    'Suivi des paiements en temps réel',
    'Relances automatiques',
    'Intégration comptabilité'
  ],
  integrations: [
    'Stripe Connect pour paiements',
    'Time tracking automatique',
    'Export comptable (XML, CSV)',
    'Système d\'authentification',
    'Base de données Supabase',
    'Real-time synchronisation',
    'Email notifications',
    'PDF generation'
  ],
  components: {
    primary: 'ModularInvoicesView',
    aliases: ['ClientInvoices', 'InvoicesView', 'InvoiceList']
  }
} as const;