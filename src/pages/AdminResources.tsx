import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Interfaces
interface HRCategory {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface HRProfile {
  id: string;
  name: string;
  category_id: string;
  base_price: number;
  created_at: string;
  updated_at: string;
}

interface Language {
  id: string;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
}

interface Expertise {
  id: string;
  name: string;
  category_id: string;
  created_at: string;
  updated_at: string;
}

const AdminResources = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // States
  const [categories, setCategories] = useState<HRCategory[]>([]);
  const [profiles, setProfiles] = useState<HRProfile[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [expertises, setExpertises] = useState<Expertise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data en attendant la migration
  const mockCategories: HRCategory[] = [
    { id: '1', name: 'Marketing', created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '2', name: 'Développement', created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '3', name: 'Gestion de projet', created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '4', name: 'Comptabilité', created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '5', name: 'Finance', created_at: '2024-01-01', updated_at: '2024-01-01' },
  ];

  const mockProfiles: HRProfile[] = [
    { id: '1-1', name: 'Directeur marketing', category_id: '1', base_price: 80, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '1-2', name: 'Stratégiste marketing', category_id: '1', base_price: 65, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '2-1', name: 'Développeur Full-Stack', category_id: '2', base_price: 70, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '2-2', name: 'Développeur Frontend', category_id: '2', base_price: 60, created_at: '2024-01-01', updated_at: '2024-01-01' },
  ];

  const mockLanguages: Language[] = [
    { id: '1', name: 'Français', code: 'fr', created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '2', name: 'Anglais', code: 'en', created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '3', name: 'Espagnol', code: 'es', created_at: '2024-01-01', updated_at: '2024-01-01' },
  ];

  const mockExpertises: Expertise[] = [
    { id: '1', name: 'PHP', category_id: '2', created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '2', name: 'React', category_id: '2', created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '3', name: 'Google Ads', category_id: '1', created_at: '2024-01-01', updated_at: '2024-01-01' },
  ];

  useEffect(() => {
    if (!user) {
      navigate('/admin');
      return;
    }
    
    // Charger les données mock
    setCategories(mockCategories);
    setProfiles(mockProfiles);
    setLanguages(mockLanguages);
    setExpertises(mockExpertises);
    setIsLoading(false);
  }, [user, navigate]);

  const getCategoryName = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId)?.name || 'Inconnu';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Gestion des Ressources</h1>
              <p className="text-muted-foreground">
                Administration des catégories, profils, langues et expertises
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="categories">Catégories</TabsTrigger>
            <TabsTrigger value="profiles">Profils</TabsTrigger>
            <TabsTrigger value="languages">Langues</TabsTrigger>
            <TabsTrigger value="expertises">Expertises</TabsTrigger>
          </TabsList>

          {/* Catégories */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Catégories HR</CardTitle>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categories.map(category => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                    >
                      <div>
                        <h3 className="font-medium">{category.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {profiles.filter(p => p.category_id === category.id).length} profils
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profils */}
          <TabsContent value="profiles">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Profils par Catégorie</CardTitle>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profiles.map(profile => (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                    >
                      <div>
                        <h3 className="font-medium">{profile.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {getCategoryName(profile.category_id)} • {profile.base_price}€/h
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Langues */}
          <TabsContent value="languages">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Langues Disponibles</CardTitle>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {languages.map(language => (
                    <div
                      key={language.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                    >
                      <div>
                        <h3 className="font-medium">{language.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Code: {language.code}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expertises */}
          <TabsContent value="expertises">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Expertises par Catégorie</CardTitle>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {expertises.map(expertise => (
                    <div
                      key={expertise.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                    >
                      <div>
                        <h3 className="font-medium">{expertise.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {getCategoryName(expertise.category_id)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminResources;