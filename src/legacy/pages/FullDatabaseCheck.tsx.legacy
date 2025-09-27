import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, Database } from 'lucide-react';

const FullDatabaseCheck = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [candidateData, setCandidateData] = useState<any>(null);
  const [success, setSuccess] = useState(false);

  const fullCheck = async () => {
    setLoading(true);
    setResults([]);
    setCandidateData(null);
    setSuccess(false);
    const logs: string[] = [];

    try {
      logs.push(`🔍 Diagnostic complet de la base de données...\n`);

      const targetEmail = 'fmeleard+ressource@gmail.com';
      const projectId = 'a2505a79-1198-44ae-83fb-141c7168afbf';

      // Étape 1: Chercher dans toutes les tables de profils possibles
      logs.push(`📊 1. Recherche dans candidate_profiles...`);
      
      const { data: candidateProfiles, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .or(`email.eq.${targetEmail},email.ilike.%fmeleard%`);

      logs.push(`   Résultat: ${candidateProfiles?.length || 0} candidat(s)`);
      if (candidateProfiles && candidateProfiles.length > 0) {
        candidateProfiles.forEach((candidate, index) => {
          logs.push(`   ${index + 1}. ${candidate.first_name} ${candidate.last_name} - ${candidate.email}`);
        });
      }

      // Étape 2: Chercher dans la table profiles générale
      logs.push(`\n📊 2. Recherche dans profiles (table générale)...`);
      
      const { data: generalProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.eq.${targetEmail},email.ilike.%fmeleard%`);

      logs.push(`   Résultat: ${generalProfiles?.length || 0} profil(s)`);
      if (generalProfiles && generalProfiles.length > 0) {
        generalProfiles.forEach((profile, index) => {
          logs.push(`   ${index + 1}. ${profile.first_name || 'N/A'} ${profile.last_name || 'N/A'} - ${profile.email || 'N/A'}`);
          logs.push(`       Role: ${profile.role || 'N/A'}, ID: ${profile.id}`);
        });
      }

      // Étape 3: Recherche large dans candidate_profiles avec LIKE
      logs.push(`\n📊 3. Recherche élargie "Francis" dans candidate_profiles...`);
      
      const { data: francisSearch, error: francisError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .or('first_name.ilike.%francis%,last_name.ilike.%meleard%');

      logs.push(`   Résultat: ${francisSearch?.length || 0} candidat(s) Francis/Meleard`);
      if (francisSearch && francisSearch.length > 0) {
        francisSearch.forEach((candidate, index) => {
          logs.push(`   ${index + 1}. ${candidate.first_name} ${candidate.last_name} - ${candidate.email}`);
          logs.push(`       ID: ${candidate.id}, Profil: ${candidate.profile_id}`);
        });
        setCandidateData(francisSearch[0]); // Garder le premier trouvé
      }

      // Étape 4: Chercher dans les tables de langues et expertises
      logs.push(`\n📊 4. Vérification des tables de relations...`);
      
      if (francisSearch && francisSearch.length > 0) {
        const candidateId = francisSearch[0].id;
        
        // Vérifier les langues
        const { data: languages } = await supabase
          .from('candidate_languages')
          .select(`
            *,
            hr_languages (name)
          `)
          .eq('candidate_id', candidateId);

        logs.push(`   Langues: ${languages?.length || 0} trouvée(s)`);
        languages?.forEach(lang => {
          logs.push(`     - ${lang.hr_languages?.name}`);
        });

        // Vérifier les expertises
        const { data: expertises } = await supabase
          .from('candidate_expertises')
          .select(`
            *,
            hr_expertises (name)
          `)
          .eq('candidate_id', candidateId);

        logs.push(`   Expertises: ${expertises?.length || 0} trouvée(s)`);
        expertises?.forEach(exp => {
          logs.push(`     - ${exp.hr_expertises?.name}`);
        });
      }

      // Étape 5: Vérifier les assignments Claude 2
      logs.push(`\n📊 5. État des assignments Claude 2...`);
      
      const { data: assignments } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id,
          booking_status,
          profile_id,
          seniority,
          languages,
          expertises,
          hr_profiles (name)
        `)
        .eq('project_id', projectId);

      logs.push(`   Assignments: ${assignments?.length || 0} trouvé(s)`);
      assignments?.forEach((assignment, index) => {
        logs.push(`   ${index + 1}. ${assignment.hr_profiles?.name} - ${assignment.booking_status}`);
        logs.push(`       Langues: ${assignment.languages?.join(', ') || 'Aucune'}`);
        logs.push(`       Expertises: ${assignment.expertises?.join(', ') || 'Aucune'}`);
      });

      // Étape 6: Chercher les notifications existantes
      logs.push(`\n📊 6. Recherche de notifications...`);
      
      if (francisSearch && francisSearch.length > 0) {
        const candidateId = francisSearch[0].id;
        
        const { data: notifications } = await supabase
          .from('candidate_notifications')
          .select('*')
          .eq('candidate_id', candidateId);

        logs.push(`   Notifications: ${notifications?.length || 0} trouvée(s)`);
        notifications?.forEach((notif, index) => {
          logs.push(`   ${index + 1}. ${notif.title} - ${notif.status}`);
          logs.push(`       Projet: ${notif.project_id === projectId ? 'Claude 2' : 'Autre'}`);
        });

        // Créer notification si candidat trouvé mais pas de notification Claude 2
        const claudeNotifs = notifications?.filter(n => n.project_id === projectId) || [];
        
        if (claudeNotifs.length === 0) {
          logs.push(`\n📝 Création de notification Claude 2 pour le candidat trouvé...`);
          
          const { data: assignment } = await supabase
            .from('hr_resource_assignments')
            .select('id')
            .eq('project_id', projectId)
            .eq('booking_status', 'recherche')
            .limit(1)
            .single();

          if (assignment) {
            const { error: notifError } = await supabase
              .from('candidate_notifications')
              .insert({
                candidate_id: candidateId,
                project_id: projectId,
                resource_assignment_id: assignment.id,
                title: 'Nouvelle mission: Claude 2',
                description: 'Mission de Directeur marketing pour Claude 2 - Correspond à votre profil !',
                status: 'unread'
              });

            if (!notifError) {
              logs.push(`✅ Notification Claude 2 créée pour ${francisSearch[0].first_name}`);
              setSuccess(true);
            } else {
              logs.push(`❌ Erreur création notification: ${notifError.message}`);
            }
          }
        } else {
          logs.push(`✅ ${claudeNotifs.length} notification(s) Claude 2 déjà existante(s)`);
          setSuccess(true);
        }
      }

      // Étape 7: Résumé final
      logs.push(`\n📊 RÉSUMÉ FINAL:`);
      logs.push(`✅ Candidat Francis trouvé: ${francisSearch && francisSearch.length > 0 ? 'OUI' : 'NON'}`);
      logs.push(`✅ Assignment Claude 2 visible: ${assignments?.some(a => a.booking_status === 'recherche') ? 'OUI' : 'NON'}`);
      logs.push(`✅ Notification Claude 2: ${success ? 'CRÉÉE/EXISTANTE' : 'MANQUANTE'}`);

      if (success) {
        logs.push(`\n🎉 PROBLÈME RÉSOLU !`);
        logs.push(`👉 Le candidat peut maintenant voir Claude 2 dans son dashboard`);
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
            <Database className="h-5 w-5 text-blue-500" />
            Diagnostic Complet Base de Données
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Le candidat existe dans l'interface mais pas dans nos requêtes API. 
              Ce diagnostic va explorer toutes les tables pour le trouver et connecter Claude 2.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={fullCheck} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Diagnostic en cours...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                🔍 Lancer diagnostic complet
              </>
            )}
          </Button>

          {candidateData && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Candidat trouvé</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <div><strong>Nom:</strong> {candidateData.first_name} {candidateData.last_name}</div>
                  <div><strong>Email:</strong> {candidateData.email}</div>
                  <div><strong>ID:</strong> {candidateData.id}</div>
                  <div><strong>Profil:</strong> {candidateData.profile_id}</div>
                </div>
              </CardContent>
            </Card>
          )}

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
                <h4 className="font-semibold text-green-800 mb-2">🎉 Candidat connecté à Claude 2!</h4>
                <p className="text-green-700 mb-2">
                  Le candidat Francis a été trouvé et la notification Claude 2 est maintenant active.
                </p>
                <p className="font-medium text-green-800">
                  👉 Vérifiez le dashboard candidat maintenant!
                </p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FullDatabaseCheck;