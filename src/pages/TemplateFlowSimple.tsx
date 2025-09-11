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
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/Card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Download, Upload, Copy, Euro, Users, FileText } from 'lucide-react';
import HRCategoriesPanel from '@/components/hr/HRCategoriesPanel';
import HRResourcePanel from '@/components/hr/HRResourcePanel';
import HRResourceNode from '@/components/hr/HRResourceNode';
import { PageHeaderNeon } from '@/components/ui/page-header-neon';

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
  
  // Calculer le prix total par minute de toutes les ressources
  const calculateTotalPrice = () => {
    let total = 0;
    hrResources.forEach(resource => {
      total += resource.calculated_price || 0;
    });
    return total;
  };

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
      {/* Header avec design Neon cohérent */}
      <div className="p-6">
        <PageHeaderNeon
          icon={FileText}
          title="Éditeur de Template"
          subtitle={templateName}
          showProjectSelector={false}
        >
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/resources')}
              className="border-gray-300 dark:border-gray-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            
            {/* Prix total avec design moderne */}
            {hrResources.size > 0 && (
              <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-700">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 dark:bg-purple-500/30 rounded-lg">
                      <Euro className="w-5 h-5 text-purple-700 dark:text-purple-300" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {calculateTotalPrice().toFixed(2)}€/min
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {hrResources.size} membre{hrResources.size > 1 ? 's' : ''} d'équipe
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-3">
              <Button
                onClick={injectToParent}
                disabled={nodes.length === 0}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium shadow-lg"
              >
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder
              </Button>

              <Button
                variant="outline"
                onClick={copyToClipboard}
                disabled={nodes.length === 0}
                className="border-gray-300 dark:border-gray-600"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copier
              </Button>
              
              <Button
                variant="outline"
                onClick={exportToJSON}
                disabled={nodes.length === 0}
                className="border-gray-300 dark:border-gray-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
              
              <Button
                variant="outline"
                onClick={() => document.getElementById('import-file')?.click()}
                className="border-gray-300 dark:border-gray-600"
              >
                <Upload className="w-4 h-4 mr-2" />
                Importer
              </Button>
              <input
                id="import-file"
                type="file"
                accept=".json"
                className="hidden"
                onChange={importFromJSON}
              />
            </div>
          </div>
        </PageHeaderNeon>
      </div>

      {/* Main Content - 3 panels avec Material Design */}
      <div className="flex-1 flex">
        {/* Panel gauche - Catégories HR avec Card */}
        <div className="w-80 border-r bg-card">
          <Card className="rounded-none border-0 border-b">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ressources Disponibles</CardTitle>
              <p className="text-sm text-muted-foreground">
                Cliquez pour ajouter à l'équipe
              </p>
            </CardHeader>
          </Card>
          <div className="overflow-y-auto h-full">
            <HRCategoriesPanel onProfileSelect={handleProfileSelect} />
          </div>
        </div>
        
        {/* Panel central - ReactFlow Canvas avec styles améliorés */}
        <div className="flex-1 relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            className="bg-transparent"
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={0.2}
            maxZoom={2}
            attributionPosition="bottom-left"
          >
            <Controls className="!bg-card !border-border !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button:hover]:!bg-accent" />
            <MiniMap className="!bg-card !border-border !shadow-lg" nodeColor="#9333ea" />
            <Background variant="dots" gap={20} size={1} color="#9333ea" />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-xl max-w-md">
                <CardContent className="py-8 text-center">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Composez votre équipe</h3>
                  <p className="text-muted-foreground">
                    Sélectionnez les profils dans le panneau de gauche pour construire l'équipe idéale pour ce template.
                  </p>
                </CardContent>
              </Card>
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