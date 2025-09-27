/**
 * Hook useReportTemplates - Gestion des Templates de Rapports
 *
 * Hook spécialisé pour les templates avec :
 * - Gestion des templates utilisateur et système
 * - CRUD complet sur les templates
 * - Duplication et personnalisation
 * - Utilisation de templates pour génération rapide
 * - Templates populaires et recommandés
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { ReportsAPI } from '../services/reportsAPI';
import type {
  ReportTemplate,
  UseReportTemplatesReturn,
  CreateReportTemplateData,
  UpdateReportTemplateData,
  ReportFilters,
  ReportConfig,
  ReportBranding
} from '../types';

export const useReportTemplates = (
  options: {
    includeSystem?: boolean;
    autoLoad?: boolean;
  } = {}
): UseReportTemplatesReturn => {
  const { user } = useAuth();
  const {
    includeSystem = true,
    autoLoad = true
  } = options;

  // ==========================================
  // ÉTAT LOCAL
  // ==========================================

  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [systemTemplates, setSystemTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // RÉCUPÉRATION DES TEMPLATES
  // ==========================================

  const fetchTemplates = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await ReportsAPI.getReportTemplates(user.id);

      if (response.success && response.data) {
        setTemplates(response.data.user);
        if (includeSystem) {
          setSystemTemplates(response.data.system);
        }
      } else {
        setError(response.error || 'Erreur lors du chargement des templates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user?.id, includeSystem]);

  // ==========================================
  // OPÉRATIONS CRUD
  // ==========================================

  const createTemplate = useCallback(async (data: CreateReportTemplateData): Promise<string | null> => {
    if (!user?.id) return null;

    try {
      setLoading(true);
      const response = await ReportsAPI.createReportTemplate({
        ...data,
        client_id: user.id
      });

      if (response.success && response.data) {
        // Ajouter le nouveau template à la liste
        setTemplates(prev => [response.data, ...prev]);
        return response.data.id;
      } else {
        setError(response.error || 'Erreur lors de la création du template');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const updateTemplate = useCallback(async (
    id: string,
    data: UpdateReportTemplateData
  ): Promise<boolean> => {
    try {
      setLoading(true);

      // Simuler l'update (à implémenter dans l'API)
      setTemplates(prev => prev.map(template =>
        template.id === id
          ? { ...template, ...data, updated_at: new Date().toISOString() }
          : template
      ));

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);

      // Simuler la suppression (à implémenter dans l'API)
      setTemplates(prev => prev.filter(template => template.id !== id));

      // Désélectionner si c'était le template sélectionné
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedTemplate]);

  const duplicateTemplate = useCallback(async (
    id: string,
    name: string
  ): Promise<string | null> => {
    const templateToDuplicate = [...templates, ...systemTemplates].find(t => t.id === id);
    if (!templateToDuplicate) {
      setError('Template introuvable');
      return null;
    }

    return createTemplate({
      name,
      description: `Copie de ${templateToDuplicate.name}`,
      config: templateToDuplicate.config,
      default_filters: templateToDuplicate.default_filters,
      branding: templateToDuplicate.branding,
      is_public: false
    });
  }, [templates, systemTemplates, createTemplate]);

  // ==========================================
  // UTILISATION DES TEMPLATES
  // ==========================================

  const useTemplate = useCallback(async (
    templateId: string,
    filters: ReportFilters
  ): Promise<string | null> => {
    if (!user?.id) return null;

    const template = [...templates, ...systemTemplates].find(t => t.id === templateId);
    if (!template) {
      setError('Template introuvable');
      return null;
    }

    try {
      setLoading(true);

      // Créer un rapport basé sur le template
      const reportData = {
        title: `Rapport ${template.name} - ${new Date().toLocaleDateString('fr-FR')}`,
        description: `Généré à partir du template "${template.name}"`,
        type: template.config.sections.includes('financial_analysis') ? 'financial' : 'dashboard',
        category: 'operational',
        config: template.config,
        filters: {
          ...template.default_filters,
          ...filters
        },
        template_id: templateId
      };

      const response = await ReportsAPI.createReport(reportData as any);

      if (response.success && response.data) {
        // Incrémenter le compteur d'usage
        setTemplates(prev => prev.map(t =>
          t.id === templateId
            ? { ...t, usage_count: t.usage_count + 1 }
            : t
        ));

        setSystemTemplates(prev => prev.map(t =>
          t.id === templateId
            ? { ...t, usage_count: t.usage_count + 1 }
            : t
        ));

        // Générer directement le rapport
        await ReportsAPI.generateReport(response.data.id);

        return response.data.id;
      } else {
        setError(response.error || 'Erreur lors de la création du rapport');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'utilisation du template');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, templates, systemTemplates]);

  // ==========================================
  // TEMPLATES PRÉDÉFINIS
  // ==========================================

  const getDefaultTemplates = useCallback((): CreateReportTemplateData[] => {
    const defaultBranding: ReportBranding = {
      primary_color: '#8b5cf6',
      secondary_color: '#ec4899',
      text_color: '#1f2937',
      background_color: '#ffffff',
      company_name: 'Mon Entreprise',
      font_family: 'Inter',
      font_size: 12,
      theme: 'professional'
    };

    return [
      {
        name: 'Rapport Financier Mensuel',
        description: 'Rapport complet des finances avec coûts, revenus et marges',
        config: {
          sections: ['executive_summary', 'key_metrics', 'financial_analysis', 'trends', 'recommendations'],
          layout: 'single_column',
          page_size: 'A4',
          orientation: 'portrait',
          include_charts: true,
          include_tables: true,
          include_summary: true,
          include_recommendations: true,
          data_aggregation: 'monthly',
          comparison_periods: 3,
          include_forecasts: true,
          export_formats: ['pdf', 'excel'],
          auto_archive: true,
          retention_days: 365
        },
        default_filters: {
          period_type: 'month',
          date_range: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0]
          }
        },
        branding: defaultBranding,
        is_public: false
      },
      {
        name: 'Dashboard Performance Équipe',
        description: 'Vue d\'ensemble des performances et productivité de l\'équipe',
        config: {
          sections: ['key_metrics', 'project_analytics', 'team_performance', 'trends'],
          layout: 'dashboard',
          page_size: 'A4',
          orientation: 'landscape',
          include_charts: true,
          include_tables: false,
          include_summary: false,
          include_recommendations: true,
          data_aggregation: 'weekly',
          comparison_periods: 4,
          include_forecasts: false,
          export_formats: ['pdf', 'html'],
          auto_archive: false,
          retention_days: 90
        },
        default_filters: {
          period_type: 'week',
          date_range: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0]
          }
        },
        branding: {
          ...defaultBranding,
          theme: 'modern',
          primary_color: '#3b82f6'
        },
        is_public: false
      },
      {
        name: 'Analyse Coûts par Projet',
        description: 'Analyse détaillée des coûts avec répartition par projet',
        config: {
          sections: ['executive_summary', 'project_analytics', 'financial_analysis', 'recommendations'],
          layout: 'two_columns',
          page_size: 'A4',
          orientation: 'portrait',
          include_charts: true,
          include_tables: true,
          include_summary: true,
          include_recommendations: true,
          data_aggregation: 'daily',
          comparison_periods: 2,
          include_forecasts: true,
          export_formats: ['pdf', 'csv', 'excel'],
          auto_archive: true,
          retention_days: 180
        },
        default_filters: {
          period_type: 'month',
          date_range: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0]
          }
        },
        branding: {
          ...defaultBranding,
          theme: 'minimal',
          primary_color: '#10b981'
        },
        is_public: false
      }
    ];
  }, []);

  const createDefaultTemplates = useCallback(async (): Promise<void> => {
    const defaults = getDefaultTemplates();

    for (const templateData of defaults) {
      await createTemplate(templateData);
    }
  }, [createTemplate, getDefaultTemplates]);

  // ==========================================
  // UTILITAIRES
  // ==========================================

  const selectTemplate = useCallback((template: ReportTemplate | null) => {
    setSelectedTemplate(template);
  }, []);

  const getTemplateById = useCallback((id: string): ReportTemplate | null => {
    return [...templates, ...systemTemplates].find(t => t.id === id) || null;
  }, [templates, systemTemplates]);

  // Templates populaires (basés sur usage_count)
  const popularTemplates = useMemo(() => {
    return [...templates, ...systemTemplates]
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 5);
  }, [templates, systemTemplates]);

  // Templates récents
  const recentTemplates = useMemo(() => {
    return templates
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
  }, [templates]);

  // Statistiques des templates
  const templateStats = useMemo(() => {
    const totalUsage = [...templates, ...systemTemplates]
      .reduce((sum, t) => sum + t.usage_count, 0);

    return {
      userTemplatesCount: templates.length,
      systemTemplatesCount: systemTemplates.length,
      totalUsage,
      averageUsage: templates.length > 0 ? totalUsage / templates.length : 0,
      mostUsedTemplate: popularTemplates[0] || null
    };
  }, [templates, systemTemplates, popularTemplates]);

  // ==========================================
  // EFFETS
  // ==========================================

  // Chargement initial
  useEffect(() => {
    if (user?.id && autoLoad) {
      fetchTemplates();
    }
  }, [user?.id, autoLoad, fetchTemplates]);

  // ==========================================
  // RETOUR DU HOOK
  // ==========================================

  return {
    // Templates
    templates,
    systemTemplates,
    loading,
    error,

    // Actions CRUD
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,

    // Template actuel
    selectedTemplate,
    selectTemplate,

    // Utilisation
    useTemplate,
    getTemplateById,

    // Utilitaires
    popularTemplates,
    recentTemplates,
    templateStats,

    // Templates par défaut
    getDefaultTemplates,
    createDefaultTemplates,

    // Actions
    refresh: fetchTemplates
  };
};