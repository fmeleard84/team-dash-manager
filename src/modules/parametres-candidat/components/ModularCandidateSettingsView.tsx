/**
 * Module PARAMÈTRES CANDIDAT - Vue Modulaire Paramètres Candidat
 *
 * Interface complète pour la gestion des paramètres candidat.
 * Basée sur la logique métier existante de CandidateSettings.tsx.
 *
 * Fonctionnalités:
 * - Gestion complète du profil candidat (personnel + professionnel)
 * - Calcul automatique des tarifs avec séniorité et bonus
 * - Gestion des compétences (langues, expertises)
 * - Intégration système de qualification IA
 * - Interface moderne à onglets avec validation temps réel
 * - Export/import des paramètres
 * - Design glassmorphism cohérent
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/components/card';
import { Button } from '@/ui/components/button';
import { Input } from '@/ui/components/input';
import { Label } from '@/ui/components/label';
import { Badge } from '@/ui/components/badge';
import { Switch } from '@/ui/components/switch';
import { Separator } from '@/ui/components/separator';
import { ScrollArea } from '@/ui/components/scroll-area';
import {
  User,
  Briefcase,
  Award,
  CheckCircle,
  Settings,
  Bell,
  Shield,
  Eye,
  Save,
  Download,
  Upload,
  Info,
  RefreshCw,
  AlertTriangle,
  Calculator,
  TrendingUp,
  Star,
  Globe,
  Code,
  Edit,
  Plus,
  X
} from 'lucide-react';
import { toast } from 'sonner';

// Imports des composants existants pour compatibilité
import { EditJobModal } from '@/components/candidate/EditJobModal';
import { EditLanguagesModal } from '@/components/candidate/EditLanguagesModal';
import { EditExpertisesModal } from '@/components/candidate/EditExpertisesModal';
import { EditSeniorityModal } from '@/components/candidate/EditSeniorityModal';
import { QualificationResults } from '@/components/candidate/QualificationResults';

import { useCandidateSettings } from '../hooks';
import type {
  CandidateSettings,
  PersonalSettings,
  ProfessionalSettings,
  SkillsSettings,
  QualificationSettings,
  CandidatePreferences,
  CandidateNotificationSettings,
  CandidateSecuritySettings,
  PrivacySettings,
  SeniorityLevel,
  CandidateStatus,
  WorkLocationType,
  QualificationMethod
} from '../types';

interface ModularCandidateSettingsViewProps {
  candidateId?: string;
  className?: string;
  onProfileUpdate?: () => void;
}

/**
 * Vue principale des paramètres candidat avec interface à onglets
 */
