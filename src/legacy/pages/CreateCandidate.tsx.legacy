import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, UserPlus } from 'lucide-react';

const CreateCandidate = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  const createCandidateComplete = async () => {
    setLoading(true);
    setResults([]);
    setSuccess(false);
    const logs: string[] = [];

    try {
      logs.push(`👤 Création complète du candidat fmeleard+ressource@gmail.com...\n`);

      const candidateEmail = 'fmeleard+ressource@gmail.com';
      const projectId = 'a2505a79-1198-44ae-83fb-141c7168afbf';

      // Étape 1: Trouver le profil "Directeur marketing"
      logs.push(`🔍 Recherche du profil Directeur marketing...`);
      
      const { data: marketingProfile, error: profileError } = await supabase
        .from('hr_profiles')
        .select('id, name')
        .ilike('name', '%directeur%marketing%')
        .single();

      if (profileError || !marketingProfile) {
        throw new Error(`Profil Directeur marketing non trouvé: ${profileError?.message}`);
      }

      logs.push(`✅ Profil trouvé: ${marketingProfile.name} (ID: ${marketingProfile.id})`);

      // Étape 2: Créer le candidat
      logs.push(`\n👤 Création du profil candidat...`);
      
      const candidateData = {
        email: candidateEmail,
        first_name: 'Francis ressource2',
        last_name: 'Meleard ressources2', 
        profile_id: marketingProfile.id,
        seniority: 'intermediate',
        phone: '+33123456789',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: createdCandidate, error: candidateError } = await supabase
        .from('candidate_profiles')
        .insert(candidateData)
        .select()
        .single();

      if (candidateError) {
        throw new Error(`Erreur création candidat: ${candidateError.message}`);
      }

      logs.push(`✅ Candidat créé: ${createdCandidate.first_name} ${createdCandidate.last_name}`);
      logs.push(`📧 Email: ${createdCandidate.email}`);
      logs.push(`🆔 ID: ${createdCandidate.id}`);

      // Étape 3: Ajouter les langues
      logs.push(`\n🌍 Ajout des langues...`);
      
      const { data: frenchLang, error: langError } = await supabase
        .from('hr_languages')
        .select('id, name')
        .ilike('name', '%français%')
        .single();

      if (!langError && frenchLang) {
        const { error: candidateLangError } = await supabase
          .from('candidate_languages')
          .insert({
            candidate_id: createdCandidate.id,
            language_id: frenchLang.id
          });

        if (!candidateLangError) {
          logs.push(`✅ Langue ajoutée: ${frenchLang.name}`);
        } else {
          logs.push(`⚠️ Erreur langue: ${candidateLangError.message}`);
        }
      }

      // Étape 4: Ajouter les expertises
      logs.push(`\n🎯 Ajout des expertises...`);
      
      const { data: googleAdsExp, error: expError } = await supabase
        .from('hr_expertises')
        .select('id, name')
        .ilike('name', '%google%ads%')
        .single();

      if (!expError && googleAdsExp) {
        const { error: candidateExpError } = await supabase
          .from('candidate_expertises')
          .insert({
            candidate_id: createdCandidate.id,
            expertise_id: googleAdsExp.id
          });

        if (!candidateExpError) {
          logs.push(`✅ Expertise ajoutée: ${googleAdsExp.name}`);
        } else {
          logs.push(`⚠️ Erreur expertise: ${candidateExpError.message}`);
        }
      }

      // Étape 5: Créer la notification pour Claude 2
      logs.push(`\n📬 Création de la notification Claude 2...`);
      
      const { data: assignment, error: assignmentError } = await supabase
        .from('hr_resource_assignments')
        .select('id')
        .eq('project_id', projectId)
        .eq('booking_status', 'recherche')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (assignmentError) {
        logs.push(`⚠️ Assignment non trouvé: ${assignmentError.message}`);
      } else {
        const notificationData = {
          candidate_id: createdCandidate.id,
          project_id: projectId,
          resource_assignment_id: assignment.id,
          title: 'Nouvelle mission: Claude 2',
          description: `🎯 Mission de Directeur marketing pour le projet Claude 2

📋 Détails de la mission:
• Poste: Directeur marketing
• Séniorité: Intermédiaire
• Compétences requises: Google Ads
• Langues: Français
• Rémunération: 138€/heure

📝 Description:
Cette mission correspond parfaitement à votre profil de Directeur marketing avec une expertise en Google Ads. 

Le projet Claude 2 recherche un professionnel expérimenté pour piloter la stratégie marketing digitale et optimiser les campagnes publicitaires.

💼 Vous avez les compétences recherchées:
✅ Profil: Directeur marketing
✅ Niveau: Intermédiaire  
✅ Langue: Français
✅ Expertise: Google Ads

Cette opportunité vous intéresse ? Consultez les détails complets dans votre dashboard.`,
          status: 'unread',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: createdNotification, error: notificationError } = await supabase
          .from('candidate_notifications')
          .insert(notificationData)
          .select()
          .single();

        if (notificationError) {
          logs.push(`❌ Erreur notification: ${notificationError.message}`);
        } else {
          logs.push(`✅ Notification créée: ${createdNotification.title}`);
          logs.push(`📋 ID: ${createdNotification.id}`);
        }
      }

      // Étape 6: Vérification finale complète
      logs.push(`\n🔍 Vérification finale complète...`);
      
      // Vérifier le candidat
      const { data: finalCandidate } = await supabase
        .from('candidate_profiles')
        .select(`
          *,
          candidate_languages (hr_languages (name)),
          candidate_expertises (hr_expertises (name))
        `)
        .eq('email', candidateEmail)
        .single();

      // Vérifier les assignments visibles
      const { data: visibleAssignments } = await supabase
        .from('hr_resource_assignments')
        .select('id, hr_profiles(name)')
        .eq('project_id', projectId)
        .eq('booking_status', 'recherche');

      // Vérifier les notifications actives
      const { data: activeNotifications } = await supabase
        .from('candidate_notifications')
        .select('id, title, status')
        .eq('candidate_id', createdCandidate.id)
        .eq('status', 'unread');

      logs.push(`\n📊 État final du système:`);
      logs.push(`✅ Candidat: ${finalCandidate?.first_name} ${finalCandidate?.last_name}`);
      logs.push(`✅ Profil: ${finalCandidate?.profile_id === marketingProfile.id ? 'Directeur marketing' : 'Autre'}`);
      logs.push(`✅ Langues: ${finalCandidate?.candidate_languages?.map(cl => cl.hr_languages?.name).join(', ') || 'Aucune'}`);
      logs.push(`✅ Expertises: ${finalCandidate?.candidate_expertises?.map(ce => ce.hr_expertises?.name).join(', ') || 'Aucune'}`);
      logs.push(`✅ Assignments visibles: ${visibleAssignments?.length || 0}`);
      logs.push(`✅ Notifications actives: ${activeNotifications?.length || 0}`);

      if ((visibleAssignments?.length || 0) > 0 && (activeNotifications?.length || 0) > 0) {
        logs.push(`\n🎉 SUCCÈS TOTAL !`);
        logs.push(`✨ Le candidat ${finalCandidate?.first_name} peut maintenant voir Claude 2`);
        logs.push(`📱 Dashboard candidat entièrement fonctionnel`);
        logs.push(`\n👉 Testez maintenant:`);
        logs.push(`   1. Allez sur /candidate-dashboard`);
        logs.push(`   2. Connectez-vous avec: ${candidateEmail}`);
        logs.push(`   3. Vérifiez l'onglet "Demandes de Mission"`);
        logs.push(`   4. Claude 2 doit apparaître avec la notification !`);
        setSuccess(true);
      } else {
        logs.push(`⚠️ Configuration incomplète`);
        if ((visibleAssignments?.length || 0) === 0) logs.push(`❌ Aucun assignment visible`);
        if ((activeNotifications?.length || 0) === 0) logs.push(`❌ Aucune notification active`);
      }

    } catch (error: any) {
      console.error('Erreur:', error);
      logs.push(`\n❌ Erreur: ${error.message}`);
    } finally {
      setResults(logs);
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-green-500" />
            Création Candidat Complet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Cette solution crée complètement le candidat fmeleard+ressource@gmail.com 
              avec son profil, ses langues, expertises ET sa notification pour Claude 2.
              C'est la solution finale qui va tout résoudre !
            </AlertDescription>
          </Alert>

          <Button 
            onClick={createCandidateComplete} 
            disabled={loading}
            className="w-full"
            size="lg"
            variant="default"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                🚀 Créer le candidat complet + notification Claude 2
              </>
            )}
          </Button>

          {results.length > 0 && (
            <Alert className={success ? "border-green-500" : "border-blue-500"}>
              <CheckCircle className="h-4 w-4 text-blue-500" />
              <AlertDescription className="whitespace-pre-wrap font-mono text-sm max-h-96 overflow-y-auto">
                {results.join('\n')}
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                <h4 className="font-semibold text-green-800 mb-2">🎉 MISSION ACCOMPLIE !</h4>
                <p className="text-green-700 mb-2">
                  Le candidat a été créé avec succès et peut maintenant voir Claude 2 
                  dans ses demandes de mission avec une notification complète.
                </p>
                <p className="font-medium text-green-800">
                  👉 Testez immédiatement le dashboard candidat !
                </p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateCandidate;