import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface AddTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddTeamMemberModal({ isOpen, onClose, onSuccess }: AddTeamMemberModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    job_title: '',
    first_name: '',
    last_name: '',
    email: '',
    description: '',
    is_billable: false,
    daily_rate: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast.error('Vous devez être connecté');
      return;
    }

    // Validation
    if (!formData.job_title || !formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (formData.is_billable && !formData.daily_rate) {
      toast.error('Veuillez indiquer le tarif journalier pour un membre facturable');
      return;
    }

    setLoading(true);
    
    try {
      // First check if table exists, if not create it
      // Note: The table client_team_members needs to be created manually in Supabase
      // Use the SQL script in CREATE_CLIENT_TEAM_MEMBERS_TABLE.sql
      
      // Insert the team member directly
      const { data, error } = await supabase
        .from('client_team_members')
        .insert({
          client_id: user.id,
          job_title: formData.job_title,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          description: formData.description,
          is_billable: formData.is_billable,
          daily_rate: formData.is_billable ? parseFloat(formData.daily_rate) : null
        })
        .select()
        .single();

      if (error) {
        // Handle specific errors
        if (error.code === '42P01') {
          toast.error('La table des membres d\'équipe n\'existe pas encore. Contactez l\'administrateur.');
        } else if (error.code === '23505') {
          toast.error('Cet email est déjà utilisé pour un membre de votre équipe');
        } else {
          toast.error('Erreur lors de l\'ajout du membre');
        }
        console.error('Error adding team member:', error);
        return;
      }

      // Try to send invitation email to the new team member (optional - don't block on failure)
      if (formData.email && data) {
        // Fire and forget the email invitation
        supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single()
          .then(({ data: clientProfile }) => {
            const clientName = clientProfile 
              ? `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() || 'Client'
              : 'Client';
            
            return supabase.functions.invoke('send-team-member-invite', {
              body: {
                memberEmail: formData.email,
                memberName: `${formData.first_name} ${formData.last_name}`,
                clientName: clientName,
                clientId: user.id,
                memberId: data.id,
                jobTitle: formData.job_title
              }
            });
          })
          .then(({ data: inviteData, error: inviteError }) => {
            if (inviteError) {
              console.error('Error sending invitation:', inviteError);
              // Don't show warning - member was added successfully
            } else if (inviteData?.success) {
              console.log('Invitation email sent successfully');
            }
          })
          .catch(err => {
            console.error('Error in invitation process:', err);
            // Don't show error - member was added successfully
          });
      }

      toast.success('Membre ajouté avec succès');
      
      // Reset form
      setFormData({
        job_title: '',
        first_name: '',
        last_name: '',
        email: '',
        description: '',
        is_billable: false,
        daily_rate: ''
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Une erreur inattendue s\'est produite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter un membre d'équipe</DialogTitle>
            <DialogDescription>
              Ajoutez un membre de votre équipe interne pour l'affecter à vos projets
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="job_title">Poste *</Label>
              <Input
                id="job_title"
                placeholder="Ex: Développeur Frontend"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first_name">Prénom *</Label>
                <Input
                  id="first_name"
                  placeholder="Jean"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="last_name">Nom *</Label>
                <Input
                  id="last_name"
                  placeholder="Dupont"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="jean.dupont@entreprise.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea
                id="description"
                placeholder="Décrivez les compétences et l'expertise de ce membre..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="resize-none"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_billable"
                  checked={formData.is_billable}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_billable: checked })}
                />
                <Label htmlFor="is_billable" className="font-normal">
                  À facturer
                </Label>
              </div>
              
              {formData.is_billable && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="daily_rate">Tarif journalier (€)</Label>
                  <Input
                    id="daily_rate"
                    type="number"
                    step="0.01"
                    placeholder="500"
                    value={formData.daily_rate}
                    onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })}
                    className="w-24"
                    required={formData.is_billable}
                  />
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}