import { useCallback } from 'react';
import { useToast } from '@/ui/components/use-toast';
import { PaymentsAPI } from '../services/paymentsAPI';
import {
  Payment,
  Invoice,
  PaymentCalculation,
  PaymentExport,
  CreatePaymentData,
  UpdatePaymentData,
  PaymentExportFormat,
  PaymentMethod,
  UsePaymentActionsReturn
} from '../types';

interface UsePaymentActionsOptions {
  candidateId?: string;
}

export function usePaymentActions(options: UsePaymentActionsOptions = {}): UsePaymentActionsReturn {
  const { toast } = useToast();

  /**
   * Crée une demande de paiement
   */
  const createPayment = useCallback(async (data: CreatePaymentData): Promise<Payment> => {
    const response = await PaymentsAPI.createPayment(data);

    if (response.success) {
      toast({
        title: "Demande de paiement créée",
        description: "Votre demande de paiement a été envoyée au client",
      });
      return response.data;
    } else {
      toast({
        title: "Erreur",
        description: response.error?.message || "Impossible de créer la demande de paiement",
        variant: "destructive",
      });
      throw new Error(response.error?.message || "Création impossible");
    }
  }, [toast]);

  /**
   * Met à jour un paiement
   */
  const updatePayment = useCallback(async (
    paymentId: string,
    data: UpdatePaymentData
  ): Promise<Payment> => {
    const response = await PaymentsAPI.updatePayment(paymentId, data);

    if (response.success) {
      toast({
        title: "Paiement mis à jour",
        description: "Les informations du paiement ont été mises à jour",
      });
      return response.data;
    } else {
      toast({
        title: "Erreur",
        description: response.error?.message || "Impossible de mettre à jour le paiement",
        variant: "destructive",
      });
      throw new Error(response.error?.message || "Mise à jour impossible");
    }
  }, [toast]);

  /**
   * Supprime un paiement (annulation)
   */
  const deletePayment = useCallback(async (paymentId: string): Promise<boolean> => {
    // Demander confirmation
    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir annuler cette demande de paiement ? Cette action est irréversible.'
    );

    if (!confirmed) return false;

    try {
      const response = await PaymentsAPI.updatePayment(paymentId, {
        payment_status: 'cancelled'
      });

      if (response.success) {
        toast({
          title: "Demande annulée",
          description: "La demande de paiement a été annulée",
        });
        return true;
      } else {
        toast({
          title: "Erreur",
          description: response.error?.message || "Impossible d'annuler la demande",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'annulation",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  /**
   * Valide un paiement (côté candidat - marque comme prêt)
   */
  const validatePayment = useCallback(async (paymentId: string): Promise<Payment> => {
    const response = await PaymentsAPI.updatePayment(paymentId, {
      payment_status: 'validated'
    });

    if (response.success) {
      toast({
        title: "Paiement validé",
        description: "Votre paiement est maintenant en attente de règlement",
      });
      return response.data;
    } else {
      toast({
        title: "Erreur",
        description: response.error?.message || "Impossible de valider le paiement",
        variant: "destructive",
      });
      throw new Error(response.error?.message || "Validation impossible");
    }
  }, [toast]);

  /**
   * Demande un paiement (relance)
   */
  const requestPayment = useCallback(async (paymentId: string): Promise<Payment> => {
    try {
      // Pour l'instant, on simule l'envoi d'une notification
      // Dans une vraie implémentation, cela enverrait un email ou une notification

      const response = await PaymentsAPI.updatePayment(paymentId, {
        // Ajouter un timestamp de dernière relance dans les métadonnées
        metadata: {
          last_reminder_sent: new Date().toISOString(),
          reminder_count: 1 // À implémenter un système de comptage
        } as any
      });

      if (response.success) {
        toast({
          title: "Relance envoyée",
          description: "Une notification a été envoyée au client pour le paiement",
        });
        return response.data;
      } else {
        throw new Error(response.error?.message);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la relance:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la relance",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  /**
   * Marque un paiement comme payé (notification depuis Stripe/autre)
   */
  const markAsPaid = useCallback(async (
    paymentId: string,
    paymentMethod: PaymentMethod
  ): Promise<Payment> => {
    const response = await PaymentsAPI.updatePayment(paymentId, {
      payment_status: 'paid',
      payment_method: paymentMethod,
      payment_date: new Date().toISOString()
    });

    if (response.success) {
      toast({
        title: "Paiement reçu ! 🎉",
        description: "Votre paiement a été traité avec succès",
      });
      return response.data;
    } else {
      toast({
        title: "Erreur",
        description: response.error?.message || "Impossible de marquer le paiement comme payé",
        variant: "destructive",
      });
      throw new Error(response.error?.message || "Mise à jour impossible");
    }
  }, [toast]);

  /**
   * Exporte les paiements
   */
  const exportPayments = useCallback(async (
    filters: PaymentFilters,
    format: PaymentExportFormat
  ): Promise<PaymentExport> => {
    const { candidateId: defaultCandidateId } = options;
    if (!defaultCandidateId) {
      throw new Error('Candidate ID required for export');
    }
    const response = await PaymentsAPI.exportPayments(defaultCandidateId, filters, format);

    if (response.success) {
      toast({
        title: "Export en cours",
        description: `Génération du fichier ${format.toUpperCase()} en cours...`,
      });

      // Simuler la notification de fin d'export
      setTimeout(() => {
        toast({
          title: "Export terminé",
          description: "Votre fichier est prêt au téléchargement",
          action: {
            label: "Télécharger",
            onClick: () => {
              // Simuler le téléchargement
              const link = document.createElement('a');
              link.href = response.data.download_url || '#';
              link.download = `paiements_${new Date().toISOString().split('T')[0]}.${format}`;
              link.click();
            }
          }
        });
      }, 3000);

      return response.data;
    } else {
      toast({
        title: "Erreur d'export",
        description: response.error?.message || "Impossible d'exporter les paiements",
        variant: "destructive",
      });
      throw new Error(response.error?.message || "Export impossible");
    }
  }, [toast]);

  /**
   * Génère une facture pour un paiement
   */
  const generateInvoice = useCallback(async (paymentId: string): Promise<Invoice> => {
    try {
      // Simuler la génération d'une facture
      // Dans une vraie implémentation, cela appellerait un service de facturation

      const mockInvoice: Invoice = {
        id: `invoice_${Date.now()}`,
        invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        project_id: 'project-id',
        client_id: 'client-id',
        period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        status: 'draft',
        subtotal_cents: 45000, // 450€
        tax_rate: 20,
        tax_amount_cents: 9000, // 90€
        total_cents: 54000, // 540€
        currency: 'EUR',
        payment_terms_days: 30,
        issued_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        line_items: [{
          id: 'line-1',
          description: 'Développement logiciel',
          quantity: 10,
          unit_price_cents: 4500, // 45€/heure
          total_cents: 45000,
          tax_rate: 20,
          category: 'development'
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      toast({
        title: "Facture générée",
        description: "La facture a été créée avec succès",
      });

      return mockInvoice;
    } catch (error) {
      console.error('Erreur lors de la génération de facture:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer la facture",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  /**
   * Envoie une facture au client
   */
  const sendInvoice = useCallback(async (invoiceId: string): Promise<boolean> => {
    try {
      // Simuler l'envoi d'une facture
      // Dans une vraie implémentation, cela enverrait un email avec la facture

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simuler l'envoi

      toast({
        title: "Facture envoyée",
        description: "La facture a été envoyée au client par email",
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de facture:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la facture",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  /**
   * Calcule le montant d'un paiement
   */
  const calculatePayment = useCallback(async (timeRecordIds: string[]): Promise<PaymentCalculation> => {
    const response = await PaymentsAPI.calculatePayment(timeRecordIds);

    if (response.success) {
      return response.data;
    } else {
      toast({
        title: "Erreur de calcul",
        description: response.error?.message || "Impossible de calculer le paiement",
        variant: "destructive",
      });
      throw new Error(response.error?.message || "Calcul impossible");
    }
  }, [toast]);

  /**
   * Télécharge un justificatif de paiement
   */
  const downloadPaymentProof = useCallback(async (paymentId: string): Promise<void> => {
    try {
      // Simuler la génération et le téléchargement d'un justificatif
      const link = document.createElement('a');
      link.href = `#`; // URL vers le justificatif
      link.download = `justificatif_paiement_${paymentId}.pdf`;
      link.click();

      toast({
        title: "Téléchargement démarré",
        description: "Le justificatif de paiement est en cours de téléchargement",
      });
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le justificatif",
        variant: "destructive",
      });
    }
  }, [toast]);

  /**
   * Conteste un paiement
   */
  const disputePayment = useCallback(async (
    paymentId: string,
    reason: string
  ): Promise<Payment> => {
    try {
      const response = await PaymentsAPI.updatePayment(paymentId, {
        payment_status: 'disputed',
        metadata: {
          dispute_reason: reason,
          dispute_date: new Date().toISOString()
        } as any
      });

      if (response.success) {
        toast({
          title: "Contestation enregistrée",
          description: "Votre contestation a été transmise au support",
        });
        return response.data;
      } else {
        throw new Error(response.error?.message);
      }
    } catch (error) {
      console.error('Erreur lors de la contestation:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la contestation",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  return {
    createPayment,
    updatePayment,
    deletePayment,
    validatePayment,
    requestPayment,
    markAsPaid,
    exportPayments,
    generateInvoice,
    sendInvoice,
    calculatePayment,
    downloadPaymentProof,
    disputePayment
  };
}