export function ModularCandidateSettingsView({
  candidateId,
  className = '',
  onProfileUpdate
}: ModularCandidateSettingsViewProps) {
  // Hooks
  const {
    settings,
    isLoading,
    error,
    updatePersonalSettings,
    updateProfessionalSettings,
    updatePreferences,
    updateNotificationSettings,
    updateSecuritySettings,
    updatePrivacySettings,
    addLanguage,
    removeLanguage,
    addExpertise,
    removeExpertise,
    calculateRate,
    updateRates,
    startQualification,
    getQualificationResults,
    exportSettings,
    importSettings,
    isDirty,
    lastSaved,
    validationErrors
  } = useCandidateSettings(candidateId);

  // État local
  const [activeTab, setActiveTab] = useState<string>('personal');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState('');

  // États pour les modales existantes (compatibilité)
  const [isEditJobModalOpen, setIsEditJobModalOpen] = useState(false);
  const [isEditLanguagesModalOpen, setIsEditLanguagesModalOpen] = useState(false);
  const [isEditExpertisesModalOpen, setIsEditExpertisesModalOpen] = useState(false);
  const [isEditSeniorityModalOpen, setIsEditSeniorityModalOpen] = useState(false);

  // États pour l'édition locale
  const [editingPersonal, setEditingPersonal] = useState<Partial<PersonalSettings>>({});

  // Initialiser les données d'édition
  useEffect(() => {
    if (settings?.personal) {
      setEditingPersonal({
        firstName: settings.personal.firstName,
        lastName: settings.personal.lastName,
        email: settings.personal.email,
        phone: settings.personal.phone
      });
    }
  }, [settings?.personal]);

  // Handlers pour les modales existantes
  const handleModalUpdate = () => {
    // Recharger les paramètres après modification via les modales existantes
    window.location.reload(); // Simple rechargement pour l'instant
    if (onProfileUpdate) {
      onProfileUpdate();
    }
  };

  // Handler pour la sauvegarde des informations personnelles
  const handleSavePersonalInfo = async () => {
    try {
      const success = await updatePersonalSettings(editingPersonal);
      if (success && onProfileUpdate) {
        onProfileUpdate();
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  // Handler pour l'export
  const handleExport = async () => {
    try {
      const data = await exportSettings();
      if (data) {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `parametres-candidat-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setShowExportDialog(false);
      }
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  // Handler pour l'import
  const handleImport = async () => {
    try {
      const success = await importSettings(importData);
      if (success) {
        setShowImportDialog(false);
        setImportData('');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'import');
    }
  };

  // Calcul du tarif avec expertise
  const calculateRateWithExpertise = (baseRate: number, expertiseCount: number, languageCount: number) => {
    if (!baseRate) return 0;

    const expertisePercentage = expertiseCount * 0.05;
    const languagePercentage = languageCount * 0.05;
    const totalPercentage = 1 + expertisePercentage + languagePercentage;

    return Math.round(baseRate * totalPercentage);
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
            Chargement du profil...
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
          <h2 className="text-2xl font-bold tracking-tight">Paramètres du Profil</h2>
          <p className="text-muted-foreground">
            Gérez votre profil personnel et professionnel
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Indicateurs de statut */}
          {settings.personal.status && (
            <Badge
              variant={
                settings.personal.status === 'disponible' ? 'default' :
                settings.personal.status === 'qualification' ? 'secondary' :
                'outline'
              }
              className="gap-1"
            >
              <div className={`w-2 h-2 rounded-full ${
                settings.personal.status === 'disponible' ? 'bg-green-500' :
                settings.personal.status === 'qualification' ? 'bg-yellow-500' :
                'bg-gray-500'
              }`} />
              {settings.personal.status}
            </Badge>
          )}

          {isDirty && (
            <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-200">
              <Info className="h-3 w-3" />
              Modifications non sauvegardées
            </Badge>
          )}

          {lastSaved && (
            <span className="text-sm text-muted-foreground">
              Dernière maj: {new Date(lastSaved).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setShowExportDialog(true)} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exporter
        </Button>

        <Button onClick={() => setShowImportDialog(true)} variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importer
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <span className="text-sm text-muted-foreground">
          Score de qualification: {settings.qualification.qualificationScore || 'Non qualifié'}
        </span>
      </div>

      {/* Interface à onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 mb-6">
          <TabsTrigger value="personal" className="gap-1">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Informations</span>
          </TabsTrigger>

          <TabsTrigger value="professional" className="gap-1">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Professionnel</span>
          </TabsTrigger>

          <TabsTrigger value="skills" className="gap-1">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Compétences</span>
          </TabsTrigger>

          <TabsTrigger value="qualification" className="gap-1">
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Qualification</span>
          </TabsTrigger>

          <TabsTrigger value="preferences" className="gap-1">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Préférences</span>
          </TabsTrigger>

          <TabsTrigger value="notifications" className="gap-1">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>

          <TabsTrigger value="security" className="gap-1">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Sécurité</span>
          </TabsTrigger>

          <TabsTrigger value="privacy" className="gap-1">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Confidentialité</span>
          </TabsTrigger>
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
            {/* Onglet Informations Personnelles */}
            <TabsContent value="personal" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informations personnelles
                  </CardTitle>
                  <CardDescription>
                    Gérez vos informations de base et coordonnées
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input
                        id="firstName"
                        value={editingPersonal.firstName || ''}
                        onChange={(e) => setEditingPersonal(prev => ({ ...prev, firstName: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom</Label>
                      <Input
                        id="lastName"
                        value={editingPersonal.lastName || ''}
                        onChange={(e) => setEditingPersonal(prev => ({ ...prev, lastName: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editingPersonal.email || ''}
                      onChange={(e) => setEditingPersonal(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={editingPersonal.phone || ''}
                      onChange={(e) => setEditingPersonal(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{settings.personal.status}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {settings.personal.availabilityDate &&
                          `Disponible le ${new Date(settings.personal.availabilityDate).toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>

                  <Button onClick={handleSavePersonalInfo} className="gap-2">
                    <Save className="h-4 w-4" />
                    Enregistrer les modifications
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Professionnel */}
            <TabsContent value="professional" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Profil professionnel
                  </CardTitle>
                  <CardDescription>
                    Gérez votre métier, séniorité et tarification
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Métier et séniorité */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Poste / Fonction</h4>
                          <p className="text-sm text-muted-foreground">
                            {settings.professional.category && settings.professional.jobTitle ? (
                              `${settings.professional.category} - ${settings.professional.jobTitle}`
                            ) : (
                              <span className="text-orange-600">Métier non configuré</span>
                            )}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setIsEditJobModalOpen(true)}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          {settings.professional.profileId ? 'Modifier' : 'Configurer'}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Séniorité</h4>
                          <p className="text-sm text-muted-foreground capitalize">
                            {settings.professional.seniority ? (
                              settings.professional.seniority
                            ) : (
                              <span className="text-orange-600">Séniorité non définie</span>
                            )}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setIsEditSeniorityModalOpen(true)}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          {settings.professional.seniority ? 'Modifier' : 'Configurer'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Tarification */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Tarification
                    </h4>

                    {settings.professional.basePrice && settings.professional.seniority ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Tarif journalier brut</span>
                                <span className="text-lg font-semibold">
                                  {settings.professional.dailyRate}€
                                </span>
                              </div>
                              <div className="text-xs text-gray-400">
                                {settings.professional.basePrice}€/min × 480min
                                {settings.professional.seniority !== 'junior' &&
                                  ` × ${settings.professional.seniority === 'intermediate' ? '1.15' :
                                    settings.professional.seniority === 'confirmé' ? '1.3' :
                                    settings.professional.seniority === 'senior' ? '1.6' :
                                    settings.professional.seniority === 'expert' ? '2.0' : '1'}`}
                              </div>
                            </div>
                          </Card>

                          <Card className="p-4 border-primary-200 bg-primary-50 dark:bg-primary-950/20">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Avec expertises</span>
                                <span className="text-lg font-semibold text-primary-600">
                                  {calculateRateWithExpertise(
                                    settings.professional.dailyRate || 0,
                                    settings.skills.expertises.length,
                                    settings.skills.languages.length
                                  )}€
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                +5% par expertise ({settings.skills.expertises.length}) et langue ({settings.skills.languages.length})
                              </div>
                            </div>
                          </Card>
                        </div>

                        <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Info className="h-4 w-4 text-blue-600" />
                              Comment fonctionne votre tarification ?
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                            <p>
                              <strong>Tarif journalier brut :</strong> Calculé selon votre métier et séniorité (8h/jour).
                            </p>
                            <p>
                              <strong>Tarif avec expertises :</strong> +5% par compétence technique et langue parlée.
                              Valorise votre polyvalence.
                            </p>
                            <p className="text-xs italic">
                              Ces tarifs sont appliqués automatiquement selon les compétences demandées par le client.
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <div className="text-center p-6 border border-dashed border-gray-300 rounded-lg">
                        <Calculator className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-orange-600">
                          Configurez votre métier et séniorité pour voir vos tarifs
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Compétences */}
            <TabsContent value="skills" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Compétences et langues
                  </CardTitle>
                  <CardDescription>
                    Gérez vos expertises techniques et langues parlées
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Langues */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Langues parlées
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditLanguagesModalOpen(true)}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Modifier
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {settings.skills.languages.map((language) => (
                        <Badge key={language.id} variant="secondary" className="gap-1">
                          <Globe className="h-3 w-3" />
                          {language.languageName}
                          {language.certified && <Star className="h-3 w-3 text-yellow-500" />}
                        </Badge>
                      ))}
                      {settings.skills.languages.length === 0 && (
                        <span className="text-sm text-muted-foreground">Aucune langue renseignée</span>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Expertises */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Expertises techniques
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditExpertisesModalOpen(true)}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Modifier
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {settings.skills.expertises.map((expertise) => (
                        <Badge key={expertise.id} variant="secondary" className="gap-1">
                          <Code className="h-3 w-3" />
                          {expertise.expertiseName}
                          {expertise.certified && <Star className="h-3 w-3 text-yellow-500" />}
                        </Badge>
                      ))}
                      {settings.skills.expertises.length === 0 && (
                        <span className="text-sm text-muted-foreground">Aucune expertise renseignée</span>
                      )}
                    </div>
                  </div>

                  {/* Impact sur les tarifs */}
                  {(settings.skills.languages.length > 0 || settings.skills.expertises.length > 0) && (
                    <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                          <TrendingUp className="h-4 w-4" />
                          <span className="font-medium">Impact sur votre tarification</span>
                        </div>
                        <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                          +{((settings.skills.languages.length + settings.skills.expertises.length) * 5)}%
                          de bonus sur vos missions mobilisant toutes vos compétences
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Qualification */}
            <TabsContent value="qualification" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Résultats de qualification
                  </CardTitle>
                  <CardDescription>
                    Votre évaluation par l'IA et résultats détaillés
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {candidateId ? (
                    <QualificationResults candidateId={candidateId} />
                  ) : (
                    <p className="text-center text-muted-foreground">
                      Chargement des résultats...
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglets additionnels (Préférences, Notifications, etc.) */}
            <TabsContent value="preferences" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Préférences utilisateur
                  </CardTitle>
                  <CardDescription>
                    Personnalisez votre expérience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Thème</Label>
                      <select className="w-full p-2 border rounded-md">
                        <option value="system">Système</option>
                        <option value="light">Clair</option>
                        <option value="dark">Sombre</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Langue</Label>
                      <select className="w-full p-2 border rounded-md">
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="compact-mode" />
                    <Label htmlFor="compact-mode">Mode interface compacte</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="advanced-features" />
                    <Label htmlFor="advanced-features">Afficher les fonctionnalités avancées</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Paramètres de notifications
                  </CardTitle>
                  <CardDescription>
                    Gérez vos préférences de notification
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <h4 className="font-medium">Email</h4>

                    <div className="flex items-center space-x-2">
                      <Switch id="email-opportunities" defaultChecked />
                      <Label htmlFor="email-opportunities">Nouvelles opportunités de projet</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch id="email-updates" defaultChecked />
                      <Label htmlFor="email-updates">Mises à jour de projet</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch id="email-messages" defaultChecked />
                      <Label htmlFor="email-messages">Messages d'équipe</Label>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Push</h4>

                    <div className="flex items-center space-x-2">
                      <Switch id="push-enabled" defaultChecked />
                      <Label htmlFor="push-enabled">Activer les notifications push</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch id="push-urgent" defaultChecked />
                      <Label htmlFor="push-urgent">Messages urgents uniquement</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Sécurité du compte
                  </CardTitle>
                  <CardDescription>
                    Protégez votre compte avec des paramètres de sécurité avancés
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="two-factor" />
                    <Label htmlFor="two-factor">Authentification à deux facteurs</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="login-alerts" defaultChecked />
                    <Label htmlFor="login-alerts">Alertes de connexion</Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Délai d'expiration de session (minutes)</Label>
                    <Input type="number" defaultValue="60" min="5" max="480" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Confidentialité
                  </CardTitle>
                  <CardDescription>
                    Contrôlez la visibilité de vos données
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Visibilité du profil</Label>
                    <select className="w-full p-2 border rounded-md">
                      <option value="clients_only">Clients seulement</option>
                      <option value="verified_only">Clients vérifiés seulement</option>
                      <option value="public">Public</option>
                      <option value="private">Privé</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="show-rates" />
                    <Label htmlFor="show-rates">Afficher les tarifs publiquement</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="allow-analytics" defaultChecked />
                    <Label htmlFor="allow-analytics">Autoriser l'analyse des données</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>

      {/* Modales existantes pour compatibilité */}
      {settings.professional.profileId && candidateId && (
        <>
          <EditJobModal
            isOpen={isEditJobModalOpen}
            onClose={() => setIsEditJobModalOpen(false)}
            currentCandidateId={candidateId}
            currentProfileId={settings.professional.profileId}
            onUpdate={handleModalUpdate}
          />

          <EditLanguagesModal
            isOpen={isEditLanguagesModalOpen}
            onClose={() => setIsEditLanguagesModalOpen(false)}
            currentCandidateId={candidateId}
            onUpdate={handleModalUpdate}
          />

          <EditExpertisesModal
            isOpen={isEditExpertisesModalOpen}
            onClose={() => setIsEditExpertisesModalOpen(false)}
            currentCandidateId={candidateId}
            currentProfileId={settings.professional.profileId}
            onUpdate={handleModalUpdate}
          />

          <EditSeniorityModal
            isOpen={isEditSeniorityModalOpen}
            onClose={() => setIsEditSeniorityModalOpen(false)}
            currentCandidateId={candidateId}
            currentSeniority={settings.professional.seniority}
            onUpdate={handleModalUpdate}
          />
        </>
      )}

      {/* Dialog Export */}
      {showExportDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowExportDialog(false)}
        >
          <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Exporter les paramètres
              </CardTitle>
              <CardDescription>
                Téléchargez vos paramètres au format JSON
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                L'export contient toutes vos préférences, paramètres de sécurité et données de profil.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleExport} className="flex-1">
                  Télécharger
                </Button>
                <Button onClick={() => setShowExportDialog(false)} variant="outline" className="flex-1">
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Dialog Import */}
      {showImportDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowImportDialog(false)}
        >
          <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Importer des paramètres
              </CardTitle>
              <CardDescription>
                Restaurez vos paramètres depuis un fichier JSON
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
                <Button onClick={() => setShowImportDialog(false)} variant="outline" className="flex-1">
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

export default ModularCandidateSettingsView;