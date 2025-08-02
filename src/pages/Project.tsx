import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string;
  price_per_minute: number;
  project_date: string;
  status: 'play' | 'pause';
}

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Début du projet' },
    position: { x: 250, y: 25 },
  },
];

const initialEdges: Edge[] = [];

const Project = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/admin');
      return;
    }
    if (id) {
      fetchProjectAndFlow();
    }
  }, [user, id, navigate]);

  const fetchProjectAndFlow = async () => {
    try {
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData as Project);

      // Fetch flow data
      const { data: flowData, error: flowError } = await supabase
        .from('project_flows')
        .select('flow_data')
        .eq('project_id', id)
        .single();

      if (flowError) {
        console.error('Flow data not found, using defaults');
      } else if (flowData?.flow_data) {
        const flowDataParsed = flowData.flow_data as { nodes?: Node[], edges?: Edge[] };
        if (flowDataParsed.nodes && flowDataParsed.nodes.length > 0) {
          setNodes(flowDataParsed.nodes);
        }
        if (flowDataParsed.edges && flowDataParsed.edges.length > 0) {
          setEdges(flowDataParsed.edges);
        }
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le projet.",
        variant: "destructive",
      });
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const saveFlow = async () => {
    if (!id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('project_flows')
        .upsert({
          project_id: id,
          flow_data: { nodes, edges } as any
        }, {
          onConflict: 'project_id'
        });

      if (error) throw error;

      toast({
        title: "Sauvegardé",
        description: "Le diagramme a été sauvegardé avec succès.",
      });
    } catch (error) {
      console.error('Error saving flow:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le diagramme.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Chargement du projet...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive">Projet non trouvé</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-xl font-bold">{project.title}</h1>
              <p className="text-sm text-muted-foreground">
                {project.price_per_minute.toFixed(2)} €/min
              </p>
            </div>
          </div>
          
          <Button onClick={saveFlow} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </header>

      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
};

export default Project;