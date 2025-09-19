import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft, Plus, Edit, Trash2, MessageSquare, Cloud, Receipt, FolderOpen,
  Briefcase, Code, Palette, Megaphone, Users, Target, Zap, Star, Heart,
  Settings, Globe, Shield, Rocket, Camera, Music, Book, Lightbulb,
  TrendingUp, Award, Coffee, Gamepad2, Headphones, Monitor, Smartphone,
  Database, Lock, Wifi, Mail, Phone, MapPin, Calendar, Clock, DollarSign, Bot
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { IAResourceConfig } from '@/ia-team/components/IAResourceConfig';

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
  is_ai?: boolean;
  prompt_id?: string;
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

interface TemplateCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface ProjectTemplate {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  reactflow_data: any;
  estimated_duration?: number;
  estimated_cost?: number;
  complexity_level: 'easy' | 'medium' | 'hard';
  tags?: string[];
  is_active: boolean;
  order_index: number;
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
  const [templateCategories, setTemplateCategories] = useState<TemplateCategory[]>([]);
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [categoryDialog, setCategoryDialog] = useState({ open: false, edit: false, data: null as HRCategory | null });
  const [profileDialog, setProfileDialog] = useState({ open: false, edit: false, data: null as HRProfile | null });
  const [languageDialog, setLanguageDialog] = useState({ open: false, edit: false, data: null as Language | null });
  const [expertiseDialog, setExpertiseDialog] = useState({ open: false, edit: false, data: null as Expertise | null });
  const [templateCategoryDialog, setTemplateCategoryDialog] = useState({ open: false, edit: false, data: null as TemplateCategory | null });
  const [projectTemplateDialog, setProjectTemplateDialog] = useState({ open: false, edit: false, data: null as ProjectTemplate | null });

  // Tab state
  const [activeTab, setActiveTab] = useState('categories');
  
  // Counts for sidebar
  const counts = {
    categories: categories.length,
    profiles: profiles.length,
    languages: languages.length,
    expertises: expertises.length,
    templates: templateCategories.length
  };

  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [profileForm, setProfileForm] = useState({ name: '', category_id: '', base_price: 50, is_ai: false, prompt_id: '' });
  const [showIAConfig, setShowIAConfig] = useState(false);
  const [selectedIAProfile, setSelectedIAProfile] = useState<HRProfile | null>(null);
  const [languageForm, setLanguageForm] = useState({ name: '', code: '', cost_percentage: 5 });
  const [expertiseForm, setExpertiseForm] = useState({ name: '', category_id: '', cost_percentage: 10 });
  const [templateCategoryForm, setTemplateCategoryForm] = useState({ 
    name: '', description: '', icon: 'FolderOpen', color: 'from-gray-600 to-gray-700', order_index: 0 
  });
  const [projectTemplateForm, setProjectTemplateForm] = useState({
    name: '', description: '', category_id: '', 
    tags: '', reactflow_data: '{}', order_index: 0,
    team_size: 4, price_per_minute: 1.5
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchAllData();

    // Écouter les messages du TemplateFlow
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'TEMPLATE_FLOW_DATA') {
        setProjectTemplateForm(prev => ({
          ...prev,
          reactflow_data: event.data.data
        }));
        
        toast({
          title: "Données reçues",
          description: "La composition ReactFlow a été importée avec succès",
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user, navigate, toast]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [categoriesData, profilesData, languagesData, expertisesData, templateCategoriesData, projectTemplatesData] = await Promise.all([
        supabase.from('hr_categories').select('*').order('name'),
        supabase.from('hr_profiles').select('*').order('name'),
        supabase.from('hr_languages').select('*, cost_percentage').order('name'),
        supabase.from('hr_expertises').select('*, cost_percentage').order('name'),
        supabase.from('template_categories').select('*').order('order_index', { ascending: true }),
        supabase.from('project_templates').select('*').order('order_index', { ascending: true })
      ]);

      if (categoriesData.error) throw categoriesData.error;
      if (profilesData.error) throw profilesData.error;
      if (languagesData.error) throw languagesData.error;
      if (expertisesData.error) throw expertisesData.error;

      setCategories(categoriesData.data);
      setProfiles(profilesData.data);
      setLanguages(languagesData.data);
      setExpertises(expertisesData.data);

      // Handle template data (may not exist yet)
      if (!templateCategoriesData.error) {
        setTemplateCategories(templateCategoriesData.data || []);
      }
      if (!projectTemplatesData.error) {
        setProjectTemplates(projectTemplatesData.data || []);
      }
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
            base_price: profileForm.base_price,
            is_ai: profileForm.is_ai
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
            base_price: profileForm.base_price,
            is_ai: profileForm.is_ai
          });
        if (error) throw error;
        toast({ title: "Succès", description: "Profil créé avec succès." });
      }
      setProfileDialog({ open: false, edit: false, data: null });
      setProfileForm({ name: '', category_id: '', base_price: 50, is_ai: false, prompt_id: '' });
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
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <AdminSidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        counts={counts}
      />
      
