import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface EditJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCandidateId: string;
  currentProfileId: string;
  onUpdate: () => void;
}

export function EditJobModal({ isOpen, onClose, currentCandidateId, currentProfileId, onUpdate }: EditJobModalProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState(currentProfileId || '');
  const [loading, setLoading] = useState(false);

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['hr-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_categories').select('*');
      if (error) throw error;
      return data;
    }
  });

  // Fetch current profile to get category
  const { data: currentProfile } = useQuery({
    queryKey: ['current-hr-profile', currentProfileId],
    queryFn: async () => {
      if (!currentProfileId) return null;
      const { data, error } = await supabase
        .from('hr_profiles')
        .select('*, hr_categories(id, name)')
        .eq('id', currentProfileId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentProfileId
  });

  // Fetch profiles by category
  const { data: profiles } = useQuery({
    queryKey: ['hr-profiles', selectedCategoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_profiles')
        .select('*')
        .eq('category_id', selectedCategoryId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCategoryId
  });

  // Set initial category when current profile is loaded
  useEffect(() => {
    if (currentProfile?.hr_categories?.id && !selectedCategoryId) {
      setSelectedCategoryId(currentProfile.hr_categories.id);
    }
  }, [currentProfile, selectedCategoryId]);

  const handleSave = async () => {
    if (!selectedProfileId) {
      toast.error('Veuillez sélectionner un poste');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ profile_id: selectedProfileId })
        .eq('id', currentCandidateId);

      if (error) throw error;

      toast.success('Poste modifié avec succès');
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
          <DialogTitle>Modifier votre poste</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Domaine d'expertise</Label>
            <Select 
              value={selectedCategoryId} 
              onValueChange={(value) => {
                setSelectedCategoryId(value);
                setSelectedProfileId('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez votre domaine" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCategoryId && (
            <div>
              <Label>Poste / Fonction</Label>
              <Select 
                value={selectedProfileId} 
                onValueChange={setSelectedProfileId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez votre poste" />
                </SelectTrigger>
                <SelectContent>
                  {profiles?.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={loading || !selectedProfileId}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}