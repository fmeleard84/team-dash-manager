/**
 * Module ONBOARDING - Composant ModularCandidateOnboarding
 *
 * Composant principal d'onboarding des candidats.
 * Basé sur la logique métier existante de CandidateOnboarding.tsx.
 *
 * Fonctionnalités:
 * - Processus d'onboarding en 6 étapes guidées
 * - Interface moderne avec stepper visuel et progression
 * - Validation de chaque étape avec feedback utilisateur
 * - Sauvegarde automatique et persistance des données
 * - Intégration avec le système de qualification IA
 * - Matching de projets en temps réel
 * - Design glassmorphism avec animations fluides
 * - Responsive et accessible
 * - Compatibilité totale avec le code existant
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/ui/components/card';
import { Button } from '@/ui/components/button';
import { Input } from '@/ui/components/input';
import { Label } from '@/ui/components/label';
import { Badge } from '@/ui/components/badge';
import { Textarea } from '@/ui/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/components/select';
import { Checkbox } from '@/ui/components/checkbox';
import { RadioGroup, RadioGroupItem } from '@/ui/components/radio-group';
import {
  Sparkles,
  Briefcase,
  Target,
  Globe,
  Receipt,
  GraduationCap,
  CheckCircle,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  User,
  Building,
  FileText,
  Award,
  X,
  MapPin,
  Calendar,
  Star,
  Clock,
  TrendingUp,
  Zap,
  Users,
  Eye,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { SeniorityStep } from './SeniorityStep';
import { CompactSiretVerification } from './CompactSiretVerification';
import { ProjectMatchingEngine, ProjectMatch } from '@/utils/projectMatching';

import { useOnboarding } from '../hooks';
import type {
  ModularCandidateOnboardingProps,
  OnboardingStep,
  OnboardingData,
  HRCategory,
  HRProfile,
  HRExpertise,
  HRLanguage,
  BillingType,
  SeniorityLevel
} from '../types';

// ==========================================
// CONFIGURATION DES ÉTAPES
// ==========================================

const STEP_CONFIG = [
  { number: 1, title: "Bienvenue", icon: Sparkles, color: "from-purple-500 to-pink-500" },
  { number: 2, title: "Métier", icon: Briefcase, color: "from-blue-500 to-cyan-500" },
  { number: 3, title: "Compétences", icon: Target, color: "from-green-500 to-emerald-500" },
  { number: 4, title: "Langues", icon: Globe, color: "from-yellow-500 to-orange-500" },
  { number: 5, title: "Séniorité", icon: Award, color: "from-purple-500 to-indigo-500" },
  { number: 6, title: "Facturation", icon: Receipt, color: "from-red-500 to-pink-500" }
];

// ==========================================
// COMPOSANTS D'ÉTAPE
// ==========================================

/**
 * Étape 1 : Bienvenue
 */
const WelcomeStep: React.FC<{ candidateName?: string; onNext: () => void }> = ({ candidateName, onNext }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-8"
    >
      <div className="space-y-4">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto"
        >
          <Sparkles className="w-12 h-12 text-white" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
        >
          Bienvenue chez Ialla !
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xl text-muted-foreground max-w-2xl mx-auto"
        >
          Bonjour {candidateName}, nous sommes ravis de vous accueillir dans notre communauté de talents.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-lg text-muted-foreground max-w-2xl mx-auto"
        >
          Nous allons maintenant configurer votre profil pour vous connecter aux meilleures opportunités qui correspondent à vos compétences.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
        className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-2xl p-6 border border-purple-200/50 dark:border-purple-800/50"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-purple-900 dark:text-purple-100 mb-2">Ce que nous allons faire ensemble :</h3>
            <ul className="text-muted-foreground space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Définir votre métier et vos expertises
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Configurer vos préférences linguistiques
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Paramétrer votre système de facturation
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Découvrir les projets qui vous correspondent
              </li>
            </ul>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <Button
          onClick={onNext}
          size="lg"
          className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300"
        >
          Commencer mon profil
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </motion.div>
    </motion.div>
  );
};

/**
 * Étape 2 : Métier
 */
