import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

const KanbanVisibilityCheck = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const checkVisibility = async () => {
    if (!user?.profile?.email) return;
    setLoading(true);

    try {
      const claudeProjectId = 'a2505a79-1198-44ae-83fb-141c7168afbf';
      
      // 1. Candidat
      const { data: candidate } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('email', user.profile.email)
        .single();

      // 2. Tableaux Kanban
      const { data: kanbanBoards } = await supabase
        .from('kanban_boards')
        .select('*')
        .eq('project_id', claudeProjectId);

      // 3. Bookings du candidat
      const { data: allBookings } = await supabase
        .from('project_bookings')
        .select(`
          *,
          projects (*)
        `)
        .eq('candidate_id', candidate?.id);

      // 4. Bookings spécifiquement pour Claude 2
      const { data: claudeBookings } = await supabase
        .from('project_bookings')
        .select(`
          *,
          projects (*)
        `)
        .eq('candidate_id', candidate?.id)
        .eq('project_id', claudeProjectId);

      // 5. Simpler l'exact même appel que useCandidateProjectsOptimized
      const { data: optimizedBookings } = await supabase
        .from('project_bookings')
        .select(`
          project_id,
          projects (
            id,
            title,
            description,
            status,
            project_date,
            due_date,
            client_budget
          )
        `)
        .eq('candidate_id', candidate?.id)
        .eq('status', 'accepted');

      // 6. Projet Claude 2 spécifique
      const { data: claudeProject } = await supabase
        .from('projects')
        .select('*')
        .eq('id', claudeProjectId)
        .single();

      setData({
        candidate,
        kanbanBoards,
        allBookings,
        claudeBookings,
        optimizedBookings,
        claudeProject,
        candidateId: candidate?.id,
        claudeProjectId
      });

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkVisibility();
  }, [user]);

  if (!data) return <div>Chargement...</div>;

  const claudeInOptimized = data.optimizedBookings?.find((b: any) => b.project_id === data.claudeProjectId);

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Diagnostic Visibilité Kanban Claude 2
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div>
            <h3 className="font-semibold text-lg mb-2">👤 Candidat</h3>
            <div className="bg-gray-50 p-3 rounded">
              <p><strong>Email:</strong> {data.candidate?.email}</p>
              <p><strong>ID:</strong> {data.candidate?.id}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">🎯 Projet Claude 2</h3>
            <div className="bg-blue-50 p-3 rounded">
              <p><strong>Titre:</strong> {data.claudeProject?.title}</p>
              <p><strong>Status:</strong> {data.claudeProject?.status}</p>
              <p><strong>ID:</strong> {data.claudeProject?.id}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">📋 Tableaux Kanban ({data.kanbanBoards?.length || 0})</h3>
            <div className="bg-green-50 p-3 rounded">
              {data.kanbanBoards?.map((board: any, index: number) => (
                <div key={index} className="mb-2">
                  <p><strong>{board.title}</strong></p>
                  <p className="text-sm">ID: {board.id}</p>
                  <p className="text-sm">Membres: {board.members?.length || 0}</p>
                  <p className="text-sm">Candidat dans membres: {board.members?.includes(data.candidateId) ? '✅ OUI' : '❌ NON'}</p>
                </div>
              )) || <p>Aucun tableau Kanban</p>}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">📊 Tous les Bookings ({data.allBookings?.length || 0})</h3>
            <div className="bg-yellow-50 p-3 rounded max-h-40 overflow-y-auto">
              {data.allBookings?.map((booking: any, index: number) => (
                <div key={index} className="mb-2 border-b pb-1">
                  <p><strong>{booking.projects?.title}</strong> - Status: {booking.status}</p>
                  <p className="text-sm">Project ID: {booking.project_id}</p>
                </div>
              )) || <p>Aucun booking</p>}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">🔍 Bookings Claude 2 Spécifiques ({data.claudeBookings?.length || 0})</h3>
            <div className="bg-purple-50 p-3 rounded">
              {data.claudeBookings?.map((booking: any, index: number) => (
                <div key={index} className="mb-2">
                  <p><strong>Status:</strong> {booking.status}</p>
                  <p><strong>ID:</strong> {booking.id}</p>
                  <p><strong>Projet:</strong> {booking.projects?.title}</p>
                </div>
              )) || <p>Aucun booking pour Claude 2</p>}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">⚙️ Bookings Hook Optimized ({data.optimizedBookings?.length || 0})</h3>
            <div className="bg-red-50 p-3 rounded">
              {data.optimizedBookings?.map((booking: any, index: number) => (
                <div key={index} className="mb-2 border-b pb-1">
                  <p><strong>{booking.projects?.title}</strong></p>
                  <p className="text-sm">Status projet: {booking.projects?.status}</p>
                  <p className="text-sm">Project ID: {booking.project_id}</p>
                </div>
              )) || <p>Aucun projet dans le hook optimized</p>}
            </div>
          </div>

          <Alert className={claudeInOptimized ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
            <AlertDescription>
              <h4 className="font-semibold mb-2">🎯 RÉSULTAT FINAL</h4>
              <p><strong>Claude 2 visible dans useCandidateProjectsOptimized:</strong> {claudeInOptimized ? '✅ OUI' : '❌ NON'}</p>
              {!claudeInOptimized && (
                <div className="mt-2">
                  <p className="font-semibold">Raisons possibles:</p>
                  <ul className="list-disc ml-4 mt-1">
                    <li>Pas de booking 'accepted' pour Claude 2</li>
                    <li>Projet Claude 2 pas dans les projets liés</li>
                    <li>Problème d'association candidate_id</li>
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>

          <Button onClick={checkVisibility} disabled={loading} className="w-full">
            {loading ? 'Rechargement...' : 'Recharger diagnostic'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default KanbanVisibilityCheck;