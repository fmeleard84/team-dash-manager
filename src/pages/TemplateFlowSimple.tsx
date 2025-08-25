import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  addEdge,
  Connection,
  Edge,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Download, Upload, Copy } from 'lucide-react';
import HRCategoriesPanel from '@/components/hr/HRCategoriesPanel';
import HRResourcePanel from '@/components/hr/HRResourcePanel';
import HRResourceNode from '@/components/hr/HRResourceNode';

interface HRProfile {
  id: string;
  name: string;
  category_id: string;
  base_price: number;
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

const TemplateFlowSimple = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('templateId');
  const templateName = searchParams.get('name') || 'Template';

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [hrResources, setHrResources] = useState<Map<string, HRResource>>(new Map());
  const [selectedResource, setSelectedResource] = useState<HRResource | null>(null);

  const onNodesChange = useCallback((changes: any[]) => {
    setNodes((nds) => {
      let newNodes = [...nds];
      changes.forEach(change => {
        if (change.type === 'remove' && change.id) {
          setHrResources(prev => {
            const newMap = new Map(prev);
            newMap.delete(change.id);
            return newMap;
          });
          setSelectedResource(prev => prev?.id === change.id ? null : prev);
          newNodes = newNodes.filter(node => node.id !== change.id);
        } else if (change.type === 'position' && change.position) {
          const nodeIndex = newNodes.findIndex(n => n.id === change.id);
          if (nodeIndex !== -1) {
            newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: change.position };
          }
        }
      });
      return newNodes;
    });
  }, []);

  const onEdgesChange = useCallback((changes: any[]) => {
    setEdges((eds) => {
      let newEdges = [...eds];
      changes.forEach(change => {
        if (change.type === 'remove') {
          newEdges = newEdges.filter(edge => edge.id !== change.id);
        }
      });
      return newEdges;
    });
  }, []);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const resource = hrResources.get(node.id);
    if (resource) {
      setSelectedResource(resource);
    }
  }, [hrResources]);

  const handleProfileSelect = useCallback((profile: HRProfile) => {
    const position = { 
      x: Math.random() * 400 + 100, 
      y: Math.random() * 400 + 100 
    };

    const newResource: HRResource = {
      id: `hr-${Date.now()}`,
      profile_id: profile.id,
      seniority: 'intermediate',
      languages: [],
      expertises: [],
      calculated_price: profile.base_price,
    };

    const newNode: Node = {
      id: newResource.id,
      type: 'hrResource',
      position,
      data: {
        profileName: profile.name,
        seniority: newResource.seniority,
        languages: newResource.languages,
        expertises: newResource.expertises,
        calculatedPrice: newResource.calculated_price,
        languageNames: newResource.languageNames || [],
        expertiseNames: newResource.expertiseNames || [],
        resource: newResource,
        profile,
      },
    };

    setNodes((nds) => nds.concat(newNode));
    setHrResources((prev) => new Map(prev.set(newResource.id, newResource)));
  }, []);

  const updateHRResource = useCallback((updatedResource: HRResource) => {
    setHrResources((prev) => new Map(prev.set(updatedResource.id, updatedResource)));
    setNodes((nds) =>
      nds.map((node) =>
        node.id === updatedResource.id
          ? { 
              ...node, 
              data: { 
                ...node.data, 
                resource: updatedResource,
                seniority: updatedResource.seniority,
                languages: updatedResource.languages,
                expertises: updatedResource.expertises,
                calculatedPrice: updatedResource.calculated_price,
                languageNames: updatedResource.languageNames || [],
                expertiseNames: updatedResource.expertiseNames || [],
              } 
            }
          : node
      )
    );
    setSelectedResource(updatedResource);
  }, []);

  const exportToJSON = useCallback(() => {
    const flowData = {
      nodes: nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          resource: hrResources.get(node.id)
        }
      })),
      edges
    };

    const dataStr = JSON.stringify(flowData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `template_${templateId || 'new'}_${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast({
      title: "Exporté avec succès",
      description: "Le template a été exporté en JSON",
    });
  }, [nodes, edges, hrResources, templateId, toast]);

  const copyToClipboard = useCallback(() => {
    const flowData = {
      nodes: nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          resource: hrResources.get(node.id)
        }
      })),
      edges
    };

    const dataStr = JSON.stringify(flowData, null, 2);
    navigator.clipboard.writeText(dataStr).then(() => {
      toast({
        title: "Copié dans le presse-papiers",
        description: "Les données JSON ont été copiées",
      });
    }).catch(() => {
      toast({
        title: "Erreur",
        description: "Impossible de copier dans le presse-papiers",
        variant: "destructive",
      });
    });
  }, [nodes, edges, hrResources, toast]);

  const injectToParent = useCallback(() => {
    const flowData = {
      nodes: nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          resource: hrResources.get(node.id)
        }
      })),
      edges
    };

    const dataStr = JSON.stringify(flowData, null, 2);
    
    if (window.opener) {
      window.opener.postMessage({
        type: 'TEMPLATE_FLOW_DATA',
        data: dataStr,
        templateId
      }, window.location.origin);
      
      toast({
        title: "Données envoyées",
        description: "Les données ont été envoyées vers le formulaire de template",
      });
    } else {
      toast({
        title: "Erreur",
        description: "Aucune fenêtre parente trouvée",
        variant: "destructive",
      });
    }
  }, [nodes, edges, hrResources, templateId, toast]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Connexion requise</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/admin/resources')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux Templates
          </Button>
          <div>
            <h1 className="text-xl font-bold">Éditeur de Template ReactFlow</h1>
            <p className="text-sm text-muted-foreground">
              Composez l'équipe pour : <span className="font-medium">{templateName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={injectToParent}
            disabled={nodes.length === 0}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Injecter dans le Template
          </Button>

          <Button
            variant="outline"
            onClick={copyToClipboard}
            disabled={nodes.length === 0}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copier JSON
          </Button>
          
          <Button
            variant="outline"
            onClick={exportToJSON}
            disabled={nodes.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Main Content - 3 panels */}
      <div className="flex-1 flex">
        {/* Panel gauche - Catégories HR */}
        <div className="w-80 border-r bg-white/50 backdrop-blur-sm">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Ressources Disponibles</h2>
            <p className="text-sm text-muted-foreground">
              Cliquez sur les profils pour les ajouter
            </p>
          </div>
          <HRCategoriesPanel onProfileSelect={handleProfileSelect} />
        </div>
        
        {/* Panel central - ReactFlow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            className="bg-gray-50"
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={0.2}
            maxZoom={2}
            attributionPosition="bottom-left"
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-muted-foreground">
                <h3 className="text-lg font-medium mb-2">Commencez par ajouter des ressources</h3>
                <p className="text-sm">
                  Utilisez le panneau de gauche pour cliquer sur les profils HR<br />
                  et créer votre composition d'équipe pour ce template.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Panel droit - Configuration ressource */}
        <HRResourcePanel
          selectedResource={selectedResource}
          onResourceUpdate={updateHRResource}
        />
      </div>
    </div>
  );
};

export default TemplateFlowSimple;