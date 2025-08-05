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

interface EditExpertisesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCandidateId: string;
  currentProfileId: string;
  onUpdate: () => void;
}

export function EditExpertisesModal({ isOpen, onClose, currentCandidateId, currentProfileId, onUpdate }: EditExpertisesModalProps) {
  const [selectedExpertises, setSelectedExpertises] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState<string>('');

  // Get category from profile
  const { data: profile } = useQuery({
    queryKey: ['hr-profile', currentProfileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_profiles')
        .select('category_id')
        .eq('id', currentProfileId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentProfileId
  });

  useEffect(() => {
    if (profile) {
      setCategoryId(profile.category_id);
    }
  }, [profile]);

  // Fetch expertises for the category
  const { data: expertises } = useQuery({
    queryKey: ['hr-expertises', categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_expertises')
        .select('*')
        .eq('category_id', categoryId);
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId
  });

  // Fetch current candidate expertises
  const { data: candidateExpertises } = useQuery({
    queryKey: ['candidate-expertises', currentCandidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_expertises')
        .select('expertise_id')
        .eq('candidate_id', currentCandidateId);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCandidateId
  });

  useEffect(() => {
    if (candidateExpertises) {
      setSelectedExpertises(candidateExpertises.map(ce => ce.expertise_id));
    }
  }, [candidateExpertises]);

  const addExpertise = (expertiseId: string) => {
    if (!selectedExpertises.includes(expertiseId)) {
      setSelectedExpertises([...selectedExpertises, expertiseId]);
    }
  };

  const removeExpertise = (expertiseId: string) => {
    setSelectedExpertises(selectedExpertises.filter(id => id !== expertiseId));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Delete existing expertises
      await supabase
        .from('candidate_expertises')
        .delete()
        .eq('candidate_id', currentCandidateId);

      // Insert new expertises
      if (selectedExpertises.length > 0) {
        const expertiseInserts = selectedExpertises.map(expertiseId => ({
          candidate_id: currentCandidateId,
          expertise_id: expertiseId
        }));

        const { error } = await supabase
          .from('candidate_expertises')
          .insert(expertiseInserts);

        if (error) throw error;
      }

      toast.success('Expertises modifiées avec succès');
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
          <DialogTitle>Modifier vos expertises</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Compétences</Label>
            <Select onValueChange={addExpertise}>
              <SelectTrigger>
                <SelectValue placeholder="Ajouter une compétence" />
              </SelectTrigger>
              <SelectContent>
                {expertises?.filter(exp => !selectedExpertises.includes(exp.id)).map((expertise) => (
                  <SelectItem key={expertise.id} value={expertise.id}>
                    {expertise.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedExpertises.map((expId) => {
                const expertise = expertises?.find(e => e.id === expId);
                return (
                  <Badge key={expId} variant="secondary" className="flex items-center gap-1">
                    {expertise?.name}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeExpertise(expId)}
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