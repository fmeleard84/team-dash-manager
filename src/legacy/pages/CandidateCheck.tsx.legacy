import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, Users } from 'lucide-react';

const CandidateCheck = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [success, setSuccess] = useState(false);

  const checkCandidates = async () => {
    setLoading(true);
    setResults([]);
    setCandidates([]);
    setSuccess(false);
    const logs: string[] = [];

    try {
      logs.push(`👥 Vérification des candidats...\n`);

      const targetEmail = 'fmeleard+ressource@gmail.com';
      const projectId = 'a2505a79-1198-44ae-83fb-141c7168afbf';

      // Étape 1: Chercher le candidat exact
      logs.push(`🔍 Recherche du candidat: ${targetEmail}`);
      
      const { data: exactCandidate, error: exactError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('email', targetEmail);

      if (exactError) {
        logs.push(`❌ Erreur recherche exacte: ${exactError.message}`);
      } else {
        logs.push(`📊 ${exactCandidate?.length || 0} candidat(s) trouvé(s) avec cet email exact`);
        
        if (exactCandidate && exactCandidate.length > 0) {
          exactCandidate.forEach((candidate, index) => {
            logs.push(`  ${index + 1}. ${candidate.first_name} ${candidate.last_name} (ID: ${candidate.id})`);
            logs.push(`     Email: ${candidate.email}`);
            logs.push(`     Profil: ${candidate.profile_id}`);
            logs.push(`     Séniorité: ${candidate.seniority}`);
          });
          setCandidates(exactCandidate);
        }
      }

      // Étape 2: Recherche plus large si pas trouvé
      if (!exactCandidate || exactCandidate.length === 0) {
        logs.push(`\n🔍 Recherche élargie avec "fmeleard"...`);
        
        const { data: similarCandidates, error: similarError } = await supabase
          .from('candidate_profiles')
          .select('*')
          .like('email', '%fmeleard%');

        if (!similarError && similarCandidates) {
          logs.push(`📊 ${similarCandidates.length} candidat(s) trouvé(s) avec "fmeleard"`);
          
          similarCandidates.forEach((candidate, index) => {
            logs.push(`  ${index + 1}. ${candidate.first_name} ${candidate.last_name}`);
            logs.push(`     Email: ${candidate.email}`);
          });
          setCandidates(similarCandidates);
        }
      }

      // Étape 3: Si candidat trouvé, vérifier ses notifications
      if (exactCandidate && exactCandidate.length === 1) {
        const candidate = exactCandidate[0];
        logs.push(`\n📬 Vérification des notifications pour ${candidate.first_name}...`);
        
        const { data: notifications, error: notifError } = await supabase
          .from('candidate_notifications')
          .select('*')
          .eq('candidate_id', candidate.id);

        if (!notifError && notifications) {
          logs.push(`📋 ${notifications.length} notification(s) totale(s)`);
          
          const claudeNotifs = notifications.filter(n => n.project_id === projectId);
          logs.push(`📋 ${claudeNotifs.length} notification(s) pour Claude 2`);
          
          claudeNotifs.forEach((notif, index) => {
            logs.push(`  ${index + 1}. ${notif.title} - Statut: ${notif.status}`);
          });

          if (claudeNotifs.length > 0) {
            // Réactiver les notifications si nécessaire
            for (const notif of claudeNotifs) {
              if (notif.status !== 'unread') {
                const { error: updateError } = await supabase
                  .from('candidate_notifications')
                  .update({ status: 'unread' })
                  .eq('id', notif.id);

                if (!updateError) {
                  logs.push(`✅ Notification réactivée: ${notif.title}`);
                }
              }
            }
          }
        }

        // Étape 4: Vérifier si tout est maintenant visible
        logs.push(`\n🔍 Vérification finale...`);
        
        const { data: finalAssignments } = await supabase
          .from('hr_resource_assignments')
          .select('id, booking_status, hr_profiles(name)')
          .eq('project_id', projectId)
          .eq('booking_status', 'recherche');

        const { data: finalNotifications } = await supabase
          .from('candidate_notifications')
          .select('id, status')
          .eq('candidate_id', candidate.id)
          .eq('project_id', projectId)
          .eq('status', 'unread');

        logs.push(`\n📊 État final pour ${candidate.first_name} ${candidate.last_name}:`);
        logs.push(`✅ Assignments visibles: ${finalAssignments?.length || 0}`);
        logs.push(`✅ Notifications actives: ${finalNotifications?.length || 0}`);

        if ((finalAssignments?.length || 0) > 0 && (finalNotifications?.length || 0) > 0) {
          logs.push(`\n🎉 PARFAIT !`);
          logs.push(`✨ Claude 2 est visible au candidat ${candidate.first_name}`);
          logs.push(`📱 Le candidat peut voir la mission dans son dashboard`);
          logs.push(`\n👉 Vérifiez : /candidate-dashboard`);
          logs.push(`📧 Connectez-vous avec: ${candidate.email}`);
          setSuccess(true);
        } else {
          logs.push(`⚠️ Quelque chose manque encore...`);
          
          if ((finalAssignments?.length || 0) === 0) {
            logs.push(`❌ Aucun assignment visible`);
          }
          if ((finalNotifications?.length || 0) === 0) {
            logs.push(`❌ Aucune notification active`);
          }
        }

      } else if (exactCandidate && exactCandidate.length > 1) {
        logs.push(`\n⚠️ Problème: Plusieurs candidats avec le même email !`);
        logs.push(`🔧 Il faut nettoyer les doublons en base`);
      } else {
        logs.push(`\n❌ Aucun candidat trouvé avec cet email`);
        logs.push(`🔧 Il faut créer le candidat ou vérifier l'email`);
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
            <Users className="h-5 w-5 text-blue-500" />
            Vérification Candidat & Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Cette page diagnostique le problème avec le candidat fmeleard+ressource@gmail.com
              et vérifie pourquoi la recherche retourne "multiple (or no) rows".
            </AlertDescription>
          </Alert>

          <Button 
            onClick={checkCandidates} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Vérification en cours...
              </>
            ) : (
              <>
                <Users className="mr-2 h-4 w-4" />
                🔍 Vérifier le candidat et ses notifications
              </>
            )}
          </Button>

          {candidates.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Candidats trouvés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {candidates.map((candidate, index) => (
                    <div key={candidate.id} className="p-3 border rounded-lg">
                      <div className="font-medium">{candidate.first_name} {candidate.last_name}</div>
                      <div className="text-sm text-gray-600">{candidate.email}</div>
                      <div className="text-xs text-gray-500">ID: {candidate.id}</div>
                      <div className="text-xs text-gray-500">Profil: {candidate.profile_id}</div>
                    </div>
                  ))}
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
                <h4 className="font-semibold text-green-800 mb-2">🎉 Candidat vérifié et configuré!</h4>
                <p className="text-green-700 mb-2">
                  Le candidat peut maintenant voir Claude 2 dans ses missions.
                </p>
                <p className="font-medium text-green-800">
                  👉 Testez en vous connectant avec l'email du candidat au dashboard candidat!
                </p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CandidateCheck;