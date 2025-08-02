import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  cost_percentage: number;
  created_at: string;
  updated_at: string;
}

interface Expertise {
  id: string;
  name: string;
  category_id: string;
  cost_percentage: number;
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

  // Dialog states
  const [categoryDialog, setCategoryDialog] = useState({ open: false, edit: false, data: null as HRCategory | null });
  const [profileDialog, setProfileDialog] = useState({ open: false, edit: false, data: null as HRProfile | null });
  const [languageDialog, setLanguageDialog] = useState({ open: false, edit: false, data: null as Language | null });
  const [expertiseDialog, setExpertiseDialog] = useState({ open: false, edit: false, data: null as Expertise | null });

  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [profileForm, setProfileForm] = useState({ name: '', category_id: '', base_price: 50 });
  const [languageForm, setLanguageForm] = useState({ name: '', code: '', cost_percentage: 5 });
  const [expertiseForm, setExpertiseForm] = useState({ name: '', category_id: '', cost_percentage: 10 });

  useEffect(() => {
    if (!user) {
      navigate('/admin');
      return;
    }
    
    fetchAllData();
  }, [user, navigate]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [categoriesData, profilesData, languagesData, expertisesData] = await Promise.all([
        supabase.from('hr_categories').select('*').order('name'),
        supabase.from('hr_profiles').select('*').order('name'),
        supabase.from('hr_languages').select('*, cost_percentage').order('name'),
        supabase.from('hr_expertises').select('*, cost_percentage').order('name')
      ]);

      if (categoriesData.error) throw categoriesData.error;
      if (profilesData.error) throw profilesData.error;
      if (languagesData.error) throw languagesData.error;
      if (expertisesData.error) throw expertisesData.error;

      setCategories(categoriesData.data);
      setProfiles(profilesData.data);
      setLanguages(languagesData.data);
      setExpertises(expertisesData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId)?.name || 'Inconnu';
  };

