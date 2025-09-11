import { useState } from 'react';
import { FullScreenModal, ModalActions } from "@/components/ui/fullscreen-modal";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type SeniorityType = 'junior' | 'intermediate' | 'senior';

interface EditSeniorityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCandidateId: string;
  currentSeniority: SeniorityType;
  onUpdate: () => void;
}

export function EditSeniorityModal({ isOpen, onClose, currentCandidateId, currentSeniority, onUpdate }: EditSeniorityModalProps) {
  const [seniority, setSeniority] = useState<SeniorityType>(currentSeniority);
  const [loading, setLoading] = useState(false);

  const seniorityOptions: { value: SeniorityType; label: string }[] = [
    { value: 'junior', label: 'Junior' },
    { value: 'intermediate', label: 'Intermédiaire' },
    { value: 'senior', label: 'Senior' }
  ];

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ seniority })
        .eq('id', currentCandidateId);

      if (error) throw error;

      toast.success('Séniorité modifiée avec succès');
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error('Erreur lors de la modification: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FullScreenModal isOpen={isOpen} onClose={() => onClose(false)} title="" description="">
      <div className="space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Modifier votre séniorité</h2>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Niveau de séniorité</Label>
            <Select value={seniority} onValueChange={(value) => setSeniority(value as SeniorityType)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un niveau" />
              </SelectTrigger>
              <SelectContent>
                {seniorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
      </div>
    </FullScreenModal>
  );
}