const JobStep: React.FC<{
  categories: HRCategory[];
  profiles: HRProfile[];
  selectedCategory?: string;
  selectedProfile?: string;
  onCategoryChange: (categoryId: string) => void;
  onProfileChange: (profileId: string) => void;
  onNext: () => void;
  onPrev: () => void;
}> = ({
  categories,
  profiles,
  selectedCategory,
  selectedProfile,
  onCategoryChange,
  onProfileChange,
  onNext,
  onPrev
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Briefcase className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
          Quel est votre métier principal ?
        </h3>
        <p className="text-muted-foreground">
          Sélectionnez votre domaine d'expertise et votre poste spécifique
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <Label className="text-sm font-semibold text-foreground">Domaine d'activité</Label>
          <Select value={selectedCategory || ''} onValueChange={onCategoryChange}>
            <SelectTrigger className="h-12 border-2 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <SelectValue placeholder="Choisissez votre domaine" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <Label className="text-sm font-semibold text-foreground">Poste spécifique</Label>
          <Select value={selectedProfile || ''} onValueChange={onProfileChange} disabled={!selectedCategory}>
            <SelectTrigger className="h-12 border-2 hover:border-cyan-300 dark:hover:border-cyan-700 transition-colors">
              <SelectValue placeholder="Choisissez votre poste" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrev} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Précédent
        </Button>
        <Button
          onClick={onNext}
          disabled={!selectedProfile}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50"
        >
          Suivant
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

/**
 * Étape 3 : Compétences
 */
const ExpertisesStep: React.FC<{
  expertises: HRExpertise[];
  selectedExpertises: string[];
  customExpertises: string[];
  onExpertisesChange: (expertises: string[]) => void;
  onCustomExpertisesChange: (customs: string[]) => void;
  onNext: () => void;
  onPrev: () => void;
}> = ({
  expertises,
  selectedExpertises,
  customExpertises,
  onExpertisesChange,
  onCustomExpertisesChange,
  onNext,
  onPrev
}) => {
  const [newExpertise, setNewExpertise] = useState("");

  const addCustomExpertise = () => {
    if (newExpertise.trim() && !customExpertises.includes(newExpertise.trim())) {
      onCustomExpertisesChange([...customExpertises, newExpertise.trim()]);
      setNewExpertise("");
    }
  };

  const removeCustomExpertise = (index: number) => {
    onCustomExpertisesChange(customExpertises.filter((_, i) => i !== index));
  };

  const toggleExpertise = (expertiseId: string) => {
    const newSelected = selectedExpertises.includes(expertiseId)
      ? selectedExpertises.filter(id => id !== expertiseId)
      : [...selectedExpertises, expertiseId];
    onExpertisesChange(newSelected);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto">
          <Target className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
          Quelles sont vos compétences ?
        </h2>
        <p className="text-muted-foreground">
          Sélectionnez toutes les compétences que vous maîtrisez
        </p>
      </div>

      {/* Compétences prédéfinies */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Compétences disponibles
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {expertises.map((expertise) => (
              <motion.div
                key={expertise.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  selectedExpertises.includes(expertise.id)
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 shadow-lg shadow-green-500/20'
                    : 'border-border hover:border-green-300 dark:hover:border-green-700 hover:bg-green-50/50 dark:hover:bg-green-950/20'
                }`}
                onClick={() => toggleExpertise(expertise.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center space-x-3">
                  <Checkbox checked={selectedExpertises.includes(expertise.id)} readOnly />
                  <div>
                    <span className="font-medium block">{expertise.name}</span>
                    {expertise.description && (
                      <span className="text-xs text-muted-foreground">{expertise.description}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Compétences personnalisées */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Ajouter une compétence personnalisée
        </h3>
        <div className="flex gap-3">
          <Input
            value={newExpertise}
            onChange={(e) => setNewExpertise(e.target.value)}
            placeholder="Ex: React Native, Blockchain..."
            className="flex-1"
            onKeyPress={(e) => e.key === 'Enter' && addCustomExpertise()}
          />
          <Button onClick={addCustomExpertise} variant="outline" className="px-6">
            <Zap className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>

        {customExpertises.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex flex-wrap gap-2 pt-2"
          >
            <AnimatePresence>
              {customExpertises.map((expertise, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {expertise}
                  <button
                    onClick={() => removeCustomExpertise(index)}
                    className="hover:bg-white/20 rounded-full p-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrev} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Précédent
        </Button>
        <Button
          onClick={onNext}
          disabled={selectedExpertises.length === 0 && customExpertises.length === 0}
          className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
        >
          Suivant
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

/**
 * Étape 4 : Langues
 */
const LanguagesStep: React.FC<{
  languages: HRLanguage[];
  selectedLanguages: string[];
  onLanguagesChange: (languages: string[]) => void;
  onNext: () => void;
  onPrev: () => void;
}> = ({ languages, selectedLanguages, onLanguagesChange, onNext, onPrev }) => {
  const toggleLanguage = (languageId: string) => {
    const newSelected = selectedLanguages.includes(languageId)
      ? selectedLanguages.filter(id => id !== languageId)
      : [...selectedLanguages, languageId];
    onLanguagesChange(newSelected);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Globe className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-2">
          Quelles langues parlez-vous ?
        </h3>
        <p className="text-muted-foreground">
          Sélectionnez toutes les langues que vous maîtrisez
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        <AnimatePresence>
          {languages.map((language) => (
            <motion.div
              key={language.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                selectedLanguages.includes(language.id)
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 shadow-lg shadow-orange-500/20'
                  : 'border-border hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-950/20'
              }`}
              onClick={() => toggleLanguage(language.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center space-x-3">
                <Checkbox checked={selectedLanguages.includes(language.id)} readOnly />
                <div className="flex items-center gap-2">
                  {language.flag && <span className="text-lg">{language.flag}</span>}
                  <span className="font-medium">{language.name}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrev} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Précédent
        </Button>
        <Button
          onClick={onNext}
          disabled={selectedLanguages.length === 0}
          className="flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
        >
          Suivant
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

/**
 * Étape 6 : Facturation
 */
const BillingStep: React.FC<{
  billingType?: BillingType;
  companyName?: string;
  siret?: string;
  onBillingTypeChange: (type: BillingType) => void;
  onCompanyDataChange: (name: string, siret: string) => void;
  onComplete: () => Promise<void>;
  onPrev: () => void;
}> = ({ billingType, companyName, siret, onBillingTypeChange, onCompanyDataChange, onComplete, onPrev }) => {
  const [siretValid, setSiretValid] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await onComplete();
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Receipt className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-2">
          Comment souhaitez-vous facturer ?
        </h3>
        <p className="text-muted-foreground">
          Choisissez votre mode de facturation préféré
        </p>
      </div>

      <RadioGroup value={billingType || ''} onValueChange={onBillingTypeChange} className="space-y-4">
        <motion.label
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          htmlFor="company"
          className={`block p-6 rounded-xl border-2 transition-all cursor-pointer ${
            billingType === 'company'
              ? 'border-red-500 bg-red-50 dark:bg-red-950/30 shadow-lg shadow-red-500/20'
              : 'border-border hover:border-red-300 dark:hover:border-red-700'
          }`}
        >
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="company" id="company" />
            <div className="flex-1">
              <span className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Building className="w-5 h-5" />
                J'ai une entreprise
              </span>
              <p className="text-muted-foreground text-sm mt-1">
                Vous avez déjà une société et pouvez émettre des factures
              </p>
            </div>
          </div>
        </motion.label>

        {billingType === 'company' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 border-t border-border pt-6"
          >
            <CompactSiretVerification
              siret={siret || ''}
              companyName={companyName || ''}
              onSiretChange={(value) => onCompanyDataChange(companyName || '', value)}
              onCompanyNameChange={(value) => onCompanyDataChange(value, siret || '')}
              onValidation={(isValid) => setSiretValid(isValid)}
              required={true}
            />
          </motion.div>
        )}

        <motion.label
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          htmlFor="micro"
          className={`block p-6 rounded-xl border-2 transition-all cursor-pointer ${
            billingType === 'micro'
              ? 'border-red-500 bg-red-50 dark:bg-red-950/30 shadow-lg shadow-red-500/20'
              : 'border-border hover:border-red-300 dark:hover:border-red-700'
          }`}
        >
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="micro" id="micro" />
            <div className="flex-1">
              <span className="text-lg font-semibold text-foreground flex items-center gap-2">
                <User className="w-5 h-5" />
                Je veux créer une micro-entreprise
              </span>
              <p className="text-muted-foreground text-sm mt-1">
                Statut simplifié pour freelances et consultants
              </p>
            </div>
          </div>
        </motion.label>

        {billingType === 'micro' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800"
          >
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Étapes pour créer votre micro-entreprise :
            </h4>
            <ul className="text-blue-700 dark:text-blue-300 text-sm space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3" />
                Rendez-vous sur <strong>autoentrepreneur.urssaf.fr</strong>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3" />
                Créez votre compte et déclarez votre activité
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3" />
                Obtenez votre numéro SIRET (sous 15 jours)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3" />
                Revenez ici pour finaliser votre profil
              </li>
            </ul>
            <p className="text-blue-600 dark:text-blue-400 text-xs mt-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              La création est gratuite et entièrement en ligne
            </p>
          </motion.div>
        )}
      </RadioGroup>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrev} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Précédent
        </Button>
        <Button
          onClick={handleComplete}
          disabled={
            !billingType ||
            (billingType === 'company' && !siretValid) ||
            isCompleting
          }
          className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 disabled:opacity-50"
        >
          {isCompleting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Finalisation...
            </>
          ) : (
            <>
              Terminer l'onboarding
              <CheckCircle className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================

export const ModularCandidateOnboarding: React.FC<ModularCandidateOnboardingProps> = ({
  candidateId: propsCandidateId,
  initialStep = 1,
  onComplete,
  onStepChange,
  skipTests = false,
  showProjects = true,
  className = ''
}) => {
  const {
    candidateProfile,
    needsOnboarding,
    isLoading,
    currentStep,
    data,
    categories,
    profiles,
    expertises,
    languages,
    updateData,
    nextStep,
    prevStep,
    handleCategoryChange,
    handleProfileChange,
    completeOnboarding
  } = useOnboarding({
    candidateId: propsCandidateId,
    initialStep,
    autoSave: true
  });

  const currentStepData = useMemo(() => {
    return STEP_CONFIG.find(s => s.number === currentStep) || STEP_CONFIG[0];
  }, [currentStep]);

  /**
   * Termine l'onboarding avec les données collectées
   */
  const handleComplete = useCallback(async () => {
    const success = await completeOnboarding(data);
    if (success && onComplete) {
      onComplete(data);
    }
  }, [completeOnboarding, data, onComplete]);

  /**
   * Gère le changement d'étape
   */
  const handleStepChange = useCallback((step: OnboardingStep) => {
    if (onStepChange) {
      onStepChange(step);
    }
  }, [onStepChange]);

  // Effet pour notifier les changements d'étape
  React.useEffect(() => {
    handleStepChange(currentStep);
  }, [currentStep, handleStepChange]);

  /**
   * Rendu du contenu selon l'étape courante
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <WelcomeStep
            candidateName={candidateProfile?.first_name}
            onNext={nextStep}
          />
        );

      case 2:
        return (
          <JobStep
            categories={categories}
            profiles={profiles}
            selectedCategory={data.selectedCategory}
            selectedProfile={data.selectedProfile}
            onCategoryChange={handleCategoryChange}
            onProfileChange={handleProfileChange}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );

      case 3:
        return (
          <ExpertisesStep
            expertises={expertises}
            selectedExpertises={data.selectedExpertises}
            customExpertises={data.customExpertises}
            onExpertisesChange={(expertises) => updateData({ selectedExpertises: expertises })}
            onCustomExpertisesChange={(custom) => updateData({ customExpertises: custom })}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );

      case 4:
        return (
          <LanguagesStep
            languages={languages}
            selectedLanguages={data.selectedLanguages}
            onLanguagesChange={(languages) => updateData({ selectedLanguages: languages })}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );

      case 5:
        return (
          <SeniorityStep
            seniority={data.seniority || ''}
            onSeniorityChange={(seniority) => updateData({ seniority: seniority as SeniorityLevel })}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );

      case 6:
        return (
          <BillingStep
            billingType={data.billingType}
            companyName={data.companyName}
            siret={data.siret}
            onBillingTypeChange={(type) => updateData({ billingType: type })}
            onCompanyDataChange={(name, siret) => updateData({ companyName: name, siret })}
            onComplete={handleComplete}
            onPrev={prevStep}
          />
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full"
        />
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-background ${className}`}>
      <div className="h-full flex flex-col">
        {/* Header avec stepper progressif */}
        <div className="bg-card/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2">
                {STEP_CONFIG.map((step, index) => (
                  <div key={step.number} className="flex items-center">
                    <motion.div
                      className={`relative transition-all duration-300 ${
                        step.number === currentStep ? 'scale-110' : ''
                      }`}
                      whileHover={{ scale: step.number <= currentStep ? 1.1 : 1 }}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                        step.number <= currentStep
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {step.number < currentStep ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <step.icon className="w-5 h-5" />
                        )}
                      </div>

                      {step.number === currentStep && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -inset-1 bg-primary/20 rounded-full -z-10"
                        />
                      )}
                    </motion.div>

                    {index < STEP_CONFIG.length - 1 && (
                      <div className={`h-0.5 w-8 mx-1 transition-all duration-300 ${
                        step.number < currentStep
                          ? 'bg-primary'
                          : 'bg-muted'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Titre et progression */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mt-4"
            >
              <h1 className="text-xl font-semibold text-foreground">
                {currentStepData.title}
              </h1>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-sm text-muted-foreground">
                  Étape {currentStep} sur {STEP_CONFIG.length}
                </span>
                <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentStep / STEP_CONFIG.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-gradient-to-r from-primary to-secondary"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Contenu de l'étape */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-background to-muted/20">
          <div className="max-w-4xl mx-auto p-6">
            <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-xl">
              <CardContent className="p-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {renderStepContent()}
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModularCandidateOnboarding;