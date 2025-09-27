import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit, Trash2, Save, X, MessageSquare, FileText, Activity, ChevronUp, ChevronDown, Shield, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  is_active?: boolean; // Pour compatibilité
  is_published?: boolean; // Nouveau champ de faq_items
  order_index: number;
  embedding_synced_at?: string; // Date de dernière synchronisation
  updated_at?: string; // Date de dernière modification
}

interface Prompt {
  id: string;
  name: string;
  context: string; // Obligatoire dans prompts_ia  
  prompt: string; // Obligatoire dans prompts_ia
  active: boolean; // Pour prompts_ia
  priority: number;
  variables?: any;
  promptType?: 'system' | 'context' | 'behavior'; // Type dérivé pour l'affichage
}

interface ActionLog {
  id: string;
  user_id: string;
  action_type: string;
  action_data: any;
  result: any;
  status: string;
  error_message?: string;
  created_at: string;
}

// Mapping entre context de la DB et types d'affichage
const contextToType = (context: string): 'system' | 'context' | 'behavior' => {
  if (context === 'general') return 'system';
  if (context === 'behavior') return 'behavior';
  if (['team-composition', 'project-management', 'technical', 'meeting', 'task-management'].includes(context)) return 'context';
  return 'system'; // Par défaut
};

const typeToContext = (type: 'system' | 'context' | 'behavior'): string => {
  if (type === 'system') return 'general';
  if (type === 'context') return 'team-composition'; // Par défaut pour context
  if (type === 'behavior') return 'behavior';
  return 'general';
};

