import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Database } from 'lucide-react';

const KanbanDiagnostic = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const checkKanbanStatus = async () => {
    setLoading(true);
    setResults([]);
    const logs: string[] = [];

    try {
      const claudeProjectId = 'a2505a79-1198-44ae-83fb-141c7168afbf';
      
      logs.push(`🔍 Diagnostic Kanban pour Claude 2...`);
      logs.push(`Project ID: ${claudeProjectId}\n`);

      // 1. Vérifier le projet
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', claudeProjectId)
        .single();

      if (projectError) {
        logs.push(`❌ Erreur récupération projet: ${projectError.message}`);
        return;
      }

      logs.push(`✅ Projet trouvé: ${project.title}`);
      logs.push(`   Status: ${project.status}`);
      logs.push(`   Owner: ${project.owner_id}\n`);

      // 2. Vérifier les tableaux Kanban existants
      const { data: kanbanBoards, error: kanbanError } = await supabase
        .from('kanban_boards')
        .select('*')
        .eq('project_id', claudeProjectId);

      logs.push(`📊 Tableaux Kanban existants: ${kanbanBoards?.length || 0}`);
      if (kanbanBoards && kanbanBoards.length > 0) {
        kanbanBoards.forEach((board, index) => {
          logs.push(`   ${index + 1}. ${board.title} (ID: ${board.id})`);
          logs.push(`      Créé par: ${board.created_by}`);
          logs.push(`      Membres: ${board.members?.length || 0}`);
        });
      } else {
        logs.push(`❌ Aucun tableau Kanban trouvé pour Claude 2`);
      }

      // 3. Vérifier les colonnes Kanban
      if (kanbanBoards && kanbanBoards.length > 0) {
        for (const board of kanbanBoards) {
          const { data: columns } = await supabase
            .from('kanban_columns')
            .select('*')
            .eq('board_id', board.id)
            .order('position');

          logs.push(`\n📋 Colonnes pour ${board.title}:`);
          if (columns && columns.length > 0) {
            columns.forEach(col => {
              logs.push(`   - ${col.title} (position: ${col.position})`);
            });
          } else {
            logs.push(`   ❌ Aucune colonne`);
          }
        }
      }

      // 4. Vérifier les bookings acceptés
      const { data: bookings, error: bookingError } = await supabase
        .from('project_bookings')
        .select(`
          *,
          candidate_profiles (
            id, first_name, last_name, email, profile_type
          )
        `)
        .eq('project_id', claudeProjectId)
        .eq('status', 'accepted');

      logs.push(`\n👥 Bookings acceptés: ${bookings?.length || 0}`);
      if (bookings && bookings.length > 0) {
        bookings.forEach((booking, index) => {
          logs.push(`   ${index + 1}. ${booking.candidate_profiles?.first_name} ${booking.candidate_profiles?.last_name}`);
          logs.push(`      Type: ${booking.candidate_profiles?.profile_type}`);
          logs.push(`      Email: ${booking.candidate_profiles?.email}`);
        });
      }

      // 5. Tenter de créer un tableau Kanban si manquant via project-orchestrator
      if (!kanbanBoards || kanbanBoards.length === 0) {
        logs.push(`\n🔧 Création d'un tableau Kanban via project-orchestrator...`);
        
        try {
          const { data: orchestratorData, error: orchestratorError } = await supabase.functions.invoke('project-orchestrator', {
            body: {
              action: 'setup-project',
              projectId: claudeProjectId
            }
          });

          if (orchestratorError) {
            logs.push(`❌ Erreur orchestrateur: ${orchestratorError.message}`);
          } else if (orchestratorData?.success) {
            logs.push(`✅ Tableau Kanban créé avec succès !`);
            logs.push(`   Board ID: ${orchestratorData.data?.kanbanBoardId}`);
            logs.push(`   Kickoff Event ID: ${orchestratorData.data?.kickoffEventId}`);
            logs.push(`   Participants: ${orchestratorData.data?.participantsCount}`);
            
            // Vérifier que le tableau a bien été créé
            const { data: newBoards } = await supabase
              .from('kanban_boards')
              .select('*')
              .eq('project_id', claudeProjectId);
              
            if (newBoards && newBoards.length > 0) {
              logs.push(`\n📊 Vérification: ${newBoards.length} tableau(x) Kanban maintenant présent(s)`);
              
              // Vérifier les colonnes
              const { data: columns } = await supabase
                .from('kanban_columns')
                .select('*')
                .eq('board_id', newBoards[0].id)
                .order('position');

              if (columns && columns.length > 0) {
                logs.push(`📋 Colonnes créées:`);
                columns.forEach(col => {
                  logs.push(`   - ${col.title} (position: ${col.position})`);
                });
              }
            }
          } else {
            logs.push(`❌ Échec de l'orchestrateur: ${JSON.stringify(orchestratorData)}`);
          }
        } catch (funcError: any) {
          logs.push(`❌ Erreur fonction orchestrateur: ${funcError.message}`);
        }
      }

      logs.push(`\n🎉 Diagnostic terminé!`);

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
            Diagnostic Kanban Claude 2
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Ce diagnostic vérifie l'état du tableau Kanban pour Claude 2 et le crée si nécessaire.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={checkKanbanStatus} 
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
                🔍 Diagnostiquer et réparer Kanban
              </>
            )}
          </Button>

          {results.length > 0 && (
            <Alert className="border-blue-500">
              <Database className="h-4 w-4 text-blue-500" />
              <AlertDescription className="whitespace-pre-wrap font-mono text-sm max-h-96 overflow-y-auto">
                {results.join('\n')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KanbanDiagnostic;