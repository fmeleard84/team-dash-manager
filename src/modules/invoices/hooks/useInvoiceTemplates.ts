/**
 * Hook useInvoiceTemplates - Gestion des Templates de Factures
 *
 * Hook spécialisé pour la gestion des modèles de factures :
 * - Création et modification de templates
 * - Templates par défaut et personnalisés
 * - Génération de factures depuis templates
 * - Sauvegarde et réutilisation
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { InvoicesAPI } from '../services/invoicesAPI';
import type {
  Invoice,
  InvoiceTemplate,
  CreateInvoiceData,
  UseInvoiceTemplatesReturn
} from '../types';

export const useInvoiceTemplates = (): UseInvoiceTemplatesReturn => {
  const { user } = useAuth();

  // ==========================================
  // ÉTAT LOCAL
  // ==========================================

  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [defaultTemplate, setDefaultTemplate] = useState<InvoiceTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // CHARGEMENT DES TEMPLATES
  // ==========================================

  const loadTemplates = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Charger les templates de l'utilisateur
      const { data, error: templatesError } = await supabase
        .from('invoice_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;

      setTemplates(data || []);

      // Identifier le template par défaut
      const defaultTpl = data?.find(t => t.is_default);
      setDefaultTemplate(defaultTpl || null);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des templates');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ==========================================
  // ACTIONS CRUD TEMPLATES
  // ==========================================

  const createTemplate = useCallback(async (
    name: string,
    templateData: any
  ): Promise<InvoiceTemplate | null> => {
    if (!user?.id) return null;

    try {
      setError(null);

      const { data, error } = await supabase
        .from('invoice_templates')
        .insert({
          name,
          template_data: templateData,
          user_id: user.id,
          is_default: false
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => [data, ...prev]);
      return data;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du template');
      return null;
    }
  }, [user?.id]);

  const updateTemplate = useCallback(async (
    id: string,
    updates: Partial<InvoiceTemplate>
  ): Promise<InvoiceTemplate | null> => {
    try {
      setError(null);

      const { data, error } = await supabase
        .from('invoice_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => prev.map(t => t.id === id ? data : t));

      // Mettre à jour le template par défaut si nécessaire
      if (data.is_default) {
        setDefaultTemplate(data);
      }

      return data;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du template');
      return null;
    }
  }, []);

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);

      // Vérifier que ce n'est pas le template par défaut
      const template = templates.find(t => t.id === id);
      if (template?.is_default) {
        throw new Error('Impossible de supprimer le template par défaut');
      }

      const { error } = await supabase
        .from('invoice_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== id));
      return true;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression du template');
      return false;
    }
  }, [templates]);

  const setAsDefaultTemplate = useCallback(async (id: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      setError(null);

      // Retirer le statut par défaut de tous les templates
      await supabase
        .from('invoice_templates')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Définir le nouveau template par défaut
      const { data, error } = await supabase
        .from('invoice_templates')
        .update({ is_default: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => prev.map(t => ({ ...t, is_default: t.id === id })));
      setDefaultTemplate(data);

      return true;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la définition du template par défaut');
      return false;
    }
  }, [user?.id]);

  // ==========================================
  // GÉNÉRATION DEPUIS TEMPLATE
  // ==========================================

  const generateInvoiceFromTemplate = useCallback(async (
    templateId: string,
    invoiceData: CreateInvoiceData
  ): Promise<Invoice | null> => {
    try {
      setError(null);

      // Récupérer le template
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        throw new Error('Template non trouvé');
      }

      // Fusionner les données du template avec les données de la facture
      const mergedData: CreateInvoiceData = {
        ...invoiceData,
        ...template.template_data,
        // Les données spécifiques de la facture prennent le dessus
        project_id: invoiceData.project_id,
        period_start: invoiceData.period_start,
        period_end: invoiceData.period_end
      };

      // Créer la facture avec l'API
      const response = await InvoicesAPI.createInvoice(mergedData);
      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.error || 'Erreur lors de la création de la facture');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération depuis le template');
      return null;
    }
  }, [templates]);

  // ==========================================
  // TEMPLATES PRÉDÉFINIS
  // ==========================================

  const createDefaultTemplates = useCallback(async () => {
    if (!user?.id) return;

    const defaultTemplates = [
      {
        name: 'Facture Standard',
        description: 'Template de facture standard avec TVA 20%',
        template_data: {
          vat_rate: 20,
          currency: 'EUR',
          payment_terms: 30, // 30 jours
          notes: 'Merci pour votre confiance.',
          auto_generate_items: true
        },
        is_default: true
      },
      {
        name: 'Facture Développement',
        description: 'Template optimisé pour les prestations de développement',
        template_data: {
          vat_rate: 20,
          currency: 'EUR',
          payment_terms: 15, // 15 jours pour le développement
          notes: 'Prestations de développement - Détail des tâches en pièce jointe.',
          auto_generate_items: true,
          service_description: 'Prestations de développement logiciel'
        },
        is_default: false
      },
      {
        name: 'Facture Consulting',
        description: 'Template pour les prestations de conseil',
        template_data: {
          vat_rate: 20,
          currency: 'EUR',
          payment_terms: 30,
          notes: 'Prestations de conseil et accompagnement.',
          auto_generate_items: true,
          service_description: 'Prestations de conseil'
        },
        is_default: false
      }
    ];

    // Créer les templates s'ils n'existent pas déjà
    for (const template of defaultTemplates) {
      const existing = templates.find(t => t.name === template.name);
      if (!existing) {
        await createTemplate(template.name, template.template_data);
      }
    }
  }, [user?.id, templates, createTemplate]);

  // ==========================================
  // UTILITAIRES
  // ==========================================

  const duplicateTemplate = useCallback(async (
    id: string,
    newName?: string
  ): Promise<InvoiceTemplate | null> => {
    const template = templates.find(t => t.id === id);
    if (!template) return null;

    const duplicateName = newName || `${template.name} (Copie)`;

    return await createTemplate(duplicateName, template.template_data);
  }, [templates, createTemplate]);

  const importTemplate = useCallback(async (
    templateData: any,
    name: string
  ): Promise<InvoiceTemplate | null> => {
    try {
      // Valider les données du template
      const validatedData = {
        vat_rate: templateData.vat_rate || 20,
        currency: templateData.currency || 'EUR',
        payment_terms: templateData.payment_terms || 30,
        notes: templateData.notes || '',
        auto_generate_items: templateData.auto_generate_items ?? true,
        ...templateData
      };

      return await createTemplate(name, validatedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'import du template');
      return null;
    }
  }, [createTemplate]);

  const exportTemplate = useCallback((id: string): string | null => {
    const template = templates.find(t => t.id === id);
    if (!template) return null;

    const exportData = {
      name: template.name,
      description: template.description,
      template_data: template.template_data,
      exported_at: new Date().toISOString(),
      version: '1.0'
    };

    return JSON.stringify(exportData, null, 2);
  }, [templates]);

  // ==========================================
  // EFFETS
  // ==========================================

  // Chargement initial
  useEffect(() => {
    if (user?.id) {
      loadTemplates();
    }
  }, [user?.id, loadTemplates]);

  // Créer les templates par défaut si aucun n'existe
  useEffect(() => {
    if (!loading && templates.length === 0) {
      createDefaultTemplates();
    }
  }, [loading, templates.length, createDefaultTemplates]);

  // ==========================================
  // RETOUR DU HOOK
  // ==========================================

  return {
    // Données
    templates,
    defaultTemplate,

    // États
    loading,
    error,

    // Actions
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setDefaultTemplate: setAsDefaultTemplate,

    // Génération
    generateInvoiceFromTemplate,

    // Utilitaires
    duplicateTemplate,
    importTemplate,
    exportTemplate,
    createDefaultTemplates,

    // Refresh
    refresh: loadTemplates
  };
};