      {/* Main content */}
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        {/* Header avec design Ialla */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-white to-purple-50 border border-gray-100 mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10" />
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Gestion des Ressources
                    </h1>
                    <p className="text-gray-600">
                      Administration des catégories, profils, langues et expertises
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Logout Button */}
              <Button
                variant="outline"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/auth');
                }}
                className="bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white"
              >
                Déconnexion
              </Button>
            </div>
          </div>
        </div>

        {/* Content based on active tab */}
        <div className="space-y-6">
          {/* Catégories */}
          {activeTab === 'categories' && (
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
                    <DialogContent aria-describedby="category-description">
                      <DialogHeader>
                        <DialogTitle>
                          {categoryDialog.edit ? 'Modifier' : 'Créer'} une catégorie
                        </DialogTitle>
                      </DialogHeader>
                      <p id="category-description" className="text-sm text-muted-foreground mb-4">
                        {categoryDialog.edit ? 'Modifiez les informations de la catégorie.' : 'Créez une nouvelle catégorie pour organiser vos profils HR.'}
                      </p>
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
          )}

          {/* Profils - Similar structure but with more fields */}
          {activeTab === 'profiles' && (
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
                    <DialogContent aria-describedby="profile-description">
                      <DialogHeader>
                        <DialogTitle>
                          {profileDialog.edit ? 'Modifier' : 'Créer'} un profil
                        </DialogTitle>
                      </DialogHeader>
                      <p id="profile-description" className="text-sm text-muted-foreground mb-4">
                        {profileDialog.edit ? 'Modifiez les informations du profil.' : 'Créez un nouveau profil HR avec ses compétences et tarification.'}
                      </p>
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
                          <Label htmlFor="profile-price">Prix de base (€/mn)</Label>
                          <Input
                            id="profile-price"
                            type="number"
                            value={profileForm.base_price}
                            onChange={(e) => setProfileForm({ ...profileForm, base_price: parseFloat(e.target.value) || 0 })}
                            placeholder="50"
                          />
                        </div>
                        <div className="flex items-center space-x-2 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                          <Switch
                            id="profile-is-ai"
                            checked={profileForm.is_ai}
                            onCheckedChange={(checked) => setProfileForm({ ...profileForm, is_ai: checked })}
                          />
                          <Label htmlFor="profile-is-ai" className="flex items-center gap-2 cursor-pointer">
                            <span className="text-sm font-medium">Ressource IA</span>
                            <span className="text-xs px-2 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded">
                              IA
                            </span>
                          </Label>
                        </div>
                        {profileForm.is_ai && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm text-amber-800">
                              ⚠️ Une ressource IA doit toujours être connectée à une ressource humaine qui la supervise et lui fournit les instructions.
                            </p>
                          </div>
                        )}
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
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{profile.name}</h3>
                          {profile.is_ai && (
                            <span className="text-xs px-2 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded font-semibold">
                              IA
                            </span>
                          )}
                        </div>
                         <p className="text-sm text-muted-foreground">
                           {getCategoryName(profile.category_id)} • {profile.base_price}€/mn
                         </p>
                      </div>
                      <div className="flex gap-2">
                        {profile.is_ai && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedIAProfile(profile);
                              setShowIAConfig(true);
                            }}
                            className="text-primary hover:text-primary"
                          >
                            <Bot className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setProfileForm({
                              name: profile.name,
                              category_id: profile.category_id,
                              base_price: profile.base_price,
                              is_ai: profile.is_ai || false,
                              prompt_id: profile.prompt_id || ''
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
          )}

          {/* Dialog de configuration IA */}
          <Dialog open={showIAConfig} onOpenChange={setShowIAConfig}>
            <DialogContent className="max-w-2xl" aria-describedby="ia-config-description">
              <DialogHeader>
                <DialogTitle>Configuration de la ressource IA</DialogTitle>
              </DialogHeader>
              <p id="ia-config-description" className="text-sm text-muted-foreground mb-4">
                Configurez le prompt système et le comportement de cette ressource IA.
              </p>
              {selectedIAProfile && (
                <IAResourceConfig
                  profileId={selectedIAProfile.id}
                  profileName={selectedIAProfile.name}
                  currentPromptId={selectedIAProfile.prompt_id}
                  onSave={() => {
                    setShowIAConfig(false);
                    fetchAllData();
                  }}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Langues */}
          {activeTab === 'languages' && (
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
                    <DialogContent aria-describedby="language-description">
                      <DialogHeader>
                        <DialogTitle>
                          {languageDialog.edit ? 'Modifier' : 'Créer'} une langue
                        </DialogTitle>
                      </DialogHeader>
                      <p id="language-description" className="text-sm text-muted-foreground mb-4">
                        {languageDialog.edit ? 'Modifiez les informations de la langue.' : 'Ajoutez une nouvelle langue avec son impact sur les coûts.'}
                      </p>
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
          )}

          {/* Expertises */}
          {activeTab === 'expertises' && (
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
                    <DialogContent aria-describedby="expertise-description">
                      <DialogHeader>
                        <DialogTitle>
                          {expertiseDialog.edit ? 'Modifier' : 'Créer'} une expertise
                        </DialogTitle>
                      </DialogHeader>
                      <p id="expertise-description" className="text-sm text-muted-foreground mb-4">
                        {expertiseDialog.edit ? 'Modifiez les informations de l\'expertise.' : 'Créez une nouvelle expertise technique avec son surcoût.'}
                      </p>
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
          )}

          {/* Templates */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              {/* Template Categories */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Catégories de Templates</CardTitle>
                    <Dialog open={templateCategoryDialog.open} onOpenChange={(open) => {
                      setTemplateCategoryDialog({ open, edit: false, data: null });
                      setTemplateCategoryForm({ name: '', description: '', icon: 'FolderOpen', color: 'from-gray-600 to-gray-700', order_index: 0 });
                    }}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Ajouter une catégorie
                        </Button>
                      </DialogTrigger>
                      <DialogContent aria-describedby="template-category-description">
                        <DialogHeader>
                          <DialogTitle>
                            {templateCategoryDialog.edit ? 'Modifier' : 'Créer'} une catégorie de template
                          </DialogTitle>
                        </DialogHeader>
                        <p id="template-category-description" className="text-sm text-muted-foreground mb-4">
                          Configurez une nouvelle catégorie pour organiser vos templates de projets.
                        </p>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="template-cat-name">Nom</Label>
                            <Input
                              id="template-cat-name"
                              value={templateCategoryForm.name}
                              onChange={(e) => setTemplateCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Ex: Communication"
                            />
                          </div>
                          <div>
                            <Label htmlFor="template-cat-desc">Description</Label>
                            <Textarea
                              id="template-cat-desc"
                              value={templateCategoryForm.description}
                              onChange={(e) => setTemplateCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Description de la catégorie"
                            />
                          </div>
                          <div>
                            <Label htmlFor="template-cat-icon">Icône</Label>
                            <Select value={templateCategoryForm.icon} onValueChange={(value) => setTemplateCategoryForm(prev => ({ ...prev, icon: value }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MessageSquare">💬 MessageSquare (Communication)</SelectItem>
                                <SelectItem value="Cloud">☁️ Cloud (Technique)</SelectItem>
                                <SelectItem value="Receipt">🧾 Receipt (Finance)</SelectItem>
                                <SelectItem value="FolderOpen">📁 FolderOpen (Général)</SelectItem>
                                <SelectItem value="Briefcase">💼 Briefcase (Business)</SelectItem>
                                <SelectItem value="Code">💻 Code (Développement)</SelectItem>
                                <SelectItem value="Palette">🎨 Palette (Design)</SelectItem>
                                <SelectItem value="Megaphone">📢 Megaphone (Marketing)</SelectItem>
                                <SelectItem value="Users">👥 Users (RH/Équipe)</SelectItem>
                                <SelectItem value="Target">🎯 Target (Objectifs)</SelectItem>
                                <SelectItem value="Zap">⚡ Zap (Performance)</SelectItem>
                                <SelectItem value="Star">⭐ Star (Premium)</SelectItem>
                                <SelectItem value="Heart">❤️ Heart (Bien-être)</SelectItem>
                                <SelectItem value="Settings">⚙️ Settings (Configuration)</SelectItem>
                                <SelectItem value="Globe">🌍 Globe (International)</SelectItem>
                                <SelectItem value="Shield">🛡️ Shield (Sécurité)</SelectItem>
                                <SelectItem value="Rocket">🚀 Rocket (Innovation)</SelectItem>
                                <SelectItem value="Camera">📷 Camera (Média)</SelectItem>
                                <SelectItem value="Music">🎵 Music (Audio)</SelectItem>
                                <SelectItem value="Book">📚 Book (Formation)</SelectItem>
                                <SelectItem value="Lightbulb">💡 Lightbulb (Idées)</SelectItem>
                                <SelectItem value="TrendingUp">📈 TrendingUp (Croissance)</SelectItem>
                                <SelectItem value="Award">🏆 Award (Excellence)</SelectItem>
                                <SelectItem value="Coffee">☕ Coffee (Détente)</SelectItem>
                                <SelectItem value="Gamepad2">🎮 Gamepad2 (Gaming)</SelectItem>
                                <SelectItem value="Headphones">🎧 Headphones (Support)</SelectItem>
                                <SelectItem value="Monitor">🖥️ Monitor (Digital)</SelectItem>
                                <SelectItem value="Smartphone">📱 Smartphone (Mobile)</SelectItem>
                                <SelectItem value="Database">🗄️ Database (Data)</SelectItem>
                                <SelectItem value="Lock">🔒 Lock (Privé)</SelectItem>
                                <SelectItem value="Wifi">📶 Wifi (Connectivité)</SelectItem>
                                <SelectItem value="Mail">📧 Mail (Communication)</SelectItem>
                                <SelectItem value="Phone">📞 Phone (Contact)</SelectItem>
                                <SelectItem value="MapPin">📍 MapPin (Localisation)</SelectItem>
                                <SelectItem value="Calendar">📅 Calendar (Planning)</SelectItem>
                                <SelectItem value="Clock">🕐 Clock (Temps)</SelectItem>
                                <SelectItem value="DollarSign">💰 DollarSign (Budget)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="template-cat-color">Couleur (gradient)</Label>
                            <Select value={templateCategoryForm.color} onValueChange={(value) => setTemplateCategoryForm(prev => ({ ...prev, color: value }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="from-purple-600 to-pink-600">🌸 Violet-Rose</SelectItem>
                                <SelectItem value="from-blue-600 to-cyan-600">🌊 Bleu-Cyan</SelectItem>
                                <SelectItem value="from-green-600 to-emerald-600">🌿 Vert-Émeraude</SelectItem>
                                <SelectItem value="from-orange-600 to-red-600">🔥 Orange-Rouge</SelectItem>
                                <SelectItem value="from-gray-600 to-gray-700">⚫ Gris</SelectItem>
                                <SelectItem value="from-indigo-600 to-purple-600">🌌 Indigo-Violet</SelectItem>
                                <SelectItem value="from-teal-600 to-blue-600">🐚 Turquoise-Bleu</SelectItem>
                                <SelectItem value="from-yellow-600 to-orange-600">☀️ Jaune-Orange</SelectItem>
                                <SelectItem value="from-rose-600 to-pink-600">🌹 Rose-Pink</SelectItem>
                                <SelectItem value="from-amber-600 to-yellow-600">🍯 Ambre-Jaune</SelectItem>
                                <SelectItem value="from-emerald-600 to-teal-600">💎 Émeraude-Turquoise</SelectItem>
                                <SelectItem value="from-violet-600 to-purple-600">🔮 Violet-Pourpre</SelectItem>
                                <SelectItem value="from-sky-600 to-blue-600">☁️ Ciel-Bleu</SelectItem>
                                <SelectItem value="from-lime-600 to-green-600">🍃 Lime-Vert</SelectItem>
                                <SelectItem value="from-red-600 to-rose-600">❤️ Rouge-Rose</SelectItem>
                                <SelectItem value="from-slate-600 to-gray-600">🪨 Ardoise-Gris</SelectItem>
                                <SelectItem value="from-cyan-600 to-teal-600">🌀 Cyan-Turquoise</SelectItem>
                                <SelectItem value="from-fuchsia-600 to-pink-600">💖 Fuchsia-Rose</SelectItem>
                                <SelectItem value="from-blue-800 to-indigo-800">🌃 Bleu Nuit-Indigo</SelectItem>
                                <SelectItem value="from-green-800 to-emerald-800">🌲 Vert Forêt-Émeraude</SelectItem>
                                <SelectItem value="from-purple-800 to-violet-800">🌜 Pourpre Nuit-Violet</SelectItem>
                                <SelectItem value="from-red-500 to-orange-500">🌅 Rouge Clair-Orange</SelectItem>
                                <SelectItem value="from-blue-500 to-purple-500">🌈 Bleu Clair-Violet</SelectItem>
                                <SelectItem value="from-green-500 to-blue-500">🌍 Vert Clair-Bleu</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button 
                            onClick={async () => {
                              try {
                                if (templateCategoryDialog.edit && templateCategoryDialog.data) {
                                  // Update existing category
                                  const { error } = await supabase
                                    .from('template_categories')
                                    .update({
                                      name: templateCategoryForm.name,
                                      description: templateCategoryForm.description,
                                      icon: templateCategoryForm.icon,
                                      color: templateCategoryForm.color,
                                      order_index: templateCategoryForm.order_index
                                    })
                                    .eq('id', templateCategoryDialog.data.id);

                                  if (error) throw error;

                                  toast({
                                    title: "Catégorie modifiée",
                                    description: "La catégorie de template a été modifiée avec succès.",
                                  });
                                } else {
                                  // Create new category
                                  const { error } = await supabase
                                    .from('template_categories')
                                    .insert({
                                      name: templateCategoryForm.name,
                                      description: templateCategoryForm.description,
                                      icon: templateCategoryForm.icon,
                                      color: templateCategoryForm.color,
                                      order_index: templateCategoryForm.order_index
                                    });

                                  if (error) throw error;

                                  toast({
                                    title: "Catégorie créée",
                                    description: "La catégorie de template a été créée avec succès.",
                                  });
                                }

                                // Refresh data
                                const { data } = await supabase
                                  .from('template_categories')
                                  .select('*')
                                  .order('order_index', { ascending: true });
                                
                                setTemplateCategories(data || []);
                                setTemplateCategoryDialog({ open: false, edit: false, data: null });
                                setTemplateCategoryForm({ name: '', description: '', icon: 'FolderOpen', color: 'from-gray-600 to-gray-700', order_index: 0 });
                              } catch (error) {
                                console.error('Error saving template category:', error);
                                toast({
                                  title: "Erreur",
                                  description: `Impossible de ${templateCategoryDialog.edit ? 'modifier' : 'créer'} la catégorie.`,
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="w-full"
                          >
                            {templateCategoryDialog.edit ? 'Modifier' : 'Créer'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {templateCategories.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Aucune catégorie de template configurée</p>
                        <p className="text-sm">Créez votre première catégorie pour organiser vos templates</p>
                      </div>
                    ) : (
                      templateCategories.map(category => (
                        <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center`}>
                              {category.icon === 'MessageSquare' && <MessageSquare className="w-5 h-5 text-white" />}
                              {category.icon === 'Cloud' && <Cloud className="w-5 h-5 text-white" />}
                              {category.icon === 'Receipt' && <Receipt className="w-5 h-5 text-white" />}
                              {category.icon === 'FolderOpen' && <FolderOpen className="w-5 h-5 text-white" />}
                              {category.icon === 'Briefcase' && <Briefcase className="w-5 h-5 text-white" />}
                              {category.icon === 'Code' && <Code className="w-5 h-5 text-white" />}
                              {category.icon === 'Palette' && <Palette className="w-5 h-5 text-white" />}
                              {category.icon === 'Megaphone' && <Megaphone className="w-5 h-5 text-white" />}
                              {category.icon === 'Users' && <Users className="w-5 h-5 text-white" />}
                              {category.icon === 'Target' && <Target className="w-5 h-5 text-white" />}
                              {category.icon === 'Zap' && <Zap className="w-5 h-5 text-white" />}
                              {category.icon === 'Star' && <Star className="w-5 h-5 text-white" />}
                              {category.icon === 'Heart' && <Heart className="w-5 h-5 text-white" />}
                              {category.icon === 'Settings' && <Settings className="w-5 h-5 text-white" />}
                              {category.icon === 'Globe' && <Globe className="w-5 h-5 text-white" />}
                              {category.icon === 'Shield' && <Shield className="w-5 h-5 text-white" />}
                              {category.icon === 'Rocket' && <Rocket className="w-5 h-5 text-white" />}
                              {category.icon === 'Camera' && <Camera className="w-5 h-5 text-white" />}
                              {category.icon === 'Music' && <Music className="w-5 h-5 text-white" />}
                              {category.icon === 'Book' && <Book className="w-5 h-5 text-white" />}
                              {category.icon === 'Lightbulb' && <Lightbulb className="w-5 h-5 text-white" />}
                              {category.icon === 'TrendingUp' && <TrendingUp className="w-5 h-5 text-white" />}
                              {category.icon === 'Award' && <Award className="w-5 h-5 text-white" />}
                              {category.icon === 'Coffee' && <Coffee className="w-5 h-5 text-white" />}
                              {category.icon === 'Gamepad2' && <Gamepad2 className="w-5 h-5 text-white" />}
                              {category.icon === 'Headphones' && <Headphones className="w-5 h-5 text-white" />}
                              {category.icon === 'Monitor' && <Monitor className="w-5 h-5 text-white" />}
                              {category.icon === 'Smartphone' && <Smartphone className="w-5 h-5 text-white" />}
                              {category.icon === 'Database' && <Database className="w-5 h-5 text-white" />}
                              {category.icon === 'Lock' && <Lock className="w-5 h-5 text-white" />}
                              {category.icon === 'Wifi' && <Wifi className="w-5 h-5 text-white" />}
                              {category.icon === 'Mail' && <Mail className="w-5 h-5 text-white" />}
                              {category.icon === 'Phone' && <Phone className="w-5 h-5 text-white" />}
                              {category.icon === 'MapPin' && <MapPin className="w-5 h-5 text-white" />}
                              {category.icon === 'Calendar' && <Calendar className="w-5 h-5 text-white" />}
                              {category.icon === 'Clock' && <Clock className="w-5 h-5 text-white" />}
                              {category.icon === 'DollarSign' && <DollarSign className="w-5 h-5 text-white" />}
                            </div>
                            <div>
                              <h3 className="font-medium">{category.name}</h3>
                              <p className="text-sm text-muted-foreground">{category.description}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setTemplateCategoryForm({
                                  name: category.name,
                                  description: category.description || '',
                                  icon: category.icon || 'FolderOpen',
                                  color: category.color || 'from-gray-600 to-gray-700',
                                  order_index: category.order_index
                                });
                                setTemplateCategoryDialog({ open: true, edit: true, data: category });
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={async () => {
                                if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
                                  try {
                                    const { error } = await supabase
                                      .from('template_categories')
                                      .delete()
                                      .eq('id', category.id);

                                    if (error) throw error;

                                    toast({
                                      title: "Catégorie supprimée",
                                      description: "La catégorie a été supprimée avec succès.",
                                    });

                                    // Refresh data
                                    const { data } = await supabase
                                      .from('template_categories')
                                      .select('*')
                                      .order('order_index', { ascending: true });
                                    
                                    setTemplateCategories(data || []);
                                  } catch (error) {
                                    console.error('Error deleting category:', error);
                                    toast({
                                      title: "Erreur",
                                      description: "Impossible de supprimer la catégorie.",
                                      variant: "destructive",
                                    });
                                  }
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Project Templates */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Templates de Projets</CardTitle>
                    <Button 
                      disabled={templateCategories.length === 0}
                      onClick={() => setProjectTemplateDialog({ open: true, edit: false, data: null })}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter un template
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {templateCategories.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Créez d'abord des catégories pour pouvoir ajouter des templates</p>
                    </div>
                  ) : projectTemplates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun template de projet configuré</p>
                      <p className="text-sm">Créez votre premier template pour proposer des structures pré-définies</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {projectTemplates.map(template => (
                        <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50">
                          <div>
                            <h3 className="font-medium">{template.name}</h3>
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Équipe: {template.team_size || 'N/A'} personnes</span>
                              <span>{template.price_per_minute || 'N/A'}€/min</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setProjectTemplateForm({
                                  name: template.name,
                                  description: template.description || '',
                                  category_id: template.category_id,
                                  tags: (template.tags || []).join(', '),
                                  reactflow_data: template.reactflow_data || '{}',
                                  order_index: template.order_index || 0,
                                  team_size: template.team_size || 4,
                                  price_per_minute: template.price_per_minute || 1.5
                                });
                                setProjectTemplateDialog({ open: true, edit: true, data: template });
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-destructive"
                              onClick={async () => {
                                if (confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) {
                                  try {
                                    const { error } = await supabase
                                      .from('project_templates')
                                      .delete()
                                      .eq('id', template.id);

                                    if (error) throw error;

                                    toast({
                                      title: "Template supprimé",
                                      description: "Le template a été supprimé avec succès.",
                                    });

                                    // Rafraîchir la liste
                                    fetchAllData();
                                  } catch (error: any) {
                                    console.error('Error deleting template:', error);
                                    toast({
                                      title: "Erreur",
                                      description: error.message || "Impossible de supprimer le template.",
                                      variant: "destructive",
                                    });
                                  }
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Dialog Template de Projet */}
        <Dialog open={projectTemplateDialog.open} onOpenChange={(open) => {
          if (!open) {
            setProjectTemplateDialog({ open: false, edit: false, data: null });
            setProjectTemplateForm({
              name: '', description: '', category_id: '', 
              tags: '', reactflow_data: '{}', order_index: 0,
              team_size: 4, price_per_minute: 1.5
            });
          }
        }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50">
            <DialogHeader className="p-6 pb-4 border-b bg-white/80 backdrop-blur-sm rounded-t-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 text-white" />
                </div>
              </div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {projectTemplateDialog.edit ? 'Modifier le template' : 'Créer un template de projet'}
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-2">
                {projectTemplateDialog.edit 
                  ? 'Modifiez les informations du template de projet'
                  : 'Créez un nouveau template de projet réutilisable'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-8">
                {/* Colonne de gauche - Informations générales */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 p-4 rounded-lg border border-blue-200/20">
                    <h3 className="font-semibold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">Informations générales</h3>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="template-name" className="text-sm font-semibold">Nom du template *</Label>
                        <Input
                          id="template-name"
                          value={projectTemplateForm.name}
                          onChange={(e) => setProjectTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ex: Création site web e-commerce"
                          className="h-12 text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="template-description" className="text-sm font-semibold">Description</Label>
                        <Textarea
                          id="template-description"
                          value={projectTemplateForm.description}
                          onChange={(e) => setProjectTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Description détaillée du template..."
                          rows={3}
                          className="text-base resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="template-category" className="text-sm font-semibold">Catégorie *</Label>
                        <Select
                          value={projectTemplateForm.category_id}
                          onValueChange={(value) => setProjectTemplateForm(prev => ({ ...prev, category_id: value }))}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Sélectionnez une catégorie" />
                          </SelectTrigger>
                          <SelectContent>
                            {templateCategories.map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="team-size" className="text-sm font-semibold">Taille équipe</Label>
                          <Input
                            id="team-size"
                            type="number"
                            min="1"
                            max="20"
                            value={projectTemplateForm.team_size}
                            onChange={(e) => setProjectTemplateForm(prev => ({ ...prev, team_size: Number(e.target.value) }))}
                            className="h-12"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="price-per-minute" className="text-sm font-semibold">Prix/min (€)</Label>
                          <Input
                            id="price-per-minute"
                            type="number"
                            step="0.1"
                            min="0"
                            value={projectTemplateForm.price_per_minute}
                            onChange={(e) => setProjectTemplateForm(prev => ({ ...prev, price_per_minute: Number(e.target.value) }))}
                            className="h-12"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="template-tags" className="text-sm font-semibold">Tags (séparés par des virgules)</Label>
                        <Input
                          id="template-tags"
                          value={projectTemplateForm.tags}
                          onChange={(e) => setProjectTemplateForm(prev => ({ ...prev, tags: e.target.value }))}
                          placeholder="web, frontend, react, typescript"
                          className="h-12"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Colonne de droite - Paramètres du projet */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 p-4 rounded-lg border border-purple-200/20">
                    <h3 className="font-semibold text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">Paramètres et composition</h3>
                    
                    <div className="space-y-4">

                      <div className="space-y-2">
                        <Label htmlFor="reactflow-data" className="text-sm font-semibold">Composition d'équipe (JSON ReactFlow)</Label>
                        <Textarea
                          id="reactflow-data"
                          value={projectTemplateForm.reactflow_data}
                          onChange={(e) => setProjectTemplateForm(prev => ({ ...prev, reactflow_data: e.target.value }))}
                          placeholder='{"nodes": [], "edges": []}'
                          rows={8}
                          className="font-mono text-sm resize-none"
                        />
                        <div className="flex gap-3 mt-3">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              const templateId = projectTemplateDialog.data?.id || 'new';
                              const templateName = projectTemplateForm.name || 'nouveau-template';
                              window.open(`/template-flow?templateId=${templateId}&name=${encodeURIComponent(templateName)}`, '_blank');
                            }}
                          >
                            Composer dans ReactFlow
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="order-index" className="text-sm font-semibold">Ordre d'affichage</Label>
                        <Input
                          id="order-index"
                          type="number"
                          min="0"
                          value={projectTemplateForm.order_index}
                          onChange={(e) => setProjectTemplateForm(prev => ({ ...prev, order_index: Number(e.target.value) }))}
                          className="h-12"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 bg-white/80 backdrop-blur-sm border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setProjectTemplateDialog({ open: false, edit: false, data: null });
                  setProjectTemplateForm({
                    name: '', description: '', category_id: '', 
                    tags: '', reactflow_data: '{}', order_index: 0,
                    team_size: 4, price_per_minute: 1.5
                  });
                }}
                className="flex-1 h-12"
              >
                Annuler
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    // Préparer les données du template
                    const templateData = {
                      name: projectTemplateForm.name,
                      description: projectTemplateForm.description,
                      category_id: projectTemplateForm.category_id,
                      reactflow_data: projectTemplateForm.reactflow_data || '{}',
                      tags: projectTemplateForm.tags ? projectTemplateForm.tags.split(',').map(t => t.trim()) : [],
                      order_index: projectTemplateForm.order_index,
                      team_size: projectTemplateForm.team_size,
                      price_per_minute: projectTemplateForm.price_per_minute,
                      is_active: true,
                      complexity_level: 'medium' as const,
                      estimated_duration: 30,
                      estimated_cost: projectTemplateForm.team_size * projectTemplateForm.price_per_minute * 30
                    };

                    if (projectTemplateDialog.edit && projectTemplateDialog.data) {
                      // Modifier le template existant
                      const { error } = await supabase
                        .from('project_templates')
                        .update(templateData)
                        .eq('id', projectTemplateDialog.data.id);

                      if (error) throw error;

                      toast({
                        title: "Template modifié",
                        description: "Le template a été modifié avec succès"
                      });
                    } else {
                      // Créer un nouveau template
                      const { error } = await supabase
                        .from('project_templates')
                        .insert(templateData);

                      if (error) throw error;

                      toast({
                        title: "Template créé",
                        description: "Le template a été créé avec succès"
                      });
                    }

                    // Rafraîchir la liste des templates
                    await fetchAllData();
                    
                    // Rester dans l'onglet templates
                    setActiveTab('templates');
                    
                    // Fermer le dialog et réinitialiser le formulaire
                    setProjectTemplateDialog({ open: false, edit: false, data: null });
                    setProjectTemplateForm({
                      name: '', description: '', category_id: '', 
                      tags: '', reactflow_data: '{}', order_index: 0,
                      team_size: 4, price_per_minute: 1.5
                    });
                  } catch (error: any) {
                    console.error('Error saving template:', error);
                    toast({
                      title: "Erreur",
                      description: error.message || "Erreur lors de la sauvegarde du template",
                      variant: "destructive"
                    });
                  }
                }}
                disabled={!projectTemplateForm.name || !projectTemplateForm.category_id}
                className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {projectTemplateDialog.edit ? 'Modifier le template' : 'Créer le template'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminResources;