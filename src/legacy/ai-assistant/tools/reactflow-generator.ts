/**
 * Générateur de JSON ReactFlow pour les équipes créées par l'IA
 */

import { Node, Edge } from 'reactflow';

export interface TeamMember {
  profile: string; // Ex: "Développeur Frontend"
  seniority: 'junior' | 'medior' | 'senior' | 'expert';
  skills?: string[];
  languages?: string[];
}

export interface TeamComposition {
  projectName: string;
  members: TeamMember[];
}

/**
 * Génère les nodes et edges ReactFlow à partir d'une composition d'équipe
 */
export function generateReactFlowTeam(team: TeamComposition): { nodes: Node[], edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // Node central pour le projet
  const projectNode: Node = {
    id: 'project-center',
    type: 'default',
    position: { x: 400, y: 50 },
    data: { 
      label: team.projectName,
      style: {
        background: '#f3f4f6',
        border: '2px solid #9333ea',
        borderRadius: '8px',
        padding: '10px',
        fontWeight: 'bold',
        fontSize: '16px'
      }
    }
  };
  nodes.push(projectNode);
  
  // Générer les nodes pour chaque membre de l'équipe
  const radius = 250;
  const angleStep = (2 * Math.PI) / team.members.length;
  
  team.members.forEach((member, index) => {
    const angle = angleStep * index - Math.PI / 2; // Commencer en haut
    const x = 400 + radius * Math.cos(angle);
    const y = 300 + radius * Math.sin(angle);
    
    const nodeId = `member-${index}`;
    
    // Couleur selon la séniorité
    const seniorityColors = {
      junior: '#10b981', // green
      medior: '#3b82f6', // blue
      senior: '#f59e0b', // amber
      expert: '#ef4444'  // red
    };
    
    const memberNode: Node = {
      id: nodeId,
      type: 'hrResource',
      position: { x, y },
      data: {
        profile: member.profile,
        seniority: member.seniority,
        skills: member.skills || [],
        languages: member.languages || [],
        color: seniorityColors[member.seniority],
        onDelete: () => {},
        onClick: () => {}
      }
    };
    
    nodes.push(memberNode);
    
    // Créer une edge du projet vers le membre
    const edge: Edge = {
      id: `edge-project-${nodeId}`,
      source: 'project-center',
      target: nodeId,
      type: 'smoothstep',
      animated: true,
      style: {
        stroke: '#9333ea',
        strokeWidth: 2
      }
    };
    
    edges.push(edge);
  });
  
  return { nodes, edges };
}

/**
 * Parse la réponse de l'IA pour extraire la composition d'équipe
 */
export function parseTeamFromAI(aiResponse: any): TeamComposition | null {
  try {
    // Si l'IA a utilisé la fonction create_team
    if (aiResponse.profiles && Array.isArray(aiResponse.profiles)) {
      return {
        projectName: aiResponse.project_name || 'Nouveau Projet',
        members: aiResponse.profiles.map((profile: any) => ({
          profile: profile.profession || profile.role,
          seniority: profile.seniority || 'medior',
          skills: profile.skills || [],
          languages: profile.languages || []
        }))
      };
    }
    
    // Sinon essayer de parser depuis le texte
    // (à implémenter si nécessaire)
    
    return null;
  } catch (error) {
    console.error('Error parsing team from AI:', error);
    return null;
  }
}

/**
 * Sauvegarde la composition d'équipe dans le localStorage pour récupération dans ReactFlow
 */
export function saveTeamComposition(team: TeamComposition) {
  const reactFlowData = generateReactFlowTeam(team);
  localStorage.setItem('ai_generated_team', JSON.stringify({
    team,
    reactFlowData,
    timestamp: Date.now()
  }));
}

/**
 * Récupère la composition d'équipe depuis le localStorage
 */
export function getTeamComposition(): { team: TeamComposition, reactFlowData: any } | null {
  const data = localStorage.getItem('ai_generated_team');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      // Vérifier que les données ne sont pas trop vieilles (1 heure)
      if (Date.now() - parsed.timestamp < 3600000) {
        return parsed;
      }
    } catch (error) {
      console.error('Error parsing team composition:', error);
    }
  }
  return null;
}

/**
 * Nettoie la composition d'équipe du localStorage
 */
export function clearTeamComposition() {
  localStorage.removeItem('ai_generated_team');
}