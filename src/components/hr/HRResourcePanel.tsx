import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/Card';
import { X, TrendingUp, Globe, Code, Info, AlertCircle, Euro, Users, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Language {
  id: string;
  name: string;
  code: string;
  cost_percentage: number;
}

interface Expertise {
  id: string;
  name: string;
  category_id: string;
  cost_percentage: number;
}

interface HRResource {
  id: string;
  profile_id: string;
  seniority: 'junior' | 'intermediate' | 'senior';
  languages: string[];
  expertises: string[];
  calculated_price: number;
  languageNames?: string[];
  expertiseNames?: string[];
  is_ai?: boolean;
  is_team_member?: boolean;
  description?: string;
  profileName?: string;
}

interface HRResourcePanelProps {
  selectedResource: HRResource | null;
  onResourceUpdate: (resource: HRResource) => void;
  onResourceDelete?: () => void;
}

const HRResourcePanel = ({ selectedResource, onResourceUpdate, onResourceDelete }: HRResourcePanelProps) => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [expertises, setExpertises] = useState<Expertise[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedExpertises, setSelectedExpertises] = useState<string[]>([]);
  const [seniority, setSeniority] = useState<'junior' | 'intermediate' | 'senior'>('junior');
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchLanguages();
  }, []);
  
  useEffect(() => {
    fetchExpertises();
  }, [selectedResource?.profile_id]); // Re-fetch when profile changes

  // État pour tracker l'ID de la ressource précédente
  const [previousResourceId, setPreviousResourceId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedResource) {
      // Si on change de ressource (différent ID)
      if (previousResourceId !== selectedResource.id) {
        setPreviousResourceId(selectedResource.id);
        
        // Pour les ressources IA, toujours garder toutes les langues
        if (selectedResource.is_ai) {
          // Charger toutes les langues pour les IA
          supabase
            .from('hr_languages')
            .select('id')
            .then(({ data: allLanguages }) => {
              if (allLanguages) {
                const allLanguageIds = allLanguages.map(lang => lang.id);
                setSelectedLanguages(allLanguageIds);
                // Mettre à jour la ressource avec toutes les langues
                if (selectedResource.languages.length === 0) {
                  const updatedResource = {
                    ...selectedResource,
                    languages: allLanguageIds
                  };
                  onResourceUpdate(updatedResource);
                }
              }
            });
          setSelectedExpertises([]);
        } else {
          // Pour les ressources humaines, comportement normal
          const hasLanguages = selectedResource.languages && selectedResource.languages.length > 0;
          const hasExpertises = selectedResource.expertises && selectedResource.expertises.length > 0;
          
          if (!hasLanguages && !hasExpertises) {
            setSelectedLanguages([]);
            setSelectedExpertises([]);
          } else {
            setSelectedLanguages(selectedResource.languages || []);
            setSelectedExpertises(selectedResource.expertises || []);
          }
        }
        
        // La séniorité reste toujours sur la valeur actuelle (junior par défaut pour nouvelles cartes)
        setSeniority(selectedResource.seniority);
        setCalculatedPrice(selectedResource.calculated_price || 0);
      }
    }
  }, [selectedResource, previousResourceId, onResourceUpdate]);

  const fetchLanguages = async () => {
    const { data, error } = await supabase
      .from('hr_languages')
      .select('*, cost_percentage')
      .order('name');
    
    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les langues.",
        variant: "destructive",
      });
    } else {
      setLanguages(data || []);
    }
  };

  const fetchExpertises = async () => {
    // Skip for team members
    if (selectedResource?.is_team_member) {
      setExpertises([]);
      return;
    }
    
    if (!selectedResource?.profile_id) {
      // Fallback: show all expertises if no profile selected
      const { data, error } = await supabase
        .from('hr_expertises')
        .select('*, cost_percentage')
        .order('name');
      
      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les expertises.",
          variant: "destructive",
        });
      } else {
        setExpertises(data || []);
      }
      return;
    }

    // Skip API call for team members (they use team-XXX format)
    if (selectedResource.profile_id.startsWith('team-')) {
      setExpertises([]);
      return;
    }
    
    // Fetch only expertises linked to this profile
    const { data, error } = await supabase
      .from('hr_profile_expertises')
      .select(`
        expertise_id,
        hr_expertises!inner (
          id,
          name,
          category_id,
          cost_percentage
        )
      `)
      .eq('profile_id', selectedResource.profile_id);
    
    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les expertises pour ce métier.",
        variant: "destructive",
      });
    } else {
      const profileExpertises = data?.map(pe => pe.hr_expertises) || [];
      setExpertises(profileExpertises);
    }
  };

  const calculatePrice = useCallback(async () => {
    if (!selectedResource) return;
    
    // For team members, use the calculated price directly
    if (selectedResource.is_team_member || selectedResource.profile_id.startsWith('team-')) {
      setCalculatedPrice(selectedResource.calculated_price || 0);
      return;
    }
    
    // Get base price from the profile
    const { data: profile } = await supabase
      .from('hr_profiles')
      .select('base_price')
      .eq('id', selectedResource.profile_id)
      .single();
    
    const basePrice = profile?.base_price || 50;
    
    // Seniority multiplier
    const seniorityMultiplier = {
      junior: 1,
      intermediate: 1.5,
      senior: 2
    };
    
    // Calculate language bonus based on actual percentages
    let languageBonus = 0;
    if (selectedLanguages.length > 0) {
      const { data: languageData } = await supabase
        .from('hr_languages')
        .select('cost_percentage')
        .in('id', selectedLanguages);
      
      if (languageData) {
        languageBonus = languageData.reduce((sum, lang) => sum + (lang.cost_percentage / 100), 0);
      }
    }
    
    // Calculate expertise bonus based on actual percentages
    let expertiseBonus = 0;
    if (selectedExpertises.length > 0) {
      const { data: expertiseData } = await supabase
        .from('hr_expertises')
        .select('cost_percentage')
        .in('id', selectedExpertises);
      
      if (expertiseData) {
        expertiseBonus = expertiseData.reduce((sum, exp) => sum + (exp.cost_percentage / 100), 0);
      }
    }
    
    const finalPrice = basePrice * seniorityMultiplier[seniority] * (1 + languageBonus + expertiseBonus);
    
    setCalculatedPrice(Math.round(finalPrice * 100) / 100);
  }, [selectedLanguages, selectedExpertises, seniority, selectedResource]);

  useEffect(() => {
    if (selectedResource) {
      calculatePrice();
    }
  }, [calculatePrice, selectedResource]);

  const calculatePriceSync = async (
    languages: string[], 
    expertises: string[], 
    seniorityLevel: 'junior' | 'intermediate' | 'senior'
  ) => {
    if (!selectedResource) return 0;
    
    // For team members, return the calculated price directly
    if (selectedResource.is_team_member || selectedResource.profile_id.startsWith('team-')) {
      return selectedResource.calculated_price || 0;
    }
    
    // Get base price from the profile
    const { data: profile } = await supabase
      .from('hr_profiles')
      .select('base_price')
      .eq('id', selectedResource.profile_id)
      .single();
    
    const basePrice = profile?.base_price || 50;
    
    // Seniority multiplier
    const seniorityMultiplier = {
      junior: 1,
      intermediate: 1.5,
      senior: 2
    };
    
    // Calculate language bonus based on actual percentages
    let languageBonus = 0;
    if (languages.length > 0) {
      const { data: languageData } = await supabase
        .from('hr_languages')
        .select('cost_percentage')
        .in('id', languages);
      
      if (languageData) {
        languageBonus = languageData.reduce((sum, lang) => sum + (lang.cost_percentage / 100), 0);
      }
    }
    
    // Calculate expertise bonus based on actual percentages
    let expertiseBonus = 0;
    if (expertises.length > 0) {
      const { data: expertiseData } = await supabase
        .from('hr_expertises')
        .select('cost_percentage')
        .in('id', expertises);
      
      if (expertiseData) {
        expertiseBonus = expertiseData.reduce((sum, exp) => sum + (exp.cost_percentage / 100), 0);
      }
    }
    
    const finalPrice = basePrice * seniorityMultiplier[seniorityLevel] * (1 + languageBonus + expertiseBonus);
    
    return Math.round(finalPrice * 100) / 100;
  };

  const addLanguage = async (languageId: string) => {
    if (!selectedLanguages.includes(languageId)) {
      const newLanguages = [...selectedLanguages, languageId];
      setSelectedLanguages(newLanguages);
      await updateResource({ languages: newLanguages }, newLanguages, selectedExpertises, seniority);
    }
  };

  const removeLanguage = async (languageId: string) => {
    const newLanguages = selectedLanguages.filter(id => id !== languageId);
    setSelectedLanguages(newLanguages);
    await updateResource({ languages: newLanguages }, newLanguages, selectedExpertises, seniority);
  };

  const addExpertise = async (expertiseId: string) => {
    if (!selectedExpertises.includes(expertiseId)) {
      const newExpertises = [...selectedExpertises, expertiseId];
      setSelectedExpertises(newExpertises);
      await updateResource({ expertises: newExpertises }, selectedLanguages, newExpertises, seniority);
    }
  };

  const removeExpertise = async (expertiseId: string) => {
    const newExpertises = selectedExpertises.filter(id => id !== expertiseId);
    setSelectedExpertises(newExpertises);
    await updateResource({ expertises: newExpertises }, selectedLanguages, newExpertises, seniority);
  };

  const updateResource = async (
    updates: Partial<HRResource>, 
    languages: string[] = selectedLanguages, 
    expertises: string[] = selectedExpertises,
    seniorityLevel: 'junior' | 'intermediate' | 'senior' = seniority
  ) => {
    if (!selectedResource) return;
    
    // Calculate the current price with the new values
    const currentPrice = await calculatePriceSync(languages, expertises, seniorityLevel);
    setCalculatedPrice(currentPrice);
    
    const updatedResource = {
      ...selectedResource,
      ...updates,
      calculated_price: currentPrice
    };
    
    // Get language and expertise names for display
    const languageNames = await Promise.all(
      updatedResource.languages.map(async (langId) => {
        const { data } = await supabase
          .from('hr_languages')
          .select('name')
          .eq('id', langId)
          .single();
        return data?.name || langId;
      })
    );
    
    const expertiseNames = await Promise.all(
      updatedResource.expertises.map(async (expId) => {
        const { data } = await supabase
          .from('hr_expertises')
          .select('name')
          .eq('id', expId)
          .single();
        return data?.name || expId;
      })
    );
    
    // Update resource with display names
    updatedResource.languageNames = languageNames;
    updatedResource.expertiseNames = expertiseNames;
    
    onResourceUpdate(updatedResource);
  };

  const handleSeniorityChange = async (newSeniority: 'junior' | 'intermediate' | 'senior') => {
    setSeniority(newSeniority);
    // Pour les ressources IA, s'assurer qu'elles gardent toutes les langues
    if (selectedResource?.is_ai) {
      const { data: allLanguages } = await supabase
        .from('hr_languages')
        .select('id');
      
      if (allLanguages) {
        const allLanguageIds = allLanguages.map(lang => lang.id);
        await updateResource({ seniority: newSeniority }, allLanguageIds, selectedExpertises, newSeniority);
      }
    } else {
      await updateResource({ seniority: newSeniority }, selectedLanguages, selectedExpertises, newSeniority);
    }
  };

  if (!selectedResource) {
    return (
      <div className="w-80 bg-card border-l">
        <Card className="rounded-none border-0 h-full">
          <CardContent className="pt-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-muted-foreground">Sélectionnez une ressource pour configurer ses paramètres</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Special display for team members
  if (selectedResource?.is_team_member) {
    return (
      <div className="w-80 bg-card border-l p-6 space-y-6">
        {/* Team member header */}
        <div className="text-center p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg">
          <Badge className="mb-2 bg-white text-blue-600">Membre d'équipe</Badge>
          <div className="text-xl font-bold text-white">
            {selectedResource.profileName || 'Membre'}
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {calculatedPrice.toFixed(2)} €/mn
          </div>
        </div>

        {/* Description */}
        {selectedResource.description && (
          <div className="space-y-2">
            <Label>Description</Label>
            <div className="p-3 bg-muted rounded-md text-sm">
              {selectedResource.description}
            </div>
          </div>
        )}

        {/* Note */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md">
          <p className="text-xs text-muted-foreground">
            Ce membre fait partie de votre équipe interne. 
            Les options de configuration ne sont pas disponibles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 bg-card border-l overflow-y-auto">
      <div className="bg-gradient-to-br from-purple-200 via-pink-200 to-blue-200 dark:from-purple-600 dark:via-pink-600 dark:to-blue-600 p-[1px]">
        <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-[#0f172a] dark:via-[#1e1b4b] dark:to-[#312e81]">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Configuration</h3>
              {onResourceDelete && (
                <Button
                  onClick={onResourceDelete}
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Supprimer la ressource (ou utilisez Backspace/Delete)"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            {/* Prix calculé avec design néon */}
            <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 dark:from-purple-500 dark:via-pink-500 dark:to-blue-500 rounded-lg flex items-center justify-center">
                    <Euro className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tarif calculé</span>
                </div>
                <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {calculatedPrice.toFixed(2)}€/min
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6 space-y-6">

      {/* Options pour les ressources humaines seulement */}
      {!selectedResource?.is_ai && (
        <>
          {/* Séniorité */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Séniorité
            </Label>
            <Select value={seniority} onValueChange={handleSeniorityChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="junior">Junior</SelectItem>
                <SelectItem value="intermediate">Intermédiaire</SelectItem>
                <SelectItem value="senior">Senior</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Langues */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Langues
            </Label>
            <Select key={`lang-${selectedResource?.id}`} value="" onValueChange={addLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Ajouter une langue" />
              </SelectTrigger>
              <SelectContent>
                {languages
                  .filter(lang => !selectedLanguages.includes(lang.id))
                  .map(language => (
                    <SelectItem key={language.id} value={language.id}>
                      {language.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              {selectedLanguages.map(langId => {
                const language = languages.find(l => l.id === langId);
                return language ? (
                  <Badge key={langId} className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 flex items-center gap-1">
                    {language.name}
                    <button
                      className="ml-1 hover:text-purple-900 dark:hover:text-purple-100"
                      onClick={() => removeLanguage(langId)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
          </div>

          {/* Expertises */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Code className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Expertises
            </Label>
            <Select key={`exp-${selectedResource?.id}`} value="" onValueChange={addExpertise}>
              <SelectTrigger>
                <SelectValue placeholder="Ajouter une expertise" />
              </SelectTrigger>
              <SelectContent>
                {expertises
                  .filter(exp => !selectedExpertises.includes(exp.id))
                  .map(expertise => (
                    <SelectItem key={expertise.id} value={expertise.id}>
                      {expertise.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              {selectedExpertises.map(expId => {
                const expertise = expertises.find(e => e.id === expId);
                return expertise ? (
                  <Badge key={expId} variant="outline" className="border-purple-300 dark:border-purple-700 flex items-center gap-1">
                    {expertise.name}
                    <button
                      className="ml-1 hover:text-destructive"
                      onClick={() => removeExpertise(expId)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
          </div>

          {/* Bloc d'information sur la séniorité */}
          <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Information Séniorité</p>
                {seniority === 'junior' && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Un profil <span className="font-semibold">junior</span> a entre 1 et 3 ans d'expérience en moyenne.
                  </p>
                )}
                {seniority === 'intermediate' && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Un profil <span className="font-semibold">intermédiaire</span> est autonome avec 3-5 ans d'expérience et peut encadrer de petites équipes.
                  </p>
                )}
                {seniority === 'senior' && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Un profil <span className="font-semibold">senior</span> est autonome avec 5+ ans d'expérience et peut encadrer des équipes importantes.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Message pour les ressources IA */}
      {selectedResource?.is_ai && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Une ressource IA doit toujours être connectée à une ressource humaine qui la supervise.
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default HRResourcePanel;