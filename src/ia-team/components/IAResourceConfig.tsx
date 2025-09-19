import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Brain, Save, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { IAPrompt } from '../types/ia-team.types';

interface IAResourceConfigProps {
  profileId: string;
  profileName: string;
  currentPromptId?: string;
  onSave?: () => void;
}

export function IAResourceConfig({ profileId, profileName, currentPromptId, onSave }: IAResourceConfigProps) {
  const [prompts, setPrompts] = useState<IAPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>(currentPromptId || '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPrompts();
  }, []);

  useEffect(() => {
    if (currentPromptId) {
      setSelectedPromptId(currentPromptId);
    }
  }, [currentPromptId]);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      // Charger les prompts IA depuis la table prompts_ia
      const { data, error } = await supabase
        .from('prompts_ia')
        .select('*')
        .in('context', ['ia_writer', 'ia_project_manager', 'ia_developer', 'ia_designer', 'ia_analyst', 'general'])
        .eq('active', true)
        .order('priority', { ascending: false });

      if (error) throw error;

      if (data) {
        setPrompts(data);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des prompts:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les prompts IA',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedPromptId) {
      toast({
        title: 'Attention',
        description: 'Veuillez sélectionner un prompt',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      // Mettre à jour le prompt_id dans hr_profiles
      const { error: updateError } = await supabase
        .from('hr_profiles')
        .update({ prompt_id: selectedPromptId })
        .eq('id', profileId);

      if (updateError) throw updateError;

      // Créer ou mettre à jour l'entrée dans ia_resource_prompts
      const { error: upsertError } = await supabase
        .from('ia_resource_prompts')
        .upsert({
          profile_id: profileId,
          prompt_id: selectedPromptId,
          is_primary: true,
          context: 'general'
        }, {
          onConflict: 'profile_id,prompt_id'
        });

      if (upsertError) throw upsertError;

      toast({
        title: 'Succès',
        description: 'Configuration IA sauvegardée',
      });

      if (onSave) onSave();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de sauvegarder la configuration',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const getPromptTypeLabel = (context: string) => {
    switch (context) {
      case 'ia_writer': return 'Rédacteur';
      case 'ia_project_manager': return 'Chef de Projet';
      case 'ia_developer': return 'Développeur';
      case 'ia_designer': return 'Designer';
      case 'ia_analyst': return 'Analyste';
      case 'general': return 'Général';
      default: return context;
    }
  };

  const getPromptTypeColor = (context: string) => {
    switch (context) {
      case 'ia_writer': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'ia_project_manager': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'ia_developer': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'ia_designer': return 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300';
      case 'ia_analyst': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          Configuration IA - {profileName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt-select" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Prompt système de l'IA
          </Label>
          <Select
            value={selectedPromptId}
            onValueChange={setSelectedPromptId}
            disabled={loading}
          >
            <SelectTrigger id="prompt-select">
              <SelectValue placeholder="Sélectionner un prompt système..." />
            </SelectTrigger>
            <SelectContent>
              {prompts.map((prompt) => (
                <SelectItem key={prompt.id} value={prompt.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{prompt.name}</span>
                    <Badge className={`ml-2 ${getPromptTypeColor(prompt.context)}`}>
                      {getPromptTypeLabel(prompt.context)}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPromptId && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <Label className="text-sm font-medium">Aperçu du prompt :</Label>
            <p className="text-sm text-muted-foreground">
              {prompts.find(p => p.id === selectedPromptId)?.prompt || ''}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Ce prompt définira le comportement et les capacités de cette ressource IA dans les projets.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            onClick={handleSave}
            disabled={!selectedPromptId || saving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}