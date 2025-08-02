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
import AIGraphGenerator from '@/components/AIGraphGenerator';
import HRCategoriesPanel from '@/components/hr/HRCategoriesPanel';
import HRResourcePanel from '@/components/hr/HRResourcePanel';
import HRResourceNode from '@/components/hr/HRResourceNode';
import { EdgeDetails } from '@/components/hr/EdgeDetails';

interface Project {
  id: string;
  title: string;
  description: string;
  price_per_minute: number;
  project_date: string;
  status: 'play' | 'pause';
}

interface HRProfile {
  id: string;
  name: string;
  category_id: string;
  base_price: number;
  inputs?: string[];
  outputs?: string[];
}

interface HRResource {
  id: string;
  profile_id: string;
  seniority: 'junior' | 'intermediate' | 'senior';
  languages: string[];
  expertises: string[];
  calculated_price: number;
  languageNames?: string[];
  expertiseNames?: string[];
}

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const nodeTypes = {
  hrResource: HRResourceNode,
};

// Helper function to ensure valid position
const ensureValidPosition = (position?: { x: number; y: number }) => {
  if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
    return { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 };
  }
  return position;
};

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
  const [selectedResource, setSelectedResource] = useState<HRResource | null>(null);
  const [hrResources, setHrResources] = useState<Map<string, HRResource>>(new Map());
  const [selectedEdge, setSelectedEdge] = useState<{ source: HRProfile; target: HRProfile } | null>(null);
  const [profiles, setProfiles] = useState<HRProfile[]>([]);

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

      // Fetch HR resource assignments
      const { data: resourceAssignments, error: resourceError } = await supabase
        .from('hr_resource_assignments')
        .select('*')
        .eq('project_id', id);

      const resourcesMap = new Map<string, HRResource>();
      const reconstructedNodes: Node[] = [];

      if (!resourceError && resourceAssignments) {
        // Fetch all needed data for reconstruction
        const profileIds = [...new Set(resourceAssignments.map(r => r.profile_id))];
        const { data: profilesData } = await supabase
          .from('hr_profiles')
          .select('*, inputs, outputs')
          .in('id', profileIds);
          
        setProfiles(profilesData || []);

        const { data: languages } = await supabase
          .from('hr_languages')
          .select('*');

        const { data: expertises } = await supabase
          .from('hr_expertises')
          .select('*');

        // Create lookup maps
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const languageMap = new Map(languages?.map(l => [l.id, l]) || []);
        const expertiseMap = new Map(expertises?.map(e => [e.id, e]) || []);

        // Reconstruct resources and nodes
        for (const assignment of resourceAssignments) {
          const profile = profileMap.get(assignment.profile_id);
          if (!profile) continue;

          // Convert stored names back to IDs for the working data
          const languageIds = assignment.languages?.map(name => 
            languages?.find(l => l.name === name)?.id
          ).filter(Boolean) || [];
          
          const expertiseIds = assignment.expertises?.map(name => 
            expertises?.find(e => e.name === name)?.id
          ).filter(Boolean) || [];

          const resource: HRResource = {
            id: assignment.id,
            profile_id: assignment.profile_id,
            seniority: assignment.seniority,
            languages: languageIds,
            expertises: expertiseIds,
            calculated_price: assignment.calculated_price,
            languageNames: assignment.languages || [],
            expertiseNames: assignment.expertises || [],
          };

          resourcesMap.set(assignment.id, resource);

          // Reconstruct node from node_data with position validation
          const nodeData = assignment.node_data as any;
          const validPosition = ensureValidPosition(nodeData?.position);

          reconstructedNodes.push({
            id: assignment.id,
            type: 'hrResource',
            position: validPosition,
            data: {
              id: assignment.id,
              profileName: profile.name,
              seniority: resource.seniority,
              languages: resource.languages,
              expertises: resource.expertises,
              calculatedPrice: resource.calculated_price,
              languageNames: resource.languageNames,
              expertiseNames: resource.expertiseNames,
              selected: false,
            },
          });
        }
      }

      setHrResources(resourcesMap);
      if (reconstructedNodes.length > 0) {
        setNodes(reconstructedNodes);
      }

      // Fetch flow data for edges
      const { data: flowData, error: flowError } = await supabase
        .from('project_flows')
        .select('flow_data')
        .eq('project_id', id)
        .single();

      if (!flowError && flowData?.flow_data) {
        const flowDataParsed = flowData.flow_data as { nodes?: Node[], edges?: Edge[] };
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

  const handleProfileSelect = (profile: HRProfile) => {
    const nodeId = crypto.randomUUID();
    
    // Créer une nouvelle ressource HR
    const newResource: HRResource = {
      id: nodeId,
      profile_id: profile.id,
      seniority: 'junior',
      languages: [],
      expertises: [],
      calculated_price: profile.base_price,
    };

    // Ajouter au Map des ressources
    setHrResources(prev => new Map(prev).set(nodeId, newResource));

    // Créer un nouveau nœud avec position garantie
    const newNode: Node = {
      id: nodeId,
      type: 'hrResource',
      position: ensureValidPosition({ x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 }),
      data: {
        id: nodeId,
        profileName: profile.name,
        seniority: newResource.seniority,
        languages: [],
        expertises: [],
        calculatedPrice: newResource.calculated_price,
        selected: false,
      },
    };

    setNodes(nds => [...nds, newNode]);
    setSelectedResource(newResource);
  };

  const handleResourceUpdate = (updatedResource: HRResource) => {
    // Mettre à jour dans le Map
    setHrResources(prev => new Map(prev).set(updatedResource.id, updatedResource));

    // Mettre à jour le nœud correspondant avec le prix calculé
    setNodes(nds =>
      nds.map(node => {
        if (node.id === updatedResource.id) {
          return {
            ...node,
            data: {
              ...node.data,
              seniority: updatedResource.seniority,
              languages: updatedResource.languages,
              expertises: updatedResource.expertises,
              calculatedPrice: updatedResource.calculated_price,
              languageNames: updatedResource.languageNames,
              expertiseNames: updatedResource.expertiseNames,
            },
            selected: true
          };
        }
        return { ...node, selected: false };
      })
    );

    setSelectedResource(updatedResource);
  };

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'hrResource') {
      const resource = hrResources.get(node.id);
      if (resource) {
        setSelectedResource(resource);
        setSelectedEdge(null); // Clear edge selection when selecting node
        
        // Mettre à jour l'état selected des nœuds
        setNodes(nds =>
          nds.map(n => ({
            ...n,
            data: { ...n.data, selected: n.id === node.id },
          }))
        );
      }
    }
  }, [hrResources, setNodes]);

  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedResource(null); // Clear resource selection when selecting edge
    
    let sourceProfile: HRProfile | null = null;
    let targetProfile: HRProfile | null = null;
    
    // For AI-generated edges, use the profile data from edge.data
    if (edge.data?.sourceProfile && edge.data?.targetProfile) {
      sourceProfile = edge.data.sourceProfile as HRProfile;
      targetProfile = edge.data.targetProfile as HRProfile;
    } else {
      // For manual edges, find profiles by node IDs
      sourceProfile = profiles.find(p => 
        hrResources.get(edge.source)?.profile_id === p.id
      ) || null;
      targetProfile = profiles.find(p => 
        hrResources.get(edge.target)?.profile_id === p.id
      ) || null;
    }
    
    if (sourceProfile && targetProfile) {
      setSelectedEdge({ source: sourceProfile, target: targetProfile });
    }
  }, [profiles, hrResources]);

  const handleCanvasDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    try {
      const profile: HRProfile = JSON.parse(event.dataTransfer.getData('application/json'));
      
      // Calculer la position relative au canvas
      const reactFlowBounds = (event.target as Element).closest('.react-flow')?.getBoundingClientRect();
      if (!reactFlowBounds) return;
      
      const position = ensureValidPosition({
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 50,
      });

      const nodeId = crypto.randomUUID();
      
      const newResource: HRResource = {
        id: nodeId,
        profile_id: profile.id,
        seniority: 'junior',
        languages: [],
        expertises: [],
        calculated_price: profile.base_price,
      };

      setHrResources(prev => new Map(prev).set(nodeId, newResource));

      const newNode: Node = {
        id: nodeId,
        type: 'hrResource',
        position,
        data: {
          id: nodeId,
          profileName: profile.name,
          seniority: newResource.seniority,
          languages: [],
          expertises: [],
          calculatedPrice: newResource.calculated_price,
          selected: false,
        },
      };

      setNodes(nds => [...nds, newNode]);
      setSelectedResource(newResource);
    } catch (error) {
      console.error('Erreur lors du drop:', error);
    }
  }, [setNodes]);

  const handleCanvasDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleGraphGenerated = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    // Process nodes and create proper HRResource objects
    const processedNodes = newNodes.map(node => {
      const validatedNode = {
        ...node,
        position: ensureValidPosition(node.position)
      };

      // Create HRResource from the node data
      if (validatedNode.data?.hrResource) {
        const hrResourceData = validatedNode.data.hrResource as any;
        const newResource: HRResource = {
          id: hrResourceData.id || crypto.randomUUID(),
          profile_id: hrResourceData.profileId || '',
          seniority: hrResourceData.seniority || 'junior',
          languages: hrResourceData.languages || [],
          expertises: hrResourceData.expertises || [],
          calculated_price: hrResourceData.calculatedPrice || 50
        };

        // Add to resources map
        setHrResources(prev => new Map(prev).set(newResource.id, newResource));

        // Update node data for display
        validatedNode.data = {
          id: newResource.id,
          profileName: hrResourceData.profile?.name || 'Profil inconnu',
          seniority: newResource.seniority,
          languages: newResource.languages,
          expertises: newResource.expertises,
          languageNames: hrResourceData.languageNames || [],
          expertiseNames: hrResourceData.expertiseNames || [],
          calculatedPrice: hrResourceData.calculatedPrice || newResource.calculated_price,
          selected: false,
        };
        validatedNode.id = newResource.id;
      }

      return validatedNode;
    });

    // Add generated nodes to existing ones
    setNodes(currentNodes => [...currentNodes, ...processedNodes]);
    setEdges(currentEdges => [...currentEdges, ...newEdges]);
  }, [setNodes, setEdges]);

  const saveFlow = async () => {
    if (!id) return;
    
    // Vérifier l'authentification de l'utilisateur admin
    if (!user) {
      console.error('User not authenticated');
      toast({
        title: "Erreur d'authentification",
        description: "Vous devez être connecté pour sauvegarder.",
        variant: "destructive",
      });
      return;
    }

    console.log('Saving with user:', user.id, 'project:', id);
    
    setIsSaving(true);
    try {
      // Save flow data (for edges and visual layout)
      const { error: flowError } = await supabase
        .from('project_flows')
        .upsert({
          project_id: id,
          flow_data: { nodes, edges } as any
        }, {
          onConflict: 'project_id'
        });

      if (flowError) throw flowError;

      // Save HR resource assignments - Convert UUIDs to names for DB storage
      const resourceAssignments = Array.from(hrResources.values()).map(resource => {
        const node = nodes.find(n => n.id === resource.id);
        
        // Convert language IDs to names
        const languageNames = resource.languageNames || [];
        const expertiseNames = resource.expertiseNames || [];
        
        return {
          id: resource.id,
          project_id: id,
          profile_id: resource.profile_id,
          seniority: resource.seniority,
          languages: languageNames, // Store names as text[], not UUIDs
          expertises: expertiseNames, // Store names as text[], not UUIDs
          calculated_price: resource.calculated_price,
          node_data: { 
            position: node?.position,
            languageNames: languageNames,
            expertiseNames: expertiseNames
          }
        };
      });

      if (resourceAssignments.length > 0) {
        console.log('Saving resource assignments:', resourceAssignments);
        
        const { error: resourceError } = await supabase
          .from('hr_resource_assignments')
          .upsert(resourceAssignments, {
            onConflict: 'id'
          });

        if (resourceError) {
          console.error('Resource save error:', resourceError);
          throw resourceError;
        }
      }

      toast({
        title: "Sauvegardé",
        description: "Le projet a été sauvegardé avec succès.",
      });
    } catch (error) {
      console.error('Error saving flow:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le projet.",
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
      {/* Header */}
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
                Gestion des ressources humaines
              </p>
            </div>
          </div>
          
          <Button onClick={saveFlow} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </header>

      {/* Main Content - 3 panels */}
      <div className="flex-1 flex">
        {/* Panel gauche - Catégories HR */}
        <HRCategoriesPanel onProfileSelect={handleProfileSelect} />
        
        {/* Panel central - ReactFlow Canvas */}
        <div 
          className="flex-1 relative"
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background gap={12} size={1} />
          </ReactFlow>

          {/* EdgeDetails overlay */}
          {selectedEdge && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
              <EdgeDetails 
                sourceProfile={selectedEdge.source}
                targetProfile={selectedEdge.target}
                onClose={() => setSelectedEdge(null)}
              />
            </div>
          )}
        </div>
        
        {/* Panel droit - Configuration ressource */}
        <HRResourcePanel 
          selectedResource={selectedResource}
          onResourceUpdate={handleResourceUpdate}
        />
      </div>
      
      {/* AI Graph Generator Footer */}
        <AIGraphGenerator 
          onGraphGenerated={handleGraphGenerated} 
          projectId={id}
        />
    </div>
  );
};

export default Project;
