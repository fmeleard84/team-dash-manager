import { useState, useEffect } from 'react';
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
}

interface Expertise {
  id: string;
  name: string;
  category_id: string;
}

interface HRResource {
  id: string;
  profile_id: string;
  seniority: 'junior' | 'intermediate' | 'senior';
  languages: string[];
  expertises: string[];
  calculated_price: number;
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
    fetchExpertises();
  }, []);

  const fetchLanguages = async () => {
    const { data, error } = await supabase
      .from('hr_languages')
      .select('*')
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
    const { data, error } = await supabase
      .from('hr_expertises')
      .select('*')
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
  };

  const calculatePrice = () => {
    let basePrice = 50; // Prix de base par heure

    // Multiplicateur selon la séniorité
    const seniorityMultiplier = {
      junior: 1,
      intermediate: 1.5,
      senior: 2.2
    };

    // Bonus par langue supplémentaire
    const languageBonus = Math.max(0, selectedLanguages.length - 1) * 10;

    // Bonus par expertise supplémentaire
    const expertiseBonus = Math.max(0, selectedExpertises.length - 1) * 15;

    const finalPrice = (basePrice * seniorityMultiplier[seniority]) + languageBonus + expertiseBonus;
    setCalculatedPrice(Math.round(finalPrice * 100) / 100);
  };

  const addLanguage = (languageId: string) => {
    if (!selectedLanguages.includes(languageId)) {
      const newLanguages = [...selectedLanguages, languageId];
      setSelectedLanguages(newLanguages);
      setTimeout(() => updateResource({ languages: newLanguages }), 100);
    }
  };

  const removeLanguage = (languageId: string) => {
    const newLanguages = selectedLanguages.filter(id => id !== languageId);
    setSelectedLanguages(newLanguages);
    setTimeout(() => updateResource({ languages: newLanguages }), 100);
  };

  const addExpertise = (expertiseId: string) => {
    if (!selectedExpertises.includes(expertiseId)) {
      const newExpertises = [...selectedExpertises, expertiseId];
      setSelectedExpertises(newExpertises);
      setTimeout(() => updateResource({ expertises: newExpertises }), 100);
    }
  };

  const removeExpertise = (expertiseId: string) => {
    const newExpertises = selectedExpertises.filter(id => id !== expertiseId);
    setSelectedExpertises(newExpertises);
    setTimeout(() => updateResource({ expertises: newExpertises }), 100);
  };

  const updateResource = (updates: Partial<HRResource>) => {
    if (selectedResource) {
      const updatedResource = {
        ...selectedResource,
        ...updates,
        calculated_price: calculatedPrice
      };
      onResourceUpdate(updatedResource);
    }
  };

  const handleSeniorityChange = (newSeniority: 'junior' | 'intermediate' | 'senior') => {
    setSeniority(newSeniority);
    setTimeout(() => updateResource({ seniority: newSeniority }), 100);
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
          {calculatedPrice.toFixed(2)} €/h
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