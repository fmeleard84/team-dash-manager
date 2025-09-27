/**
 * Module PARAMÈTRES CLIENT - Vue Modulaire Paramètres Client
 *
 * Interface moderne et complète pour la gestion des paramètres client
 * avec système à onglets, validation temps réel, auto-sauvegarde,
 * import/export et gestion des sauvegardes.
 *
 * Fonctionnalités:
 * - Interface à onglets avec 8 sections de paramètres
 * - Validation temps réel avec indicateurs visuels
 * - Auto-sauvegarde configurable
 * - Import/export de configurations
 * - Système de sauvegardes et restauration
 * - Design glassmorphism moderne
 * - Feedback utilisateur en temps réel
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/components/card';
import { Button } from '@/ui/components/button';
import { Input } from '@/ui/components/input';
import { Label } from '@/ui/components/label';
import { Switch } from '@/ui/components/switch';
import { Badge } from '@/ui/components/badge';
import { Separator } from '@/ui/components/separator';
import { ScrollArea } from '@/ui/components/scroll-area';
import {
  Settings,
  User,
  Shield,
  Bell,
  CreditCard,
  Users,
  Plug,
  Palette,
  Save,
  Download,
  Upload,
  History,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

import { useClientSettings } from '../hooks';
import type {
  SettingsSection,
  ValidationError,
  GeneralSettings,
  UserPreferences,
  SecuritySettings,
  NotificationSettings,
  BillingSettings,
  TeamSettings,
  IntegrationsSettings,
  InterfaceSettings
} from '../types';

interface ModularClientSettingsViewProps {
  clientId?: string;
  className?: string;
  onSettingsChange?: (isDirty: boolean) => void;
}

/**
 * Vue principale des paramètres client avec interface à onglets
 */
