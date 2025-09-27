/**
 * Module RAPPORTS - Composants Index
 *
 * Centralise l'export de tous les composants du module rapports avec les alias
 * de compatibilité pour faciliter l'adoption progressive.
 */

export { ModularReportsView } from './ModularReportsView';

// ==========================================
// ALIAS DE COMPATIBILITÉ
// ==========================================

// Alias principal pour le composant client
export { ModularReportsView as ClientReports } from './ModularReportsView';

// Alias génériques
export { ModularReportsView as ReportsView } from './ModularReportsView';
export { ModularReportsView as ReportsCenter } from './ModularReportsView';
export { ModularReportsView as Analytics } from './ModularReportsView';
export { ModularReportsView as ReportsHub } from './ModularReportsView';

// ==========================================
// CONFIGURATION DU MODULE
// ==========================================

export const REPORTS_MODULE_CONFIG = {
  name: 'reports',
  version: '1.0.0',
  description: 'Système de rapports et analytics complet avec export multi-format et visualisation avancée',
  features: [
    'Analytics avancés et tableaux de bord',
    'Export multi-format (PDF, Excel, CSV, JSON)',
    'Templates personnalisables et réutilisables',
    'Rapports planifiés et automatisation',
    'Visualisation de données et graphiques',
    'Métriques temps réel et tendances',
    'Comparaisons périodiques et benchmarks',
    'Rapports financiers et opérationnels',
    'Intégration complète avec time tracking',
    'Système de recommandations intelligent'
  ],
  integrations: [
    'Time tracking automatique',
    'Projets et équipes',
    'Données financières',
    'Export comptable',
    'Système d\'authentification',
    'Base de données Supabase',
    'Real-time synchronisation',
    'Recharts pour visualisation',
    'Export PDF et Excel',
    'Email notifications'
  ],
  components: {
    primary: 'ModularReportsView',
    aliases: ['ClientReports', 'ReportsView', 'ReportsCenter', 'Analytics', 'ReportsHub']
  },
  supported_formats: ['pdf', 'excel', 'csv', 'json', 'html', 'xml'],
  chart_types: ['line', 'bar', 'pie', 'doughnut', 'area', 'scatter', 'radar', 'heatmap'],
  max_export_size_mb: 50,
  retention_days: 90
} as const;