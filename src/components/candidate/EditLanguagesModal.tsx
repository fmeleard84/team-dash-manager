import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface EditLanguagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCandidateId: string;
  onUpdate: () => void;
}

export function EditLanguagesModal({ isOpen, onClose, currentCandidateId, onUpdate }: EditLanguagesModalProps) {
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all languages
  const { data: languages } = useQuery({
    queryKey: ['hr-languages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_languages').select('*');
      if (error) throw error;
      return data;
    }
  });

  // Fetch current candidate languages
  const { data: candidateLanguages } = useQuery({
    queryKey: ['candidate-languages', currentCandidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_languages')
        .select('language_id')
        .eq('candidate_id', currentCandidateId);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCandidateId
  });

  useEffect(() => {
    if (candidateLanguages) {
      setSelectedLanguages(candidateLanguages.map(cl => cl.language_id));
    }
  }, [candidateLanguages]);

  const addLanguage = (languageId: string) => {
    if (!selectedLanguages.includes(languageId)) {
      setSelectedLanguages([...selectedLanguages, languageId]);
    }
  };

  const removeLanguage = (languageId: string) => {
    setSelectedLanguages(selectedLanguages.filter(id => id !== languageId));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Delete existing languages
      await supabase
        .from('candidate_languages')
        .delete()
        .eq('candidate_id', currentCandidateId);

      // Insert new languages
      if (selectedLanguages.length > 0) {
        const languageInserts = selectedLanguages.map(languageId => ({
          candidate_id: currentCandidateId,
          language_id: languageId
        }));

        const { error } = await supabase
          .from('candidate_languages')
          .insert(languageInserts);

        if (error) throw error;
      }

      toast.success('Langues modifiées avec succès');
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error('Erreur lors de la modification: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier vos langues</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Langues parlées</Label>
            <Select onValueChange={addLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Ajouter une langue" />
              </SelectTrigger>
              <SelectContent>
                {languages?.filter(lang => !selectedLanguages.includes(lang.id)).map((language) => (
                  <SelectItem key={language.id} value={language.id}>
                    {language.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedLanguages.map((langId) => {
                const language = languages?.find(l => l.id === langId);
                return (
                  <Badge key={langId} variant="secondary" className="flex items-center gap-1">
                    {language?.name}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeLanguage(langId)}
                    />
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}