export function ModularClientSettingsView({
  clientId,
  className = '',
  onSettingsChange
}: ModularClientSettingsViewProps) {
  // Hooks
  const {
    settings,
    isLoading,
    error,
    isDirty,
    autoSaveEnabled,
    lastSaved,
    updateLocalSettings,
    saveChanges,
    cancelChanges,
    toggleAutoSave,
    validateSettings,
    exportSettings,
    importSettings,
    createBackup,
    getBackups,
    resetSection,
    resetAllSettings,
    getSection,
    isSectionDirty
  } = useClientSettings(clientId);

  // État local
  const [activeTab, setActiveTab] = useState<SettingsSection>('general');
  const [validationErrors, setValidationErrors] = useState<Record<string, ValidationError[]>>({});
  const [importData, setImportData] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Effet pour notifier les changements
  useEffect(() => {
    onSettingsChange?.(isDirty);
  }, [isDirty, onSettingsChange]);

  // Validation temps réel
  useEffect(() => {
    if (settings) {
      const errors: Record<string, ValidationError[]> = {};

      const sections: SettingsSection[] = ['general', 'preferences', 'security', 'notifications', 'billing', 'team', 'integrations', 'interface'];

      sections.forEach(section => {
        const sectionData = getSection(section);
        if (sectionData) {
          const sectionErrors = validateSettings(section, sectionData);
          if (sectionErrors.length > 0) {
            errors[section] = sectionErrors;
          }
        }
      });

      setValidationErrors(errors);
    }
  }, [settings, validateSettings, getSection]);

  // Handlers
  const handleSectionUpdate = (section: SettingsSection, data: any) => {
    updateLocalSettings(section, data);
  };

  const handleSave = async () => {
    const success = await saveChanges();
    if (success) {
      toast.success('Paramètres sauvegardés avec succès');
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportSettings();
      if (data) {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `settings-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const handleImport = async () => {
    try {
      const success = await importSettings(importData);
      if (success) {
        setShowImportDialog(false);
        setImportData('');
        toast.success('Paramètres importés avec succès');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'import');
    }
  };

  const handleBackup = async () => {
    const backupId = await createBackup(`Sauvegarde manuelle - ${new Date().toLocaleString()}`);
    if (backupId) {
      toast.success('Sauvegarde créée avec succès');
    }
  };

  const getSectionIcon = (section: SettingsSection) => {
    const icons = {
      general: User,
      preferences: Settings,
      security: Shield,
      notifications: Bell,
      billing: CreditCard,
      team: Users,
      integrations: Plug,
      interface: Palette
    };
    return icons[section] || Settings;
  };

  const getSectionTitle = (section: SettingsSection) => {
    const titles = {
      general: 'Général',
      preferences: 'Préférences',
      security: 'Sécurité',
      notifications: 'Notifications',
      billing: 'Facturation',
      team: 'Équipe',
      integrations: 'Intégrations',
      interface: 'Interface'
    };
    return titles[section] || 'Paramètres';
  };

  const getValidationSeverityColor = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'info': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full h-96 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Chargement des paramètres...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Erreur de chargement
          </CardTitle>
          <CardDescription className="text-red-500 dark:text-red-300">
            {error}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Aucun paramètre trouvé pour ce client
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {/* Header avec actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Paramètres Client</h2>
          <p className="text-muted-foreground">
            Gérez votre configuration et préférences
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Indicateur auto-save */}
          <Badge variant={autoSaveEnabled ? 'default' : 'secondary'} className="gap-1">
            <Save className="h-3 w-3" />
            Auto-save {autoSaveEnabled ? 'ON' : 'OFF'}
          </Badge>

          {/* Status */}
          {isDirty && (
            <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-200">
              <Info className="h-3 w-3" />
              Modifications non sauvegardées
            </Badge>
          )}

          {lastSaved && (
            <span className="text-sm text-muted-foreground">
              Dernière sauvegarde: {new Date(lastSaved).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleSave} disabled={!isDirty} className="gap-2">
          <Save className="h-4 w-4" />
          Sauvegarder
        </Button>

        <Button onClick={cancelChanges} variant="outline" disabled={!isDirty} className="gap-2">
          <X className="h-4 w-4" />
          Annuler
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button onClick={toggleAutoSave} variant="ghost" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Auto-save {autoSaveEnabled ? 'ON' : 'OFF'}
        </Button>

        <Button onClick={handleExport} variant="ghost" className="gap-2">
          <Download className="h-4 w-4" />
          Exporter
        </Button>

        <Button onClick={() => setShowImportDialog(true)} variant="ghost" className="gap-2">
          <Upload className="h-4 w-4" />
          Importer
        </Button>

        <Button onClick={handleBackup} variant="ghost" className="gap-2">
          <History className="h-4 w-4" />
          Sauvegarder
        </Button>
      </div>

      {/* Interface à onglets */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsSection)} className="w-full">
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 mb-6">
          {(['general', 'preferences', 'security', 'notifications', 'billing', 'team', 'integrations', 'interface'] as SettingsSection[]).map((section) => {
            const Icon = getSectionIcon(section);
            const hasErrors = validationErrors[section]?.some(e => e.severity === 'error');
            const hasWarnings = validationErrors[section]?.some(e => e.severity === 'warning');
            const isDirtySec = isSectionDirty(section);

            return (
              <TabsTrigger
                key={section}
                value={section}
                className="gap-1 relative"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{getSectionTitle(section)}</span>

                {/* Indicateurs */}
                {hasErrors && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
                {hasWarnings && !hasErrors && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full" />
                )}
                {isDirtySec && !hasErrors && !hasWarnings && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Contenu des onglets */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Affichage des erreurs de validation */}
            {validationErrors[activeTab] && validationErrors[activeTab].length > 0 && (
              <Card className="mb-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Problèmes détectés
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {validationErrors[activeTab].map((error, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${error.severity === 'error' ? 'bg-red-500' : error.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                        <span className={getValidationSeverityColor(error.severity)}>
                          {error.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contenu spécifique à chaque onglet */}
            <TabsContent value="general" className="space-y-4">
              <GeneralSettingsPanel
                settings={getSection('general') as GeneralSettings}
                onChange={(data) => handleSectionUpdate('general', data)}
                onReset={() => resetSection('general')}
              />
            </TabsContent>

            <TabsContent value="preferences" className="space-y-4">
              <PreferencesSettingsPanel
                settings={getSection('preferences') as UserPreferences}
                onChange={(data) => handleSectionUpdate('preferences', data)}
                onReset={() => resetSection('preferences')}
              />
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <SecuritySettingsPanel
                settings={getSection('security') as SecuritySettings}
                onChange={(data) => handleSectionUpdate('security', data)}
                onReset={() => resetSection('security')}
              />
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <NotificationSettingsPanel
                settings={getSection('notifications') as NotificationSettings}
                onChange={(data) => handleSectionUpdate('notifications', data)}
                onReset={() => resetSection('notifications')}
              />
            </TabsContent>

            <TabsContent value="billing" className="space-y-4">
              <BillingSettingsPanel
                settings={getSection('billing') as BillingSettings}
                onChange={(data) => handleSectionUpdate('billing', data)}
                onReset={() => resetSection('billing')}
              />
            </TabsContent>

            <TabsContent value="team" className="space-y-4">
              <TeamSettingsPanel
                settings={getSection('team') as TeamSettings}
                onChange={(data) => handleSectionUpdate('team', data)}
                onReset={() => resetSection('team')}
              />
            </TabsContent>

            <TabsContent value="integrations" className="space-y-4">
              <IntegrationsSettingsPanel
                settings={getSection('integrations') as IntegrationsSettings}
                onChange={(data) => handleSectionUpdate('integrations', data)}
                onReset={() => resetSection('integrations')}
              />
            </TabsContent>

            <TabsContent value="interface" className="space-y-4">
              <InterfaceSettingsPanel
                settings={getSection('interface') as InterfaceSettings}
                onChange={(data) => handleSectionUpdate('interface', data)}
                onReset={() => resetSection('interface')}
              />
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>

      {/* Dialog Import */}
      {showImportDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowImportDialog(false)}
        >
          <Card
            className="w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Importer des paramètres
              </CardTitle>
              <CardDescription>
                Collez votre configuration JSON ci-dessous
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                className="w-full h-32 p-3 border rounded-md resize-none font-mono text-sm"
                placeholder="Collez votre JSON ici..."
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={handleImport} disabled={!importData.trim()} className="flex-1">
                  Importer
                </Button>
                <Button
                  onClick={() => setShowImportDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// Composants de panneaux de paramètres individuels
function GeneralSettingsPanel({ settings, onChange, onReset }: {
  settings: GeneralSettings;
  onChange: (data: Partial<GeneralSettings>) => void;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Paramètres généraux</CardTitle>
            <CardDescription>
              Configuration de base de votre compte
            </CardDescription>
          </div>
          <Button onClick={onReset} variant="outline" size="sm">
            Réinitialiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nom de l'entreprise</Label>
            <Input
              id="company-name"
              value={settings?.companyName || ''}
              onChange={(e) => onChange({ companyName: e.target.value })}
              placeholder="Votre entreprise"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Secteur d'activité</Label>
            <Input
              id="industry"
              value={settings?.industry || ''}
              onChange={(e) => onChange({ industry: e.target.value })}
              placeholder="Ex: Technologie"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            className="w-full p-3 border rounded-md resize-none"
            rows={3}
            value={settings?.description || ''}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Décrivez votre entreprise..."
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="public-profile"
            checked={settings?.isPublicProfile || false}
            onCheckedChange={(checked) => onChange({ isPublicProfile: checked })}
          />
          <Label htmlFor="public-profile">Profil public</Label>
        </div>
      </CardContent>
    </Card>
  );
}

function PreferencesSettingsPanel({ settings, onChange, onReset }: {
  settings: UserPreferences;
  onChange: (data: Partial<UserPreferences>) => void;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Préférences utilisateur</CardTitle>
            <CardDescription>
              Personnalisez votre expérience
            </CardDescription>
          </div>
          <Button onClick={onReset} variant="outline" size="sm">
            Réinitialiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="language">Langue</Label>
            <select
              id="language"
              className="w-full p-2 border rounded-md"
              value={settings?.language || 'fr'}
              onChange={(e) => onChange({ language: e.target.value as 'fr' | 'en' | 'es' })}
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Fuseau horaire</Label>
            <select
              id="timezone"
              className="w-full p-2 border rounded-md"
              value={settings?.timezone || 'Europe/Paris'}
              onChange={(e) => onChange({ timezone: e.target.value })}
            >
              <option value="Europe/Paris">Europe/Paris</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Asia/Tokyo">Asia/Tokyo</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="dark-mode"
              checked={settings?.darkMode || false}
              onCheckedChange={(checked) => onChange({ darkMode: checked })}
            />
            <Label htmlFor="dark-mode">Mode sombre</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="compact-mode"
              checked={settings?.compactMode || false}
              onCheckedChange={(checked) => onChange({ compactMode: checked })}
            />
            <Label htmlFor="compact-mode">Interface compacte</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SecuritySettingsPanel({ settings, onChange, onReset }: {
  settings: SecuritySettings;
  onChange: (data: Partial<SecuritySettings>) => void;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Paramètres de sécurité</CardTitle>
            <CardDescription>
              Protégez votre compte
            </CardDescription>
          </div>
          <Button onClick={onReset} variant="outline" size="sm">
            Réinitialiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="two-factor"
              checked={settings?.twoFactorEnabled || false}
              onCheckedChange={(checked) => onChange({ twoFactorEnabled: checked })}
            />
            <Label htmlFor="two-factor">Authentification à deux facteurs</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="login-alerts"
              checked={settings?.loginAlerts || false}
              onCheckedChange={(checked) => onChange({ loginAlerts: checked })}
            />
            <Label htmlFor="login-alerts">Alertes de connexion</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="suspicious-activity"
              checked={settings?.suspiciousActivityAlerts || false}
              onCheckedChange={(checked) => onChange({ suspiciousActivityAlerts: checked })}
            />
            <Label htmlFor="suspicious-activity">Alertes d'activité suspecte</Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="session-timeout">Délai d'expiration de session (minutes)</Label>
          <Input
            id="session-timeout"
            type="number"
            min="5"
            max="480"
            value={settings?.sessionTimeout || 60}
            onChange={(e) => onChange({ sessionTimeout: parseInt(e.target.value) })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationSettingsPanel({ settings, onChange, onReset }: {
  settings: NotificationSettings;
  onChange: (data: Partial<NotificationSettings>) => void;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Gérez vos préférences de notification
            </CardDescription>
          </div>
          <Button onClick={onReset} variant="outline" size="sm">
            Réinitialiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium">Notifications par email</h4>

          <div className="flex items-center space-x-2">
            <Switch
              id="project-updates"
              checked={settings?.email?.projectUpdates || false}
              onCheckedChange={(checked) => onChange({
                email: { ...settings?.email, projectUpdates: checked }
              })}
            />
            <Label htmlFor="project-updates">Mises à jour de projets</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="team-messages"
              checked={settings?.email?.teamMessages || false}
              onCheckedChange={(checked) => onChange({
                email: { ...settings?.email, teamMessages: checked }
              })}
            />
            <Label htmlFor="team-messages">Messages d'équipe</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="billing-alerts"
              checked={settings?.email?.billingAlerts || false}
              onCheckedChange={(checked) => onChange({
                email: { ...settings?.email, billingAlerts: checked }
              })}
            />
            <Label htmlFor="billing-alerts">Alertes de facturation</Label>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="font-medium">Notifications push</h4>

          <div className="flex items-center space-x-2">
            <Switch
              id="push-enabled"
              checked={settings?.push?.enabled || false}
              onCheckedChange={(checked) => onChange({
                push: { ...settings?.push, enabled: checked }
              })}
            />
            <Label htmlFor="push-enabled">Activer les notifications push</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BillingSettingsPanel({ settings, onChange, onReset }: {
  settings: BillingSettings;
  onChange: (data: Partial<BillingSettings>) => void;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Facturation</CardTitle>
            <CardDescription>
              Paramètres de facturation et paiement
            </CardDescription>
          </div>
          <Button onClick={onReset} variant="outline" size="sm">
            Réinitialiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="billing-email">Email de facturation</Label>
          <Input
            id="billing-email"
            type="email"
            value={settings?.billingEmail || ''}
            onChange={(e) => onChange({ billingEmail: e.target.value })}
            placeholder="facturation@entreprise.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-vat">Numéro de TVA</Label>
          <Input
            id="company-vat"
            value={settings?.vatNumber || ''}
            onChange={(e) => onChange({ vatNumber: e.target.value })}
            placeholder="FR12345678901"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="auto-payment"
            checked={settings?.autoPayment || false}
            onCheckedChange={(checked) => onChange({ autoPayment: checked })}
          />
          <Label htmlFor="auto-payment">Paiement automatique</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="invoice-alerts"
            checked={settings?.invoiceAlerts || false}
            onCheckedChange={(checked) => onChange({ invoiceAlerts: checked })}
          />
          <Label htmlFor="invoice-alerts">Alertes de facture</Label>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamSettingsPanel({ settings, onChange, onReset }: {
  settings: TeamSettings;
  onChange: (data: Partial<TeamSettings>) => void;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Équipe</CardTitle>
            <CardDescription>
              Gestion de votre équipe et collaborateurs
            </CardDescription>
          </div>
          <Button onClick={onReset} variant="outline" size="sm">
            Réinitialiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="max-members">Nombre maximum de membres</Label>
          <Input
            id="max-members"
            type="number"
            min="1"
            max="1000"
            value={settings?.maxMembers || 10}
            onChange={(e) => onChange({ maxMembers: parseInt(e.target.value) })}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="invite-enabled"
              checked={settings?.inviteEnabled || false}
              onCheckedChange={(checked) => onChange({ inviteEnabled: checked })}
            />
            <Label htmlFor="invite-enabled">Permettre les invitations</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="require-approval"
              checked={settings?.requireApproval || false}
              onCheckedChange={(checked) => onChange({ requireApproval: checked })}
            />
            <Label htmlFor="require-approval">Approbation requise</Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="default-role">Rôle par défaut</Label>
          <select
            id="default-role"
            className="w-full p-2 border rounded-md"
            value={settings?.defaultRole || 'member'}
            onChange={(e) => onChange({ defaultRole: e.target.value as 'admin' | 'member' | 'viewer' })}
          >
            <option value="viewer">Lecteur</option>
            <option value="member">Membre</option>
            <option value="admin">Administrateur</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}

function IntegrationsSettingsPanel({ settings, onChange, onReset }: {
  settings: IntegrationsSettings;
  onChange: (data: Partial<IntegrationsSettings>) => void;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Intégrations</CardTitle>
            <CardDescription>
              Connectez vos outils préférés
            </CardDescription>
          </div>
          <Button onClick={onReset} variant="outline" size="sm">
            Réinitialiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="slack-enabled"
              checked={settings?.slack?.enabled || false}
              onCheckedChange={(checked) => onChange({
                slack: { ...settings?.slack, enabled: checked }
              })}
            />
            <Label htmlFor="slack-enabled">Slack</Label>
          </div>

          {settings?.slack?.enabled && (
            <div className="ml-6 space-y-2">
              <Label htmlFor="slack-webhook">Webhook URL</Label>
              <Input
                id="slack-webhook"
                value={settings?.slack?.webhookUrl || ''}
                onChange={(e) => onChange({
                  slack: { ...settings?.slack, webhookUrl: e.target.value }
                })}
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="teams-enabled"
              checked={settings?.teams?.enabled || false}
              onCheckedChange={(checked) => onChange({
                teams: { ...settings?.teams, enabled: checked }
              })}
            />
            <Label htmlFor="teams-enabled">Microsoft Teams</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="discord-enabled"
              checked={settings?.discord?.enabled || false}
              onCheckedChange={(checked) => onChange({
                discord: { ...settings?.discord, enabled: checked }
              })}
            />
            <Label htmlFor="discord-enabled">Discord</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InterfaceSettingsPanel({ settings, onChange, onReset }: {
  settings: InterfaceSettings;
  onChange: (data: Partial<InterfaceSettings>) => void;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Interface</CardTitle>
            <CardDescription>
              Personnalisez l'apparence de l'application
            </CardDescription>
          </div>
          <Button onClick={onReset} variant="outline" size="sm">
            Réinitialiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="theme">Thème</Label>
          <select
            id="theme"
            className="w-full p-2 border rounded-md"
            value={settings?.theme || 'system'}
            onChange={(e) => onChange({ theme: e.target.value as 'light' | 'dark' | 'system' })}
          >
            <option value="system">Système</option>
            <option value="light">Clair</option>
            <option value="dark">Sombre</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="layout">Mise en page</Label>
          <select
            id="layout"
            className="w-full p-2 border rounded-md"
            value={settings?.layout || 'comfortable'}
            onChange={(e) => onChange({ layout: e.target.value as 'compact' | 'comfortable' | 'spacious' })}
          >
            <option value="compact">Compacte</option>
            <option value="comfortable">Confortable</option>
            <option value="spacious">Spacieuse</option>
          </select>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="animations"
              checked={settings?.animations || false}
              onCheckedChange={(checked) => onChange({ animations: checked })}
            />
            <Label htmlFor="animations">Animations</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="sound-effects"
              checked={settings?.soundEffects || false}
              onCheckedChange={(checked) => onChange({ soundEffects: checked })}
            />
            <Label htmlFor="sound-effects">Effets sonores</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="reduced-motion"
              checked={settings?.reducedMotion || false}
              onCheckedChange={(checked) => onChange({ reducedMotion: checked })}
            />
            <Label htmlFor="reduced-motion">Mouvement réduit</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ModularClientSettingsView;