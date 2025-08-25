import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeniorityStep } from './SeniorityStep';
import { ProjectMatchingEngine, ProjectMatch } from '@/utils/projectMatching';
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { IallaLogo } from "@/components/IallaLogo";

interface OnboardingData {
  step: number;
  // Étape 2 - Métier
  selectedCategory?: string;
  selectedProfile?: string;
  // Étape 3 - Compétences  
  selectedExpertises: string[];
  customExpertises: string[];
  // Étape 4 - Langues
  selectedLanguages: string[];
  // Étape 5 - Séniorité
  seniority?: string;
  // Étape 6 - Facturation
  billingType?: 'company' | 'micro';
  companyName?: string;
  siret?: string;
  // Validation différée après l'onboarding
  suggestedProjects: any[];
}

interface CandidateOnboardingProps {
  candidateId: string;
  onComplete: (data?: any) => void;
  completeOnboarding: (data: any) => Promise<boolean>;
}

const CandidateOnboarding = ({ candidateId, onComplete, completeOnboarding }: CandidateOnboardingProps) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    step: 1,
    selectedCategory: '', // Initialize with empty string instead of undefined
    selectedProfile: '', // Initialize with empty string instead of undefined
    selectedExpertises: [],
    customExpertises: [],
    selectedLanguages: [],
    seniority: '',
    billingType: undefined, // Will be set to '' in BillingStep
    companyName: '',
    siret: '',
    suggestedProjects: []
  });

  // Data loading
  const [categories, setCategories] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [expertises, setExpertises] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);
  const [testQuestions, setTestQuestions] = useState<any[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);


  const loadInitialData = async () => {
    try {
      // Load categories, languages
      const [categoriesRes, languagesRes] = await Promise.all([
        supabase.from('hr_categories').select('*').order('name'),
        supabase.from('hr_languages').select('*').order('name')
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (languagesRes.data) setLanguages(languagesRes.data);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error("Erreur lors du chargement des données");
    }
  };

  const loadProfiles = async (categoryId: string) => {
    try {
      const { data: profilesData } = await supabase
        .from('hr_profiles')
        .select('*')
        .eq('category_id', categoryId)
        .order('name');
      
      if (profilesData) setProfiles(profilesData);
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const loadExpertises = async (categoryId: string) => {
    try {
      const { data: expertisesData } = await supabase
        .from('hr_expertises')
        .select('*')
        .eq('category_id', categoryId)
        .order('name');
      
      if (expertisesData) setExpertises(expertisesData);
    } catch (error) {
      console.error('Error loading expertises:', error);
    }
  };

  const nextStep = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const completeOnboardingData = async () => {
    setIsLoading(true);
    try {
      const success = await completeOnboarding(data);
      return success;
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error("Erreur lors de la finalisation de l'onboarding");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { number: 1, title: "Bienvenue", icon: Sparkles, color: "from-purple-500 to-pink-500" },
    { number: 2, title: "Métier", icon: Briefcase, color: "from-blue-500 to-cyan-500" },
    { number: 3, title: "Compétences", icon: Target, color: "from-green-500 to-emerald-500" },
    { number: 4, title: "Langues", icon: Globe, color: "from-yellow-500 to-orange-500" },
    { number: 5, title: "Séniorité", icon: Award, color: "from-purple-500 to-indigo-500" },
    { number: 6, title: "Facturation", icon: Receipt, color: "from-red-500 to-pink-500" }
  ];

  const currentStepData = steps[currentStep - 1];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep onNext={nextStep} />;
      case 2:
        return (
          <JobStep 
            categories={categories}
            profiles={profiles}
            selectedCategory={data.selectedCategory}
            selectedProfile={data.selectedProfile}
            onCategoryChange={(categoryId) => {
              updateData({ selectedCategory: categoryId });
              loadProfiles(categoryId);
              loadExpertises(categoryId);
            }}
            onProfileChange={(profileId) => updateData({ selectedProfile: profileId })}
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
            onSeniorityChange={(seniority) => updateData({ seniority })}
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
            onNext={async () => {
              // Terminer l'onboarding sans test
              const success = await completeOnboardingData();
              if (success) {
                onComplete(data);
              }
            }}
            onPrev={prevStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-green-50 overflow-auto">
      <div className="min-h-screen p-8 flex flex-col">
        {/* Header avec logo et progression */}
        <div className="w-full max-w-6xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <IallaLogo size="lg" />
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Configuration du profil
                </h2>
                <p className="text-sm text-gray-600">Bienvenue dans votre espace candidat</p>
              </div>
            </div>
            {/* Bouton pour fermer/skip (optionnel, mais désactivé pour les premières étapes) */}
            {currentStep > 5 && (
              <Button
                variant="ghost"
                onClick={onComplete}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
          
          {/* Stepper amélioré */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center gap-2">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div className={`relative transition-all duration-500 ${
                    step.number === currentStep ? 'scale-125' : ''
                  }`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold transition-all duration-300 ${
                      step.number <= currentStep 
                        ? `bg-gradient-to-r ${step.color} shadow-lg` 
                        : 'bg-gray-300'
                    }`}>
                      {step.number < currentStep ? (
                        <CheckCircle className="w-7 h-7" />
                      ) : (
                        <step.icon className="w-7 h-7" />
                      )}
                    </div>
                    {step.number === currentStep && (
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 animate-ping opacity-25" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`h-1 w-20 mx-2 rounded-full transition-all duration-500 ${
                      step.number < currentStep 
                        ? 'bg-gradient-to-r from-green-400 to-blue-400' 
                        : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Titre étape courante */}
          <div className="text-center mb-8">
            <h1 className={`text-4xl font-bold mb-3 bg-gradient-to-r ${currentStepData.color} bg-clip-text text-transparent`}>
              {currentStepData.title}
            </h1>
            <p className="text-lg text-gray-600">
              Étape {currentStep} sur {steps.length}
            </p>
          </div>
        </div>

        {/* Contenu de l'étape - Zone centrale */}
        <div className="flex-1 flex items-center justify-center pb-8">
          <Card className="w-full max-w-4xl bg-white/90 backdrop-blur-sm border-0 shadow-2xl rounded-3xl overflow-hidden">
            <CardContent className="p-10">
              {renderStepContent()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Composants pour chaque étape
const WelcomeStep = ({ onNext }: { onNext: () => void }) => {
  const { user } = useAuth();
  
  return (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto">
          <Sparkles className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Bienvenue chez Ialla !
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Bonjour {user?.firstName}, nous sommes ravis de vous accueillir dans notre communauté de talents.
        </p>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Nous allons maintenant configurer votre profil pour vous connecter aux meilleures opportunités qui correspondent à vos compétences.
        </p>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200/50">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-purple-900 mb-2">Ce que nous allons faire ensemble :</h3>
            <ul className="text-purple-700 space-y-1 text-sm">
              <li>• Définir votre métier et vos expertises</li>
              <li>• Configurer vos préférences linguistiques</li>
              <li>• Paramétrer votre système de facturation</li>
              <li>• Valider vos compétences par un test rapide</li>
              <li>• Découvrir les projets qui vous correspondent</li>
            </ul>
          </div>
        </div>
      </div>

      <Button 
        onClick={onNext} 
        size="lg"
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 px-8 py-3 text-lg"
      >
        Commencer mon profil
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
};

const JobStep = ({ 
  categories, 
  profiles, 
  selectedCategory, 
  selectedProfile, 
  onCategoryChange, 
  onProfileChange, 
  onNext, 
  onPrev 
}: any) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto">
          <Briefcase className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Quel est votre métier principal ?
        </h2>
        <p className="text-gray-600">
          Sélectionnez votre domaine d'expertise et votre poste spécifique
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Domaine d'activité</Label>
          <Select value={selectedCategory || ''} onValueChange={onCategoryChange}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Choisissez votre domaine" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category: any) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">Poste spécifique</Label>
          <Select value={selectedProfile || ''} onValueChange={onProfileChange} disabled={!selectedCategory}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Choisissez votre poste" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((profile: any) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Précédent
        </Button>
        <Button 
          onClick={onNext} 
          disabled={!selectedProfile}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
        >
          Suivant
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

const ExpertisesStep = ({ 
  expertises, 
  selectedExpertises, 
  customExpertises, 
  onExpertisesChange, 
  onCustomExpertisesChange, 
  onNext, 
  onPrev 
}: any) => {
  const [newExpertise, setNewExpertise] = useState("");

  const addCustomExpertise = () => {
    if (newExpertise.trim() && !customExpertises.includes(newExpertise.trim())) {
      onCustomExpertisesChange([...customExpertises, newExpertise.trim()]);
      setNewExpertise("");
    }
  };

  const toggleExpertise = (expertiseId: string) => {
    const newSelected = selectedExpertises.includes(expertiseId)
      ? selectedExpertises.filter((id: string) => id !== expertiseId)
      : [...selectedExpertises, expertiseId];
    onExpertisesChange(newSelected);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto">
          <Target className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
          Quelles sont vos compétences ?
        </h2>
        <p className="text-gray-600">
          Sélectionnez toutes les compétences que vous maîtrisez
        </p>
      </div>

      {/* Compétences prédéfinies */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Compétences disponibles</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {expertises.map((expertise: any) => (
            <div
              key={expertise.id}
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                selectedExpertises.includes(expertise.id)
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
              }`}
              onClick={() => toggleExpertise(expertise.id)}
            >
              <div className="flex items-center space-x-2">
                <Checkbox checked={selectedExpertises.includes(expertise.id)} readOnly />
                <span className="font-medium">{expertise.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compétences personnalisées */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Ajouter une compétence personnalisée</h3>
        <div className="flex gap-3">
          <Input
            value={newExpertise}
            onChange={(e) => setNewExpertise(e.target.value)}
            placeholder="Ex: React Native, Blockchain..."
            className="flex-1"
            onKeyPress={(e) => e.key === 'Enter' && addCustomExpertise()}
          />
          <Button onClick={addCustomExpertise} variant="outline">
            Ajouter
          </Button>
        </div>
        {customExpertises.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customExpertises.map((expertise: string, index: number) => (
              <Badge key={index} className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                {expertise}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Précédent
        </Button>
        <Button 
          onClick={onNext} 
          disabled={selectedExpertises.length === 0 && customExpertises.length === 0}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
        >
          Suivant
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

const LanguagesStep = ({ 
  languages, 
  selectedLanguages, 
  onLanguagesChange, 
  onNext, 
  onPrev 
}: any) => {
  const toggleLanguage = (languageId: string) => {
    const newSelected = selectedLanguages.includes(languageId)
      ? selectedLanguages.filter((id: string) => id !== languageId)
      : [...selectedLanguages, languageId];
    onLanguagesChange(newSelected);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto">
          <Globe className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
          Quelles langues parlez-vous ?
        </h2>
        <p className="text-gray-600">
          Sélectionnez toutes les langues que vous maîtrisez
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {languages.map((language: any) => (
          <div
            key={language.id}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
              selectedLanguages.includes(language.id)
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
            }`}
            onClick={() => toggleLanguage(language.id)}
          >
            <div className="flex items-center space-x-3">
              <Checkbox checked={selectedLanguages.includes(language.id)} readOnly />
              <span className="font-medium">{language.name}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Précédent
        </Button>
        <Button 
          onClick={onNext} 
          disabled={selectedLanguages.length === 0}
          className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
        >
          Suivant
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

const BillingStep = ({ 
  billingType, 
  companyName, 
  siret, 
  onBillingTypeChange, 
  onCompanyDataChange, 
  onNext, 
  onPrev 
}: any) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto">
          <Receipt className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
          Comment souhaitez-vous facturer ?
        </h2>
        <p className="text-gray-600">
          Choisissez votre mode de facturation préféré
        </p>
      </div>

      <RadioGroup value={billingType || ''} onValueChange={onBillingTypeChange} className="space-y-4">
        <div className="space-y-4">
          <div className={`p-6 rounded-2xl border-2 transition-all ${
            billingType === 'company' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
          }`}>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="company" id="company" />
              <div className="flex-1">
                <Label htmlFor="company" className="text-lg font-semibold cursor-pointer">
                  <Building className="w-5 h-5 inline mr-2" />
                  J'ai une entreprise
                </Label>
                <p className="text-gray-600 text-sm mt-1">
                  Vous avez déjà une société et pouvez émettre des factures
                </p>
              </div>
            </div>
            
            {billingType === 'company' && (
              <div className="mt-4 space-y-4">
                <div>
                  <Label className="text-sm font-medium">Nom de l'entreprise</Label>
                  <Input
                    value={companyName || ''}
                    onChange={(e) => onCompanyDataChange(e.target.value, siret)}
                    placeholder="Ex: Mon Entreprise SARL"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Numéro SIRET</Label>
                  <Input
                    value={siret || ''}
                    onChange={(e) => onCompanyDataChange(companyName, e.target.value)}
                    placeholder="Ex: 12345678901234"
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          <div className={`p-6 rounded-2xl border-2 transition-all ${
            billingType === 'micro' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
          }`}>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="micro" id="micro" />
              <div className="flex-1">
                <Label htmlFor="micro" className="text-lg font-semibold cursor-pointer">
                  <User className="w-5 h-5 inline mr-2" />
                  Je veux créer une micro-entreprise
                </Label>
                <p className="text-gray-600 text-sm mt-1">
                  Statut simplifié pour freelances et consultants
                </p>
              </div>
            </div>
            
            {billingType === 'micro' && (
              <div className="mt-4 p-4 bg-green-100 rounded-xl">
                <h4 className="font-semibold text-green-800 mb-2">📋 Étapes pour créer votre micro-entreprise :</h4>
                <ul className="text-green-700 text-sm space-y-1">
                  <li>1. Rendez-vous sur <strong>autoentrepreneur.urssaf.fr</strong></li>
                  <li>2. Créez votre compte et déclarez votre activité</li>
                  <li>3. Obtenez votre numéro SIRET (sous 15 jours)</li>
                  <li>4. Revenez ici pour finaliser votre profil</li>
                </ul>
                <p className="text-green-600 text-xs mt-2">
                  💡 La création est gratuite et entièrement en ligne
                </p>
              </div>
            )}
          </div>
        </div>
      </RadioGroup>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Précédent
        </Button>
        <Button 
          onClick={onNext} 
          disabled={!billingType || (billingType === 'company' && (!companyName || !siret))}
          className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
        >
          Suivant
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

const TestStep = ({ profileId, testAnswers, onAnswersChange, onNext, onPrev }: any) => {
  // Implémentation du test de compétences
  // Pour l'instant, on simule avec un test simple
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions] = useState([
    {
      id: 1,
      question: "Quel est votre niveau d'expérience dans votre domaine ?",
      options: ["Débutant (< 1 an)", "Intermédiaire (1-3 ans)", "Expérimenté (3-5 ans)", "Expert (> 5 ans)"],
      correct: 3
    },
    {
      id: 2, 
      question: "Comment évaluez-vous votre capacité d'adaptation ?",
      options: ["Limitée", "Correcte", "Bonne", "Excellente"],
      correct: 3
    }
  ]);

  const handleAnswer = (questionId: number, answerIndex: number) => {
    const newAnswers = { ...testAnswers, [questionId]: answerIndex };
    const score = Object.entries(newAnswers).reduce((acc, [qId, answer]) => {
      const question = questions.find(q => q.id === parseInt(qId));
      return acc + (question && answer === question.correct ? 1 : 0);
    }, 0);
    
    onAnswersChange(newAnswers, score);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Test de compétences
        </h2>
        <p className="text-gray-600">
          Quelques questions pour valider votre profil
        </p>
      </div>

      <div className="space-y-6">
        {questions.map((question, index) => (
          <Card key={question.id} className="p-6">
            <h3 className="font-semibold mb-4">
              {index + 1}. {question.question}
            </h3>
            <div className="space-y-3">
              {question.options.map((option, optionIndex) => (
                <div
                  key={optionIndex}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    testAnswers[question.id] === optionIndex
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                  onClick={() => handleAnswer(question.id, optionIndex)}
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem 
                      value={optionIndex.toString()} 
                      checked={testAnswers[question.id] === optionIndex}
                      readOnly
                    />
                    <span>{option}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Précédent
        </Button>
        <Button 
          onClick={onNext} 
          disabled={Object.keys(testAnswers).length < questions.length}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        >
          Terminer le test
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

const ValidationStep = ({ testScore, qualificationStatus, onStatusChange, onNext, onPrev }: any) => {
  useEffect(() => {
    // Logique de validation automatique basée sur le score
    if (testScore !== undefined) {
      if (testScore >= 2) {
        onStatusChange('qualified');
      } else if (testScore >= 1) {
        onStatusChange('pending');
      } else {
        onStatusChange('rejected');
      }
    }
  }, [testScore]);

  const getStatusContent = () => {
    switch (qualificationStatus) {
      case 'qualified':
        return {
          icon: CheckCircle,
          color: 'from-green-500 to-emerald-500',
          title: 'Félicitations ! Vous êtes qualifié',
          message: 'Votre profil a été validé avec succès. Vous pouvez maintenant recevoir des propositions de mission.',
          bgColor: 'from-green-50 to-emerald-50',
          borderColor: 'border-green-200'
        };
      case 'pending':
        return {
          icon: Award,
          color: 'from-yellow-500 to-orange-500', 
          title: 'Profil en cours de validation',
          message: 'Votre profil nécessite une validation manuelle. Nous reviendrons vers vous sous 48h.',
          bgColor: 'from-yellow-50 to-orange-50',
          borderColor: 'border-yellow-200'
        };
      case 'rejected':
        return {
          icon: X,
          color: 'from-red-500 to-pink-500',
          title: 'Profil non validé',
          message: 'Votre profil ne correspond pas aux critères actuels. Vous pourrez repasser le test dans 30 jours.',
          bgColor: 'from-red-50 to-pink-50',
          borderColor: 'border-red-200'
        };
      default:
        return null;
    }
  };

  const statusContent = getStatusContent();
  if (!statusContent) return null;

  const { icon: StatusIcon, color, title, message, bgColor, borderColor } = statusContent;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className={`w-16 h-16 bg-gradient-to-r ${color} rounded-full flex items-center justify-center mx-auto`}>
          <StatusIcon className="w-8 h-8 text-white" />
        </div>
        <h2 className={`text-2xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
          Résultat de votre évaluation
        </h2>
      </div>

      <Card className={`p-8 bg-gradient-to-r ${bgColor} border-2 ${borderColor}`}>
        <div className="text-center space-y-4">
          <h3 className="text-xl font-bold">{title}</h3>
          <p className="text-gray-700">{message}</p>
          
          {testScore !== undefined && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                Score obtenu : {testScore}/2
              </p>
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Précédent
        </Button>
        <Button 
          onClick={onNext}
          className={`bg-gradient-to-r ${color} hover:opacity-90`}
        >
          {qualificationStatus === 'qualified' ? 'Voir les projets' : 'Terminer'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

const ProjectsStep = ({ 
  candidateId, 
  profileId, 
  expertises, 
  suggestedProjects, 
  onProjectsLoaded, 
  onComplete, 
  onPrev 
}: any) => {
  const [isLoading, setIsLoading] = useState(false);
  const [projectMatches, setProjectMatches] = useState<ProjectMatch[]>([]);
  const [improvementSuggestions, setImprovementSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (candidateId && profileId && expertises.length > 0) {
      loadSuggestedProjects();
    }
  }, [candidateId, profileId, expertises]);

  const loadSuggestedProjects = async () => {
    setIsLoading(true);
    try {
      // Utiliser le moteur de matching amélioré
      const candidateSkills = await ProjectMatchingEngine.getCandidateSkills(candidateId);
      
      if (candidateSkills) {
        const matches = await ProjectMatchingEngine.findMatchingProjects(candidateId, candidateSkills, 8);
        const suggestions = ProjectMatchingEngine.generateImprovementSuggestions(candidateSkills, matches);
        
        setProjectMatches(matches);
        setImprovementSuggestions(suggestions);
        onProjectsLoaded(matches);
      }
    } catch (error) {
      console.error('Error loading suggested projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto">
          <FolderOpen className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          Projets qui vous correspondent
        </h2>
        <p className="text-gray-600">
          Basé sur votre profil et vos compétences, voici les projets qui pourraient vous intéresser
        </p>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Recherche de projets correspondants...</p>
        </div>
      )}

      {!isLoading && projectMatches.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">✨ Projets recommandés ({projectMatches.length})</h3>
          
          {projectMatches.map((project, index) => (
            <Card key={project.id} className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{project.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                    {project.client_name && (
                      <p className="text-xs text-gray-500 mt-1">Client: {project.client_name}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      Score: {project.match_score}%
                    </Badge>
                    {project.client_budget && (
                      <p className="text-sm text-green-600 font-medium mt-1">
                        {project.client_budget.toLocaleString()}€
                      </p>
                    )}
                  </div>
                </div>
                
                {project.match_reasons.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Pourquoi ce projet vous correspond :</p>
                    <div className="flex flex-wrap gap-1">
                      {project.match_reasons.map((reason, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {project.required_expertises.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Compétences requises :</p>
                    <div className="flex flex-wrap gap-1">
                      {project.required_expertises.map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>📅 {new Date(project.project_date).toLocaleDateString()}</span>
                  <span className="capitalize">🔄 {project.status}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && projectMatches.length === 0 && (
        <div className="text-center py-8 space-y-4">
          <div className="text-gray-400">
            <FolderOpen className="w-12 h-12 mx-auto mb-3" />
            <p>Aucun projet correspondant pour le moment</p>
            <p className="text-sm">De nouveaux projets sont ajoutés régulièrement !</p>
          </div>
        </div>
      )}

      {improvementSuggestions.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h4 className="font-semibold text-blue-800 mb-2">💡 Conseils pour plus d'opportunités</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              {improvementSuggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span>•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Précédent
        </Button>
        <Button 
          onClick={onComplete}
          className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
        >
          Accéder à mon tableau de bord
          <CheckCircle className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default CandidateOnboarding;