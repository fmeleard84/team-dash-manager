/**
 * Hook useInvoiceActions - Actions CRUD et Utilitaires
 *
 * Hook spécialisé pour toutes les actions de manipulation des factures :
 * - Opérations CRUD (Create, Read, Update, Delete)
 * - Gestion des paiements Stripe
 * - Actions de statut (envoi, marquage payé, annulation)
 * - Export et génération de documents
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { InvoicesAPI } from '../services/invoicesAPI';
import type {
  Invoice,
  InvoiceItem,
  CreateInvoiceData,
  UpdateInvoiceData,
  CreateInvoiceItemData,
  UpdateInvoiceItemData,
  UseInvoiceActionsReturn,
  InvoiceFormat,
  PaymentMethod,
  StripeSessionData,
  StripeWebhookPayload
} from '../types';

export const useInvoiceActions = (): UseInvoiceActionsReturn => {
  const { user } = useAuth();

  // ==========================================
  // ÉTAT LOCAL
  // ==========================================

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // ==========================================
  // UTILITAIRES INTERNES
  // ==========================================

  const handleAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    successMessage?: string
  ): Promise<T | null> => {
    if (!user?.id) {
      setError('Utilisateur non connecté');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      setProgress(0);

      const result = await operation();

      if (successMessage) {
        console.log(successMessage);
      }
      setProgress(100);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000); // Reset progress après 1s
    }
  }, [user?.id]);

  // ==========================================
  // ACTIONS CRUD FACTURES
  // ==========================================

  const createInvoice = useCallback(async (
    data: CreateInvoiceData
  ): Promise<Invoice | null> => {
    return handleAsync(
      async () => {
        const response = await InvoicesAPI.createInvoice(data);
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error || 'Erreur lors de la création');
      },
      'Facture créée avec succès'
    );
  }, [handleAsync]);

  const updateInvoice = useCallback(async (
    id: string,
    updates: UpdateInvoiceData
  ): Promise<Invoice | null> => {
    return handleAsync(
      async () => {
        const response = await InvoicesAPI.updateInvoice(id, updates);
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error || 'Erreur lors de la mise à jour');
      },
      'Facture mise à jour avec succès'
    );
  }, [handleAsync]);

  const deleteInvoice = useCallback(async (id: string): Promise<boolean> => {
    const result = await handleAsync(
      async () => {
        const response = await InvoicesAPI.deleteInvoice(id);
        if (response.success) {
          return true;
        }
        throw new Error(response.error || 'Erreur lors de la suppression');
      },
      'Facture supprimée avec succès'
    );
    return result !== null;
  }, [handleAsync]);

  const duplicateInvoice = useCallback(async (id: string): Promise<Invoice | null> => {
    return handleAsync(
      async () => {
        // Récupérer la facture originale
        const originalResponse = await InvoicesAPI.getInvoiceById(id);
        if (!originalResponse.success || !originalResponse.data) {
          throw new Error('Facture originale non trouvée');
        }

        const original = originalResponse.data;

        // Créer une nouvelle facture basée sur l'originale
        const duplicateData: CreateInvoiceData = {
          project_id: original.project_id,
          period_start: original.period_start,
          period_end: original.period_end,
          notes: original.notes ? `[COPIE] ${original.notes}` : '[COPIE]',
          auto_generate_items: false // On va copier les éléments manuellement
        };

        const newInvoiceResponse = await InvoicesAPI.createInvoice(duplicateData);
        if (!newInvoiceResponse.success || !newInvoiceResponse.data) {
          throw new Error('Erreur lors de la création de la copie');
        }

        const newInvoice = newInvoiceResponse.data;

        // Copier les éléments si ils existent
        if (original.items && original.items.length > 0) {
          for (const item of original.items) {
            const itemData: CreateInvoiceItemData = {
              invoice_id: newInvoice.id,
              candidate_id: item.candidate_id,
              service_name: item.service_name,
              service_description: item.service_description,
              total_minutes: item.total_minutes,
              rate_per_minute_cents: item.rate_per_minute_cents,
              amount_cents: item.amount_cents,
              task_details: item.task_details
            };

            await InvoicesAPI.addInvoiceItem(itemData);
          }
        }

        // Récupérer la facture complète avec les éléments
        const completeInvoiceResponse = await InvoicesAPI.getInvoiceById(newInvoice.id);
        if (completeInvoiceResponse.success && completeInvoiceResponse.data) {
          return completeInvoiceResponse.data;
        }

        return newInvoice;
      },
      'Facture dupliquée avec succès'
    );
  }, [handleAsync]);

  // ==========================================
  // ACTIONS DE STATUT
  // ==========================================

  const sendInvoice = useCallback(async (id: string): Promise<boolean> => {
    const result = await handleAsync(
      async () => {
        // Marquer comme envoyée
        const response = await InvoicesAPI.updateInvoice(id, {
          status: 'sent'
        });

        if (response.success) {
          // TODO: Envoyer l'email si nécessaire
          return true;
        }
        throw new Error(response.error || 'Erreur lors de l\'envoi');
      },
      'Facture envoyée avec succès'
    );
    return result !== null;
  }, [handleAsync]);

  const markAsPaid = useCallback(async (
    id: string,
    paymentMethod: PaymentMethod,
    paymentDate?: string
  ): Promise<boolean> => {
    const result = await handleAsync(
      async () => {
        const response = await InvoicesAPI.updateInvoice(id, {
          status: 'paid',
          payment_method: paymentMethod,
          payment_date: paymentDate || new Date().toISOString()
        });

        if (response.success) {
          return true;
        }
        throw new Error(response.error || 'Erreur lors de la mise à jour du statut');
      },
      'Facture marquée comme payée'
    );
    return result !== null;
  }, [handleAsync]);

  const cancelInvoice = useCallback(async (
    id: string,
    reason?: string
  ): Promise<boolean> => {
    const result = await handleAsync(
      async () => {
        const notes = reason ? `Annulée: ${reason}` : 'Facture annulée';
        const response = await InvoicesAPI.updateInvoice(id, {
          status: 'cancelled',
          notes
        });

        if (response.success) {
          return true;
        }
        throw new Error(response.error || 'Erreur lors de l\'annulation');
      },
      'Facture annulée avec succès'
    );
    return result !== null;
  }, [handleAsync]);

  // ==========================================
  // ACTIONS STRIPE
  // ==========================================

  const createStripeSession = useCallback(async (
    invoiceId: string
  ): Promise<StripeSessionData | null> => {
    return handleAsync(
      async () => {
        const response = await InvoicesAPI.createStripeSession(invoiceId);
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error || 'Erreur lors de la création de la session de paiement');
      },
      'Session de paiement créée avec succès'
    );
  }, [handleAsync]);

  const processStripeWebhook = useCallback(async (
    payload: StripeWebhookPayload
  ): Promise<boolean> => {
    const result = await handleAsync(
      async () => {
        const response = await InvoicesAPI.processStripeWebhook(payload);
        if (response.success) {
          return true;
        }
        throw new Error(response.error || 'Erreur lors du traitement du webhook');
      }
    );
    return result !== null;
  }, [handleAsync]);

  // ==========================================
  // GESTION DES ÉLÉMENTS DE FACTURE
  // ==========================================

  const addInvoiceItem = useCallback(async (
    data: CreateInvoiceItemData
  ): Promise<boolean> => {
    const result = await handleAsync(
      async () => {
        const response = await InvoicesAPI.addInvoiceItem(data);
        if (response.success) {
          return true;
        }
        throw new Error(response.error || 'Erreur lors de l\'ajout de l\'élément');
      },
      'Élément ajouté à la facture'
    );
    return result !== null;
  }, [handleAsync]);

  const updateInvoiceItem = useCallback(async (
    id: string,
    data: UpdateInvoiceItemData
  ): Promise<boolean> => {
    const result = await handleAsync(
      async () => {
        // TODO: Implémenter dans InvoicesAPI
        throw new Error('updateInvoiceItem pas encore implémenté');
      },
      'Élément de facture mis à jour'
    );
    return result !== null;
  }, [handleAsync]);

  const removeInvoiceItem = useCallback(async (id: string): Promise<boolean> => {
    const result = await handleAsync(
      async () => {
        // TODO: Implémenter dans InvoicesAPI
        throw new Error('removeInvoiceItem pas encore implémenté');
      },
      'Élément supprimé de la facture'
    );
    return result !== null;
  }, [handleAsync]);

  // ==========================================
  // EXPORT ET IMPRESSION
  // ==========================================

  const exportInvoice = useCallback(async (
    id: string,
    format: InvoiceFormat
  ): Promise<string | null> => {
    return handleAsync(
      async () => {
        const response = await InvoicesAPI.exportInvoice(id, format);
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error || 'Erreur lors de l\'export');
      },
      `Facture exportée en ${format.toUpperCase()}`
    );
  }, [handleAsync]);

  const printInvoice = useCallback(async (id: string): Promise<boolean> => {
    const result = await handleAsync(
      async () => {
        // Exporter en PDF puis ouvrir pour impression
        const pdfUrl = await exportInvoice(id, 'pdf');
        if (pdfUrl) {
          // Ouvrir dans un nouvel onglet pour impression
          window.open(pdfUrl, '_blank');
          return true;
        }
        throw new Error('Impossible de générer le PDF pour impression');
      },
      'Facture préparée pour impression'
    );
    return result !== null;
  }, [handleAsync, exportInvoice]);

  // ==========================================
  // GÉNÉRATION AUTOMATIQUE AVANCÉE
  // ==========================================

  const generateInvoicesForProject = useCallback(async (
    projectId: string,
    startDate: string,
    endDate: string,
    splitBy: 'week' | 'month' = 'week'
  ): Promise<Invoice[]> => {
    const result = await handleAsync(
      async () => {
        const invoices: Invoice[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Générer les périodes selon le split
        const periods = [];
        let currentDate = new Date(start);

        while (currentDate < end) {
          const periodEnd = new Date(currentDate);

          if (splitBy === 'week') {
            periodEnd.setDate(currentDate.getDate() + 6);
          } else {
            periodEnd.setMonth(currentDate.getMonth() + 1, 0); // Dernier jour du mois
          }

          // S'assurer de ne pas dépasser la date de fin
          if (periodEnd > end) {
            periodEnd.setTime(end.getTime());
          }

          periods.push({
            start: new Date(currentDate),
            end: new Date(periodEnd)
          });

          if (splitBy === 'week') {
            currentDate.setDate(currentDate.getDate() + 7);
          } else {
            currentDate.setMonth(currentDate.getMonth() + 1, 1);
          }
        }

        // Créer une facture pour chaque période
        for (const period of periods) {
          const invoiceData: CreateInvoiceData = {
            project_id: projectId,
            period_start: period.start.toISOString().split('T')[0],
            period_end: period.end.toISOString().split('T')[0],
            auto_generate_items: true
          };

          const response = await InvoicesAPI.createInvoice(invoiceData);
          if (response.success && response.data) {
            invoices.push(response.data);
          }
        }

        return invoices;
      },
      `${invoices.length} facture(s) générée(s) avec succès`
    );

    return result || [];
  }, [handleAsync]);

  // ==========================================
  // UTILITAIRES
  // ==========================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(0);
  }, []);

  // Validation des données de facture
  const validateInvoiceData = useCallback((data: CreateInvoiceData | UpdateInvoiceData) => {
    const errors: string[] = [];

    if ('project_id' in data && !data.project_id) {
      errors.push('Le projet est obligatoire');
    }

    if ('period_start' in data && 'period_end' in data) {
      const start = new Date(data.period_start!);
      const end = new Date(data.period_end!);

      if (start >= end) {
        errors.push('La date de fin doit être postérieure à la date de début');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }, []);

  // ==========================================
  // RETOUR DU HOOK
  // ==========================================

  return {
    // États
    loading,
    error,
    progress,

    // Actions CRUD
    createInvoice,
    updateInvoice,
    deleteInvoice,
    duplicateInvoice,

    // Actions de statut
    sendInvoice,
    markAsPaid,
    cancelInvoice,

    // Actions Stripe
    createStripeSession,
    processStripeWebhook,

    // Gestion des éléments
    addInvoiceItem,
    updateInvoiceItem,
    removeInvoiceItem,

    // Export et impression
    exportInvoice,
    printInvoice,

    // Génération avancée
    generateInvoicesForProject,

    // Utilitaires
    clearError,
    resetProgress,
    validateInvoiceData
  };
};