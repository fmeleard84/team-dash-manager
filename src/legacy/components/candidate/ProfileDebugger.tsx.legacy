import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function ProfileDebugger() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    job_title: 'Directeur Marketing Senior',
    seniority_level: 'Senior',
    technical_skills: ['Google Ads', 'SEO', 'Marketing Digital', 'Analytics'],
    languages: ['Français', 'Anglais'],
    bio: 'Expert en marketing digital avec spécialisation Google Ads et SEO'
  });

  const checkProfile = async () => {
    if (!user) {
      toast.error('Pas d\'utilisateur connecté');
      return;
    }

    setLoading(true);
    try {
      // Appeler la fonction Edge pour déboguer
      const { data, error } = await supabase.functions.invoke('debug-user-profile');
      
      if (error) {
        console.error('Erreur fonction:', error);
        toast.error('Erreur lors de la vérification du profil');
      } else {
        console.log('📊 Données profil:', data);
        setProfileData(data);
        
        if (data.profile) {
          toast.success(`Profil trouvé dans ${data.source}`);
        } else {
          toast.warning('Aucun profil trouvé');
        }
      }
    } catch (err) {
      console.error('Erreur:', err);
      toast.error('Erreur inattendue');
    } finally {
      setLoading(false);
    }
  };

  const createOrUpdateProfile = async () => {
    if (!user) {
      toast.error('Pas d\'utilisateur connecté');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ensure-user-profile', {
        body: { profileData: formData }
      });
      
      if (error) {
        console.error('Erreur création profil:', error);
        toast.error('Erreur lors de la création du profil');
      } else {
        console.log('✅ Profil créé/mis à jour:', data);
        toast.success(`Profil ${data.action === 'created' ? 'créé' : 'mis à jour'} avec succès!`);
        setShowForm(false);
        // Recharger le profil
        await checkProfile();
      }
    } catch (err) {
      console.error('Erreur:', err);
      toast.error('Erreur inattendue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkProfile();
    }
  }, [user]);

  if (!user) {
    return <div>Pas d'utilisateur connecté</div>;
  }

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Debug Profil Utilisateur</h3>
      
      <div className="space-y-2 mb-4">
        <div className="text-sm">
          <strong>User ID:</strong> {user.id}
        </div>
        <div className="text-sm">
          <strong>Email:</strong> {user.email}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Button 
          onClick={checkProfile} 
          disabled={loading}
          size="sm"
        >
          {loading ? 'Vérification...' : 'Vérifier Profil'}
        </Button>
        
        <Button 
          onClick={() => setShowForm(!showForm)} 
          disabled={loading}
          size="sm"
          variant="outline"
        >
          {showForm ? 'Annuler' : 'Créer/Modifier Profil Marketing'}
        </Button>
      </div>

      {showForm && (
        <div className="border rounded p-4 mb-4 bg-blue-50">
          <h4 className="font-semibold mb-3">Créer/Modifier Profil Marketing</h4>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="job_title">Poste</Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                placeholder="Ex: Directeur Marketing Senior"
              />
            </div>
            
            <div>
              <Label htmlFor="seniority">Niveau de séniorité</Label>
              <Input
                id="seniority"
                value={formData.seniority_level}
                onChange={(e) => setFormData({...formData, seniority_level: e.target.value})}
                placeholder="Ex: Senior"
              />
            </div>
            
            <div>
              <Label htmlFor="skills">Compétences (séparées par des virgules)</Label>
              <Input
                id="skills"
                value={formData.technical_skills.join(', ')}
                onChange={(e) => setFormData({
                  ...formData, 
                  technical_skills: e.target.value.split(',').map(s => s.trim())
                })}
                placeholder="Ex: Google Ads, SEO, Marketing Digital"
              />
            </div>
            
            <Button 
              onClick={createOrUpdateProfile}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'En cours...' : 'Enregistrer le profil Marketing'}
            </Button>
          </div>
        </div>
      )}

      {profileData && (
        <div className="border rounded p-3 bg-gray-50">
          <h4 className="font-semibold mb-2">Données du profil:</h4>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(profileData, null, 2)}
          </pre>
        </div>
      )}
    </Card>
  );
}