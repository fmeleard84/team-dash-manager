import { useState } from 'react';
import { FullScreenModal, ModalActions } from "@/components/ui/fullscreen-modal";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EditRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCandidateId: string;
  currentRate: number;
  onUpdate: () => void;
}

export function EditRateModal({ isOpen, onClose, currentCandidateId, currentRate, onUpdate }: EditRateModalProps) {
  const [dailyRate, setDailyRate] = useState(currentRate);
  const [loading, setLoading] = useState(false);

  const calculateHourlyRate = () => (dailyRate / 8).toFixed(2);
  const calculateMinuteRate = () => (dailyRate / (8 * 60)).toFixed(2);

  const handleSave = async () => {
    if (dailyRate <= 0) {
      toast.error('Le tarif doit être supérieur à 0');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ daily_rate: dailyRate })
        .eq('id', currentCandidateId);

      if (error) throw error;

      toast.success('Tarif modifié avec succès');
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
          <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Modifier votre tarif</h2>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Tarif journalier (€)</Label>
            <Input
              type="number"
              value={dailyRate}
              onChange={(e) => setDailyRate(parseFloat(e.target.value) || 0)}
              min="0"
              step="10"
            />
            <div className="text-sm text-muted-foreground mt-1">
              Tarif horaire: {calculateHourlyRate()}€ | Tarif minute: {calculateMinuteRate()}€
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={loading || dailyRate <= 0}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </div>
    </FullScreenModal>
  );
}