  // CRUD Functions for Categories
  const saveCategory = async () => {
    try {
      if (categoryDialog.edit && categoryDialog.data) {
        const { error } = await supabase
          .from('hr_categories')
          .update({ name: categoryForm.name })
          .eq('id', categoryDialog.data.id);
        if (error) throw error;
        toast({ title: "Succès", description: "Catégorie modifiée avec succès." });
      } else {
        const { error } = await supabase
          .from('hr_categories')
          .insert({ name: categoryForm.name });
        if (error) throw error;
        toast({ title: "Succès", description: "Catégorie créée avec succès." });
      }
      setCategoryDialog({ open: false, edit: false, data: null });
      setCategoryForm({ name: '' });
      fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from('hr_categories').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Succès", description: "Catégorie supprimée avec succès." });
      fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer la catégorie.",
        variant: "destructive",
      });
    }
  };

  // CRUD Functions for Profiles
  const saveProfile = async () => {
    try {
      if (profileDialog.edit && profileDialog.data) {
        const { error } = await supabase
          .from('hr_profiles')
          .update({ 
            name: profileForm.name,
            category_id: profileForm.category_id,
            base_price: profileForm.base_price
          })
          .eq('id', profileDialog.data.id);
        if (error) throw error;
        toast({ title: "Succès", description: "Profil modifié avec succès." });
      } else {
        const { error } = await supabase
          .from('hr_profiles')
          .insert({ 
            name: profileForm.name,
            category_id: profileForm.category_id,
            base_price: profileForm.base_price
          });
        if (error) throw error;
        toast({ title: "Succès", description: "Profil créé avec succès." });
      }
      setProfileDialog({ open: false, edit: false, data: null });
      setProfileForm({ name: '', category_id: '', base_price: 50 });
      fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  };

  const deleteProfile = async (id: string) => {
    try {
      const { error } = await supabase.from('hr_profiles').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Succès", description: "Profil supprimé avec succès." });
      fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le profil.",
        variant: "destructive",
      });
    }
  };

  // CRUD Functions for Languages
  const saveLanguage = async () => {
    try {
      if (languageDialog.edit && languageDialog.data) {
        const { error } = await supabase
          .from('hr_languages')
          .update({ 
            name: languageForm.name,
            code: languageForm.code,
            cost_percentage: languageForm.cost_percentage
          })
          .eq('id', languageDialog.data.id);
        if (error) throw error;
        toast({ title: "Succès", description: "Langue modifiée avec succès." });
      } else {
        const { error } = await supabase
          .from('hr_languages')
          .insert({ 
            name: languageForm.name,
            code: languageForm.code,
            cost_percentage: languageForm.cost_percentage
          });
        if (error) throw error;
        toast({ title: "Succès", description: "Langue créée avec succès." });
      }
      setLanguageDialog({ open: false, edit: false, data: null });
      setLanguageForm({ name: '', code: '', cost_percentage: 5 });
      fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  };

  const deleteLanguage = async (id: string) => {
    try {
      const { error } = await supabase.from('hr_languages').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Succès", description: "Langue supprimée avec succès." });
      fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer la langue.",
        variant: "destructive",
      });
    }
  };

  // CRUD Functions for Expertises
  const saveExpertise = async () => {
    try {
      if (expertiseDialog.edit && expertiseDialog.data) {
        const { error } = await supabase
          .from('hr_expertises')
          .update({ 
            name: expertiseForm.name,
            category_id: expertiseForm.category_id,
            cost_percentage: expertiseForm.cost_percentage
          })
          .eq('id', expertiseDialog.data.id);
        if (error) throw error;
        toast({ title: "Succès", description: "Expertise modifiée avec succès." });
      } else {
        const { error } = await supabase
          .from('hr_expertises')
          .insert({ 
            name: expertiseForm.name,
            category_id: expertiseForm.category_id,
            cost_percentage: expertiseForm.cost_percentage
          });
        if (error) throw error;
        toast({ title: "Succès", description: "Expertise créée avec succès." });
      }
      setExpertiseDialog({ open: false, edit: false, data: null });
      setExpertiseForm({ name: '', category_id: '', cost_percentage: 10 });
      fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  };

  const deleteExpertise = async (id: string) => {
    try {
      const { error } = await supabase.from('hr_expertises').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Succès", description: "Expertise supprimée avec succès." });
      fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'expertise.",
        variant: "destructive",
      });
    }
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
            <TabsTrigger value="categories">Catégories ({categories.length})</TabsTrigger>
            <TabsTrigger value="profiles">Profils ({profiles.length})</TabsTrigger>
            <TabsTrigger value="languages">Langues ({languages.length})</TabsTrigger>
            <TabsTrigger value="expertises">Expertises ({expertises.length})</TabsTrigger>
          </TabsList>

          {/* Catégories */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Catégories HR</CardTitle>
                  <Dialog open={categoryDialog.open} onOpenChange={(open) => {
                    setCategoryDialog({ open, edit: false, data: null });
                    setCategoryForm({ name: '' });
                  }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {categoryDialog.edit ? 'Modifier' : 'Créer'} une catégorie
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="category-name">Nom</Label>
                          <Input
                            id="category-name"
                            value={categoryForm.name}
                            onChange={(e) => setCategoryForm({ name: e.target.value })}
                            placeholder="Ex: Marketing"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setCategoryDialog({ open: false, edit: false, data: null })}>
                            Annuler
                          </Button>
                          <Button onClick={saveCategory} disabled={!categoryForm.name.trim()}>
                            {categoryDialog.edit ? 'Modifier' : 'Créer'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setCategoryForm({ name: category.name });
                            setCategoryDialog({ open: true, edit: true, data: category });
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteCategory(category.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profils - Similar structure but with more fields */}
          <TabsContent value="profiles">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Profils par Catégorie</CardTitle>
                  <Dialog open={profileDialog.open} onOpenChange={(open) => {
                    setProfileDialog({ open, edit: false, data: null });
                    setProfileForm({ name: '', category_id: '', base_price: 50 });
                  }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {profileDialog.edit ? 'Modifier' : 'Créer'} un profil
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="profile-name">Nom</Label>
                          <Input
                            id="profile-name"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                            placeholder="Ex: Développeur Full-Stack"
                          />
                        </div>
                        <div>
                          <Label htmlFor="profile-category">Catégorie</Label>
                          <Select 
                            value={profileForm.category_id} 
                            onValueChange={(value) => setProfileForm({ ...profileForm, category_id: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une catégorie" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="profile-price">Prix de base (€/h)</Label>
                          <Input
                            id="profile-price"
                            type="number"
                            value={profileForm.base_price}
                            onChange={(e) => setProfileForm({ ...profileForm, base_price: parseFloat(e.target.value) || 0 })}
                            placeholder="50"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setProfileDialog({ open: false, edit: false, data: null })}>
                            Annuler
                          </Button>
                          <Button onClick={saveProfile} disabled={!profileForm.name.trim() || !profileForm.category_id}>
                            {profileDialog.edit ? 'Modifier' : 'Créer'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setProfileForm({ 
                              name: profile.name,
                              category_id: profile.category_id,
                              base_price: profile.base_price
                            });
                            setProfileDialog({ open: true, edit: true, data: profile });
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteProfile(profile.id)}
                        >
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
                  <Dialog open={languageDialog.open} onOpenChange={(open) => {
                    setLanguageDialog({ open, edit: false, data: null });
                    setLanguageForm({ name: '', code: '', cost_percentage: 5 });
                  }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {languageDialog.edit ? 'Modifier' : 'Créer'} une langue
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="language-name">Nom</Label>
                          <Input
                            id="language-name"
                            value={languageForm.name}
                            onChange={(e) => setLanguageForm({ ...languageForm, name: e.target.value })}
                            placeholder="Ex: Français"
                          />
                        </div>
                        <div>
                          <Label htmlFor="language-code">Code</Label>
                          <Input
                            id="language-code"
                            value={languageForm.code}
                            onChange={(e) => setLanguageForm({ ...languageForm, code: e.target.value.toLowerCase() })}
                            placeholder="Ex: fr"
                            maxLength={3}
                          />
                        </div>
                        <div>
                          <Label htmlFor="language-cost">Coût supplémentaire (%)</Label>
                          <Input
                            id="language-cost"
                            type="number"
                            min="0"
                            step="0.1"
                            value={languageForm.cost_percentage}
                            onChange={(e) => setLanguageForm({ ...languageForm, cost_percentage: parseFloat(e.target.value) || 0 })}
                            placeholder="Ex: 5.0"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setLanguageDialog({ open: false, edit: false, data: null })}>
                            Annuler
                          </Button>
                          <Button onClick={saveLanguage} disabled={!languageForm.name.trim() || !languageForm.code.trim()}>
                            {languageDialog.edit ? 'Modifier' : 'Créer'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
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
                           Code: {language.code} | +{language.cost_percentage}%
                         </p>
                       </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setLanguageForm({ 
                              name: language.name,
                              code: language.code,
                              cost_percentage: language.cost_percentage
                            });
                            setLanguageDialog({ open: true, edit: true, data: language });
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteLanguage(language.id)}
                        >
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
                  <Dialog open={expertiseDialog.open} onOpenChange={(open) => {
                    setExpertiseDialog({ open, edit: false, data: null });
                    setExpertiseForm({ name: '', category_id: '', cost_percentage: 10 });
                  }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {expertiseDialog.edit ? 'Modifier' : 'Créer'} une expertise
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="expertise-name">Nom</Label>
                          <Input
                            id="expertise-name"
                            value={expertiseForm.name}
                            onChange={(e) => setExpertiseForm({ ...expertiseForm, name: e.target.value })}
                            placeholder="Ex: React"
                          />
                        </div>
                        <div>
                          <Label htmlFor="expertise-category">Catégorie</Label>
                          <Select 
                            value={expertiseForm.category_id} 
                            onValueChange={(value) => setExpertiseForm({ ...expertiseForm, category_id: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une catégorie" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="expertise-cost">Coût supplémentaire (%)</Label>
                          <Input
                            id="expertise-cost"
                            type="number"
                            min="0"
                            step="0.1"
                            value={expertiseForm.cost_percentage}
                            onChange={(e) => setExpertiseForm({ ...expertiseForm, cost_percentage: parseFloat(e.target.value) || 0 })}
                            placeholder="Ex: 10.0"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setExpertiseDialog({ open: false, edit: false, data: null })}>
                            Annuler
                          </Button>
                          <Button onClick={saveExpertise} disabled={!expertiseForm.name.trim() || !expertiseForm.category_id}>
                            {expertiseDialog.edit ? 'Modifier' : 'Créer'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
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
                           {getCategoryName(expertise.category_id)} | +{expertise.cost_percentage}%
                         </p>
                       </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setExpertiseForm({ 
                              name: expertise.name,
                              category_id: expertise.category_id,
                              cost_percentage: expertise.cost_percentage
                            });
                            setExpertiseDialog({ open: true, edit: true, data: expertise });
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteExpertise(expertise.id)}
                        >
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