import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface HRProfile {
  id: string;
  name: string;
  category_id: string;
  base_price: number;
}

interface HRCategory {
  id: string;
  name: string;
  profiles: HRProfile[];
}

interface HRCategoriesPanelProps {
  onProfileSelect: (profile: HRProfile) => void;
}

const HRCategoriesPanel = ({ onProfileSelect }: HRCategoriesPanelProps) => {
  const [categories, setCategories] = useState<HRCategory[]>([]);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategoriesAndProfiles();
  }, []);

  const fetchCategoriesAndProfiles = async () => {
    try {
      // Récupérer les catégories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('hr_categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;

      // Récupérer les profils
      const { data: profilesData, error: profilesError } = await supabase
        .from('hr_profiles')
        .select('*')
        .order('name');

      if (profilesError) throw profilesError;

      // Organiser les profils par catégorie
      const categoriesWithProfiles = categoriesData.map(category => ({
        ...category,
        profiles: profilesData.filter(profile => profile.category_id === category.id)
      }));

      setCategories(categoriesWithProfiles);
      
      // Ouvrir la première catégorie par défaut
      if (categoriesWithProfiles.length > 0) {
        setOpenCategories([categoriesWithProfiles[0].id]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les catégories RH.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleProfileDragStart = (e: React.DragEvent, profile: HRProfile) => {
    e.dataTransfer.setData('application/json', JSON.stringify(profile));
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (isLoading) {
    return (
      <div className="w-80 bg-card border-r p-4 space-y-2">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Ressources Humaines</h2>
        </div>
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-card border-r p-4 space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="font-semibold">Ressources Humaines</h2>
      </div>

      <div className="space-y-1">
        {categories.map(category => (
          <Collapsible
            key={category.id}
            open={openCategories.includes(category.id)}
            onOpenChange={() => toggleCategory(category.id)}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent text-left">
              {openCategories.includes(category.id) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="font-medium">{category.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {category.profiles.length}
              </span>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="ml-6 space-y-1">
              {category.profiles.map(profile => (
                <div
                  key={profile.id}
                  draggable
                  onDragStart={(e) => handleProfileDragStart(e, profile)}
                  className={cn(
                    "p-2 rounded-md cursor-grab active:cursor-grabbing",
                    "hover:bg-accent/50 border border-transparent hover:border-border",
                    "transition-colors duration-200"
                  )}
                  onClick={() => onProfileSelect(profile)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{profile.name}</span>
                     <span className="text-xs text-muted-foreground">
                      {profile.base_price}€/mn
                    </span>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      <div className="mt-6 p-3 bg-muted/50 rounded-md">
        <p className="text-xs text-muted-foreground">
          Glissez-déposez les profils sur le canvas pour les ajouter à votre projet.
        </p>
      </div>
    </div>
  );
};

export default HRCategoriesPanel;