export function AIAssistantManager() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixingPermissions, setFixingPermissions] = useState(false);
  const [syncingEmbeddings, setSyncingEmbeddings] = useState(false);
  
  // État pour l'édition
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'faq' | 'prompt'>('faq');

  // Charger les données
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger les FAQ depuis faq_items (table avec RLS correctes)
      const { data: faqData, error: faqError } = await supabase
        .from('faq_items')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (!faqError && faqData) {
        // Adapter les données pour compatibilité
        const adaptedFaqs = faqData.map((faq: any) => ({
          ...faq,
          is_active: faq.is_published !== undefined ? faq.is_published : faq.is_active
        }));
        setFaqs(adaptedFaqs);
      }

      // Charger les prompts depuis prompts_ia (table avec RLS correctes)
      const { data: promptData, error: promptError } = await supabase
        .from('prompts_ia')
        .select('*')
        .order('priority', { ascending: false });
      
      if (!promptError && promptData) {
        // Ajouter le type dérivé pour l'affichage
        const enrichedPrompts = promptData.map(p => ({
          ...p,
          promptType: contextToType(p.context)
        }));
        setPrompts(enrichedPrompts);
      }

      // Charger les logs d'actions
      const { data: logData, error: logError } = await supabase
        .from('ai_action_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!logError && logData) {
        setActionLogs(logData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Gestion des FAQ
  const handleSaveFaq = async () => {
    if (!editingFaq) return;

    try {
      if (editingFaq.id) {
        // Mise à jour
        const { error } = await supabase
          .from('faq_items')
          .update({
            question: editingFaq.question,
            answer: editingFaq.answer,
            category: editingFaq.category,
            tags: editingFaq.tags,
            is_published: editingFaq.is_active,
            order_index: editingFaq.order_index
          })
          .eq('id', editingFaq.id);

        if (error) throw error;
        toast({ title: 'FAQ mise à jour avec succès' });
      } else {
        // Création
        const { error } = await supabase
          .from('faq_items')
          .insert({
            question: editingFaq.question,
            answer: editingFaq.answer,
            category: editingFaq.category,
            tags: editingFaq.tags,
            is_published: editingFaq.is_active,
            order_index: editingFaq.order_index || 0
          });

        if (error) throw error;
        toast({ title: 'FAQ créée avec succès' });
      }

      setIsDialogOpen(false);
      setEditingFaq(null);
      loadData();
    } catch (error: any) {
      console.error('Error saving FAQ:', error);
      const isPermissionError = error?.code === '42501' || error?.message?.includes('policy');
      toast({
        title: 'Erreur',
        description: isPermissionError 
          ? 'Erreur de permissions. Cliquez sur "Corriger permissions" et réessayez.'
          : 'Impossible de sauvegarder la FAQ',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette FAQ ?')) return;

    try {
      const { error } = await supabase
        .from('faq_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'FAQ supprimée avec succès' });
      loadData();
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la FAQ',
        variant: 'destructive'
      });
    }
  };

  // Gestion des Prompts
  const handleSavePrompt = async () => {
    if (!editingPrompt) return;

    try {
      if (editingPrompt.id && !editingPrompt.id.startsWith('custom_')) {
        // Mise à jour
        const { error } = await supabase
          .from('prompts_ia')
          .update({
            name: editingPrompt.name,
            context: editingPrompt.context || 'general',
            prompt: editingPrompt.prompt,
            active: editingPrompt.active !== false,
            priority: editingPrompt.priority,
            variables: editingPrompt.variables || {}
          })
          .eq('id', editingPrompt.id);

        if (error) throw error;
        toast({ title: 'Prompt mis à jour avec succès' });
      } else {
        // Création - générer un ID unique pour prompts_ia
        const newId = `custom_${Date.now()}`;
        const { error } = await supabase
          .from('prompts_ia')
          .insert({
            id: newId,
            name: editingPrompt.name,
            context: editingPrompt.context || 'general',
            prompt: editingPrompt.prompt,
            active: editingPrompt.active !== false,
            priority: editingPrompt.priority || 0,
            variables: editingPrompt.variables || {}
          });

        if (error) throw error;
        toast({ title: 'Prompt créé avec succès' });
      }

      setIsDialogOpen(false);
      setEditingPrompt(null);
      loadData();
    } catch (error: any) {
      console.error('Error saving prompt:', error);
      const isPermissionError = error?.code === '42501' || error?.message?.includes('policy');
      toast({
        title: 'Erreur',
        description: isPermissionError 
          ? 'Erreur de permissions. Cliquez sur "Corriger permissions" et réessayez.'
          : 'Impossible de sauvegarder le prompt',
        variant: 'destructive'
      });
    }
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce prompt ?')) return;

    try {
      const { error } = await supabase
        .from('prompts_ia')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Prompt supprimé avec succès' });
      loadData();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le prompt',
        variant: 'destructive'
      });
    }
  };

  // Corriger les permissions
  const fixPermissions = async () => {
    setFixingPermissions(true);
    try {
      const { data, error } = await supabase.functions.invoke('fix-admin-permissions');
      
      if (error) throw error;
      
      toast({
        title: 'Permissions corrigées',
        description: 'Vos permissions administrateur ont été mises à jour. Réessayez votre action.',
      });
      
      // Recharger les données après correction
      await loadData();
    } catch (error) {
      console.error('Error fixing permissions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de corriger les permissions',
        variant: 'destructive'
      });
    } finally {
      setFixingPermissions(false);
    }
  };

  // Synchroniser les embeddings des FAQs
  const syncFaqEmbeddings = async () => {
    setSyncingEmbeddings(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-faq-embeddings');
      
      if (error) throw error;
      
      toast({
        title: 'Synchronisation réussie',
        description: `Les FAQs ont été synchronisées avec la base vectorielle. ${data?.results?.length || 0} FAQs traitées.`,
      });
    } catch (error) {
      console.error('Error syncing embeddings:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de synchroniser les embeddings',
        variant: 'destructive'
      });
    } finally {
      setSyncingEmbeddings(false);
    }
  };

  // Réorganiser les FAQ
  const moveFaq = async (id: string, direction: 'up' | 'down') => {
    const index = faqs.findIndex(f => f.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= faqs.length) return;

    const newFaqs = [...faqs];
    [newFaqs[index], newFaqs[newIndex]] = [newFaqs[newIndex], newFaqs[index]];
    
    // Mettre à jour les order_index
    for (let i = 0; i < newFaqs.length; i++) {
      newFaqs[i].order_index = i;
    }
    
    setFaqs(newFaqs);

    // Sauvegarder en base
    try {
      await Promise.all(
        newFaqs.map(faq => 
          supabase
            .from('faq_items')
            .update({ order_index: faq.order_index })
            .eq('id', faq.id)
        )
      );
    } catch (error) {
      console.error('Error reordering FAQs:', error);
      loadData(); // Recharger en cas d'erreur
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Gestion de l'Assistant IA</CardTitle>
            <CardDescription>
              Configurez les FAQ, prompts et suivez les actions de l'assistant vocal
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={fixPermissions}
            disabled={fixingPermissions}
          >
            <Shield className="w-4 h-4 mr-2" />
            {fixingPermissions ? 'Correction...' : 'Corriger permissions'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="faq" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="faq">
              <MessageSquare className="w-4 h-4 mr-2" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="prompts">
              <FileText className="w-4 h-4 mr-2" />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Activity className="w-4 h-4 mr-2" />
              Historique
            </TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Questions Fréquentes</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={syncFaqEmbeddings}
                  disabled={syncingEmbeddings}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncingEmbeddings ? 'animate-spin' : ''}`} />
                  {syncingEmbeddings ? 'Synchronisation...' : 'Synchroniser vectoriel'}
                </Button>
                <Button
                  onClick={() => {
                    setEditingFaq({
                      id: '',
                      question: '',
                      answer: '',
                      category: '',
                      tags: [],
                      is_active: true,
                      order_index: faqs.length
                    });
                    setDialogType('faq');
                    setIsDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter FAQ
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <Card key={faq.id} className={!faq.is_active ? 'opacity-50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{faq.category}</Badge>
                            {!faq.is_active && <Badge variant="destructive">Inactif</Badge>}
                            {/* Indicateur de synchronisation */}
                            {faq.embedding_synced_at ? (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                <span className="text-xs text-green-600">Synchronisé</span>
                              </div>
                            ) : faq.updated_at && (!faq.embedding_synced_at || new Date(faq.updated_at) > new Date(faq.embedding_synced_at)) ? (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-yellow-500" />
                                <span className="text-xs text-yellow-600">Non synchronisé</span>
                              </div>
                            ) : null}
                          </div>
                          <h4 className="font-semibold mb-2">{faq.question}</h4>
                          <p className="text-sm text-muted-foreground">{faq.answer}</p>
                          {faq.tags && faq.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {faq.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <div className="flex flex-col gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => moveFaq(faq.id, 'up')}
                              disabled={index === 0}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => moveFaq(faq.id, 'down')}
                              disabled={index === faqs.length - 1}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingFaq(faq);
                              setDialogType('faq');
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteFaq(faq.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Prompts Tab */}
          <TabsContent value="prompts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Prompts de l'Assistant</h3>
              <Button
                onClick={() => {
                  setEditingPrompt({
                    id: '',
                    name: '',
                    context: 'general',
                    prompt: '',
                    active: true,
                    priority: 0,
                    promptType: 'system'
                  });
                  setDialogType('prompt');
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter Prompt
              </Button>
            </div>

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {prompts.map(prompt => (
                  <Card key={prompt.id} className={prompt.active === false ? 'opacity-50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge>
                              {prompt.promptType === 'system' ? 'Système' :
                               prompt.promptType === 'context' ? 'Contexte' : 'Comportement'}
                            </Badge>
                            <Badge variant="outline">Priorité: {prompt.priority}</Badge>
                            {prompt.active === false && <Badge variant="destructive">Inactif</Badge>}
                          </div>
                          <h4 className="font-semibold mb-2">{prompt.name}</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {prompt.prompt}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingPrompt(prompt);
                              setDialogType('prompt');
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeletePrompt(prompt.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Historique des Actions</h3>
              <Button variant="outline" onClick={loadData}>
                Rafraîchir
              </Button>
            </div>

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-2">
                {actionLogs.map(log => (
                  <Card key={log.id}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={
                              log.status === 'success' ? 'default' :
                              log.status === 'failed' ? 'destructive' : 'secondary'
                            }>
                              {log.status}
                            </Badge>
                            <span className="text-sm font-medium">{log.action_type}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          {log.error_message && (
                            <p className="text-sm text-destructive mt-1">
                              Erreur: {log.error_message}
                            </p>
                          )}
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer">
                              Détails
                            </summary>
                            <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-x-auto">
                              {JSON.stringify(log.action_data, null, 2)}
                            </pre>
                          </details>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Dialog pour édition */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {dialogType === 'faq' ? 
                  (editingFaq?.id ? 'Modifier la FAQ' : 'Nouvelle FAQ') :
                  (editingPrompt?.id ? 'Modifier le Prompt' : 'Nouveau Prompt')
                }
              </DialogTitle>
              <DialogDescription>
                {dialogType === 'faq' ? 
                  'Gérez les questions fréquentes pour aider les utilisateurs' :
                  'Configurez les prompts pour personnaliser le comportement de l\'assistant'
                }
              </DialogDescription>
            </DialogHeader>

            {dialogType === 'faq' && editingFaq && (
              <div className="space-y-4">
                <div>
                  <Label>Question</Label>
                  <Input
                    value={editingFaq.question}
                    onChange={(e) => setEditingFaq({...editingFaq, question: e.target.value})}
                    placeholder="Quelle est la question ?"
                  />
                </div>
                <div>
                  <Label>Réponse</Label>
                  <Textarea
                    value={editingFaq.answer}
                    onChange={(e) => setEditingFaq({...editingFaq, answer: e.target.value})}
                    placeholder="Réponse détaillée..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <Input
                    value={editingFaq.category}
                    onChange={(e) => setEditingFaq({...editingFaq, category: e.target.value})}
                    placeholder="Ex: Projets, Équipe, Planning..."
                  />
                </div>
                <div>
                  <Label>Tags (séparés par des virgules)</Label>
                  <Input
                    value={editingFaq.tags.join(', ')}
                    onChange={(e) => setEditingFaq({
                      ...editingFaq, 
                      tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                    })}
                    placeholder="tag1, tag2, tag3..."
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingFaq.is_active}
                    onCheckedChange={(checked) => setEditingFaq({...editingFaq, is_active: checked})}
                  />
                  <Label>Actif</Label>
                </div>
              </div>
            )}

            {dialogType === 'prompt' && editingPrompt && (
              <div className="space-y-4">
                <div>
                  <Label>Nom</Label>
                  <Input
                    value={editingPrompt.name}
                    onChange={(e) => setEditingPrompt({...editingPrompt, name: e.target.value})}
                    placeholder="Nom du prompt"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={editingPrompt.promptType || 'system'}
                    onValueChange={(value: 'system' | 'context' | 'behavior') => {
                      const newContext = typeToContext(value);
                      setEditingPrompt({
                        ...editingPrompt, 
                        promptType: value,
                        context: newContext
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">Système</SelectItem>
                      <SelectItem value="context">Contexte</SelectItem>
                      <SelectItem value="behavior">Comportement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editingPrompt.promptType === 'context' && (
                  <div>
                    <Label>Contexte spécifique</Label>
                    <Select
                      value={editingPrompt.context}
                      onValueChange={(value) => setEditingPrompt({...editingPrompt, context: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="team-composition">Composition d'équipe</SelectItem>
                        <SelectItem value="project-management">Gestion de projet</SelectItem>
                        <SelectItem value="technical">Technique</SelectItem>
                        <SelectItem value="meeting">Réunion</SelectItem>
                        <SelectItem value="task-management">Gestion des tâches</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Contenu du prompt</Label>
                  <Textarea
                    value={editingPrompt.prompt || ''}
                    onChange={(e) => setEditingPrompt({...editingPrompt, prompt: e.target.value})}
                    placeholder="Entrez le contenu du prompt ici..."
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <Label>Priorité (0-10)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    value={editingPrompt.priority}
                    onChange={(e) => setEditingPrompt({...editingPrompt, priority: parseInt(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingPrompt.active !== false}
                    onCheckedChange={(checked) => setEditingPrompt({...editingPrompt, active: checked})}
                  />
                  <Label>Actif</Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={dialogType === 'faq' ? handleSaveFaq : handleSavePrompt}>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}