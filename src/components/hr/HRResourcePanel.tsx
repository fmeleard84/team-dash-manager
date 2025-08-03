import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
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
}

interface HRResourcePanelProps {
  selectedResource: HRResource | null;
  onResourceUpdate: (resource: HRResource) => void;
}

const HRResourcePanel = ({ selectedResource, onResourceUpdate }: HRResourcePanelProps) => {
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

  useEffect(() => {
    if (selectedResource) {
      setSelectedLanguages(selectedResource.languages || []);
      setSelectedExpertises(selectedResource.expertises || []);
      setSeniority(selectedResource.seniority);
      setCalculatedPrice(selectedResource.calculated_price || 0);
    }
  }, [selectedResource]);

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
    await updateResource({ seniority: newSeniority }, selectedLanguages, selectedExpertises, newSeniority);
  };

  if (!selectedResource) {
    return (
      <div className="w-80 bg-card border-l p-6">
        <div className="text-center text-muted-foreground">
          <p>Sélectionnez une ressource pour configurer ses paramètres</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-card border-l p-6 space-y-6">
      {/* Prix calculé */}
      <div className="text-center p-4 bg-primary/10 rounded-lg">
        <div className="text-2xl font-bold text-primary">
          {calculatedPrice.toFixed(2)} €/mn
        </div>
        <div className="text-sm text-muted-foreground">Prix calculé</div>
      </div>

      {/* Séniorité */}
      <div className="space-y-2">
        <Label>Séniorité</Label>
        <Select value={seniority} onValueChange={handleSeniorityChange}>
          <SelectTrigger>
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
        <Label>Langues</Label>
        <Select onValueChange={addLanguage}>
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
               <Badge key={langId} variant="secondary" className="flex items-center gap-1">
                 {language.name}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeLanguage(langId)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ) : null;
          })}
        </div>
      </div>

      {/* Expertises */}
      <div className="space-y-2">
        <Label>Expertises</Label>
        <Select onValueChange={addExpertise}>
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
               <Badge key={expId} variant="outline" className="flex items-center gap-1">
                 {expertise.name}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeExpertise(expId)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
};

export default HRResourcePanel;