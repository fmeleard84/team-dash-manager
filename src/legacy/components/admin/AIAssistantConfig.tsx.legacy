/**
 * Interface d'administration pour configurer l'assistant IA
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, Plus, Trash2, Edit2, Copy, 
  Bot, FileText, Wand2, RefreshCw, AlertCircle,
  ChevronRight, Check, X, Code
} from 'lucide-react';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { 
  DEFAULT_SYSTEM_PROMPTS, 
  loadCustomPrompts, 
  saveCustomPrompts,
  updatePrompt,
  addCustomPrompt,
  deletePrompt,
  resetToDefaultPrompts,
  type SystemPrompt 
} from '@/ai-assistant/config/prompts';
import { ASSISTANT_TOOLS, type ToolDefinition } from '@/ai-assistant/config/tools';
import { PLATFORM_KNOWLEDGE } from '@/ai-assistant/config/knowledge-base';

export function AIAssistantConfig() {
  const [activeTab, setActiveTab] = useState('general');
  const [apiKey, setApiKey] = useState('');
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<SystemPrompt | null>(null);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [enabledTools, setEnabledTools] = useState<Record<string, boolean>>({});
  const [testMode, setTestMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Dialog states
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [promptForm, setPromptForm] = useState<Partial<SystemPrompt>>({
    name: '',
    context: 'general',
    prompt: '',
    priority: 0,
    active: true
  });

  // Charger la configuration au montage
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = () => {
    // Charger la clé API
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) setApiKey(savedKey);

    // Charger les prompts
    const customPrompts = loadCustomPrompts();
    setPrompts(customPrompts);

    // Charger les tools activés
    const savedTools = localStorage.getItem('ai_assistant_enabled_tools');
    if (savedTools) {
      setEnabledTools(JSON.parse(savedTools));
    } else {
      // Par défaut, tous les tools sont activés
      const allEnabled: Record<string, boolean> = {};
      ASSISTANT_TOOLS.forEach(tool => {
        allEnabled[tool.function.name] = true;
      });
      setEnabledTools(allEnabled);
    }

    // Mode test
    const savedTestMode = localStorage.getItem('ai_assistant_test_mode');
    setTestMode(savedTestMode === 'true');
  };

  const saveConfiguration = () => {
    // Sauvegarder la clé API
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
    }

    // Sauvegarder les prompts
    saveCustomPrompts(prompts);

    // Sauvegarder les tools
    localStorage.setItem('ai_assistant_enabled_tools', JSON.stringify(enabledTools));

    // Sauvegarder le mode test
    localStorage.setItem('ai_assistant_test_mode', testMode.toString());

    setHasChanges(false);
    toast({
      title: '✅ Configuration sauvegardée',
      description: 'Les paramètres de l\'assistant ont été enregistrés'
    });
  };

  const handleResetPrompts = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les prompts aux valeurs par défaut ?')) {
      resetToDefaultPrompts();
      const defaultPrompts = Object.values(DEFAULT_SYSTEM_PROMPTS);
      setPrompts(defaultPrompts);
      setHasChanges(true);
      toast({
        title: 'Prompts réinitialisés',
        description: 'Les prompts ont été restaurés aux valeurs par défaut'
      });
    }
  };

  const handleAddPrompt = () => {
    setPromptForm({
      name: '',
      context: 'general',
      prompt: '',
      priority: 0,
      active: true
    });
    setShowPromptDialog(true);
  };

  const handleEditPrompt = (prompt: SystemPrompt) => {
    setPromptForm(prompt);
    setShowPromptDialog(true);
  };

  const handleSavePrompt = () => {
    if (!promptForm.name || !promptForm.prompt) {
      toast({
        title: 'Erreur',
        description: 'Le nom et le contenu du prompt sont requis',
        variant: 'destructive'
      });
      return;
    }

    if (promptForm.id) {
      // Mise à jour
      const updated = updatePrompt(promptForm.id, promptForm as SystemPrompt);
      setPrompts(updated);
    } else {
      // Création
      const updated = addCustomPrompt(promptForm as Omit<SystemPrompt, 'id' | 'createdAt'>);
      setPrompts(updated);
    }

    setShowPromptDialog(false);
    setHasChanges(true);
    toast({
      title: promptForm.id ? 'Prompt modifié' : 'Prompt ajouté',
      description: 'Le prompt a été enregistré avec succès'
    });
  };

  const handleDeletePrompt = (promptId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce prompt ?')) {
      const updated = deletePrompt(promptId);
      setPrompts(updated);
      setHasChanges(true);
      toast({
        title: 'Prompt supprimé',
        description: 'Le prompt a été supprimé avec succès'
      });
    }
  };

  const handleToggleTool = (toolName: string) => {
    setEnabledTools(prev => ({
      ...prev,
      [toolName]: !prev[toolName]
    }));
    setHasChanges(true);
  };

  const handleTestAPIKey = async () => {
    if (!apiKey) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer une clé API',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (response.ok) {
        toast({
          title: '✅ Clé API valide',
          description: 'La connexion à OpenAI a réussi'
        });
      } else {
        throw new Error('Invalid API key');
      }
    } catch (error) {
      toast({
        title: 'Clé API invalide',
        description: 'Impossible de se connecter à OpenAI',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brand to-brand/80 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Configuration de l'AI Assistant</h2>
            <p className="text-muted-foreground">Gérez les Settings et le comportement de l'assistant</p>
          </div>
        </div>
        <Button 
          onClick={saveConfiguration}
          disabled={!hasChanges}
        >
          <Save className="w-4 h-4 mr-2" />
          Sauvegarder
        </Button>
      </div>

      {hasChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vous avez des modifications non sauvegardées. N'oubliez pas d'Save avant de quitter.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="tools">Outils</TabsTrigger>
          <TabsTrigger value="knowledge">Base de connaissances</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Settings généraux</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">Clé API OpenAI</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setHasChanges(true);
                    }}
                    placeholder="sk-..."
                  />
                  <Button variant="outline" onClick={handleTestAPIKey}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Tester
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Votre clé API OpenAI pour utiliser l'assistant. Elle doit avoir accès à l'API Realtime.
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="test-mode">Mode test</Label>
                  <p className="text-sm text-muted-foreground">
                    Active les Logs détaillés et les fonctions de débogage
                  </p>
                </div>
                <Switch
                  id="test-mode"
                  checked={testMode}
                  onCheckedChange={(checked) => {
                    setTestMode(checked);
                    setHasChanges(true);
                  }}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Prompts Management */}
        <TabsContent value="prompts" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Gestion des prompts</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleResetPrompts}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Réinitialiser
                </Button>
                <Button size="sm" onClick={handleAddPrompt}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {prompts.map(prompt => (
                  <div
                    key={prompt.id}
                    className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{prompt.name}</h4>
                          <Badge variant="secondary">{prompt.context}</Badge>
                          {prompt.active ? (
                            <Badge variant="default" className="text-xs">Actif</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Inactif</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {prompt.prompt}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Priorité: {prompt.priority}</span>
                          {prompt.updatedAt && (
                            <span>Modifié: {new Date(prompt.updatedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPrompt(prompt)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePrompt(prompt.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* Tools Configuration */}
        <TabsContent value="tools" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Outils Availables</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Activez ou désactivez les outils que l'assistant peut utiliser.
            </p>

            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {ASSISTANT_TOOLS.map(tool => (
                  <div
                    key={tool.function.name}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Wand2 className="w-4 h-4 text-brand" />
                          <h4 className="font-medium font-mono text-sm">
                            {tool.function.name}
                          </h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {tool.function.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="outline">
                            {tool.function.parameters.required?.length || 0} params requis
                          </Badge>
                          <Badge variant="outline">
                            {Object.keys(tool.function.parameters.properties).length} params total
                          </Badge>
                        </div>
                      </div>
                      <Switch
                        checked={enabledTools[tool.function.name] !== false}
                        onCheckedChange={() => {
                          handleToggleTool(tool.function.name);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* Knowledge Base */}
        <TabsContent value="knowledge" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Base de connaissances</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Informations que l'assistant utilise pour comprendre la plateforme.
            </p>

            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {Object.entries(PLATFORM_KNOWLEDGE).map(([key, knowledge]) => (
                  <div
                    key={key}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-brand mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{knowledge.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {knowledge.description}
                        </p>
                        <div className="flex items-center gap-2">
                          {knowledge.workflows && (
                            <Badge variant="secondary">
                              {knowledge.workflows.length} étapes
                            </Badge>
                          )}
                          {knowledge.tips && (
                            <Badge variant="secondary">
                              {knowledge.tips.length} conseils
                            </Badge>
                          )}
                          {knowledge.relatedFeatures && (
                            <Badge variant="secondary">
                              {knowledge.relatedFeatures.length} liens
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Prompt Dialog */}
      <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {promptForm.id ? 'Modifier le prompt' : 'Ajouter un prompt'}
            </DialogTitle>
            <DialogDescription>
              Créez ou modifiez un prompt System pour l'assistant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="prompt-name">Name</Label>
              <Input
                id="prompt-name"
                value={promptForm.name}
                onChange={(e) => setPromptForm({ ...promptForm, name: e.target.value })}
                placeholder="Ex: Assistant Commercial"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prompt-context">Contexte</Label>
                <Select
                  value={promptForm.context}
                  onValueChange={(value) => setPromptForm({ ...promptForm, context: value as any })}
                >
                  <SelectTrigger id="prompt-context">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Général</SelectItem>
                    <SelectItem value="team-composition">Composition d'Team</SelectItem>
                    <SelectItem value="project-management">Gestion de Project</SelectItem>
                    <SelectItem value="meeting">Réunions</SelectItem>
                    <SelectItem value="task-management">Tâches</SelectItem>
                    <SelectItem value="technical">Technique</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt-priority">Priorité</Label>
                <Input
                  id="prompt-priority"
                  type="number"
                  value={promptForm.priority}
                  onChange={(e) => setPromptForm({ ...promptForm, priority: parseInt(e.target.value) })}
                  min="0"
                  max="10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt-content">Contenu du prompt</Label>
              <Textarea
                id="prompt-content"
                value={promptForm.prompt}
                onChange={(e) => setPromptForm({ ...promptForm, prompt: e.target.value })}
                placeholder="Entrez les instructions pour l'assistant..."
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="prompt-active"
                checked={promptForm.active}
                onCheckedChange={(checked) => setPromptForm({ ...promptForm, active: checked })}
              />
              <Label htmlFor="prompt-active">Prompt actif</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromptDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSavePrompt}>
              {promptForm.id ? 'Edit' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}