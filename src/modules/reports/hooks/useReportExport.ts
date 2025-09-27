/**
 * Hook useReportExport - Gestion des Exports de Rapports
 *
 * Hook spécialisé pour l'export avec :
 * - Export multi-format (PDF, Excel, CSV, JSON)
 * - Suivi du statut et progression
 * - Gestion des téléchargements
 * - Historique des exports
 * - Configuration d'export avancée
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { ReportsAPI } from '../services/reportsAPI';
import type {
  ReportExport,
  UseReportExportReturn,
  ReportFormat,
  ExportConfig
} from '../types';

export const useReportExport = (
  options: {
    autoCleanup?: boolean;
    maxRetentionDays?: number;
    enableProgress?: boolean;
  } = {}
): UseReportExportReturn => {
  const { user } = useAuth();
  const {
    autoCleanup = true,
    maxRetentionDays = 30,
    enableProgress = true
  } = options;

  // ==========================================
  // ÉTAT LOCAL
  // ==========================================

  const [exports, setExports] = useState<ReportExport[]>([]);
  const [exportProgress, setExportProgress] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // EXPORT DE RAPPORTS
  // ==========================================

  const exportReport = useCallback(async (
    reportDataId: string,
    format: ReportFormat,
    config: ExportConfig = {}
  ): Promise<string | null> => {
    if (!user?.id) return null;

    try {
      setLoading(true);
      setError(null);

      // Initier l'export
      const response = await ReportsAPI.exportReport(reportDataId, format, config);

      if (response.success && response.data) {
        const newExport = response.data;

        // Ajouter à la liste des exports
        setExports(prev => [newExport, ...prev]);

        // Initialiser la progression
        if (enableProgress) {
          setExportProgress(prev => ({
            ...prev,
            [newExport.id]: 0
          }));

          // Simuler la progression (en réalité, ceci viendrait du serveur)
          const progressInterval = setInterval(() => {
            setExportProgress(prev => {
              const currentProgress = prev[newExport.id] || 0;
              const nextProgress = Math.min(100, currentProgress + Math.random() * 20 + 5);

              if (nextProgress >= 100) {
                clearInterval(progressInterval);
                // Marquer l'export comme prêt
                setExports(prevExports => prevExports.map(exp =>
                  exp.id === newExport.id
                    ? { ...exp, status: 'ready', progress_percentage: 100 }
                    : exp
                ));
              }

              return {
                ...prev,
                [newExport.id]: nextProgress
              };
            });
          }, 1000);

          // Nettoyer l'intervalle après 30 secondes max
          setTimeout(() => {
            clearInterval(progressInterval);
          }, 30000);
        }

        return newExport.id;
      } else {
        setError(response.error || 'Erreur lors de l\'export');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'export');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, enableProgress]);

  // ==========================================
  // TÉLÉCHARGEMENT
  // ==========================================

  const downloadExport = useCallback(async (exportId: string): Promise<boolean> => {
    try {
      const exportToDownload = exports.find(exp => exp.id === exportId);
      if (!exportToDownload) {
        setError('Export introuvable');
        return false;
      }

      if (exportToDownload.status !== 'ready') {
        setError('L\'export n\'est pas encore prêt');
        return false;
      }

      // Simuler le téléchargement (en réalité, il y aurait un lien direct vers le fichier)
      const fileName = exportToDownload.file_name;
      const fileContent = `Contenu simulé du fichier ${fileName}`;

      // Créer un blob et déclencher le téléchargement
      const blob = new Blob([fileContent], {
        type: getContentType(exportToDownload.format)
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Incrémenter le compteur de téléchargement
      setExports(prev => prev.map(exp =>
        exp.id === exportId
          ? { ...exp, download_count: exp.download_count + 1 }
          : exp
      ));

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
      return false;
    }
  }, [exports]);

  // ==========================================
  // GESTION DES EXPORTS
  // ==========================================

  const deleteExport = useCallback(async (exportId: string): Promise<boolean> => {
    try {
      // Supprimer localement (à implémenter côté serveur)
      setExports(prev => prev.filter(exp => exp.id !== exportId));

      // Nettoyer la progression
      setExportProgress(prev => {
        const { [exportId]: removed, ...rest } = prev;
        return rest;
      });

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    }
  }, []);

  const getExportStatus = useCallback((exportId: string): ReportExport | null => {
    return exports.find(exp => exp.id === exportId) || null;
  }, [exports]);

  // ==========================================
  // NETTOYAGE AUTOMATIQUE
  // ==========================================

  const cleanupExpiredExports = useCallback(() => {
    if (!autoCleanup) return;

    const cutoffDate = new Date(Date.now() - maxRetentionDays * 24 * 60 * 60 * 1000);

    setExports(prev => prev.filter(exp => {
      const exportDate = new Date(exp.exported_at);
      return exportDate > cutoffDate;
    }));
  }, [autoCleanup, maxRetentionDays]);

  // ==========================================
  // UTILITAIRES
  // ==========================================

  const getContentType = (format: ReportFormat): string => {
    switch (format) {
      case 'pdf':
        return 'application/pdf';
      case 'excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv':
        return 'text/csv';
      case 'json':
        return 'application/json';
      case 'html':
        return 'text/html';
      case 'xml':
        return 'application/xml';
      default:
        return 'application/octet-stream';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ==========================================
  // MÉTRIQUES ET STATISTIQUES
  // ==========================================

  const isExporting = useMemo(() => {
    return exports.some(exp => exp.status === 'processing' || exp.status === 'pending');
  }, [exports]);

  const exportStats = useMemo(() => {
    return {
      totalExports: exports.length,
      readyExports: exports.filter(exp => exp.status === 'ready').length,
      processingExports: exports.filter(exp => exp.status === 'processing').length,
      failedExports: exports.filter(exp => exp.status === 'failed').length,
      totalDownloads: exports.reduce((sum, exp) => sum + exp.download_count, 0),
      totalSize: exports.reduce((sum, exp) => sum + exp.file_size, 0),
      averageSize: exports.length > 0
        ? exports.reduce((sum, exp) => sum + exp.file_size, 0) / exports.length
        : 0,
      formatDistribution: exports.reduce((acc, exp) => {
        acc[exp.format] = (acc[exp.format] || 0) + 1;
        return acc;
      }, {} as Record<ReportFormat, number>)
    };
  }, [exports]);

  // Exports récents (7 derniers jours)
  const recentExports = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return exports.filter(exp => new Date(exp.exported_at) > weekAgo);
  }, [exports]);

  // Exports par format
  const exportsByFormat = useMemo(() => {
    return exports.reduce((acc, exp) => {
      if (!acc[exp.format]) {
        acc[exp.format] = [];
      }
      acc[exp.format].push(exp);
      return acc;
    }, {} as Record<ReportFormat, ReportExport[]>);
  }, [exports]);

  // ==========================================
  // CONFIGURATIONS D'EXPORT PRÉDÉFINIES
  // ==========================================

  const getPresetConfigs = useCallback((): Record<string, ExportConfig> => {
    return {
      'pdf_high_quality': {
        pdf: {
          quality: 'high',
          include_charts: true,
          include_raw_data: false,
          watermark: undefined
        }
      },
      'pdf_presentation': {
        pdf: {
          quality: 'medium',
          include_charts: true,
          include_raw_data: false,
          watermark: 'CONFIDENTIEL'
        }
      },
      'excel_complete': {
        excel: {
          include_formulas: true,
          include_charts: true,
          worksheet_per_section: true,
          protect_sheets: false
        }
      },
      'excel_data_only': {
        excel: {
          include_formulas: false,
          include_charts: false,
          worksheet_per_section: false,
          protect_sheets: true
        }
      },
      'csv_standard': {
        csv: {
          delimiter: ',',
          encoding: 'utf-8',
          include_headers: true,
          quote_all: false
        }
      },
      'json_compact': {
        json: {
          pretty_print: false,
          include_metadata: false,
          compress: true
        }
      },
      'json_detailed': {
        json: {
          pretty_print: true,
          include_metadata: true,
          compress: false
        }
      }
    };
  }, []);

  // ==========================================
  // EFFETS
  // ==========================================

  // Nettoyage automatique périodique
  useEffect(() => {
    if (!autoCleanup) return;

    // Nettoyer au montage
    cleanupExpiredExports();

    // Nettoyer périodiquement
    const interval = setInterval(cleanupExpiredExports, 24 * 60 * 60 * 1000); // Une fois par jour

    return () => clearInterval(interval);
  }, [autoCleanup, cleanupExpiredExports]);

  // ==========================================
  // RETOUR DU HOOK
  // ==========================================

  return {
    // Exports
    exports,
    loading,
    error,

    // Actions
    exportReport,
    downloadExport,
    deleteExport,

    // Status
    getExportStatus,
    isExporting,
    exportProgress,

    // Utilitaires
    formatFileSize,
    getContentType,
    getPresetConfigs,

    // Données organisées
    recentExports,
    exportsByFormat,
    exportStats,

    // Nettoyage
    cleanupExpiredExports
  };
};