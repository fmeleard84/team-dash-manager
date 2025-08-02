import { useState, useEffect } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Données temporaires en attendant la migration
const mockCategories: HRCategory[] = [
  {
    id: '1',
    name: 'Marketing',
    profiles: [
      { id: '1-1', name: 'Directeur marketing', category_id: '1', base_price: 80 },
      { id: '1-2', name: 'Stratégiste marketing', category_id: '1', base_price: 65 },
      { id: '1-3', name: 'Chef de projet marketing', category_id: '1', base_price: 55 },
    ]
  },
  {
    id: '2',
    name: 'Développement',
    profiles: [
      { id: '2-1', name: 'Architecte technique', category_id: '2', base_price: 90 },
      { id: '2-2', name: 'Développeur Full-Stack', category_id: '2', base_price: 70 },
      { id: '2-3', name: 'Développeur Frontend', category_id: '2', base_price: 60 },
      { id: '2-4', name: 'Développeur Backend', category_id: '2', base_price: 65 },
    ]
  },
  {
    id: '3',
    name: 'Gestion de projet',
    profiles: [
      { id: '3-1', name: 'Chef de projet senior', category_id: '3', base_price: 75 },
      { id: '3-2', name: 'Project Manager', category_id: '3', base_price: 65 },
      { id: '3-3', name: 'Scrum Master', category_id: '3', base_price: 60 },
    ]
  },
  {
    id: '4',
    name: 'Comptabilité',
    profiles: [
      { id: '4-1', name: 'Expert-comptable', category_id: '4', base_price: 85 },
      { id: '4-2', name: 'Comptable senior', category_id: '4', base_price: 55 },
      { id: '4-3', name: 'Assistant comptable', category_id: '4', base_price: 35 },
    ]
  },
  {
    id: '5',
    name: 'Finance',
    profiles: [
      { id: '5-1', name: 'Directeur financier', category_id: '5', base_price: 95 },
      { id: '5-2', name: 'Analyste financier', category_id: '5', base_price: 70 },
      { id: '5-3', name: 'Contrôleur de gestion', category_id: '5', base_price: 65 },
    ]
  }
];

const HRCategoriesPanel = ({ onProfileSelect }: HRCategoriesPanelProps) => {
  const [categories, setCategories] = useState<HRCategory[]>(mockCategories);
  const [openCategories, setOpenCategories] = useState<string[]>(['1']);

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
                      {profile.base_price}€/h
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