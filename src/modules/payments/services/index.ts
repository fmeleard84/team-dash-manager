/**
 * Module PAIEMENTS - Services
 *
 * Ce fichier centralise tous les exports des services du module Paiements
 */

// ==========================================
// SERVICES PRINCIPAUX
// ==========================================

export { PaymentsAPI } from './paymentsAPI';

// ==========================================
// CONFIGURATION DES SERVICES
// ==========================================

export const PAYMENTS_SERVICES_CONFIG = {
  PaymentsAPI: {
    description: 'Service principal pour les interactions avec l\'API des paiements',
    endpoints: [
      'getPayments',
      'getPayment',
      'createPayment',
      'updatePayment',
      'deletePayment',
      'getPaymentStats',
      'getTimeRecords',
      'createTimeRecord',
      'updateTimeRecord',
      'deleteTimeRecord',
      'calculatePayment',
      'exportPayments',
      'generateInvoice'
    ],
    features: [
      'CRUD complet',
      'Gestion d\'erreurs',
      'Pagination',
      'Filtres avancés',
      'Export multiple formats',
      'Calculs automatiques'
    ]
  }
} as const;