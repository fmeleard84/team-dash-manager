import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getTeamComposition, clearTeamComposition } from '@/ai-assistant/tools/reactflow-generator';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  addEdge,
  Connection,
  Edge,
  Node,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/ui/components/Card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Download, Upload, Users, Network, Euro, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/ui/components/ThemeToggle';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { EnhancedVoiceAssistant } from '@/components/client/EnhancedVoiceAssistant';
import HRCategoriesPanel from '@/components/hr/HRCategoriesPanel';
import HRResourcePanel from '@/components/hr/HRResourcePanel';
import HRResourceNode from '@/components/hr/HRResourceNode';
import ClientNode from '@/components/hr/ClientNode';
import UniversalEdge from '@/components/hr/UniversalEdge';
import { EdgeDetails } from '@/components/hr/EdgeDetails';
import { PageHeaderNeon } from '@/components/ui/page-header-neon';

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
  is_ai?: boolean;
  is_team_member?: boolean;
  description?: string;
  job_title?: string;
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
  is_ai?: boolean;
  is_team_member?: boolean;
  description?: string;
  job_title?: string;
  profileName?: string;
}

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const nodeTypes = {
  hrResource: HRResourceNode,
  clientNode: ClientNode,
};

const edgeTypes = {
  custom: UniversalEdge,
};

// Helper function to generate UUID v4 compatible with all browsers
const generateUUID = (): string => {
  // Générer un UUID v4 valide
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Helper function to ensure valid position
const ensureValidPosition = (position?: { x: number; y: number }) => {
  if (!position || typeof position.x !== 'number' || typeof position.y !== 'number' || 
      isNaN(position.x) || isNaN(position.y) || 
      !isFinite(position.x) || !isFinite(position.y)) {
    console.warn('Invalid position detected, using default:', position);
    return { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 };
  }
  
  // Augmenter les limites pour permettre plus de liberté de mouvement
  // et éviter que les cartes disparaissent lors du zoom/déplacement
  const clamped = {
    x: Math.max(-10000, Math.min(10000, position.x)),
    y: Math.max(-10000, Math.min(10000, position.y))
  };
  
  // Ne pas réinitialiser la position sauf si vraiment extrême
  if (Math.abs(clamped.x) > 9500 || Math.abs(clamped.y) > 9500) {
    console.warn('Position extremely far, keeping at boundary:', clamped);
    // Garder à la limite plutôt que de réinitialiser au centre
    return {
      x: clamped.x > 0 ? 9000 : -9000,
      y: clamped.y > 0 ? 9000 : -9000
    };
  }
  
  return clamped;
};

const Project = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  // User auth handled by AuthContext
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [isArchived, setIsArchived] = useState(false);
  const [showReactFlow, setShowReactFlow] = useState(false);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);

  // Vérifier si on doit ouvrir ReactFlow automatiquement (depuis l'IA)
  useEffect(() => {
    const openReactFlow = searchParams.get('openReactFlow') === 'true';
    const fromAI = searchParams.get('fromAI') === 'true';
    
    if (openReactFlow) {
      setShowReactFlow(true);
      
      // Si on vient de l'IA, charger l'équipe générée
      if (fromAI) {
        const teamData = getTeamComposition();
        if (teamData) {
          const { reactFlowData } = teamData;
          setNodes(reactFlowData.nodes);
          setEdges(reactFlowData.edges);
          
          // Nettoyer les données après chargement
          clearTeamComposition();
          
          toast({
            title: 'Équipe chargée',
            description: 'L\'équipe générée par l\'IA a été chargée dans l\'éditeur',
            duration: 5000,
          });
        }
      }
    }
  }, [searchParams, toast]);
  
  // Supprimé car causait des re-renders infinis

  // Handler pour les changements de nœuds
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // Bloquer les modifications si le projet est archivé
    if (isArchived) {
      // Autoriser uniquement les changements de sélection et de position pour navigation
      const allowedChanges = changes.filter(change =>
        change.type === 'select' ||
        (change.type === 'position' && 'dragging' in change && !change.dragging)
      );
      if (allowedChanges.length > 0) {
        setNodes((nds) => applyNodeChanges(allowedChanges, nds));
      }
      return;
    }

    // Filtrer les changements pour empêcher la suppression du nœud client
    const filteredChanges = changes.filter(change => {
      if (change.type === 'remove' && 'id' in change && change.id === 'client-node') {
        return false; // Ne pas supprimer le nœud client
      }
      return true;
    });

    // Handle node removals separately to clean up resources
    filteredChanges.forEach(change => {
      if (change.type === 'remove' && 'id' in change) {
        const nodeId = change.id;
        console.log('Removing node:', nodeId);

        // Remove from hrResources when node is deleted
        setHrResources(prev => {
          const newMap = new Map(prev);
          newMap.delete(nodeId);
          console.log('Removed from hrResources:', nodeId);
          return newMap;
        });

        // Clear selection if the removed node was selected
        setSelectedResource(prev => {
          if (prev?.id === nodeId) {
            console.log('Clearing selected resource');
            return null;
          }
          return prev;
        });

        // Also remove any edges connected to this node
        setEdges(edges => edges.filter(edge =>
          edge.source !== nodeId && edge.target !== nodeId
        ));
      }
    });

    // Apply all changes using ReactFlow's utility function
    setNodes((nds) => applyNodeChanges(filteredChanges, nds));
  }, [isArchived]);

  // Handler pour les changements d'edges
  const onEdgesChange = useCallback((changes: any[]) => {
    // Bloquer les modifications si le projet est archivé
    if (isArchived) {
      // Autoriser uniquement la sélection pour navigation
      const allowedChanges = changes.filter(change => change.type === 'select');
      if (allowedChanges.length > 0) {
        setEdges((eds) => {
          let newEdges = [...eds];
          allowedChanges.forEach(change => {
            const edgeIndex = newEdges.findIndex(e => e.id === change.id);
            if (edgeIndex !== -1) {
              newEdges[edgeIndex] = { ...newEdges[edgeIndex], selected: change.selected };
            }
          });
          return newEdges;
        });
      }
      return;
    }
    
    setEdges((eds) => {
      let newEdges = [...eds];
      changes.forEach(change => {
        if (change.type === 'remove' && change.id) {
          newEdges = newEdges.filter(edge => edge.id !== change.id);
        } else if (change.type === 'select') {
          const edgeIndex = newEdges.findIndex(e => e.id === change.id);
          if (edgeIndex !== -1) {
            newEdges[edgeIndex] = { ...newEdges[edgeIndex], selected: change.selected };
          }
        }
      });
      return newEdges;
    });
  }, [isArchived]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedResource, setSelectedResource] = useState<HRResource | null>(null);
  const [hrResources, setHrResources] = useState<Map<string, HRResource>>(new Map());
  const [selectedEdge, setSelectedEdge] = useState<{ source: HRProfile; target: HRProfile } | null>(null);
  const [profiles, setProfiles] = useState<HRProfile[]>([]);
  
  // Calculer le prix total par minute de toutes les ressources
  const calculateTotalPrice = () => {
    let total = 0;
    hrResources.forEach(resource => {
      total += resource.calculated_price || 0;
    });
    return total;
  };
  
  // Log quand selectedEdge change
  useEffect(() => {
    console.log('👀👀👀 selectedEdge changed:', selectedEdge);
    if (selectedEdge) {
      console.log('✅✅✅ Popup should be visible now!');
      console.log('Source:', selectedEdge.source);
      console.log('Target:', selectedEdge.target);
    } else {
      console.log('❌ selectedEdge is null');
    }
  }, [selectedEdge]);

  // Définir handleEdgeClick ici, après les states et avant les useEffect
  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: any) => {
    console.log('🔍 Edge click detected!');
    console.log('Edge data:', edge);
    console.log('Edge source:', edge.source, 'target:', edge.target);
    console.log('Event type:', event.type);
    console.log('Event target:', event.target);
    
    event.stopPropagation();
    event.preventDefault();
    
    setSelectedResource(null);
    
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    console.log('📌 Source node found:', sourceNode ? 'YES' : 'NO');
    if (sourceNode) console.log('Source node data:', sourceNode.data);
    console.log('📌 Target node found:', targetNode ? 'YES' : 'NO');
    if (targetNode) console.log('Target node data:', targetNode.data);
    
    let sourceProfile: HRProfile | null = null;
    let targetProfile: HRProfile | null = null;
    
    const getNodeName = (node: any) => {
      if (node?.type === 'clientNode') {
        return 'Client';
      }
      return node?.data?.profileName || 'Ressource';
    };
    
    if (sourceNode && targetNode) {
      sourceProfile = {
        id: edge.source,
        name: getNodeName(sourceNode),
        inputs: [],
        outputs: [],
        category_id: '',
        base_price: 0
      };
      
      targetProfile = {
        id: edge.target,
        name: getNodeName(targetNode),
        inputs: [],
        outputs: [],
        category_id: '',
        base_price: 0
      };
      
      console.log('✅ Profiles created successfully!');
      console.log('Source profile:', sourceProfile);
      console.log('Target profile:', targetProfile);
      setSelectedEdge({ source: sourceProfile, target: targetProfile });
    } else {
      console.log('❌ Could not find nodes');
      console.log('Source node:', sourceNode);
      console.log('Target node:', targetNode);
    }
  }, [nodes]);


  // useRef pour stocker les nodes sans causer de re-render
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  
  // Fonction pour gérer le clic depuis les edges custom - version stable
  // Pas de useCallback ici pour éviter les dépendances circulaires
  const handleEdgeClickFromDataRef = useRef<(edgeId: string, sourceId: string, targetId: string) => void>();
  
  handleEdgeClickFromDataRef.current = (edgeId: string, sourceId: string, targetId: string) => {
    console.log('🎯 Opening edge popup', { edgeId, sourceId, targetId });
    console.log('Current nodes:', nodes);
    
    const sourceNode = nodes.find(n => n.id === sourceId);
    const targetNode = nodes.find(n => n.id === targetId);
    
    console.log('Found sourceNode:', sourceNode);
    console.log('Found targetNode:', targetNode);
    
    if (sourceNode && targetNode) {
      const getNodeName = (node: any) => {
        if (node?.type === 'clientNode') {
          return 'Client';
        }
        return node?.data?.profileName || 'Ressource';
      };
      
      const sourceProfile = {
        id: sourceId,
        name: getNodeName(sourceNode),
        inputs: [],
        outputs: [],
        category_id: '',
        base_price: 0
      };
      
      const targetProfile = {
        id: targetId,
        name: getNodeName(targetNode),
        inputs: [],
        outputs: [],
        category_id: '',
        base_price: 0
      };
      
      console.log('Setting selectedEdge with:', { source: sourceProfile, target: targetProfile });
      setSelectedEdge({ source: sourceProfile, target: targetProfile });
    } else {
      console.log('❌ Could not find nodes for edge click');
    }
  };
  
  const handleEdgeClickFromData = useCallback((edgeId: string, sourceId: string, targetId: string) => {
    handleEdgeClickFromDataRef.current?.(edgeId, sourceId, targetId);
  }, []);
  
  // Note: Les listeners sont maintenant gérés directement par ReactFlow
  // via onEdgeClick, onEdgeMouseEnter et onEdgeMouseLeave

  useEffect(() => {
    const fetchProjectAndFlow = async () => {
    try {
      console.log('fetchProjectAndFlow called with project ID:', id);
      
      // Handle template preview case
      if (id === 'template-preview') {
        const urlParams = new URLSearchParams(window.location.search);
        const templateId = urlParams.get('template');
        
        if (templateId) {
          // Fetch template data instead of project data
          const { data: templateData, error: templateError } = await supabase
            .from('project_templates')
            .select('*')
            .eq('id', templateId)
            .single();

          if (templateError) throw templateError;

          // Create a fake project object from template data
          const fakeProject = {
            id: 'template-preview',
            title: `Aperçu: ${templateData.name}`,
            description: templateData.description || '',
            price_per_minute: templateData.price_per_minute || 1.5,
            project_date: new Date().toISOString(),
            status: 'pause' as const
          };

          setProject(fakeProject);

          // Load ReactFlow data from template
          if (templateData.reactflow_data) {
            try {
              const flowData = typeof templateData.reactflow_data === 'string' 
                ? JSON.parse(templateData.reactflow_data) 
                : templateData.reactflow_data;
              
              if (flowData.nodes) {
                const validNodes = flowData.nodes.map((node: any) => ({
                  ...node,
                  position: ensureValidPosition(node.position)
                }));
                
                // Add client node at the beginning (same as regular projects)
                const clientNode = {
                  id: 'client-node',
                  type: 'clientNode',
                  position: { x: 400, y: 50 },
                  data: { label: 'Client' },
                  draggable: false,
                  deletable: false,
                  selectable: false,
                };
                
                // Check if template already has a client node
                const hasClientNode = validNodes.some((node: any) => node.type === 'clientNode');
                
                // Add client node if not present
                const allNodes = hasClientNode ? validNodes : [clientNode, ...validNodes];
                setNodes(allNodes);

                // Load profiles first to have proper profile data
                const { data: profilesData } = await supabase
                  .from('hr_profiles')
                  .select('*');
                
                if (profilesData) {
                  setProfiles(profilesData);
                }

                // Create HRResource objects for template nodes
                const templateResourcesMap = new Map<string, HRResource>();
                allNodes.forEach((node: any) => {
                  if (node.type === 'hrResource' && node.data) {
                    console.log('Processing template node:', node.id, 'with data:', node.data);
                    
                    // Try to extract profile_id from different possible sources
                    let profileId = node.data.profileId || 
                                   node.data.profile_id || 
                                   '';
                    
                    // If we don't have a direct profile_id, try to find it by profile name
                    if (!profileId && node.data.profileName && profilesData) {
                      const matchingProfile = profilesData.find(p => p.name === node.data.profileName);
                      if (matchingProfile) {
                        profileId = matchingProfile.id;
                        console.log('Found profile by name:', node.data.profileName, '-> ID:', profileId);
                      }
                    }
                    
                    const resource: HRResource = {
                      id: node.id,
                      profile_id: profileId,
                      seniority: (node.data.seniority || 'junior') as 'junior' | 'intermediate' | 'senior',
                      languages: node.data.languages || [],
                      expertises: node.data.expertises || [],
                      calculated_price: node.data.calculatedPrice || node.data.calculated_price || 50,
                      languageNames: node.data.languageNames || [],
                      expertiseNames: node.data.expertiseNames || [],
                    };
                    
                    console.log('Created resource for template with profile_id:', resource.profile_id, 'resource:', resource);
                    templateResourcesMap.set(node.id, resource);
                  }
                });
                
                console.log('Setting hrResources for template with:', templateResourcesMap, 'size:', templateResourcesMap.size);
                setHrResources(templateResourcesMap);
              }
              
              if (flowData.edges) {
                setEdges(flowData.edges);
              }
            } catch (error) {
              console.error('Error parsing template ReactFlow data:', error);
            }
          }
          
          setIsLoading(false);
          return;
        }
      }
      
      // Normal project loading
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (projectError) throw projectError;
      setProject(projectData as Project);
      
      // Vérifier si le projet est archivé
      if (projectData?.archived_at) {
        setIsArchived(true);
        toast({
          title: "Projet archivé",
          description: "Ce projet est en lecture seule. Aucune modification n'est autorisée.",
          variant: "default",
        });
      }

      // Fetch HR resource assignments
      console.log('Fetching hr_resource_assignments for project_id:', id);
      const { data: resourceAssignments, error: resourceError } = await supabase
        .from('hr_resource_assignments')
        .select('*')
        .eq('project_id', id);
      
      console.log('hr_resource_assignments query result:', { resourceAssignments, resourceError, count: resourceAssignments?.length });

      const resourcesMap = new Map<string, HRResource>();
      const reconstructedNodes: Node[] = [];
      let profileMap = new Map<string, any>();  // Declare at the outer scope
      
      // Always fetch ALL profiles for proper mapping
      const { data: allProfilesDataFetch } = await supabase
        .from('hr_profiles')
        .select('*, inputs, outputs');
      
      const allProfilesData = allProfilesDataFetch || [];
      setProfiles(allProfilesData);
      profileMap = new Map(allProfilesData.map(p => [p.id, p]));

      if (!resourceError && resourceAssignments) {
        // Fetch additional data needed for reconstruction
        const { data: languages } = await supabase
          .from('hr_languages')
          .select('*');

        const { data: expertises } = await supabase
          .from('hr_expertises')
          .select('*');

        // Create lookup maps for languages and expertises
        const languageMap = new Map(languages?.map(l => [l.id, l]) || []);
        const expertiseMap = new Map(expertises?.map(e => [e.id, e]) || []);

        // Reconstruct resources and nodes
        for (const assignment of resourceAssignments) {
          const profile = profileMap.get(assignment.profile_id);
          if (!profile) continue;

          // Check if this is an AI resource
          const isAI = profile.is_ai || (assignment.node_data as any)?.is_ai || false;
          
          // Convert stored names back to IDs for the working data
          let languageIds = assignment.languages?.map(name => 
            languages?.find(l => l.name === name)?.id
          ).filter(Boolean) || [];
          
          // For AI resources, ensure they have all languages
          if (isAI && languages && languageIds.length === 0) {
            console.log('AI resource detected with no languages, adding all languages');
            languageIds = languages.map(l => l.id);
          }
          
          const expertiseIds = assignment.expertises?.map(name => 
            expertises?.find(e => e.name === name)?.id
          ).filter(Boolean) || [];

          // Extract additional properties from node_data
          const nodeData = assignment.node_data as any;
          const isTeamMember = nodeData?.is_team_member || false;
          
          const resource: HRResource = {
            id: assignment.id,
            profile_id: assignment.profile_id,
            seniority: assignment.seniority,
            languages: languageIds,
            expertises: expertiseIds,
            calculated_price: assignment.calculated_price,
            languageNames: assignment.languages || [],
            expertiseNames: assignment.expertises || [],
            is_ai: isAI,
            is_team_member: isTeamMember,
            description: nodeData?.description || '',
            profileName: nodeData?.profileName || profile?.name || '',
            job_title: nodeData?.job_title || '',
          };

          resourcesMap.set(assignment.id, resource);

          // Reconstruct node from node_data with position validation
          const validPosition = ensureValidPosition(nodeData?.position);

          reconstructedNodes.push({
            id: assignment.id,
            type: 'hrResource',
            position: validPosition,
            data: {
              id: assignment.id,
              profileName: resource.profileName || profile.name,
              seniority: resource.seniority,
              languages: resource.languages,
              expertises: resource.expertises,
              calculatedPrice: resource.calculated_price,
              is_team_member: resource.is_team_member,
              is_ai: resource.is_ai,
              description: resource.description,
              job_title: resource.job_title,
              badge: resource.is_team_member ? 'Équipe' : undefined,
              languageNames: resource.languageNames,
              expertiseNames: resource.expertiseNames,
              selected: false,
            },
          });
        }
      }

      console.log('Setting hrResources with resourcesMap:', resourcesMap, 'size:', resourcesMap.size);
      setHrResources(resourcesMap);
      
      // Add client node at the beginning
      const clientNode = {
        id: 'client-node',
        type: 'clientNode',
        position: { x: 400, y: 50 },
        data: { label: 'Client' },
        draggable: false,
        deletable: false,
        selectable: false,
      };
      
      const allNodes = [clientNode, ...reconstructedNodes];
      setNodes(allNodes);

      // Fetch flow data for edges  
      const { data: flowData, error: flowError } = await supabase
        .from('project_flows')
        .select('nodes, edges')
        .eq('project_id', id)
        .maybeSingle();

      console.log('Flow data fetch result:', { flowData, flowError });

      if (!flowError && flowData) {
        if (flowData.edges && Array.isArray(flowData.edges) && flowData.edges.length > 0) {
          // Convertir les edges chargés au type custom
          const edgesWithType = (flowData.edges as unknown as Edge[]).map(edge => ({
            ...edge,
            type: 'custom',
            animated: true,
            data: { 
              ...edge.data,
              onClick: (edgeId: string, sourceId: string, targetId: string) => {
                handleEdgeClickFromData(edgeId, sourceId, targetId);
              }
            },
          }));
          setEdges(edgesWithType);
        }
        if (flowData.nodes && Array.isArray(flowData.nodes) && flowData.nodes.length > 0) {
          // If flowData has nodes, we need to rebuild the hrResources map to match
          const updatedResourcesMap = new Map<string, HRResource>();
          const flowNodes = flowData.nodes as unknown as Node[];
          
          // Create a map of profile_id to resource from the loaded resources
          const profileToResourceMap = new Map<string, HRResource>();
          resourcesMap.forEach((resource, id) => {
            if (resource.profile_id) {
              profileToResourceMap.set(resource.profile_id, resource);
            }
          });
          
          // For each node in flowData, find the corresponding resource
          flowNodes.forEach((node: any) => {
            if (node.type === 'hrResource') {
              // First try to find by exact ID match
              let existingResource = resourcesMap.get(node.id);
              
              // If not found by ID, try to find by profile name or profile_id in node data
              if (!existingResource && node.data) {
                // Try to find the profile by name
                const profileName = node.data.profileName;
                if (profileName) {
                  // Find resource that matches this profile name
                  for (const [resId, resource] of resourcesMap.entries()) {
                    const profile = profileMap.get(resource.profile_id);
                    if (profile && profile.name === profileName) {
                      existingResource = resource;
                      break;
                    }
                  }
                }
                
                // If still not found, try by profile_id in data
                if (!existingResource && node.data.profile_id) {
                  existingResource = profileToResourceMap.get(node.data.profile_id);
                }
              }
              
              if (existingResource) {
                // Use the node's ID as the key, but keep the resource data
                // Also preserve is_team_member and other properties from node data
                updatedResourcesMap.set(node.id, {
                  ...existingResource,
                  id: node.id, // Update the ID to match the node
                  is_team_member: node.data?.is_team_member || existingResource.is_team_member || false,
                  description: node.data?.description || existingResource.description || '',
                  profileName: node.data?.profileName || existingResource.profileName || '',
                  job_title: node.data?.job_title || existingResource.job_title || '',
                });
              } else {
                // If no existing resource found, create one from node data
                console.log('Creating new resource from node data for node:', node.id);
                // Try to find profile_id from the node's profile name
                let foundProfileId = node.data?.profile_id || '';
                if (!foundProfileId && node.data?.profileName && allProfilesData.length > 0) {
                  const matchingProfile = allProfilesData.find((p: any) => p.name === node.data.profileName);
                  if (matchingProfile) {
                    foundProfileId = matchingProfile.id;
                  }
                }
                
                const newResource: HRResource = {
                  id: node.id,
                  profile_id: foundProfileId,
                  seniority: node.data?.seniority || 'junior',
                  languages: node.data?.languages || [],
                  expertises: node.data?.expertises || [],
                  calculated_price: node.data?.calculatedPrice || node.data?.calculated_price || 50,
                  is_ai: node.data?.is_ai || false,
                  is_team_member: node.data?.is_team_member || false,
                  languageNames: node.data?.languageNames || [],
                  expertiseNames: node.data?.expertiseNames || [],
                  description: node.data?.description || '',
                  profileName: node.data?.profileName || '',
                  job_title: node.data?.job_title || '',
                };
                updatedResourcesMap.set(node.id, newResource);
              }
            }
          });
          
          console.log('Rebuilding hrResources after loading flowData nodes:', updatedResourcesMap, 'size:', updatedResourcesMap.size);
          setHrResources(updatedResourcesMap);
          setNodes(flowNodes);
        } else if (reconstructedNodes.length > 0) {
          // Only use reconstructed nodes if flowData doesn't have nodes
          setNodes(reconstructedNodes);
        }
      } else if (reconstructedNodes.length > 0) {
        // No flow data, use reconstructed nodes
        setNodes(reconstructedNodes);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le projet.",
        variant: "destructive",
      });
      navigate('/client-dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  // Si l'authentification est en cours de chargement, attendre
  if (authLoading) {
    return;
  }

  // Si pas d'utilisateur après le chargement, rediriger
  if (!user) {
    // For template preview, allow access without auth
    if (id === 'template-preview') {
      fetchProjectAndFlow();
      return;
    }
    // Rediriger vers la page de connexion
    navigate('/login');
    return;
  }
  
  // Si l'utilisateur est connecté et qu'on a un ID de projet
  if (user && id) {
    fetchProjectAndFlow();
  }
}, [user, id, navigate, authLoading]);

  // Défini après handleEdgeClick

  const handleProfileSelect = (profile: HRProfile) => {
    // Bloquer l'ajout de ressources si le projet est archivé
    if (isArchived) {
      toast({
        title: "Action non autorisée",
        description: "Impossible d'ajouter des ressources à un projet archivé.",
        variant: "destructive",
      });
      return;
    }
    
    const nodeId = generateUUID();
    
    // Créer une nouvelle ressource HR
    const newResource: HRResource = {
      id: nodeId,
      profile_id: profile.id,
      seniority: profile.is_team_member ? 'senior' : 'junior',
      languages: [],
      expertises: [],
      calculated_price: profile.base_price,
      is_ai: profile.is_ai || false,
      is_team_member: profile.is_team_member || false,
      description: profile.description || '',
      job_title: profile.job_title || '',
      profileName: profile.name,
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
        is_ai: profile.is_ai || false,
        is_team_member: profile.is_team_member || false,
        badge: profile.is_team_member ? 'Équipe' : undefined,
        description: profile.description || '',
        job_title: profile.job_title || '',
      },
    };

    setNodes(nds => [...nds, newNode]);
    setSelectedResource(newResource);
  };

  const handleResourceUpdate = (updatedResource: HRResource) => {
    // Bloquer les modifications si le projet est archivé
    if (isArchived) {
      toast({
        title: "Action non autorisée",
        description: "Impossible de modifier les ressources d'un projet archivé.",
        variant: "destructive",
      });
      return;
    }
    
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
    console.log('Node clicked:', node, 'type:', node.type);
    console.log('Current hrResources state:', hrResources, 'size:', hrResources.size);
    if (node.type === 'hrResource') {
      const resource = hrResources.get(node.id);
      console.log('Looking for node.id:', node.id, 'Found resource:', resource);
      if (resource) {
        console.log('Setting selected resource:', resource);
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

  // handleEdgeClick déjà défini plus haut

  // Plus besoin de cet effet avec les edges natifs

  const onConnect = useCallback(
    (params: Connection) => {
      // Bloquer la création de connexions si le projet est archivé
      if (isArchived) {
        toast({
          title: "Action non autorisée",
          description: "Impossible de créer des connexions dans un projet archivé.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('🔗 Creating new edge connection:', params);
      const newEdge = {
        ...params,
        id: `${params.source}-${params.target}`,
        type: 'custom',
        animated: true,
        data: { 
          onClick: (edgeId: string, sourceId: string, targetId: string) => {
            handleEdgeClickFromData(edgeId, sourceId, targetId);
          }
        },
      };
      console.log('✅ New edge created:', newEdge);
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, isArchived],
  );

  const handleCanvasDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    
    // Bloquer le drop si le projet est archivé
    if (isArchived) {
      toast({
        title: "Action non autorisée",
        description: "Impossible d'ajouter des ressources à un projet archivé.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const profile: HRProfile = JSON.parse(event.dataTransfer.getData('application/json'));
      const isTeamMember = event.dataTransfer.getData('team-member') === 'true';
      
      // Calculer la position relative au canvas
      const reactFlowBounds = (event.target as Element).closest('.react-flow')?.getBoundingClientRect();
      if (!reactFlowBounds) return;
      
      const position = ensureValidPosition({
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 50,
      });

      const nodeId = generateUUID();
      
      // Si c'est un membre de l'équipe client
      if (isTeamMember) {
        // Get additional team member data
        const teamMemberDataStr = event.dataTransfer.getData('team-member-data');
        let teamMemberData = { description: '', job_title: '' };
        if (teamMemberDataStr) {
          try {
            teamMemberData = JSON.parse(teamMemberDataStr);
          } catch (e) {
            console.log('Could not parse team member data');
          }
        }
        
        const newResource: HRResource = {
          id: nodeId,
          profile_id: profile.id || nodeId, // Utiliser nodeId si profile.id est vide
          seniority: 'senior', // Les membres d'équipe sont considérés comme seniors
          languages: [], // Pas de langues spécifiques pour l'équipe interne
          expertises: [],
          calculated_price: profile.base_price || 0,
          is_ai: false,
          is_team_member: true, // Flag pour identifier les membres d'équipe
          languageNames: [],
          expertiseNames: [],
          description: teamMemberData.description || '',
          profileName: profile.name || 'Membre d\'équipe',
          job_title: teamMemberData.job_title || '',
        };

        setHrResources(prev => new Map(prev).set(nodeId, newResource));

        const newNode: Node = {
          id: nodeId,
          type: 'hrResource',
          position,
          data: {
            id: nodeId,
            profileName: profile.name,
            seniority: 'senior',
            languages: [],
            expertises: [],
            calculatedPrice: profile.base_price,
            selected: false,
            is_ai: false,
            is_team_member: true,
            badge: 'Équipe', // Badge spécial pour les membres d'équipe
            description: teamMemberData.description || '',
            job_title: teamMemberData.job_title || '',
          },
        };
        
        setNodes(prev => [...prev, newNode]);
        return;
      }
      
      // Si c'est une ressource IA, récupérer toutes les langues disponibles
      let defaultLanguages: string[] = [];
      if (profile.is_ai) {
        const { data: allLanguages } = await supabase
          .from('hr_languages')
          .select('id');
        
        if (allLanguages) {
          defaultLanguages = allLanguages.map(lang => lang.id);
        }
      }
      
      const newResource: HRResource = {
        id: nodeId,
        profile_id: profile.id,
        seniority: 'junior',
        languages: profile.is_ai ? defaultLanguages : [],
        expertises: profile.is_ai ? [] : [], // Les IA n'ont pas besoin d'expertises
        calculated_price: profile.base_price,
        is_ai: profile.is_ai,
        languageNames: [], // sera rempli par HRResourcePanel
        expertiseNames: [],
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
          languages: profile.is_ai ? defaultLanguages : [],
          expertises: [],
          calculatedPrice: newResource.calculated_price,
          selected: false,
          is_ai: profile.is_ai,
        },
      };

      setNodes(nds => [...nds, newNode]);
      setSelectedResource(newResource);
    } catch (error) {
      console.error('Erreur lors du drop:', error);
    }
  }, [setNodes, supabase]);

  const handleCanvasDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);


  // Fonction d'export JSON pour les admins
  const exportJSON = () => {
    const flowData = {
      nodes,
      edges,
    };
    
    // Copier dans le presse-papiers
    navigator.clipboard.writeText(JSON.stringify(flowData, null, 2));
    
    toast({
      title: "Export réussi",
      description: "JSON copié dans le presse-papiers. Vous pouvez le coller dans votre template.",
    });
  };

  // Fonction d'import JSON pour les admins
  const importJSON = () => {
    const input = prompt("Collez le JSON ReactFlow ici :");
    if (!input) return;

    try {
      const flowData = JSON.parse(input);
      if (flowData.nodes && flowData.edges) {
        setNodes(flowData.nodes);
        setEdges(flowData.edges);
        toast({
          title: "Import réussi",
          description: "Composition chargée avec succès",
        });
      } else {
        throw new Error("Format JSON invalide");
      }
    } catch (error) {
      toast({
        title: "Erreur d'import",
        description: "Format JSON invalide",
        variant: "destructive",
      });
    }
  };

  const saveFlow = async () => {
    if (!id) return;
    
    // Bloquer la sauvegarde si le projet est archivé
    if (isArchived) {
      toast({
        title: "Action non autorisée",
        description: "Impossible de sauvegarder les modifications d'un projet archivé.",
        variant: "destructive",
      });
      return;
    }
    
    // Vérifier l'authentification de l'utilisateur
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      console.error('User not authenticated');
      toast({
        title: "Erreur d'authentification",
        description: "Vous devez être connecté pour sauvegarder.",
        variant: "destructive",
      });
      return;
    }

    // Vérifier que toutes les ressources IA ont au moins une connexion
    const aiNodes = nodes.filter(node => node.data?.is_ai === true);
    for (const aiNode of aiNodes) {
      // Vérifier si le nœud IA a au moins une connexion (entrante ou sortante)
      const hasConnection = edges.some(edge => 
        edge.source === aiNode.id || edge.target === aiNode.id
      );
      
      if (!hasConnection) {
        toast({
          title: "Configuration invalide",
          description: `La ressource IA "${aiNode.data.profileName}" doit être connectée à une ressource humaine (ou au client).`,
          variant: "destructive",
        });
        return;
      }
      
      // Vérifier qu'au moins une connexion est avec une ressource non-IA ou le client
      const connectedNodes = edges
        .filter(edge => edge.source === aiNode.id || edge.target === aiNode.id)
        .map(edge => edge.source === aiNode.id ? edge.target : edge.source)
        .map(nodeId => nodes.find(n => n.id === nodeId))
        .filter(Boolean);
      
      const hasHumanConnection = connectedNodes.some(node => 
        node.type === 'clientNode' || !node.data?.is_ai
      );
      
      if (!hasHumanConnection) {
        toast({
          title: "Configuration invalide",
          description: `La ressource IA "${aiNode.data.profileName}" doit être connectée à au moins une ressource humaine ou au client.`,
          variant: "destructive",
        });
        return;
      }
    }

    let projectId = id;

    // Si on est en mode template preview, créer un nouveau projet
    if (id === 'template-preview') {
      console.log('Template preview detected, creating new project...');
      
      const now = new Date();
      const projectTitle = `Nouveau projet ${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      
      try {
        const { data: newProject, error: createError } = await supabase
          .from('projects')
          .insert({
            title: projectTitle,
            description: 'Projet créé à partir d\'un template',
            project_date: now.toISOString(),
            status: 'pause',
          })
          .select('id')
          .single();

        if (createError || !newProject) {
          throw createError || new Error('Failed to create project');
        }

        projectId = newProject.id;
        console.log('New project created with ID:', projectId);
        
        toast({
          title: "Nouveau projet créé",
          description: `"${projectTitle}" a été créé avec votre équipe personnalisée.`,
        });

        // Mettre à jour l'URL et l'état pour refléter le nouveau projet
        window.history.replaceState(null, '', `/project/${projectId}`);
        setProject(prev => prev ? { ...prev, id: projectId, title: projectTitle } : null);
        
      } catch (error) {
        console.error('Error creating new project:', error);
        toast({
          title: "Erreur",
          description: "Impossible de créer le nouveau projet.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
    }

    console.log('Saving project:', projectId, 'by user:', auth.user.id);
    console.log('HR Resources to save:', Array.from(hrResources.values()));
    
    setIsSaving(true);
    try {
      // 1. First, delete resources that exist in DB but not in current canvas
      const { data: existingResources } = await supabase
        .from('hr_resource_assignments')
        .select('id')
        .eq('project_id', projectId);

      if (existingResources) {
        const currentResourceIds = Array.from(hrResources.keys());
        const resourcesToDelete = existingResources
          .filter(resource => !currentResourceIds.includes(resource.id))
          .map(resource => resource.id);

        if (resourcesToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('hr_resource_assignments')
            .delete()
            .in('id', resourcesToDelete);

          if (deleteError) {
            console.error('Delete error:', deleteError);
            throw deleteError;
          }
        }
      }

      // 2. Filter out duplicate profile_id combinations and prefer existing resources
      const resourceAssignmentsMap = Array.from(hrResources.values())
        .reduce((acc, resource) => {
          const key = `${projectId}-${resource.profile_id}`;
          // Keep the first occurrence or prefer existing resources (those with existing assignments)
          if (!acc.has(key)) {
            acc.set(key, resource);
          }
          return acc;
        }, new Map());
      
      const resourceAssignments = Array.from(resourceAssignmentsMap.values());

      // Validate that all resources have complete information
      const incompleteResources = resourceAssignments.filter(resource => {
        // Les ressources IA n'ont pas besoin d'expertises
        if (resource.is_ai) {
          const hasLanguages = (resource.languages && resource.languages.length > 0) || 
                              (resource.languageNames && resource.languageNames.length > 0);
          const hasSeniority = resource.seniority && resource.seniority !== '';
          
          console.log('Checking AI resource:', resource.id, {
            hasLanguages,
            hasSeniority,
            languages: resource.languages
          });
          
          return !hasLanguages || !hasSeniority;
        }
        
        // Les membres d'équipe n'ont pas besoin de validation spéciale
        if (resource.is_team_member) {
          console.log('Skipping validation for team member:', resource.id);
          return false; // Team members are always considered complete
        }
        
        // Pour les ressources humaines, vérifier tout
        const hasLanguages = (resource.languages && resource.languages.length > 0) || 
                            (resource.languageNames && resource.languageNames.length > 0);
        const hasExpertises = (resource.expertises && resource.expertises.length > 0) || 
                             (resource.expertiseNames && resource.expertiseNames.length > 0);
        const hasSeniority = resource.seniority && resource.seniority !== '';
        
        console.log('Checking human resource:', resource.id, {
          hasLanguages,
          hasExpertises, 
          hasSeniority,
          languages: resource.languages,
          expertises: resource.expertises
        });
        
        return !hasLanguages || !hasExpertises || !hasSeniority;
      });
      
      if (incompleteResources.length > 0) {
        toast({
          title: "Informations manquantes",
          description: "Toutes les cartes doivent avoir au moins une séniorité, une langue et une expertise sélectionnées.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // Convert to array and prepare for DB storage
      console.log('hrResources Map:', hrResources);
      console.log('hrResources size:', hrResources.size);
      console.log('resourceAssignments:', resourceAssignments);
      
      // Get all language names for AI resources upfront
      const allLanguages = await supabase
        .from('hr_languages')
        .select('id, name');
      
      const languageMap = new Map();
      if (allLanguages.data) {
        allLanguages.data.forEach(lang => languageMap.set(lang.id, lang.name));
      }
      
      // D'abord, créer une liste des profile_ids déjà traités pour éviter les doublons
      const processedProfileIds = new Set<string>();
      
      const assignmentsArray = resourceAssignments.map(resource => {
        const node = nodes.find(n => n.id === resource.id);
        
        // Generate new UUID for template-based resources (if current ID is not a valid UUID)
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resource.id);
        const assignmentId = isValidUUID ? resource.id : generateUUID();
        
        console.log('Processing resource:', resource.id, 'isValidUUID:', isValidUUID, 'assignmentId:', assignmentId);
        
        // Pour les membres d'équipe, nous devons gérer différemment
        let finalProfileId = resource.profile_id;
        
        // Pour les membres d'équipe, on doit éviter d'utiliser le même profile_id
        if (resource.is_team_member) {
          // Si le profile_id est vide ou invalide, utiliser l'ID de la ressource
          if (!finalProfileId || finalProfileId === '') {
            console.log('Team member has empty profile_id, using resource id:', resource.id);
            finalProfileId = resource.id; // Utiliser l'ID de la ressource comme profile_id
          }
          
          // Vérifier si on a déjà traité ce membre d'équipe pour ce projet
          const key = `${projectId}-${finalProfileId}`;
          if (processedProfileIds.has(key)) {
            console.log('Skipping duplicate team member:', finalProfileId);
            return null; // Sera filtré
          }
          processedProfileIds.add(key);
          
          // Aussi vérifier dans les ressources existantes
          const alreadyInDB = existingResources?.some(r => 
            r.project_id === projectId && 
            (r.profile_id === finalProfileId || r.node_data?.team_member_id === finalProfileId)
          );
          
          if (alreadyInDB) {
            console.log('Team member already exists in DB, skipping');
            return null;
          }
        } else {
          // Pour les ressources normales, vérifier aussi les doublons
          const key = `${projectId}-${finalProfileId}`;
          if (processedProfileIds.has(key)) {
            console.log('Skipping duplicate resource:', finalProfileId);
            return null;
          }
          processedProfileIds.add(key);
        }
        
        // Convert language IDs to names - for AI resources, get names from IDs if needed
        let languageNames = resource.languageNames || [];
        if (resource.is_ai && resource.languages && resource.languages.length > 0 && languageNames.length === 0) {
          // Convert IDs to names using our map
          console.log('Converting language IDs to names for AI resource');
          languageNames = resource.languages.map(id => languageMap.get(id)).filter(Boolean);
        }
        
        const expertiseNames = resource.expertiseNames || [];
        
        // Determine booking status: AI resources are always 'booké' (available), others start as 'draft'
        const existingResource = existingResources?.find(r => r.id === assignmentId);
        let bookingStatus = existingResource?.booking_status || 'draft';

        // Les ressources IA sont TOUJOURS disponibles (même lors des mises à jour)
        if (resource.is_ai) {
          bookingStatus = 'booké';
        }

        // Les membres d'équipe sont TOUJOURS disponibles (même lors des mises à jour)
        if (resource.is_team_member) {
          bookingStatus = 'booké';
        }

        // Pour les ressources humaines, conserver le statut existant ou utiliser 'draft'
        if (!resource.is_ai && !resource.is_team_member && existingResource) {
          bookingStatus = existingResource.booking_status;
        }
        
        return {
          id: assignmentId,
          project_id: projectId,
          profile_id: finalProfileId, // Utiliser le profile_id corrigé
          seniority: resource.seniority,
          languages: languageNames, // Store names as text[], not UUIDs
          expertises: expertiseNames, // Store names as text[], not UUIDs
          calculated_price: resource.calculated_price,
          booking_status: bookingStatus, // Preserve existing status or use 'draft'
          node_data: { 
            position: node?.position,
            languageNames: languageNames,
            expertiseNames: expertiseNames,
            is_ai: resource.is_ai, // Stocker le flag is_ai
            is_team_member: resource.is_team_member, // Stocker le flag is_team_member
            description: resource.description || '', // Stocker la description du membre
            job_title: resource.job_title || '', // Stocker le job_title du membre
            profileName: resource.profileName || '', // Stocker le nom du profil
            team_member_id: resource.is_team_member ? resource.profile_id : null // Stocker l'ID du membre d'équipe depuis client_team_members
          }
        };
      }).filter(assignment => assignment !== null); // Filtrer les null (membres d'équipe dupliqués)

      console.log('Assignments array to save:', assignmentsArray);
      console.log('Number of assignments:', assignmentsArray.length);

      // 3. Save flow data (for edges and visual layout)
      // First check if flow exists
      const { data: existingFlow } = await supabase
        .from('project_flows')
        .select('id')
        .eq('project_id', id)
        .maybeSingle();
      
      let flowError;
      if (existingFlow) {
        // Update existing flow
        const { error } = await supabase
          .from('project_flows')
          .update({
            nodes: nodes as any,
            edges: edges as any
          })
          .eq('project_id', projectId);
        flowError = error;
      } else {
        // Insert new flow
        const { error } = await supabase
          .from('project_flows')
          .insert({
            project_id: projectId,
            nodes: nodes as any,
            edges: edges as any
          });
        flowError = error;
      }

      if (flowError) throw flowError;

      // 4. Save HR resource assignments if any exist
      if (assignmentsArray.length > 0) {
        console.log('Saving resource assignments:', assignmentsArray);
        
        // Use individual insert/update logic instead of upsert
        let resourceError = null;
        console.log('Processing', assignmentsArray.length, 'assignments');
        
        for (const assignment of assignmentsArray) {
          console.log('Processing assignment:', assignment);
          
          // Préparer l'assignment en excluant les champs qui pourraient poser problème
          const cleanAssignment = {
            project_id: assignment.project_id,
            profile_id: assignment.profile_id,
            seniority: assignment.seniority,
            languages: assignment.languages,
            expertises: assignment.expertises,
            booking_status: assignment.booking_status,
            calculated_price: assignment.calculated_price,
            node_data: assignment.node_data, // Important pour stocker is_ai et la position
            updated_at: new Date().toISOString()
          };

          // Only try to update if we have a valid UUID and it's an existing resource (not from template)
          const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignment.id);
          const isExistingAssignment = existingResources?.some(r => r.id === assignment.id);
          
          if (assignment.id && isValidUUID && isExistingAssignment) {
            // Try update first - avec gestion spéciale du trigger
            console.log('Trying to update existing assignment:', assignment.id);
            
            try {
              // Stratégie 1: Vérifier si une mise à jour est vraiment nécessaire
              const { data: currentAssignment } = await supabase
                .from('hr_resource_assignments')
                .select('*')
                .eq('id', assignment.id)
                .single();

              // Comparer si les données ont vraiment changé
              const needsUpdate = !currentAssignment || 
                currentAssignment.profile_id !== cleanAssignment.profile_id ||
                currentAssignment.seniority !== cleanAssignment.seniority ||
                JSON.stringify(currentAssignment.languages || []) !== JSON.stringify(cleanAssignment.languages || []) ||
                JSON.stringify(currentAssignment.expertises || []) !== JSON.stringify(cleanAssignment.expertises || []) ||
                currentAssignment.calculated_price !== cleanAssignment.calculated_price ||
                currentAssignment.booking_status !== cleanAssignment.booking_status;

              if (!needsUpdate) {
                console.log('No changes detected, skipping update to avoid trigger');
                continue; // Passer au suivant sans mettre à jour
              }

              // NOUVEAU: Détecter les changements CRITIQUES qui nécessitent un remplacement
              console.log('🔍 Checking for critical changes:', {
                currentAssignment: currentAssignment ? {
                  booking_status: currentAssignment.booking_status,
                  seniority: currentAssignment.seniority,
                  profile_id: currentAssignment.profile_id,
                  languages: currentAssignment.languages,
                  expertises: currentAssignment.expertises
                } : null,
                newAssignment: {
                  seniority: cleanAssignment.seniority,
                  profile_id: cleanAssignment.profile_id,
                  booking_status: cleanAssignment.booking_status,
                  languages: cleanAssignment.languages,
                  expertises: cleanAssignment.expertises
                }
              });

              // Détecter les changements critiques SEULEMENT s'il y a vraiment un changement
              const isCriticalChange = currentAssignment && 
                (currentAssignment.booking_status === 'accepted' || 
                 currentAssignment.booking_status === 'booké') && // PAS pour 'recherche' car pas de candidat assigné
                (
                  currentAssignment.profile_id !== cleanAssignment.profile_id || // Changement de métier
                  currentAssignment.seniority !== cleanAssignment.seniority || // Changement de séniorité
                  JSON.stringify(currentAssignment.languages || []) !== JSON.stringify(cleanAssignment.languages || []) || // Changement de langues
                  JSON.stringify(currentAssignment.expertises || []) !== JSON.stringify(cleanAssignment.expertises || []) // Changement d'expertises
                );

              if (isCriticalChange) {
                console.log('🚨 CRITICAL CHANGE DETECTED - Using resource modification system');
                console.log('Old seniority:', currentAssignment.seniority, 'New seniority:', cleanAssignment.seniority);
                
                // Appeler la fonction simplifiée handle-resource-change
                const { data: modificationResult, error: modError } = await supabase.functions.invoke('handle-resource-change', {
                  body: {
                    assignmentId: assignment.id,
                    oldData: currentAssignment,
                    newData: cleanAssignment
                  }
                });

                if (modError) {
                  console.error('Resource modification error:', modError);
                  toast({
                    title: "Erreur de modification",
                    description: "Impossible de gérer le changement de ressource",
                    variant: "destructive"
                  });
                } else {
                  console.log('Resource modification result:', modificationResult);
                  if (modificationResult.requiresRebooking) {
                    toast({
                      title: "Ressource modifiée",
                      description: "La recherche d'un nouveau candidat est en cours. L'ancien candidat a été notifié.",
                    });
                  }
                }
                continue; // Passer au suivant, la modification est gérée
              }

              console.log('Changes detected, attempting update...');
              const { data: updateResult, error: updateError } = await supabase
                .from('hr_resource_assignments')
                .update(cleanAssignment)
                .eq('id', assignment.id)
                .select();
              
              if (updateError) {
                console.error('Update error:', updateError);
                
                // Si l'erreur est liée au trigger de notification
                if (updateError.message.includes('description') || updateError.message.includes('notification')) {
                  console.log('Trigger error detected - SKIPPING update to avoid database issues');
                  console.log('Assignment exists and is functional, keeping current state');
                  // Ne pas essayer d'autres méthodes qui pourraient aussi échouer
                  // L'assignment existe déjà et est fonctionnel
                } else {
                  resourceError = updateError;
                }
              } else if (!updateResult || updateResult.length === 0) {
                // No rows updated, resource doesn't exist - insert it
                console.log('No rows updated, inserting new assignment');
                const { error: insertError } = await supabase
                  .from('hr_resource_assignments')
                  .insert({
                    ...cleanAssignment,
                    created_at: new Date().toISOString()
                  })
                  .select();
                
                if (insertError) {
                  console.error('Insert error:', insertError);
                  resourceError = insertError;
                }
              } else {
                console.log('Assignment updated successfully');
              }
            } catch (unexpectedError: any) {
              console.error('Unexpected error during update:', unexpectedError);
              resourceError = unexpectedError;
            }
          } else {
            // Insert new
            console.log('Inserting new assignment with ID:', assignment.id);
            try {
              const { data: insertedData, error } = await supabase
                .from('hr_resource_assignments')
                .insert({
                  id: assignment.id, // Important: inclure l'ID
                  ...cleanAssignment,
                  created_at: new Date().toISOString()
                })
                .select();
              
              if (error) {
                console.error('Insert error:', error);
                resourceError = error;
              } else {
                console.log('✅ Successfully inserted assignment:', insertedData);
              }
            } catch (insertError: any) {
              console.error('Insert exception:', insertError);
              resourceError = insertError;
            }
          }
        }

        if (resourceError) {
          console.error('Resource save error:', resourceError);
          // Ne pas faire échouer complètement si c'est juste le trigger
          if (resourceError.message && resourceError.message.includes('description')) {
            console.warn('Trigger error detected but assignments may have been saved');
            // Continue sans fail - les assignments principaux sont probablement sauvés
          } else {
            throw resourceError;
          }
        } else {
          console.log('Resources saved successfully');
        }
        
        // Link team members to the project
        const teamMembers = assignmentsArray.filter(a => a.node_data?.is_team_member);
        for (const teamMember of teamMembers) {
          if (teamMember.node_data?.team_member_id) {
            try {
              console.log('Linking team member to project:', teamMember.node_data.team_member_id);
              const { error: linkError } = await supabase.rpc('link_team_member_to_project', {
                p_member_id: teamMember.node_data.team_member_id,
                p_project_id: projectId
              });
              
              if (linkError) {
                console.error('Error linking team member to project:', linkError);
              } else {
                console.log('Team member linked successfully');
              }
            } catch (err) {
              console.error('Failed to link team member:', err);
            }
          }
        }
      }

      // Pas besoin de mettre à jour le statut - le bouton "Démarrer le projet" 
      // apparaît maintenant automatiquement quand il y a des ressources
      // Le statut sera changé en "en-cours" quand l'utilisateur cliquera sur "Démarrer"
      console.log('Project has', assignmentsArray.length, 'resources assigned');
      
      // Déclencher un événement pour forcer le rafraîchissement dans d'autres composants
      window.dispatchEvent(new CustomEvent('projectUpdated', { detail: { projectId } }));
      
      toast({
        title: "Sauvegardé",
        description: "Le projet a été sauvegardé avec succès.",
        duration: 3000, // Disparaît après 3 secondes
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

  // Afficher un loader si l'authentification ou le projet est en cours de chargement
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">
            {authLoading ? "Vérification de l'authentification..." : "Chargement du projet..."}
          </p>
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
      {/* Header simplifié avec hauteur réduite */}
      <div className="p-3">
        <div className="bg-gradient-to-br from-purple-200 via-pink-200 to-blue-200 dark:from-purple-600 dark:via-pink-600 dark:to-blue-600 p-[1px] rounded-xl shadow-lg">
          <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-[#0f172a] dark:via-[#1e1b4b] dark:to-[#312e81] rounded-xl">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                {/* Gauche: Bouton retour et titre */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (id === 'template-preview') {
                        if (window.opener) {
                          window.close();
                          return;
                        }
                        navigate('/client-dashboard?section=templates');
                      } else {
                        navigate('/client-dashboard?section=projects');
                      }
                    }}
                    className="hover:bg-purple-100 dark:hover:bg-purple-900/30"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 dark:from-purple-500 dark:via-pink-500 dark:to-blue-500 rounded-lg flex items-center justify-center">
                      <Network className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                        {id === 'template-preview' ? 'Construisez votre équipe' : project.title}
                      </h1>
                    </div>
                    {isArchived && (
                      <Badge className="bg-orange-500 text-white text-xs">Archivé</Badge>
                    )}
                  </div>
                </div>
                
                {/* Centre: Prix total */}
                {hrResources.size > 0 && (
                  <div className="flex items-center gap-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 px-4 py-1.5 rounded-lg border border-purple-200 dark:border-purple-700">
                    <Euro className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-lg font-bold text-purple-900 dark:text-purple-100">
                      {calculateTotalPrice().toFixed(2)}€/min
                    </span>
                    <span className="text-sm text-purple-600 dark:text-purple-400">
                      • {hrResources.size} ressource{hrResources.size > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                
                {/* Droite: Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsVoiceAssistantOpen(true)}
                    className="hover:bg-purple-100 dark:hover:bg-purple-900/30"
                    title="Assistant IA"
                  >
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </Button>
                  <NotificationBell />
                  <ThemeToggle />
                  {isAdmin && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={importJSON}
                        className="hover:bg-purple-100 dark:hover:bg-purple-900/30"
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={exportJSON}
                        className="hover:bg-purple-100 dark:hover:bg-purple-900/30"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {!isArchived && (
                    <Button 
                      size="sm"
                      onClick={saveFlow} 
                      disabled={isSaving || isArchived}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={{
                type: 'custom',
                animated: true
              }}
              fitView={false} // Désactiver fitView automatique qui peut causer des problèmes
              nodesDraggable={!isArchived} // Désactiver le drag si archivé
              nodesConnectable={!isArchived} // Désactiver les connexions si archivé
              nodesFocusable={true}
              panOnDrag={[1, 2]}
              selectionOnDrag={false}
              elementsSelectable={true} // Permettre la sélection pour voir les détails
              deleteKeyCode={isArchived ? null : ['Delete', 'Backspace']} // Désactiver la suppression si archivé, support Mac et PC
              minZoom={0.1} // Permettre de dézoomer plus
              maxZoom={2} // Limiter le zoom max
              defaultViewport={{ x: 0, y: 0, zoom: 1 }} // Vue par défaut
            >
              <Controls 
                style={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '12px',
                  padding: '4px'
                }}
                showInteractive={false}
              />
              <MiniMap 
                style={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '12px'
                }}
                maskColor="rgba(139, 92, 246, 0.2)"
                nodeColor="#8b5cf6"
                pannable
                zoomable
              />
              <Background gap={12} size={1} />
            </ReactFlow>
          </ReactFlowProvider>

          {/* EdgeDetails overlay */}
          {selectedEdge && (
            <div 
              className="absolute inset-0 flex items-center justify-center pointer-events-none" 
              style={{ zIndex: 1000 }}
            >
              <div className="pointer-events-auto">
                <EdgeDetails 
                  sourceProfile={selectedEdge.source}
                  targetProfile={selectedEdge.target}
                  onClose={() => {
                    console.log('Closing edge details');
                    setSelectedEdge(null);
                  }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Panel droit - Configuration ressource */}
        <HRResourcePanel
          selectedResource={selectedResource}
          onResourceUpdate={handleResourceUpdate}
          onResourceDelete={selectedResource ? () => {
            if (selectedResource && selectedResource.id !== 'client-node' && !isArchived) {
              // Déclencher la suppression du nœud
              const changes = [{
                type: 'remove' as const,
                id: selectedResource.id
              }];
              onNodesChange(changes);
            }
          } : undefined}
        />
      </div>

      {/* Assistant IA Fullscreen */}
      <EnhancedVoiceAssistant
        isOpen={isVoiceAssistantOpen}
        onClose={() => setIsVoiceAssistantOpen(false)}
      />
    </div>
  );
};

export default Project;
